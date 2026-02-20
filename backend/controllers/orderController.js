import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Merchant from '../models/Merchant.js';

/**
 * @desc    Create an order (from cart)
 * @route   POST /api/orders
 * @access  Private
 */
export const createOrder = async (req, res, next) => {
    try {
        const { shippingAddress, paymentMethod, customerNote } = req.body;

        // Get user's cart
        const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty',
            });
        }

        // Build order items from cart
        const orderItems = [];
        let itemsTotal = 0;

        for (const cartItem of cart.items) {
            const product = cartItem.product;

            if (!product || !product.isActive) {
                return res.status(400).json({
                    success: false,
                    message: `Product "${cartItem.product?.name || 'Unknown'}" is no longer available`,
                });
            }

            if (product.stock < cartItem.quantity) {
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

        // Create the order
        const order = await Order.create({
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
        });

        // Reduce product stock
        for (const item of orderItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity },
            });
        }

        // Update merchant order counts
        const merchantIds = [...new Set(orderItems.map((i) => i.merchant.toString()))];
        for (const merchantId of merchantIds) {
            const merchantItemsTotal = orderItems
                .filter((i) => i.merchant.toString() === merchantId)
                .reduce((sum, i) => sum + i.price * i.quantity, 0);

            await Merchant.findByIdAndUpdate(merchantId, {
                $inc: { totalOrders: 1, totalRevenue: merchantItemsTotal },
            });
        }

        // Clear the cart
        cart.items = [];
        await cart.save();

        res.status(201).json({
            success: true,
            order,
        });
    } catch (error) {
        next(error);
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

        const [orders, total] = await Promise.all([
            Order.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
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
        const isOwner = order.user._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const merchant = await Merchant.findOne({ user: req.user._id });
        const isMerchant = merchant && order.items.some(
            (item) => item.merchant.toString() === merchant._id.toString()
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
 */
export const cancelOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
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
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this order',
            });
        }

        // Can only cancel if pending or confirmed
        if (!['pending', 'confirmed'].includes(order.status)) {
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

        // Restore product stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity },
            });
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            order,
        });
    } catch (error) {
        next(error);
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

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('user', 'firstName lastName email phone')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
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
