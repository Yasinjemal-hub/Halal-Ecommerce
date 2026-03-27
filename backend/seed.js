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

        const categories = ['meat', 'poultry', 'spices', 'grains', 'honey', 'clothing', 'bakery', 'other', 'perfume', 'snacks'];
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

        const categoryProducts = {
            meat: [
                { name: 'Fresh Beef Tibs Meat', nameAmharic: 'የጥብስ ስጋ', desc: 'Premium quality fresh beef perfectly cut for Ethiopian tibs.', image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=800&q=80', price: 800, category: 'meat' },
                { name: 'Premium Goat Meat (Fiyel)', nameAmharic: 'የፍየል ስጋ', desc: 'Tender fresh goat meat, sourced locally and halal certified.', image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=800&q=80', price: 1200, category: 'meat' },
                { name: 'Minced Beef for Kitfo', nameAmharic: 'የክትፎ ስጋ', desc: 'Lean, finely minced red beef essential for authentic kitfo.', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80', price: 950, category: 'meat' }
            ],
            poultry: [
                { name: 'Fresh Doro (Local Chicken)', nameAmharic: 'የሀበሻ ዶሮ', desc: 'Farm raised local chicken, dressed and ready for doro wot.', image: 'https://images.unsplash.com/photo-1626200926732-4752ff9fbaf5?w=800&q=80', price: 650, category: 'poultry' },
                { name: 'Farm Fresh Eggs', nameAmharic: 'ትኩስ እንቁላል', desc: 'Organic farm-fresh eggs, perfect for cooking and baking.', image: 'https://images.unsplash.com/photo-1598514982205-f36b96d1ea8d?w=800&q=80', price: 200, category: 'poultry' }
            ],
            spices: [
                { name: 'Authentic Berbere Blend', nameAmharic: 'በርበሬ', desc: 'Traditional Ethiopian berbere blend made from premium chili, garlic, and aromatic spices.', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', price: 350, category: 'spices' },
                { name: 'Mitmita Hot Spice', nameAmharic: 'ሚጥሚጣ', desc: 'Authentic mitmita with intense heat, ideal for kitfo and tibs.', image: 'https://images.unsplash.com/photo-1621236378699-8597faf6a176?w=800&q=80', price: 280, category: 'spices' },
                { name: 'Shiro Powder', nameAmharic: 'የሽሮ ዱቄት', desc: 'Finely milled roasted chickpea and spice blend for classic Ethiopian shiro.', image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=800&q=80', price: 250, category: 'spices' }
            ],
            grains: [
                { name: 'Premium White Teff', nameAmharic: 'ነጭ ጤፍ', desc: 'Top quality white teff flour for baking soft, perfect injera.', image: 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=800&q=80', price: 4500, category: 'grains' },
                { name: 'Red Teff', nameAmharic: 'ቀይ ጤፍ', desc: 'Nutrient-rich red teff grain sourced tightly from local highlands.', image: 'https://images.unsplash.com/photo-1593414220166-085ba36203cf?w=800&q=80', price: 4000, category: 'grains' },
                { name: 'Roasted Barley (Kolo)', nameAmharic: 'ቆሎ', desc: 'Freshly roasted barley snack mixed with peanuts and chickpeas.', image: 'https://images.unsplash.com/photo-1628188172900-a54817a00f27?w=800&q=80', price: 150, category: 'grains' }
            ],
            honey: [
                { name: 'Pure Lalibela Honey', nameAmharic: 'የላሊበላ ማር', desc: '100% natural, raw organic honey harvested from the mountains of Lalibela.', image: 'https://images.unsplash.com/photo-1587049352847-8d4c0b490f89?w=800&q=80', price: 800, category: 'honey' },
                { name: 'White Gojjam Honey', nameAmharic: 'የጎጃም ነጭ ማር', desc: 'Premium thick white honey perfectly suited for natural sweetening.', image: 'https://images.unsplash.com/photo-1587049352851-8d4c0b490f89?w=800&q=80', price: 950, category: 'honey' }
            ],
            clothing: [
                { name: 'Traditional Habesha Kemis', nameAmharic: 'የሀበሻ ቀሚስ', desc: 'Beautiful handwoven Ethiopian traditional dress with intricate tilet patterns.', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80', price: 3500, category: 'clothing' },
                { name: 'Elegant Abaya', nameAmharic: 'አባያ', desc: 'High-quality modest elegant abaya with beautiful detailing.', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80', price: 1800, category: 'clothing' },
                { name: 'Men\'s Netela/Gabi', nameAmharic: 'ጋቢ', desc: 'Warm and comforting traditional handwoven cotton blanket/wrap.', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80', price: 1200, category: 'clothing' }
            ],
            bakery: [
                { name: 'Fresh Ambasha Bread', nameAmharic: 'አምባሻ', desc: 'Sweet, festive Ethiopian bread with rich flavors and soft texture.', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', price: 100, category: 'bakery' },
                { name: 'Defo Dabo', nameAmharic: 'ድፎ ዳቦ', desc: 'Traditional spiced bread baked wrapped in banana leaves.', image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&q=80', price: 350, category: 'bakery' },
                { name: 'Fresh Injera (10 Rolls)', nameAmharic: 'እንጀራ', desc: 'Soft and spongy 100% teff authentic injera made fresh daily.', image: 'https://images.unsplash.com/photo-1509365465994-3e8c58852115?w=800&q=80', price: 200, category: 'bakery' }
            ],
            perfume: [
                { name: 'Luxury Oud Fragrance', nameAmharic: 'የኡድ ሽቶ', desc: 'Long-lasting and captivating luxury Oud perfume fragrance without alcohol.', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80', price: 2500, category: 'perfume' },
                { name: 'Bakhur Incense', nameAmharic: 'ዕጣን / ባኩር', desc: 'Premium aromatic incense blocks to refresh your home space.', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80', price: 450, category: 'perfume' }
            ],
            snacks: [
                { name: 'Premium Khudri Dates (Temir)', nameAmharic: 'ተምር', desc: 'Fresh, sweet, and pure premium dates, perfect for fasting and daily snacking.', image: 'https://images.unsplash.com/photo-1588600878108-578307a3cc9d?w=800&q=80', price: 400, category: 'snacks' },
                { name: 'Vegetable Sambusa', nameAmharic: 'የአትክልት ሳምቡሳ', desc: 'Crispy fried dough pastry packed with savory lentil and vegetable filling.', image: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&q=80', price: 50, category: 'snacks' },
                { name: 'Beso (Toasted Barley Snack)', nameAmharic: 'በሶ', desc: 'Traditional moistened toasted barley, packed with energy and nutrition.', image: 'https://images.unsplash.com/photo-1628188172900-a54817a00f27?w=800&q=80', price: 150, category: 'snacks' }
            ],
            other: [
                { name: 'Jebena (Traditional Coffee Pot)', nameAmharic: 'ጀበና', desc: 'Iconic black clay pot essential for the Ethiopian coffee ceremony.', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80', price: 300, category: 'other' },
                { name: 'Rekbot Mini Table', nameAmharic: 'ረከቦት', desc: 'Beautifully crafted wooden table stand used for serving traditional coffee.', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80', price: 800, category: 'other' },
                { name: 'Frankincense (Etan)', nameAmharic: 'ዕጣን', desc: 'Natural tree resin incensce sourced locally to produce calming aromas.', image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80', price: 150, category: 'other' },
                { name: 'Niter Kibbeh (Spiced Butter)', nameAmharic: 'ንጥር ቅቤ', desc: 'Authentic clarified butter simmered with herbs, perfect for enhancing wots.', image: 'https://images.unsplash.com/photo-1620189507195-68309c04c4d0?w=800&q=80', price: 450, category: 'other' }
            ]
        };

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
                const productsPool = categoryProducts[category] || categoryProducts.other;
                const selectedProduct = productsPool[p % productsPool.length];

                await Product.create({
                    merchant: merchant._id,
                    name: selectedProduct.name,
                    nameAmharic: selectedProduct.nameAmharic,
                    description: selectedProduct.desc,
                    price: selectedProduct.price,
                    discountPrice: Math.random() > 0.5 ? Math.floor(selectedProduct.price * 0.8) : null,
                    category: category,
                    stock: Math.floor(Math.random() * 200) + 10,
                    halalCertified: true,
                    isFeatured: Math.random() > 0.7,
                    isApproved: true,
                    images: [{ url: selectedProduct.image, isDefault: true }],
                    ratingsAverage: parseFloat((Math.random() * (5 - 4) + 4).toFixed(1)),
                    ratingsCount: Math.floor(Math.random() * 300) + 5
                });
            }
        }

        // Add a few recognizable featured products to the first merchant
        if (createdMerchants.length > 0) {
            const featuredMerchant = createdMerchants[0];
            const featuredItems = [
                categoryProducts.spices[0], 
                categoryProducts.spices[1],
                categoryProducts.grains[0],
                categoryProducts.clothing[0],
                categoryProducts.perfume[0]
            ];
            
            for (const item of featuredItems) {
                if (!item) continue;
                await Product.create({
                    merchant: featuredMerchant._id,
                    name: item.name,
                    nameAmharic: item.nameAmharic,
                    description: item.desc,
                    price: item.price,
                    category: item.category || 'other',
                    stock: Math.floor(Math.random() * 150) + 30,
                    halalCertified: true,
                    isFeatured: true,
                    isApproved: true,
                    images: [{ url: item.image, isDefault: true }],
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
