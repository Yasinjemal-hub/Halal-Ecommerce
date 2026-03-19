import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1'],
            default: 1,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: true, timestamps: true }
);

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true, // One cart per user
        },
        items: [cartItemSchema],
        currency: {
            type: String,
            default: 'ETB',
        },

        // Auto-expiry for abandoned carts (30 days)
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Indexes ─────────────────────────────────────────────
cartSchema.index({ user: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// ── Virtual: total price ────────────────────────────────
cartSchema.virtual('totalPrice').get(function () {
    return this.items.reduce((total, item) => total + item.price * item.quantity, 0);
});

// ── Virtual: total items ────────────────────────────────
cartSchema.virtual('totalItems').get(function () {
    return this.items.reduce((count, item) => count + item.quantity, 0);
});

// ── Update expiresAt on modification ────────────────────
cartSchema.pre('save', function () {
    if (this.isModified('items')) {
        this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
});

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
