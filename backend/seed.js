import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Merchant from './models/Merchant.js';
import Product from './models/Product.js';

const seedData = async () => {
    try {
        console.log('🌱 Connecting to DB...');
        await connectDB();
        console.log('🌱 DB Connected. Wiping existing data...');

        // Wipe existing data to prevent duplicates when running multiple times
        await User.deleteMany({ email: { $regex: '@demo.com' } });
        console.log('🌱 Users deleted');
        await Merchant.deleteMany({});
        console.log('🌱 Merchants deleted');
        await Product.deleteMany({});
        console.log('🌱 Products deleted');

        const categories = ['meat', 'poultry', 'spices', 'grains', 'honey', 'clothing', 'bakery', 'grocery'];
        const cities = ['Addis Ababa', 'Harar', 'Dire Dawa', 'Mekelle', 'Bahir Dar', 'Hawassa', 'Jimma'];
        const cityToRegion = {
            'Addis Ababa': 'Addis Ababa',
            'Harar': 'Harari',
            'Dire Dawa': 'Dire Dawa',
            'Mekelle': 'Tigray',
            'Bahir Dar': 'Amhara',
            'Hawassa': 'Sidama',
            'Jimma': 'Oromia',
        };
        const types = ['butcher', 'spice_shop', 'grocery', 'clothing', 'bakery', 'restaurant'];

        // Images collections from Unsplash mapping to categories
        const categoryImages = {
            meat: ['https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=400&q=80', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80', 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&q=80'],
            poultry: ['https://images.unsplash.com/photo-1626200926732-4752ff9fbaf5?w=400&q=80', 'https://images.unsplash.com/photo-1598514982205-f36b96d1ea8d?w=400&q=80', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80'],
            spices: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80', 'https://images.unsplash.com/photo-1559131397-d9611624c9e3?w=400&q=80', 'https://images.unsplash.com/photo-1621236378699-8597faf6a176?w=400&q=80'],
            grains: ['https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=400&q=80', 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=400&q=80', 'https://images.unsplash.com/photo-1593414220166-085ba36203cf?w=400&q=80'],
            honey: ['https://images.unsplash.com/photo-1587049352847-8d4c0b490f89?w=400&q=80', 'https://images.unsplash.com/photo-1587049352851-8d4c0b490f89?w=400&q=80'],
            clothing: ['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80'],
            bakery: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&q=80', 'https://images.unsplash.com/photo-1509365465994-3e8c58852115?w=400&q=80'],
            grocery: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&q=80']
        };
        const featuredEthiopianProducts = [
            {
                name: 'Berbere Spice Mix',
                nameAmharic: 'በርበሬ',
                description: 'Traditional Ethiopian berbere blend made from premium chili, garlic, and aromatic spices. Perfect for wot, tibs, and marinades.',
                imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80',
                price: 320,
                category: 'spices',
            },
            {
                name: 'Mitmita Hot Spice',
                nameAmharic: 'ሚጥሚጣ',
                description: 'Authentic mitmita with intense heat and deep flavor, ideal for kitfo, tibs, and Ethiopian dishes.',
                imageUrl: 'https://images.unsplash.com/photo-1559131397-d9611624c9e3?w=800&q=80',
                price: 280,
                category: 'spices',
            },
            {
                name: 'Shiro Powder',
                nameAmharic: 'ሽሮ',
                description: 'Finely milled roasted chickpea and spice blend for classic Ethiopian shiro wot.',
                imageUrl: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e3?w=800&q=80',
                price: 260,
                category: 'grains',
            },
            {
                name: 'Niter Kibbeh',
                nameAmharic: 'ንጥር ቅቤ',
                description: 'Traditional Ethiopian spiced clarified butter with rich aroma for authentic cooking.',
                imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&q=80',
                price: 450,
                category: 'oils',
            },
            {
                name: 'Teff Flour',
                nameAmharic: 'ጤፍ ዱቄት',
                description: 'Premium Ethiopian teff flour, ideal for injera and healthy gluten-free baking.',
                imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
                price: 380,
                category: 'grains',
            },
            {
                name: 'Buna Coffee Beans',
                nameAmharic: 'ቡና',
                description: 'Fresh Ethiopian coffee beans with bold aroma and balanced flavor, perfect for buna ceremony.',
                imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
                price: 520,
                category: 'beverages',
            },
        ];

        const adjectives = ['Premium', 'Authentic', 'Fresh', 'Organic', 'Royal', 'Crown', 'Golden', 'Elite', 'Prime', 'Green', 'Pure', 'Sunrise', 'Pioneer', 'Highland', 'Savannah'];
        const nouns = ['Foods', 'Market', 'Bazaar', 'Spices', 'Harvest', 'Oasis', 'Farms', 'Traders', 'Boutique', 'Organics', 'Meats', 'Valley', 'Goods'];

        console.log('Generating 30 Merchants...');
        const createdUsers = [];
        const createdMerchants = [];

        for (let i = 1; i <= 30; i++) {
            // Create user
            const user = await User.create({
                firstName: `Merchant${i}`,
                lastName: `Demo`,
                email: `merchant${i}@demo.com`,
                password: 'Demo1234!',
                phone: `+251911${String(i).padStart(6, '0')}`,
                role: 'merchant'
            });
            createdUsers.push(user);

            // Create merchant
            const city = cities[i % cities.length];
            const type = types[i % types.length];
            const name = `${adjectives[i % adjectives.length]} ${nouns[(i * 2) % nouns.length]} ${city}`;

            const merchant = await Merchant.create({
                user: user._id,
                businessName: name,
                businessNameAmharic: `የ${name} የንግድ ድርጅት`,
                description: `Discover the best quality products from ${name}. We are committed to providing top-tier, halal-certified goods directly to your doorstep in ${city}. Trusted by thousands of happy customers.`,
                businessType: type,
                businessPhone: `+251911${String(i).padStart(6, '0')}`,
                businessEmail: `contact@merchant${i}.com`,
                businessAddress: { street: `Main Ave ${i}`, city: city, region: cityToRegion[city] || 'Addis Ababa' },
                verificationStatus: 'approved',
                verifiedAt: new Date(),
                ratingsAverage: parseFloat((Math.random() * (5 - 4) + 4).toFixed(1)), // 4.0 to 5.0
                ratingsCount: Math.floor(Math.random() * 500) + 10,
                totalProducts: Math.floor(Math.random() * 20) + 5,
                totalOrders: Math.floor(Math.random() * 5000) + 100,
                isFeatured: i <= 8,
                isActive: true,
                logo: { url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200` },
                socialMedia: { telegram: `t.me/merchant${i}`, instagram: `@merchant${i}` }
            });
            createdMerchants.push(merchant);

            // Generate Products for this merchant
            const numProducts = Math.floor(Math.random() * 4) + 3; // 3 to 6 products
            for (let p = 0; p < numProducts; p++) {
                const category = categories[(i + p) % categories.length];
                const bgImagePool = categoryImages[category] || categoryImages.grocery;
                const imageUrl = bgImagePool[p % bgImagePool.length];

                const basePrice = Math.floor(Math.random() * 1500) + 100;

                await Product.create({
                    merchant: merchant._id,
                    name: `${adjectives[(i + p) % adjectives.length]} ${category.charAt(0).toUpperCase() + category.slice(1)} Item ${p + 1}`,
                    nameAmharic: `ምርጥ የ${category} ቁሳቁስ`,
                    description: `Experience the finest authentic ${category} sourced carefully for optimal quality and freshness. Fully compliant with halal standards and verified by the Majlis.`,
                    price: basePrice,
                    discountPrice: Math.random() > 0.5 ? Math.floor(basePrice * 0.8) : null,
                    category: category,
                    stock: Math.floor(Math.random() * 200) + 10,
                    halalCertified: true,
                    isFeatured: Math.random() > 0.7,
                    isApproved: true,
                    images: [{ url: imageUrl, isDefault: true }],
                    ratingsAverage: parseFloat((Math.random() * (5 - 4) + 4).toFixed(1)),
                    ratingsCount: Math.floor(Math.random() * 300) + 5
                });
            }
        }

        // Add a few recognizable Ethiopian spice products
        if (createdMerchants.length > 0) {
            const featuredMerchant = createdMerchants[0];
            for (const item of featuredEthiopianProducts) {
                await Product.create({
                    merchant: featuredMerchant._id,
                    name: item.name,
                    nameAmharic: item.nameAmharic,
                    description: item.description,
                    price: item.price,
                    category: item.category,
                    stock: Math.floor(Math.random() * 150) + 30,
                    halalCertified: true,
                    isFeatured: true,
                    isApproved: true,
                    images: [{ url: item.imageUrl, isDefault: true }],
                    ratingsAverage: parseFloat((Math.random() * (5 - 4.2) + 4.2).toFixed(1)),
                    ratingsCount: Math.floor(Math.random() * 250) + 20,
                });
            }
        }

        console.log(`\n🎉 Seed completed! 30 Merchants and over 100 products created with real images.\n`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`  Field "${key}": ${error.errors[key].message}`);
            });
        }
        console.error(error.stack);
        process.exit(1);
    }
};

seedData();
