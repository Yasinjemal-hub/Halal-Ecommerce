import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Merchant from '../models/Merchant.js';
import mongoose from 'mongoose';

// ── Valid order status transitions ──────────────────────
const VALID_TRANSITIONS = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'returned'],
    'delivered': ['returned'],
    'cancelled': [],
    'returned': [],
};

/**
 * Validate order status transition
 * Prevents invalid state changes like: delivered -> pending
 */
const validateStatusTransition = (currentStatus, newStatus) => {
    if (currentStatus === newStatus) return true;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
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
        const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const merchant = await Merchant.findOne({ user: req.user._id });
        
        // Handle null merchant references in items
        const isMerchant = merchant && order.items.some(
            (item) => item.merchant && item.merchant.toString() === merchant._id.toString()
        );

        if (!isOwner && !isAdmin && !isMerchant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order',
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
    try {
        const { status, note } = req.body;

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        // VALIDATE status transition (prevent: delivered -> pending, etc.)
        if (!validateStatusTransition(order.status, status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot transition order status from '${order.status}' to '${status}'. Valid transitions are: ${VALID_TRANSITIONS[order.status]?.join(', ') || 'none'}`,
            });
        }

        // Update status
        order.status = status;

        // Add timeline event
        order.timeline.push({
            status,
            note: note || `Status updated to ${status}`,
            timestamp: new Date(),
            updatedBy: req.user._id,
        });

        // Handle specific status transitions
        if (status === 'delivered') {
            order.deliveredAt = new Date();
        }

        if (status === 'shipped' && req.body.trackingNumber) {
            order.trackingNumber = req.body.trackingNumber;
            order.deliveryPartner = req.body.deliveryPartner;
            order.estimatedDelivery = req.body.estimatedDelivery;
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: `Order status updated to '${status}'`,
            order,
        });
    } catch (error) {
        next(error);
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

        // Only owner or admin can cancel
        if (
            order.user.toString() !== req.user._id.toString() &&
            req.user.role !== 'admin'
        ) {
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this order',
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
        order.timeline.push({
            status: 'cancelled',
            note: order.cancelReason,
            timestamp: new Date(),
            updatedBy: req.user._id,
        });

        // Restore product stock (atomic)
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } },
                { session }
            );
        }

        // DECREMENT merchant metrics (ATOMIC) - FIX for bug 1.6
        const merchantIds = [...new Set(order.items.map((i) => i.merchant.toString()))];
        for (const merchantId of merchantIds) {
            const merchantItemsTotal = order.items
                .filter((i) => i.merchant.toString() === merchantId)
                .reduce((sum, i) => sum + i.price * i.quantity, 0);

            await Merchant.findByIdAndUpdate(
                merchantId,
                {
                    $inc: { 
                        totalOrders: -1, 
                        totalRevenue: -merchantItemsTotal 
                    },
                },
                { session }
            );
        }

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
        const merchant = await Merchant.findOne({ user: req.user._id });

        if (!merchant) {
            return res.status(403).json({
                success: false,
                message: 'Merchant profile not found',
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { 'items.merchant': merchant._id };
        if (req.query.status) filter.status = req.query.status;

        // Aggregate to include user details without N+1 queries
        const pipeline = [
            { $match: filter },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userDetails' } },
            { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
            { $project: { user: { _id: '$userDetails._id', firstName: '$userDetails.firstName', lastName: '$userDetails.lastName', email: '$userDetails.email', phone: '$userDetails.phone' }, items:1, itemsTotal:1, totalPrice:1, status:1, createdAt:1 } }
        ];

        const [orders, total] = await Promise.all([
            Order.aggregate(pipeline),
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
