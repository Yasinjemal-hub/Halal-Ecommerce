import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        name: { type: String, required: true },           // Snapshot at order time
        image: { type: String },                           // Snapshot
        price: { type: Number, required: true, min: 0 },   // Unit price at order time
        quantity: { type: Number, required: true, min: 1 },
        merchant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Merchant',
            required: true,
        },
    },
    { _id: false }
);

const timelineEventSchema = new mongoose.Schema(
    {
        status: { type: String, required: true },
        note: { type: String },
        timestamp: { type: Date, default: Date.now },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Order must belong to a user'],
        },
        orderNumber: {
            type: String,
            unique: true,
        },

        // ── Order Items ─────────────────────────────────────
        items: {
            type: [orderItemSchema],
            validate: {
                validator: (val) => val.length > 0,
                message: 'Order must have at least one item',
            },
        },

        // ── Pricing (ETB) ──────────────────────────────────
        itemsTotal: { type: Number, required: true, min: 0 },      // Sum of (price × qty)
        deliveryFee: { type: Number, default: 0, min: 0 },
        tax: { type: Number, default: 0, min: 0 },                  // 15% VAT in Ethiopia
        discount: { type: Number, default: 0, min: 0 },
        totalPrice: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'ETB' },

        // ── Shipping Address ────────────────────────────────
        shippingAddress: {
            fullName: { type: String, required: true, trim: true },
            phone: {
                type: String,
                required: true,
                match: [/^(\+251|0)(9|7)\d{8}$/, 'Please provide a valid Ethiopian phone number'],
            },
            street: { type: String, trim: true },
            subcity: { type: String, trim: true },
            woreda: { type: String, trim: true },
            city: { type: String, trim: true, default: 'Addis Ababa' },
            region: { type: String, trim: true },
            instructions: { type: String, maxlength: 500 },
        },

        // ── Payment ─────────────────────────────────────────
        paymentMethod: {
            type: String,
            required: [true, 'Payment method is required'],
            enum: ['telebirr', 'cbe_birr', 'cash_on_delivery', 'bank_transfer', 'amole'],
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded', 'partial_refund'],
            default: 'pending',
        },
        paymentDetails: {
            transactionId: { type: String },
            paidAt: Date,
            paidAmount: { type: Number },
            receiptUrl: { type: String },
        },

        // ── Order Status ────────────────────────────────────
        status: {
            type: String,
            enum: [
                'pending',
                'confirmed',
                'processing',
                'shipped',
                'out_for_delivery',
                'delivered',
                'cancelled',
                'refunded',
                'return_requested',
                'returned',
            ],
            default: 'pending',
        },

        // ── Delivery ────────────────────────────────────────
        trackingNumber: { type: String, trim: true },
        deliveryPartner: { type: String, trim: true },
        estimatedDelivery: Date,
        deliveredAt: Date,

        // ── Cancellation / Refund ───────────────────────────
        cancelReason: { type: String, maxlength: 500 },
        cancelledAt: Date,
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        refundAmount: { type: Number, min: 0 },
        refundedAt: Date,

        // ── Timeline ────────────────────────────────────────
        timeline: [timelineEventSchema],

        // ── Notes ───────────────────────────────────────────
        customerNote: { type: String, maxlength: 500 },
        adminNote: { type: String, maxlength: 500 },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Indexes ─────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.merchant': 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// ── Auto-generate order number ──────────────────────────
orderSchema.pre('save', async function (next) {
    if (this.isNew && !this.orderNumber) {
        const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.orderNumber = `HE-${datePart}-${randomPart}`;
    }

    // Push initial timeline event
    if (this.isNew) {
        this.timeline.push({
            status: 'pending',
            note: 'Order placed',
            timestamp: new Date(),
        });
    }

    next();
});

// ── Virtual: item count ─────────────────────────────────
orderSchema.virtual('itemCount').get(function () {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
