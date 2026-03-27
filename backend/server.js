import 'dotenv/config';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import requestLogger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';

// ── Route Imports ───────────────────────────────────────
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import merchantRoutes from './routes/merchantRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import mejilisRoutes from './routes/mejilisRoutes.js';

// ── Initialize Express ─────────────────────────────────
const app = express();

// ── Connect to Database ─────────────────────────────────
connectDB();

// ── Global Middleware ───────────────────────────────────
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        // In development, allow any localhost origin
        if (process.env.NODE_ENV !== 'production' && origin.match(/^http:\/\/localhost:\d+$/)) {
            return callback(null, true);
        }
        // In production, check against CLIENT_URL
        const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:3000', 'http://localhost:3001'];
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(requestLogger);

// ── Health Check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Halal E-Commerce API is running',
        timestamp: new Date().toISOString(),
    });
});

// ── Mount Routes ────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/mejilis', mejilisRoutes);

// ── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// ── Global Error Handler ────────────────────────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📍 API Base: http://localhost:${PORT}/api`);
    console.log(`🏥 Health:    http://localhost:${PORT}/api/health\n`);
});

console.log("ENV URI:", process.env.MONGO_URI);
export default app;
