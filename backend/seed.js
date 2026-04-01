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
                { name: 'Fresh Beef for Tibs (ጥብስ)', nameAmharic: 'የጥብስ ስጋ', desc: 'Premium cubed beef cuts prepared for sizzling Ethiopian tibs, sourced from local highland cattle.', image: 'https://placehold.co/800x800/E74C3C/FFFFFF/png?text=Premium+Tibs+Beef', price: 850, category: 'meat' },
                { name: 'Minced Beef for Kitfo (ክትፎ)', nameAmharic: 'የክትፎ ስጋ', desc: 'Lean finely minced raw beef essential for authentic Ethiopian kitfo, halal certified.', image: 'https://placehold.co/800x800/C0392B/FFFFFF/png?text=Minced+Beef+for+Kitfo', price: 950, category: 'meat' },
                { name: 'Premium Goat Meat (የፍየል ስጋ)', nameAmharic: 'የፍየል ስጋ', desc: 'Tender, locally sourced goat meat perfect for slow-cooked yebeg wot.', image: 'https://placehold.co/800x800/A93226/FFFFFF/png?text=Premium+Goat+Meat', price: 1200, category: 'meat' },
                { name: 'Lamb Chops (የበግ ስጋ)', nameAmharic: 'የበግ አንጀት ስጋ', desc: 'Succulent lamb chops, ideal for grilling or traditional Ethiopian yebeg tibs.', image: 'https://placehold.co/800x800/922B21/FFFFFF/png?text=Fresh+Lamb+Chops', price: 1400, category: 'meat' }
            ],
            // ============ POULTRY - Whole chicken, eggs ============
            poultry: [
                { name: 'Whole Doro (ዶሮ) Chicken', nameAmharic: 'ሙሉ ዶሮ', desc: 'Farm-raised whole local chicken, dressed and ready for classic doro wot.', image: 'https://placehold.co/800x800/F39C12/FFFFFF/png?text=Whole+Doro+Chicken', price: 650, category: 'poultry' },
                { name: 'Free-Range Eggs (እንቁላል)', nameAmharic: 'የቤት እንቁላል', desc: 'Pack of 30 organic free-range eggs from highland farms.', image: 'https://placehold.co/800x800/F1C40F/FFFFFF/png?text=Free-Range+Eggs', price: 250, category: 'poultry' },
                { name: 'Chicken Drumsticks', nameAmharic: 'የዶሮ እግር', desc: 'Fresh chicken drumsticks, perfect for grilled or fried dishes.', image: 'https://placehold.co/800x800/D4AC0D/FFFFFF/png?text=Chicken+Drumsticks', price: 450, category: 'poultry' }
            ],
            // ============ SPICES - Red powders, whole spices, bowls ============
            spices: [
                { name: 'Berbere Spice Blend (በርበሬ)', nameAmharic: 'በርበሬ', desc: 'Vibrant red Ethiopian berbere blend with chili, fenugreek, garlic, and cardamom. The soul of every wot.', image: 'https://placehold.co/800x800/CB4335/FFFFFF/png?text=Berbere+Spice+Blend', price: 350, category: 'spices' },
                { name: 'Mitmita Hot Pepper (ሚጥሚጣ)', nameAmharic: 'ሚጥሚጣ', desc: 'Fiery orange-red mitmita made from bird\'s-eye chili peppers, perfect for kitfo.', image: 'https://placehold.co/800x800/E74C3C/FFFFFF/png?text=Mitmita+Hot+Pepper', price: 280, category: 'spices' },
                { name: 'Shiro Powder (ሽሮ)', nameAmharic: 'የሽሮ ዱቄት', desc: 'Finely milled roasted chickpea and spice blend for classic Ethiopian shiro wot.', image: 'https://placehold.co/800x800/D68910/FFFFFF/png?text=Shiro+Powder', price: 250, category: 'spices' },
                { name: 'Korerima (Ethiopian Cardamom)', nameAmharic: 'ኮረሪማ', desc: 'Aromatic Ethiopian cardamom pods, essential for traditional coffee and stew recipes.', image: 'https://placehold.co/800x800/873600/FFFFFF/png?text=Korerima+Cardamom', price: 400, category: 'spices' },
                { name: 'Turmeric Powder (ዕርድ)', nameAmharic: 'ዕርድ', desc: 'Pure golden turmeric powder used in Ethiopian cooking and natural health remedies.', image: 'https://placehold.co/800x800/F1C40F/FFFFFF/png?text=Turmeric+Powder', price: 200, category: 'spices' }
            ],
            // ============ GRAINS - Whole grains, flour, seeds ============
            grains: [
                { name: 'White Teff Grain (ነጭ ጤፍ)', nameAmharic: 'ነጭ ጤፍ', desc: 'Premium white teff grain from Ethiopian highlands, produces the finest soft injera.', image: 'https://placehold.co/800x800/F5CBA7/FFFFFF/png?text=White+Teff+Grain', price: 4500, category: 'grains' },
                { name: 'Red Teff Grain (ቀይ ጤፍ)', nameAmharic: 'ቀይ ጤፍ', desc: 'Nutrient-rich red teff grain, slightly nutty and nutrient-dense for dark injera.', image: 'https://placehold.co/800x800/A04000/FFFFFF/png?text=Red+Teff+Grain', price: 4000, category: 'grains' },
                { name: 'Wheat Flour (የስንዴ ዱቄት)', nameAmharic: 'የስንዴ ዱቄት', desc: 'All-purpose wheat flour for making dabo, himbasha and pastries.', image: 'https://placehold.co/800x800/FDEBD0/FFFFFF/png?text=Wheat+Flour', price: 1800, category: 'grains' },
                { name: 'Lentils (ምስር)', nameAmharic: 'ምስር', desc: 'Red split lentils ideal for misir wot, a staple Ethiopian stew.', image: 'https://placehold.co/800x800/DC7633/FFFFFF/png?text=Red+Split+Lentils', price: 300, category: 'grains' }
            ],
            // ============ HONEY - Jars, golden liquid, natural ============
            honey: [
                { name: 'Pure Lalibela Honey (ማር)', nameAmharic: 'የላሊበላ ንጹህ ማር', desc: '100% raw, unfiltered highland honey from Lalibela region, rich golden color and deep floral aroma.', image: 'https://placehold.co/800x800/F39C12/FFFFFF/png?text=Pure+Lalibela+Honey', price: 850, category: 'honey' },
                { name: 'White Gojjam Honey (ነጭ ማር)', nameAmharic: 'የጎጃም ነጭ ማር', desc: 'Rare Ethiopian white honey with thick creamy texture and mild sweet taste.', image: 'https://placehold.co/800x800/F9E79F/FFFFFF/png?text=White+Gojjam+Honey', price: 1200, category: 'honey' },
                { name: 'Tigray Mountain Honey', nameAmharic: 'የትግራይ ተራራ ማር', desc: 'Dark amber wildflower honey from the mountains of Tigray, intensely rich.', image: 'https://placehold.co/800x800/B9770E/FFFFFF/png?text=Tigray+Mountain+Honey', price: 950, category: 'honey' }
            ],
            // ============ CLOTHING - Traditional Ethiopian garments ============
            clothing: [
                { name: 'Habesha Kemis (የሀበሻ ቀሚስ)', nameAmharic: 'የሀበሻ ቀሚስ', desc: 'Elegant handwoven Ethiopian traditional dress with intricate tilet cross-stitch embroidery.', image: 'https://placehold.co/800x800/FFFFFF/000000/png?text=Habesha+Kemis', price: 3500, category: 'clothing' },
                { name: 'Elegant Abaya (አባያ)', nameAmharic: 'አባያ', desc: 'Modest, premium-quality abaya with lacework detailing, perfect for daily and special occasions.', image: 'https://placehold.co/800x800/17202A/FFFFFF/png?text=Elegant+Abaya', price: 2200, category: 'clothing' },
                { name: 'Gabi Cotton Wrap (ጋቢ)', nameAmharic: 'ጋቢ', desc: 'Warm handwoven Ethiopian cotton wrap/blanket with thick weave for cold highland evenings.', image: 'https://placehold.co/800x800/FDFEFE/000000/png?text=Gabi+Cotton+Wrap', price: 1500, category: 'clothing' },
                { name: 'Men\'s Jelebiya (ጀለቢያ)', nameAmharic: 'ጀለቢያ', desc: 'Traditional flowing men\'s garment, lightweight and comfortable for prayer and gatherings.', image: 'https://placehold.co/800x800/E5E8E8/000000/png?text=Men%27s+Jelebiya', price: 1800, category: 'clothing' }
            ],
            // ============ BAKERY - Breads, flatbreads, pastries ============
            bakery: [
                { name: 'Fresh Injera (እንጀራ) - 10 Rolls', nameAmharic: 'እንጀራ', desc: 'Soft, spongy, and tangy teff injera freshly made daily. The heart of every Ethiopian meal.', image: 'https://placehold.co/800x800/E6C29F/FFFFFF/png?text=Fresh+Injera', price: 200, category: 'bakery' },
                { name: 'Ambasha Bread (አምባሻ)', nameAmharic: 'አምባሻ', desc: 'Sweet festive Ethiopian bread decorated with traditional cross patterns, soft and fragrant.', image: 'https://placehold.co/800x800/D35400/FFFFFF/png?text=Ambasha+Bread', price: 120, category: 'bakery' },
                { name: 'Defo Dabo (ድፎ ዳቦ)', nameAmharic: 'ድፎ ዳቦ', desc: 'Dense traditional spiced celebration bread baked in banana leaves for holidays.', image: 'https://placehold.co/800x800/A04000/FFFFFF/png?text=Defo+Dabo', price: 350, category: 'bakery' },
                { name: 'Himbasha (ህንባሻ)', nameAmharic: 'ህንባሻ', desc: 'Slightly sweet cardamom-spiced celebratory bread, often shared during holidays.', image: 'https://placehold.co/800x800/CA6F1E/FFFFFF/png?text=Himbasha+Bread', price: 150, category: 'bakery' }
            ],
            // ============ PERFUME - Fragrances, oud, incense ============
            perfume: [
                { name: 'Luxury Oud Perfume (ዑድ)', nameAmharic: 'የዑድ ሽቶ', desc: 'Long-lasting alcohol-free Arabian oud fragrance, deep and captivating.', image: 'https://placehold.co/800x800/D4AF37/FFFFFF/png?text=Luxury+Oud+Perfume', price: 2500, category: 'perfume' },
                { name: 'Bakhur Incense (ባኩር)', nameAmharic: 'ባኩር', desc: 'Aromatic incense chips that fill the home with warm, inviting woodsy fragrance.', image: 'https://placehold.co/800x800/8B4513/FFFFFF/png?text=Bakhur+Incense', price: 450, category: 'perfume' },
                { name: 'Musk Attar Oil (ሙስክ)', nameAmharic: 'ሙስክ ዘይት', desc: 'Pure concentrated musk attar perfume oil, applied on pulse points for lasting scent.', image: 'https://placehold.co/800x800/F5DEB3/000000/png?text=Musk+Attar+Oil', price: 800, category: 'perfume' }
            ],
            // ============ SNACKS - Dates, sambusa, kolo ============
            snacks: [
                { name: 'Medjool Dates (ተምር)', nameAmharic: 'ተምር', desc: 'Premium large medjool dates, sweet and soft, perfect for Iftar and daily snacking.', image: 'https://placehold.co/800x800/5C4033/FFFFFF/png?text=Medjool+Dates', price: 500, category: 'snacks' },
                { name: 'Sambusa (ሳምቡሳ)', nameAmharic: 'ሳምቡሳ', desc: 'Crispy golden fried pastry triangles filled with seasoned lentils and vegetables.', image: 'https://placehold.co/800x800/D4AC0D/FFFFFF/png?text=Sambusa', price: 80, category: 'snacks' },
                { name: 'Roasted Kolo (ቆሎ)', nameAmharic: 'ቆሎ', desc: 'Freshly roasted barley, chickpeas, and peanut mix — Ethiopia\'s favorite crunchy snack.', image: 'https://placehold.co/800x800/A04000/FFFFFF/png?text=Roasted+Kolo', price: 150, category: 'snacks' },
                { name: 'Beso Flour (በሶ)', nameAmharic: 'በሶ', desc: 'Traditional energy-rich toasted barley flour, mixed with water or honey for quick nutrition.', image: 'https://placehold.co/800x800/DEB887/000000/png?text=Beso+Flour', price: 180, category: 'snacks' }
            ],
            // ============ OTHER - Coffee, jebena, household, accessories ============
            other: [
                { name: 'Ethiopian Buna Coffee (ቡና)', nameAmharic: 'ቡና', desc: 'Fresh roasted premium Ethiopian Yirgacheffe coffee beans with bold floral aroma.', image: 'https://placehold.co/800x800/3E2723/FFFFFF/png?text=Ethiopian+Buna+Coffee', price: 550, category: 'other' },
                { name: 'Jebena Coffee Pot (ጀበና)', nameAmharic: 'ጀበና', desc: 'Traditional black clay jebena pot, essential for the Ethiopian buna ceremony.', image: 'https://placehold.co/800x800/1B1210/FFFFFF/png?text=Jebena+Coffee+Pot', price: 350, category: 'other' },
                { name: 'Frankincense Resin (ዕጣን)', nameAmharic: 'ዕጣን', desc: 'Pure natural frankincense resin from Tigray, burned for calming aroma and spiritual cleansing.', image: 'https://placehold.co/800x800/D2B48C/000000/png?text=Frankincense+Resin', price: 200, category: 'other' },
                { name: 'Niter Kibbeh (ንጥር ቅቤ)', nameAmharic: 'ንጥር ቅቤ', desc: 'Spiced clarified butter infused with rosemary, garlic, ginger, turmeric — base of every wot.', image: 'https://placehold.co/800x800/F1C40F/FFFFFF/png?text=Niter+Kibbeh', price: 480, category: 'other' },
                { name: 'Mesob Basket (መሶብ)', nameAmharic: 'መሶብ', desc: 'Colorful handwoven Ethiopian serving basket used to present injera, a cultural icon.', image: 'https://placehold.co/800x800/E67E22/FFFFFF/png?text=Mesob+Basket', price: 2500, category: 'other' }
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
