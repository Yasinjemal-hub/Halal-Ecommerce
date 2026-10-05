import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Merchant from '../models/Merchant.js';
import mongoose from 'mongoose';
import {
    ORDER_TRANSITIONS,
    allowedTargets,
    isTransitionAllowedForActor,
} from '../utils/orderTransitions.js';

// ── Single source of truth for status transitions ───────
// See backend/utils/orderTransitions.js. Kept here as an alias so error
// messages stay consistent with the documented lifecycle table.
const VALID_TRANSITIONS = Object.fromEntries(
    Object.entries(ORDER_TRANSITIONS).map(([from, opts]) => [from, opts.map((o) => o.to)])
);

/**
 * Validate order status transition (graph check only, no actor check).
 * Prevents invalid state changes like: delivered -> pending.
 * Actor authorization is enforced separately via isTransitionAllowedForActor.
 */
const validateStatusTransition = (currentStatus, newStatus) => {
    if (currentStatus === newStatus) return true;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
};

// ── Shared authorization helpers ────────────────────────
const ADMIN_ROLES = ['admin', 'superadmin'];
const isAdminLike = (role) => ADMIN_ROLES.includes(role);

/** Resolve the caller's Merchant profile (null when none). */
const findCallerMerchant = (userId, session = null) => {
    const q = Merchant.findOne({ user: userId });
    return session ? q.session(session) : q;
};

/** Extract a comparable id whether the ref is populated or a raw ObjectId. */
const refId = (ref) => {
    if (!ref) return null;
    if (ref._id) return ref._id.toString();
    return ref.toString();
};

/** True when the merchant owns >= 1 item in the order. */
const merchantOwnsOrder = (order, merchantId) =>
    order.items.some(
        (item) => item.merchant && refId(item.merchant) === merchantId.toString()
    );

/**
 * Build a merchant-scoped order view: only their items plus the customer
 * fields needed for fulfilment (name, phone, shipping address).
 * Email is withheld — it is not needed to fulfil items.
 */
const toMerchantOrderView = (orderObj, merchantId) => {
    const ownItems = (orderObj.items || []).filter(
        (i) => {
            const m = i.merchant?._id || i.merchant;
            return m && m.toString() === merchantId.toString();
        }
    );
    const merchantSubtotal = ownItems.reduce(
        (sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0
    );
    const user = orderObj.user && typeof orderObj.user === 'object'
        ? {
            _id: orderObj.user._id,
            firstName: orderObj.user.firstName,
            lastName: orderObj.user.lastName,
            phone: orderObj.user.phone,
        }
        : orderObj.user;
    return {
        ...orderObj,
        items: ownItems,
        merchantItemCount: ownItems.reduce((n, i) => n + (i.quantity || 0), 0),
        merchantSubtotal,
        user,
        // Withhold non-fulfilment internals from merchants
        paymentDetails: undefined,
        adminNote: undefined,
    };
};

/** Restore stock + reverse merchant accounting for cancelled/returned items. */
const reverseFulfilmentSideEffects = async (order, session, { reverseOrdersCount }) => {
    for (const item of order.items) {
        await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } },
            { session }
        );
    }
    const merchantIds = [...new Set(order.items.map((i) => refId(i.merchant)))];
    for (const merchantId of merchantIds) {
        const merchantItemsTotal = order.items
            .filter((i) => refId(i.merchant) === merchantId)
            .reduce((sum, i) => sum + i.price * i.quantity, 0);
        await Merchant.findByIdAndUpdate(
            merchantId,
            {
                $inc: {
                    ...(reverseOrdersCount ? { totalOrders: -1 } : {}),
                    totalRevenue: -merchantItemsTotal,
                },
            },
            { session }
        );
    }
};

/**
 * Reverse merchant revenue WITHOUT touching stock or order counts.
 * Used when refunding from a state whose revenue was never reversed
 * ('delivered', 'return_requested'). Orders refunded from 'cancelled' or
 * 'returned' already had revenue reversed, so this must NOT run for them
 * (otherwise revenue would be double-reversed).
 */
const reverseRevenueOnly = async (order, session) => {
    const merchantIds = [...new Set(order.items.map((i) => refId(i.merchant)))];
    for (const merchantId of merchantIds) {
        const merchantItemsTotal = order.items
            .filter((i) => refId(i.merchant) === merchantId)
            .reduce((sum, i) => sum + i.price * i.quantity, 0);
        await Merchant.findByIdAndUpdate(
            merchantId,
            { $inc: { totalRevenue: -merchantItemsTotal } },
            { session }
        );
    }
};

/** States whose merchant revenue has already been reversed (cancel/return). */
const REVENUE_ALREADY_REVERSED = ['cancelled', 'returned'];

const pushTimeline = (order, status, note, updatedBy) => {
    order.timeline.push({
        status,
        note: note || `Status updated to ${status}`,
        timestamp: new Date(),
        updatedBy,
    });
};

/**
 * @desc    Create an order (from cart)
 * @route   POST /api/orders
 * @access  Private
 * @fix     Uses atomic operations to prevent race conditions on stock
 */
export const createOrder = async (req, res, next) => {
    if (req.user.role === 'merchant') {
        return res.status(403).json({
            success: false,
            message: 'Merchants cannot place orders. Use your dashboard to manage products and orders instead.',
        });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { shippingAddress, paymentMethod, customerNote } = req.body;

        // Get user's cart
        const cart = await Cart.findOne({ user: req.user._id })
            .populate('items.product')
            .session(session);

        if (!cart || cart.items.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty',
            });
        }

        // Build order items from cart and validate all products
        const orderItems = [];
        let itemsTotal = 0;

        for (const cartItem of cart.items) {
            const product = cartItem.product;

            if (!product || !product.isActive) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Product "${cartItem.product?.name || 'Unknown'}" is no longer available`,
                });
            }

            // Check stock availability (initial check)
            if (product.stock < cartItem.quantity) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for "${product.name}". Available: ${product.stock}`,
                });
            }

            const itemPrice = product.discountPrice || product.price;

            orderItems.push({
                product: product._id,
                name: product.name,
                image: product.images?.[0]?.url || '',
                price: itemPrice,
                quantity: cartItem.quantity,
                merchant: product.merchant,
            });

            itemsTotal += itemPrice * cartItem.quantity;
        }

        // Calculate totals
        const deliveryFee = req.body.deliveryFee || 0;
        const tax = Math.round(itemsTotal * 0.15 * 100) / 100; // 15% VAT
        const discount = req.body.discount || 0;
        const totalPrice = itemsTotal + deliveryFee + tax - discount;

        // Validate discount doesn't exceed order total
        if (discount > itemsTotal) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Discount cannot exceed the order total',
            });
        }

        // Create the order
        const order = await Order.create(
            [{
                user: req.user._id,
                items: orderItems,
                itemsTotal,
                deliveryFee,
                tax,
                discount,
                totalPrice,
                shippingAddress,
                paymentMethod,
                customerNote,
            }],
            {session}
        );

        // Atomically reduce product stock with validation
        // This prevents race condition where two orders could both succeed
        for (const item of orderItems) {
            const updatedProduct = await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: -item.quantity } },
                { new: true, session, runValidators: true }
            );

            // Check if stock went negative (race condition detected)
            if (updatedProduct.stock < 0) {
                // Restore and abort transaction
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { stock: item.quantity } },
                    { session }
                );

                await session.abortTransaction();
                return res.status(409).json({
                    success: false,
                    message: `Stock depleted for "${item.name}". Another order was placed simultaneously. Please try again.`,
                });
            }
        }

        // Update merchant order counts (ATOMIC)
        const merchantIds = [...new Set(orderItems.map((i) => i.merchant.toString()))];
        for (const merchantId of merchantIds) {
            const merchantItemsTotal = orderItems
                .filter((i) => i.merchant.toString() === merchantId)
                .reduce((sum, i) => sum + i.price * i.quantity, 0);

            await Merchant.findByIdAndUpdate(
                merchantId,
                {
                    $inc: { totalOrders: 1, totalRevenue: merchantItemsTotal },
                },
                { session }
            );
        }

        // Clear the cart (atomic)
        await Cart.updateOne(
            { _id: cart._id },
            { items: [] },
            { session }
        );

        // Commit transaction
        await session.commitTransaction();

        res.status(201).json({
            success: true,
            order: order[0],
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Get my orders
 * @route   GET /api/orders/my-orders
 * @access  Private
 */
export const getMyOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { user: req.user._id };
        if (req.query.status) filter.status = req.query.status;

        // Use aggregation to avoid N+1 population queries
        const aggregatePipeline = [
            { $match: filter },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userDetails' } },
            { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
            { $project: { user: { _id: '$userDetails._id', firstName: '$userDetails.firstName', lastName: '$userDetails.lastName', email: '$userDetails.email', phone: '$userDetails.phone' }, items: 1, itemsTotal: 1, deliveryFee: 1, tax:1, discount:1, totalPrice:1, status:1, createdAt:1 } }
        ];

        const [orders, total] = await Promise.all([
            Order.aggregate(aggregatePipeline),
            Order.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: orders.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            orders,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private (owner / admin / merchant involved)
 * @fix     Handle null user/merchant references gracefully
 */
export const getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'firstName lastName email phone')
            .populate('items.product', 'name images slug')
            .populate('items.merchant', 'businessName');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        // Check authorization
        // Handle null user reference gracefully
        const userId = order.user?._id || order.user;
        const isOwner = userId && userId.toString() === req.user._id.toString();
        const isAdminLikeUser = isAdminLike(req.user.role);

        let callerMerchant = null;
        let isMerchantOwner = false;
        if (req.user.role === 'merchant') {
            callerMerchant = await findCallerMerchant(req.user._id);
            // Handle null merchant references in items
            isMerchantOwner = !!callerMerchant && merchantOwnsOrder(order, callerMerchant._id);
        }

        if (!isOwner && !isAdminLikeUser && !isMerchantOwner) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order',
            });
        }

        // Merchants see only their own items + fulfilment customer info
        if (isMerchantOwner && !isAdminLikeUser && !isOwner) {
            return res.status(200).json({
                success: true,
                order: toMerchantOrderView(order.toObject(), callerMerchant._id),
            });
        }

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Merchant / Admin
 * @fix     Validates state transitions prevent invalid status changes
 */
export const updateOrderStatus = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { status, note } = req.body;

        const order = await Order.findById(req.params.id).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        // Idempotent: duplicate request for the current status is a no-op success
        // (safe against retries; no duplicate timeline/stock/accounting effects).
        if (order.status === status) {
            await session.abortTransaction();
            return res.status(200).json({
                success: true,
                message: `Order is already '${status}'`,
                order,
            });
        }

        const role = req.user.role;

        // ── Ownership + actor authorization (verified on EVERY mutation) ──
        if (role === 'merchant') {
            const merchant = await findCallerMerchant(req.user._id, session);
            if (!merchant || !merchantOwnsOrder(order, merchant._id)) {
                await session.abortTransaction();
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this order — you do not own any item in it',
                });
            }
            if (!isTransitionAllowedForActor(order.status, status, 'merchant')) {
                await session.abortTransaction();
                return res.status(403).json({
                    success: false,
                    message: `Role 'merchant' cannot transition order from '${order.status}' to '${status}'. Allowed: ${allowedTargets(order.status).join(', ') || 'none'}`,
                });
            }
        } else if (isAdminLike(role)) {
            if (!isTransitionAllowedForActor(order.status, status, role)) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Cannot transition order status from '${order.status}' to '${status}'. Valid transitions are: ${VALID_TRANSITIONS[order.status]?.join(', ') || 'none'}`,
                });
            }
        } else {
            // Consumers must use PUT /:id/cancel and PUT /:id/return.
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                message: 'Consumers cannot update order status directly. Use cancel / return endpoints.',
            });
        }

        // Graph-level guard (defence in depth — actor check above already passed)
        if (!validateStatusTransition(order.status, status)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot transition order status from '${order.status}' to '${status}'. Valid transitions are: ${VALID_TRANSITIONS[order.status]?.join(', ') || 'none'}`,
            });
        }

        // ── Apply transition + transactional side effects ──
        const previousStatus = order.status;
        order.status = status;
        pushTimeline(order, status, note, req.user._id);

        if (status === 'delivered') {
            order.deliveredAt = new Date();
        }

        if (status === 'shipped') {
            if (req.body.trackingNumber) order.trackingNumber = req.body.trackingNumber;
            if (req.body.deliveryPartner) order.deliveryPartner = req.body.deliveryPartner;
            if (req.body.estimatedDelivery) order.estimatedDelivery = req.body.estimatedDelivery;
        }

        if (status === 'cancelled') {
            order.cancelReason = req.body.cancelReason || note || 'Cancelled';
            order.cancelledAt = new Date();
            order.cancelledBy = req.user._id;
            await reverseFulfilmentSideEffects(order, session, { reverseOrdersCount: true });
        }

        if (status === 'returned') {
            order.returnReason = req.body.returnReason || note || 'Returned';
            order.returnedAt = new Date();
            // Returned items go back to inventory; merchant revenue is reversed
            // (order count is kept as history). See PO-input notes.
            await reverseFulfilmentSideEffects(order, session, { reverseOrdersCount: false });
        }

        if (status === 'refunded') {
            order.paymentStatus = 'refunded';
            order.refundAmount = req.body.refundAmount ?? order.totalPrice;
            order.refundedAt = new Date();
            // Refunded money is not earned revenue. Cancel/return paths already
            // reversed revenue; only reverse here when coming from a state
            // that still counts revenue (delivered / return_requested).
            if (!REVENUE_ALREADY_REVERSED.includes(previousStatus)) {
                await reverseRevenueOnly(order, session);
            }
        }

        await order.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: `Order status updated to '${status}'`,
            order,
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Cancel an order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private (owner only, before shipping)
 * @fix     Decrements merchant metrics when order is cancelled
 */
export const cancelOrder = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findById(req.params.id).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        // Only the owning consumer or admin/superadmin can cancel
        // (merchants cannot cancel — fulfilment moves forward only).
        const isOwner = order.user.toString() === req.user._id.toString();
        if (!isOwner && !isAdminLike(req.user.role)) {
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this order',
            });
        }
        if (req.user.role === 'merchant') {
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                message: 'Merchants cannot cancel orders',
            });
        }

        // Idempotent: already-cancelled is a success no-op (duplicate-request safe)
        if (order.status === 'cancelled') {
            await session.abortTransaction();
            return res.status(200).json({
                success: true,
                message: 'Order is already cancelled',
                order,
            });
        }

        // Can only cancel if pending or confirmed
        if (!['pending', 'confirmed'].includes(order.status)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot cancel an order with status '${order.status}'`,
            });
        }

        order.status = 'cancelled';
        order.cancelReason = req.body.cancelReason || 'Cancelled by user';
        order.cancelledAt = new Date();
        order.cancelledBy = req.user._id;
        pushTimeline(order, 'cancelled', order.cancelReason, req.user._id);

        // Restore stock + reverse merchant accounting (transactional).
        await reverseFulfilmentSideEffects(order, session, { reverseOrdersCount: true });

        await order.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            order,
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Get orders for a merchant
 * @route   GET /api/orders/merchant
 * @access  Merchant
 */
export const getMerchantOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Admins without a merchant profile see the full order list.
        if (isAdminLike(req.user.role)) {
            const callerMerchant = await findCallerMerchant(req.user._id);
            if (!callerMerchant) {
                const filter = {};
                if (req.query.status) filter.status = req.query.status;
                const [orders, total] = await Promise.all([
                    Order.find(filter)
                        .sort({ createdAt: -1 })
                        .skip(skip)
                        .limit(limit)
                        .populate('user', 'firstName lastName email phone')
                        .populate('items.product', 'name images slug')
                        .populate('items.merchant', 'businessName'),
                    Order.countDocuments(filter),
                ]);
                return res.status(200).json({
                    success: true,
                    count: orders.length,
                    total,
                    totalPages: Math.ceil(total / limit),
                    currentPage: page,
                    orders,
                });
            }
        }

        const merchant = await findCallerMerchant(req.user._id);

        if (!merchant) {
            return res.status(403).json({
                success: false,
                message: 'Merchant profile not found',
            });
        }

        const filter = { 'items.merchant': merchant._id };
        if (req.query.status) filter.status = req.query.status;

        // Aggregate to include user details without N+1 queries.
        // NOTE: email is intentionally excluded — merchants receive only the
        // customer fields needed for fulfilment. Items are scoped to the
        // caller's own items below.
        const pipeline = [
            { $match: filter },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userDetails' } },
            { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
            { $project: { orderNumber: 1, user: { _id: '$userDetails._id', firstName: '$userDetails.firstName', lastName: '$userDetails.lastName', phone: '$userDetails.phone' }, shippingAddress: 1, items:1, itemsTotal:1, totalPrice:1, status:1, trackingNumber: 1, createdAt:1 } }
        ];

        const [orders, total] = await Promise.all([
            Order.aggregate(pipeline),
            Order.countDocuments(filter),
        ]);

        // Restrict each order to the caller's own items (+ scoped subtotal).
        const scoped = orders.map((o) => toMerchantOrderView(o, merchant._id));

        res.status(200).json({
            success: true,
            count: scoped.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            orders: scoped,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Request a return (consumer owner of a delivered order)
 * @route   PUT /api/orders/:id/return
 * @access  Private (owner / admin / superadmin)
 */
export const requestReturn = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findById(req.params.id).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const isOwner = order.user.toString() === req.user._id.toString();
        if (!isOwner && !isAdminLike(req.user.role)) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Not authorized to return this order' });
        }

        // Idempotent: duplicate return requests are a success no-op.
        if (order.status === 'return_requested') {
            await session.abortTransaction();
            return res.status(200).json({ success: true, message: 'Return already requested', order });
        }

        if (!isTransitionAllowedForActor(order.status, 'return_requested', isAdminLike(req.user.role) ? req.user.role : 'consumer')) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot request a return for an order with status '${order.status}'. Returns are allowed only for delivered orders.`,
            });
        }

        order.status = 'return_requested';
        order.returnReason = req.body.returnReason || req.body.reason || 'Return requested';
        pushTimeline(order, 'return_requested', order.returnReason, req.user._id);

        await order.save({ session });
        await session.commitTransaction();

        res.status(200).json({ success: true, message: 'Return requested', order });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Process a refund (admin / superadmin only)
 * @route   PUT /api/orders/:id/refund
 * @access  Admin
 */
export const processRefund = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findById(req.params.id).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Idempotent: already-refunded is a success no-op (duplicate-request safe,
        // no double accounting since revenue was already reversed on cancel/return).
        if (order.status === 'refunded') {
            await session.abortTransaction();
            return res.status(200).json({ success: true, message: 'Order is already refunded', order });
        }

        if (!isTransitionAllowedForActor(order.status, 'refunded', req.user.role)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot refund an order with status '${order.status}'. Refunds are allowed from 'cancelled', 'returned', 'return_requested' or (exceptionally) 'delivered'.`,
            });
        }

        const previousStatus = order.status;
        order.status = 'refunded';
        order.paymentStatus = 'refunded';
        order.refundAmount = req.body.refundAmount ?? order.totalPrice;
        order.refundedAt = new Date();
        pushTimeline(order, 'refunded', req.body.note || `Refunded ${order.refundAmount} ETB`, req.user._id);
        // Refunded money is not earned revenue. Cancel/return paths already
        // reversed revenue; only reverse here when coming from a state that
        // still counts revenue (delivered / return_requested).
        if (!REVENUE_ALREADY_REVERSED.includes(previousStatus)) {
            await reverseRevenueOnly(order, session);
        }

        await order.save({ session });
        await session.commitTransaction();

        res.status(200).json({ success: true, message: 'Order refunded', order });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};
