import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

/**
 * @desc    Get current user's cart
 * @route   GET /api/cart
 * @access  Private
 */
export const getCart = async (req, res, next) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id }).populate(
            'items.product',
            'name images price discountPrice stock isActive merchant'
        );

        if (!cart) {
            // Create empty cart if none exists
            cart = await Cart.create({ user: req.user._id, items: [] });
        }

        res.status(200).json({
            success: true,
            cart,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Add item to cart
 * @route   POST /api/cart
 * @access  Private
 */
export const addToCart = async (req, res, next) => {
    try {
        const { productId, quantity = 1 } = req.body;

        // Validate product
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or is unavailable',
            });
        }

        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} items available in stock`,
            });
        }

        // Get or create cart
        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = new Cart({ user: req.user._id, items: [] });
        }

        // Check if product already in cart
        const existingIndex = cart.items.findIndex(
            (item) => item.product.toString() === productId
        );

        const itemPrice = product.discountPrice || product.price;

        if (existingIndex > -1) {
            // Update quantity
            cart.items[existingIndex].quantity += quantity;
            cart.items[existingIndex].price = itemPrice;
        } else {
            // Add new item
            cart.items.push({
                product: productId,
                quantity,
                price: itemPrice,
            });
        }

        await cart.save();

        // Populate for response
        await cart.populate('items.product', 'name images price discountPrice stock isActive');

        res.status(200).json({
            success: true,
            message: 'Item added to cart',
            cart,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/:itemId
 * @access  Private
 */
export const updateCartItem = async (req, res, next) => {
    try {
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1',
            });
        }

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found',
            });
        }

        const item = cart.items.id(req.params.itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found',
            });
        }

        // Check stock
        const product = await Product.findById(item.product);
        if (product && product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} items available in stock`,
            });
        }

        item.quantity = quantity;
        if (product) {
            item.price = product.discountPrice || product.price;
        }

        await cart.save();
        await cart.populate('items.product', 'name images price discountPrice stock isActive');

        res.status(200).json({
            success: true,
            message: 'Cart item updated',
            cart,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/:itemId
 * @access  Private
 */
export const removeFromCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found',
            });
        }

        cart.items = cart.items.filter(
            (item) => item._id.toString() !== req.params.itemId
        );

        await cart.save();
        await cart.populate('items.product', 'name images price discountPrice stock isActive');

        res.status(200).json({
            success: true,
            message: 'Item removed from cart',
            cart,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/cart
 * @access  Private
 */
export const clearCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found',
            });
        }

        cart.items = [];
        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Cart cleared',
            cart,
        });
    } catch (error) {
        next(error);
    }
};
