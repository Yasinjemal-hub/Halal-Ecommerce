import "dotenv/config";
import mongoose from "mongoose";
import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import requestLogger from "./utils/logger.js";
import errorHandler from "./middleware/errorHandler.js";

// ── Environment Validation ──────────────────────────────
// Require core env vars; MongoDB may be provided via MONGO_ATLAS_URI or MONGO_URI.
const requiredEnvVars = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "NODE_ENV",
  "CLIENT_URL",
];

const missingEnvVars = requiredEnvVars.filter((env) => !process.env[env]);

// Accept either MONGO_ATLAS_URI (preferred) or MONGO_URI
if (!process.env.MONGO_ATLAS_URI && !process.env.MONGO_URI) {
  missingEnvVars.unshift("MONGO_ATLAS_URI or MONGO_URI");
}

if (missingEnvVars.length > 0) {
  console.error("❌ CRITICAL: Missing required environment variables:");
  missingEnvVars.forEach((env) => console.error(`   - ${env}`));
  console.error("\nPlease add these to your .env file");
  process.exit(1);
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error("❌ CRITICAL: JWT_SECRET must be at least 32 characters");
  process.exit(1);
}

if (
  process.env.JWT_REFRESH_SECRET &&
  process.env.JWT_REFRESH_SECRET.length < 32
) {
  console.error(
    "❌ CRITICAL: JWT_REFRESH_SECRET must be at least 32 characters",
  );
  process.exit(1);
}

// ── Route Imports ───────────────────────────────────────
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import merchantRoutes from "./routes/merchantRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import mejilisRoutes from "./routes/mejilisRoutes.js";

// ── Initialize Express ─────────────────────────────────
const app = express();

// ── Security Headers (Helmet) ──────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// ── Rate Limiting ──────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", generalLimiter);

// ── Connect to Database ─────────────────────────────────
connectDB().catch((err) => {
  console.error("❌ CRITICAL: Database connection failed:", err.message);
  console.error("   Ensure MongoDB is running and MONGO_URI is correct");
  process.exit(1);
});

// ── Global Middleware ───────────────────────────────────
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        process.env.NODE_ENV !== "production" &&
        origin &&
        origin.match(/^http:\/\/localhost:\d+$/)
      ) {
        return callback(null, true);
      }

      const extra = (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const allowedOrigins = [process.env.CLIENT_URL, ...extra].filter(Boolean);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(
        `CORS: origin not allowed: ${origin} (allowed: ${allowedOrigins.join(", ")})`,
      );

      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(requestLogger);

// ── Health Check ────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    // Check database connectivity
    await mongoose.connection.db.admin().ping();

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    res.status(200).json({
      success: true,
      message: "Halal E-Commerce API is running",
      timestamp: new Date().toISOString(),
      database: "connected",
      memoryUsage: memPercent.toFixed(2) + "%",
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      message: "Database connection failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Mount Routes ────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/merchants", merchantRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/mejilis", mejilisRoutes);

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

let server;

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log("\n⏹️  Shutdown signal received, closing gracefully...");

  if (server) {
    server.close(async () => {
      console.log("✅ HTTP server closed");

      try {
        await mongoose.connection.close();
        console.log("✅ Database connection closed");
      } catch (err) {
        console.error("❌ Error closing database:", err.message);
      }

      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error("❌ Forced shutdown due to timeout");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  const host = process.env.CLIENT_URL || `http://localhost:${PORT}`;
  console.log(`📍 API Base: ${host.replace(/\/$/, "")}/api`);
  console.log(`🏥 Health:    ${host.replace(/\/$/, "")}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}\n`);
});
export default app;
