import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Merchant from './models/Merchant.js';
import Product from './models/Product.js';

const seedData = async () => {
    try {
        await connectDB();
        console.log('🌱 Starting seed...\n');

        // ── Create Demo Users ──────────────────────────────
        const demoUsers = [
            { firstName: 'Ahmed', lastName: 'Mohammed', email: 'ahmed@demo.com', password: 'Demo1234!', phone: '+251911223344', role: 'merchant' },
            { firstName: 'Fatima', lastName: 'Hassan', email: 'fatima@demo.com', password: 'Demo1234!', phone: '+251922334455', role: 'merchant' },
            { firstName: 'Ibrahim', lastName: 'Ali', email: 'ibrahim@demo.com', password: 'Demo1234!', phone: '+251933445566', role: 'merchant' },
            { firstName: 'Amina', lastName: 'Omar', email: 'amina@demo.com', password: 'Demo1234!', phone: '+251944556677', role: 'merchant' },
            { firstName: 'Yusuf', lastName: 'Abdullahi', email: 'yusuf@demo.com', password: 'Demo1234!', phone: '+251955667788', role: 'merchant' },
            { firstName: 'Khadija', lastName: 'Abdi', email: 'khadija@demo.com', password: 'Demo1234!', phone: '+251966778899', role: 'merchant' },
        ];

        const createdUsers = [];
        for (const userData of demoUsers) {
            let user = await User.findOne({ email: userData.email });
            if (!user) {
                user = await User.create(userData);
                console.log(`  ✅ Created user: ${user.firstName} ${user.lastName}`);
            } else {
                console.log(`  ⏭️  User exists: ${user.firstName} ${user.lastName}`);
            }
            createdUsers.push(user);
        }

        // ── Create Demo Merchants ──────────────────────────
        const demoMerchants = [
            {
                user: createdUsers[0]._id,
                businessName: 'Addis Halal Meats',
                businessNameAmharic: 'አዲስ ሐላል ስጋ',
                description: 'Premium halal-certified meat & poultry sourced from trusted Ethiopian farms. We deliver fresh, hand-slaughtered, Majlis-verified cuts across Addis Ababa daily.',
                businessType: 'butcher',
                businessPhone: '+251911223344',
                businessEmail: 'contact@addishalalmeats.com',
                businessAddress: { street: 'Merkato Area, Block 5', subcity: 'Addis Ketema', city: 'Addis Ababa', region: 'Addis Ababa' },
                verificationStatus: 'approved',
                verifiedAt: new Date(),
                ratingsAverage: 4.8,
                ratingsCount: 245,
                totalProducts: 12,
                totalOrders: 1580,
                isFeatured: true,
                isActive: true,
                socialMedia: { telegram: 't.me/addishalalmeats', instagram: '@addishalalmeats' },
            },
            {
                user: createdUsers[1]._id,
                businessName: 'Harar Spice Market',
                businessNameAmharic: 'ሐረር ቅመም ገበያ',
                description: 'Authentic Ethiopian spice blends passed down through generations. We offer Berbere, Mitmita, Shiro, and specialty blends — all sourced from Harar\'s finest farms.',
                businessType: 'spice_shop',
                businessPhone: '+251922334455',
                businessEmail: 'info@hararspices.com',
                businessAddress: { street: 'Harar City, Jugol', city: 'Harar', region: 'Harari' },
                verificationStatus: 'approved',
                verifiedAt: new Date(),
                ratingsAverage: 4.9,
                ratingsCount: 512,
                totalProducts: 28,
                totalOrders: 3200,
                isFeatured: true,
                isActive: true,
                socialMedia: { telegram: 't.me/hararspice', facebook: 'hararspicemarket' },
            },
            {
                user: createdUsers[2]._id,
                businessName: 'Oromia Grains & Teff',
                businessNameAmharic: 'ኦሮሚያ ጤፍና ሰብል',
                description: 'Direct from Oromia\'s fertile highlands — premium organic teff, wheat, barley, and grain products. Halal-certified, farm-to-table quality.',
                businessType: 'grocery',
                businessPhone: '+251933445566',
                businessEmail: 'sales@oromiagrains.com',
                businessAddress: { street: 'Bole Road, Building 12', subcity: 'Bole', city: 'Addis Ababa', region: 'Addis Ababa' },
                verificationStatus: 'approved',
                verifiedAt: new Date(),
                ratingsAverage: 4.7,
                ratingsCount: 189,
                totalProducts: 15,
                totalOrders: 2100,
                isFeatured: true,
                isActive: true,
                socialMedia: { telegram: 't.me/oromiagrains', tiktok: '@oromiagrains' },
            },
            {
                user: createdUsers[3]._id,
                businessName: 'Tigray Honey Farm',
                businessNameAmharic: 'ትግራይ ማር ፋርም',
                description: 'Pure, raw wildflower honey and beeswax products from the highlands of Tigray. Our honey is unprocessed, halal-certified, and sustainably harvested.',
                businessType: 'grocery',
                businessPhone: '+251944556677',
                businessEmail: 'hello@tigrayhoney.com',
                businessAddress: { street: 'Mekelle, Zone 3', city: 'Mekelle', region: 'Tigray' },
                verificationStatus: 'approved',
                verifiedAt: new Date(),
                ratingsAverage: 4.9,
                ratingsCount: 378,
                totalProducts: 8,
                totalOrders: 1850,
                isFeatured: true,
                isActive: true,
            },
            {
                user: createdUsers[4]._id,
                businessName: 'Halal Fashion House',
                businessNameAmharic: 'ሐላል ፋሽን ሃውስ',
                description: 'Modest, elegant fashion for Muslim men and women. We carry traditional Ethiopian clothing, hijabs, thobes, and modern Islamic fashion from premium fabrics.',
                businessType: 'clothing',
                businessPhone: '+251955667788',
                businessEmail: 'info@halalfashion.et',
                businessAddress: { street: 'Piassa Area', subcity: 'Arada', city: 'Addis Ababa', region: 'Addis Ababa' },
                verificationStatus: 'approved',
                verifiedAt: new Date(),
                ratingsAverage: 4.6,
                ratingsCount: 98,
                totalProducts: 45,
                totalOrders: 920,
                isFeatured: true,
                isActive: true,
                socialMedia: { instagram: '@halalfashionhouse', facebook: 'halalfashionET' },
            },
            {
                user: createdUsers[5]._id,
                businessName: 'Dire Dawa Bakery',
                businessNameAmharic: 'ድሬ ዳዋ ዳቦ',
                description: 'Artisanal halal bakery specializing in Ethiopian breads, pastries, and confections. Fresh-baked daily using traditional recipes and halal ingredients.',
                businessType: 'bakery',
                businessPhone: '+251966778899',
                businessEmail: 'order@diredawabakery.com',
                businessAddress: { street: 'Dire Dawa City, Kezira', city: 'Dire Dawa', region: 'Dire Dawa' },
                verificationStatus: 'approved',
                verifiedAt: new Date(),
                ratingsAverage: 4.5,
                ratingsCount: 156,
                totalProducts: 20,
                totalOrders: 1100,
                isFeatured: true,
                isActive: true,
                socialMedia: { telegram: 't.me/diredawabakery' },
            },
        ];

        const createdMerchants = [];
        for (const merchantData of demoMerchants) {
            let merchant = await Merchant.findOne({ user: merchantData.user });
            if (!merchant) {
                merchant = await Merchant.create(merchantData);
                console.log(`  ✅ Created merchant: ${merchant.businessName}`);
            } else {
                console.log(`  ⏭️  Merchant exists: ${merchant.businessName}`);
            }
            createdMerchants.push(merchant);
        }

        // ── Create Demo Products ──────────────────────────
        const demoProducts = [
            // Addis Halal Meats products
            { merchant: createdMerchants[0]._id, name: 'Premium Halal Beef', nameAmharic: 'ፕሪሚየም ሐላል ስጋ', description: 'Hand-slaughtered, premium Ethiopian beef from free-range cattle. Majlis verified.', price: 850, discountPrice: 720, category: 'meat', stock: 50, halalCertified: true, isFeatured: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/dc2626/fff?text=Halal+Beef', isDefault: true }], ratingsAverage: 4.8, ratingsCount: 124 },
            { merchant: createdMerchants[0]._id, name: 'Halal Chicken Wings', nameAmharic: 'ሐላል የዶሮ ክንፍ', description: 'Fresh halal-certified chicken wings, perfect for family meals.', price: 350, category: 'poultry', stock: 80, halalCertified: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/ef4444/fff?text=Chicken+Wings', isDefault: true }], ratingsAverage: 4.5, ratingsCount: 67 },
            { merchant: createdMerchants[0]._id, name: 'Premium Lamb Cuts', nameAmharic: 'ፕሪሚየም የበግ ስጋ', description: 'Tender lamb cuts from Ethiopian highlands, halal slaughtered.', price: 950, discountPrice: 820, category: 'meat', stock: 30, halalCertified: true, isFeatured: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/b91c1c/fff?text=Lamb', isDefault: true }], ratingsAverage: 4.7, ratingsCount: 89 },

            // Harar Spice products
            { merchant: createdMerchants[1]._id, name: 'Ethiopian Berbere Spice', nameAmharic: 'በርበሬ ቅመም', description: 'Classic Harar-style berbere spice blend with 16 traditional ingredients.', price: 180, category: 'spices', stock: 200, halalCertified: true, isFeatured: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/d97706/fff?text=Berbere', isDefault: true }], ratingsAverage: 4.9, ratingsCount: 256 },
            { merchant: createdMerchants[1]._id, name: 'Mitmita Spice Blend', nameAmharic: 'ሚጥሚጣ', description: 'Hot & aromatic mitmita pepper blend, perfect for kitfo and raw meat dishes.', price: 120, category: 'spices', stock: 150, halalCertified: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/ea580c/fff?text=Mitmita', isDefault: true }], ratingsAverage: 4.8, ratingsCount: 156 },
            { merchant: createdMerchants[1]._id, name: 'Shiro Powder', nameAmharic: 'ሽሮ', description: 'Premium ground chickpea-based shiro powder with spices.', price: 95, category: 'spices', stock: 300, halalCertified: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/c2410c/fff?text=Shiro', isDefault: true }], ratingsAverage: 4.7, ratingsCount: 203 },

            // Oromia Grains products
            { merchant: createdMerchants[2]._id, name: 'Organic Teff Grain', nameAmharic: 'ኦርጋኒክ ጤፍ', description: 'Premium organic teff grain from Oromia highlands, perfect for injera.', price: 280, category: 'grains', stock: 100, halalCertified: true, isFeatured: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/065f2d/fff?text=Teff', isDefault: true }], ratingsAverage: 4.6, ratingsCount: 92 },
            { merchant: createdMerchants[2]._id, name: 'Natural Teff Flour', nameAmharic: 'ተፈጥሮአዊ ጤፍ ዱቄት', description: 'Stone-ground teff flour for authentic Ethiopian injera.', price: 320, category: 'grains', stock: 80, halalCertified: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/16a34a/fff?text=Teff+Flour', isDefault: true }], ratingsAverage: 4.7, ratingsCount: 89 },

            // Tigray Honey products
            { merchant: createdMerchants[3]._id, name: 'Raw Wildflower Honey', nameAmharic: 'ንጹህ ማር', description: 'Pure, unprocessed wildflower honey from Tigray\'s highland bees.', price: 520, discountPrice: 440, category: 'honey', stock: 60, halalCertified: true, isFeatured: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/ca8a04/fff?text=Honey', isDefault: true }], ratingsAverage: 4.9, ratingsCount: 178 },
            { merchant: createdMerchants[3]._id, name: 'White Honey Premium', nameAmharic: 'ነጭ ማር', description: 'Rare Ethiopian white honey from the Tigray highlands, known for its delicate flavor.', price: 780, category: 'honey', stock: 25, halalCertified: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/eab308/fff?text=White+Honey', isDefault: true }], ratingsAverage: 4.9, ratingsCount: 45 },

            // Halal Fashion products
            { merchant: createdMerchants[4]._id, name: 'Modest Hijab Collection', nameAmharic: 'ሂጃብ ስብስብ', description: 'Elegant, breathable hijabs in a variety of colors and patterns.', price: 350, category: 'clothing', stock: 120, halalCertified: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/7c3aed/fff?text=Hijab', isDefault: true }], ratingsAverage: 4.6, ratingsCount: 78 },
            { merchant: createdMerchants[4]._id, name: 'Ethiopian Habesha Kemis', nameAmharic: 'ሐበሻ ቀሚስ', description: 'Traditional Ethiopian dress with modern Islamic modest design.', price: 2500, discountPrice: 2100, category: 'clothing', stock: 15, halalCertified: true, isFeatured: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/8b5cf6/fff?text=Kemis', isDefault: true }], ratingsAverage: 4.8, ratingsCount: 34 },

            // Dire Dawa Bakery products
            { merchant: createdMerchants[5]._id, name: 'Artisan Injera Pack', nameAmharic: 'እንጀራ ፓኬት', description: 'Pack of 10 fresh, fluffy injera made from 100% teff flour.', price: 150, category: 'bakery', stock: 200, halalCertified: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/92400e/fff?text=Injera', isDefault: true }], ratingsAverage: 4.4, ratingsCount: 112 },
            { merchant: createdMerchants[5]._id, name: 'Himbasha Sweet Bread', nameAmharic: 'ህምባሻ', description: 'Traditional Ethiopian sweet bread, perfect for celebrations.', price: 120, category: 'bakery', stock: 100, halalCertified: true, isFeatured: true, isApproved: true, images: [{ url: 'https://placehold.co/400x400/a16207/fff?text=Himbasha', isDefault: true }], ratingsAverage: 4.7, ratingsCount: 67 },
        ];

        for (const productData of demoProducts) {
            const existing = await Product.findOne({ name: productData.name, merchant: productData.merchant });
            if (!existing) {
                await Product.create(productData);
                console.log(`  ✅ Created product: ${productData.name}`);
            } else {
                console.log(`  ⏭️  Product exists: ${productData.name}`);
            }
        }

        console.log('\n🎉 Seed completed successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    }
};

seedData();
