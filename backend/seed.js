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
            // ============ MEAT - Raw cuts, butcher shop imagery ============
            meat: [
                { name: 'Fresh Beef for Tibs (ጥብስ)', nameAmharic: 'የጥብስ ስጋ', desc: 'Premium cubed beef cuts prepared for sizzling Ethiopian tibs, sourced from local highland cattle.', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&q=80', price: 850, category: 'meat' },
                { name: 'Minced Beef for Kitfo (ክትፎ)', nameAmharic: 'የክትፎ ስጋ', desc: 'Lean finely minced raw beef essential for authentic Ethiopian kitfo, halal certified.', image: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=800&q=80', price: 950, category: 'meat' },
                { name: 'Premium Goat Meat (የፍየል ስጋ)', nameAmharic: 'የፍየል ስጋ', desc: 'Tender, locally sourced goat meat perfect for slow-cooked yebeg wot.', image: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=800&q=80', price: 1200, category: 'meat' },
                { name: 'Lamb Chops (የበግ ስጋ)', nameAmharic: 'የበግ አንጀት ስጋ', desc: 'Succulent lamb chops, ideal for grilling or traditional Ethiopian yebeg tibs.', image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=800&q=80', price: 1400, category: 'meat' }
            ],
            // ============ POULTRY - Whole chicken, eggs ============
            poultry: [
                { name: 'Whole Doro (ዶሮ) Chicken', nameAmharic: 'ሙሉ ዶሮ', desc: 'Farm-raised whole local chicken, dressed and ready for classic doro wot.', image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800&q=80', price: 650, category: 'poultry' },
                { name: 'Free-Range Eggs (እንቁላል)', nameAmharic: 'የቤት እንቁላል', desc: 'Pack of 30 organic free-range eggs from highland farms.', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&q=80', price: 250, category: 'poultry' },
                { name: 'Chicken Drumsticks', nameAmharic: 'የዶሮ እግር', desc: 'Fresh chicken drumsticks, perfect for grilled or fried dishes.', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80', price: 450, category: 'poultry' }
            ],
            // ============ SPICES - Red powders, whole spices, bowls ============
            spices: [
                { name: 'Berbere Spice Blend (በርበሬ)', nameAmharic: 'በርበሬ', desc: 'Vibrant red Ethiopian berbere blend with chili, fenugreek, garlic, and cardamom. The soul of every wot.', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80', price: 350, category: 'spices' },
                { name: 'Mitmita Hot Pepper (ሚጥሚጣ)', nameAmharic: 'ሚጥሚጣ', desc: 'Fiery orange-red mitmita made from bird\'s-eye chili peppers, perfect for kitfo.', image: 'https://images.unsplash.com/photo-1599909531610-14a64e85a648?w=800&q=80', price: 280, category: 'spices' },
                { name: 'Shiro Powder (ሽሮ)', nameAmharic: 'የሽሮ ዱቄት', desc: 'Finely milled roasted chickpea and spice blend for classic Ethiopian shiro wot.', image: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=800&q=80', price: 250, category: 'spices' },
                { name: 'Korerima (Ethiopian Cardamom)', nameAmharic: 'ኮረሪማ', desc: 'Aromatic Ethiopian cardamom pods, essential for traditional coffee and stew recipes.', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&q=80', price: 400, category: 'spices' },
                { name: 'Turmeric Powder (ዕርድ)', nameAmharic: 'ዕርድ', desc: 'Pure golden turmeric powder used in Ethiopian cooking and natural health remedies.', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&q=80', price: 200, category: 'spices' }
            ],
            // ============ GRAINS - Whole grains, flour, seeds ============
            grains: [
                { name: 'White Teff Grain (ነጭ ጤፍ)', nameAmharic: 'ነጭ ጤፍ', desc: 'Premium white teff grain from Ethiopian highlands, produces the finest soft injera.', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80', price: 4500, category: 'grains' },
                { name: 'Red Teff Grain (ቀይ ጤፍ)', nameAmharic: 'ቀይ ጤፍ', desc: 'Nutrient-rich red teff grain, slightly nutty and nutrient-dense for dark injera.', image: 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=800&q=80', price: 4000, category: 'grains' },
                { name: 'Wheat Flour (የስንዴ ዱቄት)', nameAmharic: 'የስንዴ ዱቄት', desc: 'All-purpose wheat flour for making dabo, himbasha and pastries.', image: 'https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=800&q=80', price: 1800, category: 'grains' },
                { name: 'Lentils (ምስር)', nameAmharic: 'ምስር', desc: 'Red split lentils ideal for misir wot, a staple Ethiopian stew.', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&q=80', price: 300, category: 'grains' }
            ],
            // ============ HONEY - Jars, golden liquid, natural ============
            honey: [
                { name: 'Pure Lalibela Honey (ማር)', nameAmharic: 'የላሊበላ ንጹህ ማር', desc: '100% raw, unfiltered highland honey from Lalibela region, rich golden color and deep floral aroma.', image: 'https://images.unsplash.com/photo-1558583055-d7ac00b1adca?w=800&q=80', price: 850, category: 'honey' },
                { name: 'White Gojjam Honey (ነጭ ማር)', nameAmharic: 'የጎጃም ነጭ ማር', desc: 'Rare Ethiopian white honey with thick creamy texture and mild sweet taste.', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80', price: 1200, category: 'honey' },
                { name: 'Tigray Mountain Honey', nameAmharic: 'የትግራይ ተራራ ማር', desc: 'Dark amber wildflower honey from the mountains of Tigray, intensely rich.', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80', price: 950, category: 'honey' }
            ],
            // ============ CLOTHING - Traditional Ethiopian garments ============
            clothing: [
                { name: 'Habesha Kemis (የሀበሻ ቀሚስ)', nameAmharic: 'የሀበሻ ቀሚስ', desc: 'Elegant handwoven Ethiopian traditional dress with intricate tilet cross-stitch embroidery.', image: 'https://images.unsplash.com/photo-1518622358385-8ea7d0794bf6?w=800&q=80', price: 3500, category: 'clothing' },
                { name: 'Elegant Abaya (አባያ)', nameAmharic: 'አባያ', desc: 'Modest, premium-quality abaya with lacework detailing, perfect for daily and special occasions.', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80', price: 2200, category: 'clothing' },
                { name: 'Gabi Cotton Wrap (ጋቢ)', nameAmharic: 'ጋቢ', desc: 'Warm handwoven Ethiopian cotton wrap/blanket with thick weave for cold highland evenings.', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80', price: 1500, category: 'clothing' },
                { name: 'Men\'s Jelebiya (ጀለቢያ)', nameAmharic: 'ጀለቢያ', desc: 'Traditional flowing men\'s garment, lightweight and comfortable for prayer and gatherings.', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80', price: 1800, category: 'clothing' }
            ],
            // ============ BAKERY - Breads, flatbreads, pastries ============
            bakery: [
                { name: 'Fresh Injera (እንጀራ) - 10 Rolls', nameAmharic: 'እንጀራ', desc: 'Soft, spongy, and tangy teff injera freshly made daily. The heart of every Ethiopian meal.', image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&q=80', price: 200, category: 'bakery' },
                { name: 'Ambasha Bread (አምባሻ)', nameAmharic: 'አምባሻ', desc: 'Sweet festive Ethiopian bread decorated with traditional cross patterns, soft and fragrant.', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', price: 120, category: 'bakery' },
                { name: 'Defo Dabo (ድፎ ዳቦ)', nameAmharic: 'ድፎ ዳቦ', desc: 'Dense traditional spiced celebration bread baked in banana leaves for holidays.', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80', price: 350, category: 'bakery' },
                { name: 'Himbasha (ህንባሻ)', nameAmharic: 'ህንባሻ', desc: 'Slightly sweet cardamom-spiced celebratory bread, often shared during holidays.', image: 'https://images.unsplash.com/photo-1549931319-a545753467c8?w=800&q=80', price: 150, category: 'bakery' }
            ],
            // ============ PERFUME - Fragrances, oud, incense ============
            perfume: [
                { name: 'Luxury Oud Perfume (ዑድ)', nameAmharic: 'የዑድ ሽቶ', desc: 'Long-lasting alcohol-free Arabian oud fragrance, deep and captivating.', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80', price: 2500, category: 'perfume' },
                { name: 'Bakhur Incense (ባኩር)', nameAmharic: 'ባኩር', desc: 'Aromatic incense chips that fill the home with warm, inviting woodsy fragrance.', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80', price: 450, category: 'perfume' },
                { name: 'Musk Attar Oil (ሙስክ)', nameAmharic: 'ሙስክ ዘይት', desc: 'Pure concentrated musk attar perfume oil, applied on pulse points for lasting scent.', image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80', price: 800, category: 'perfume' }
            ],
            // ============ SNACKS - Dates, sambusa, kolo ============
            snacks: [
                { name: 'Medjool Dates (ተምር)', nameAmharic: 'ተምር', desc: 'Premium large medjool dates, sweet and soft, perfect for Iftar and daily snacking.', image: 'https://images.pexels.com/photos/4469611/pexels-photo-4469611.jpeg', price: 500, category: 'snacks' },
                { name: 'Sambusa (ሳምቡሳ)', nameAmharic: 'ሳምቡሳ', desc: 'Crispy golden fried pastry triangles filled with seasoned lentils and vegetables.', image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&q=80', price: 80, category: 'snacks' },
                { name: 'Roasted Kolo (ቆሎ)', nameAmharic: 'ቆሎ', desc: 'Freshly roasted barley, chickpeas, and peanut mix — Ethiopia\'s favorite crunchy snack.', image: 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=800&q=80', price: 150, category: 'snacks' },
                { name: 'Beso Flour (በሶ)', nameAmharic: 'በሶ', desc: 'Traditional energy-rich toasted barley flour, mixed with water or honey for quick nutrition.', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80', price: 180, category: 'snacks' }
            ],
            // ============ OTHER - Coffee, jebena, household, accessories ============
            other: [
                { name: 'Ethiopian Buna Coffee (ቡና)', nameAmharic: 'ቡና', desc: 'Fresh roasted premium Ethiopian Yirgacheffe coffee beans with bold floral aroma.', image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80', price: 550, category: 'other' },
                { name: 'Jebena Coffee Pot (ጀበና)', nameAmharic: 'ጀበና', desc: 'Traditional black clay jebena pot, essential for the Ethiopian buna ceremony.', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80', price: 350, category: 'other' },
                { name: 'Frankincense Resin (ዕጣን)', nameAmharic: 'ዕጣን', desc: 'Pure natural frankincense resin from Tigray, burned for calming aroma and spiritual cleansing.', image: 'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=800&q=80', price: 200, category: 'other' },
                { name: 'Niter Kibbeh (ንጥር ቅቤ)', nameAmharic: 'ንጥር ቅቤ', desc: 'Spiced clarified butter infused with rosemary, garlic, ginger, turmeric — base of every wot.', image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&q=80', price: 480, category: 'other' },
                { name: 'Mesob Basket (መሶብ)', nameAmharic: 'መሶብ', desc: 'Colorful handwoven Ethiopian serving basket used to present injera, a cultural icon.', image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80', price: 2500, category: 'other' }
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
                categoryProducts.spices[0],    // Berbere
                categoryProducts.meat[0],      // Beef Tibs
                categoryProducts.grains[0],    // White Teff
                categoryProducts.honey[0],     // Lalibela Honey
                categoryProducts.clothing[0],  // Habesha Kemis
                categoryProducts.bakery[0],    // Injera
                categoryProducts.snacks[0],    // Dates
                categoryProducts.perfume[0],   // Oud
                categoryProducts.other[0],     // Buna Coffee
                categoryProducts.poultry[0]    // Doro Chicken
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
