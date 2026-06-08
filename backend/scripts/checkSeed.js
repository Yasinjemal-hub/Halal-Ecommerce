import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Merchant from '../models/Merchant.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

const run = async () => {
  try {
    await connectDB();

    const [userCount, merchantCount, productCount, orderCount] = await Promise.all([
      User.countDocuments(),
      Merchant.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
    ]);

    console.log('DB Summary:');
    console.log(`  Users:    ${userCount}`);
    console.log(`  Merchants:${merchantCount}`);
    console.log(`  Products: ${productCount}`);
    console.log(`  Orders:   ${orderCount}`);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber createdAt user totalPrice status')
      .populate('user', 'firstName lastName email');

    console.log('\nRecent Orders (up to 5):');
    if (!recentOrders.length) {
      console.log('  (none)');
    } else {
      recentOrders.forEach((o) => {
        const userLabel = o.user ? `${o.user.firstName || ''} ${o.user.lastName || ''} <${o.user.email || ''}>`.trim() : 'Unknown';
        console.log(`  - ${o.orderNumber} | ${o.status} | ${o.totalPrice} ETB | ${userLabel} | ${o.createdAt.toISOString()}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Error checking DB:', err);
    process.exit(1);
  }
};

run();
