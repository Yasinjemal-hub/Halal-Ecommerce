import "./config/env.js";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Merchant from "./models/Merchant.js";
import Product from "./models/Product.js";

const isDryRun = process.argv.includes("--dry-run");
const isReset = process.argv.includes("--reset");
const isProductsOnly = process.argv.includes("--products-only");

const categories = [
  "meat",
  "poultry",
  "spices",
  "grains",
  "honey",
  "clothing",
  "bakery",
  "other",
  "perfume",
  "snacks",
];
const cities = [
  "Addis Ababa",
  "Harar",
  "Dire Dawa",
  "Mekelle",
  "Bahir Dar",
  "Hawassa",
  "Jimma",
];
const cityToRegion = {
  "Addis Ababa": "Addis Ababa",
  Harar: "Harari",
  "Dire Dawa": "Dire Dawa",
  Mekelle: "Tigray",
  "Bahir Dar": "Amhara",
  Hawassa: "Sidama",
  Jimma: "Oromia",
};
const types = [
  "butcher",
  "spice_shop",
  "grocery",
  "clothing",
  "bakery",
  "restaurant",
];

const categoryProducts = {
  meat: [
    {
      name: "Fresh Beef for Tibs (ጥብስ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582057/products/products/fresh-beef-for-tibs.jpg",
      nameAmharic: "የጥብስ ስጋ",
      desc: "Premium cubed beef cuts prepared for sizzling Ethiopian tibs, sourced from local highland cattle.",
      price: 850,
      category: "meat",
    },
    {
      name: "Minced Beef for Kitfo (ክትፎ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582060/products/products/minced-beef-for-kitfo.jpg",
      nameAmharic: "የክትፎ ስጋ",
      desc: "Lean finely minced raw beef essential for authentic Ethiopian kitfo, halal certified.",
      price: 950,
      category: "meat",
    },
    {
      name: "Premium Goat Meat (የፍየል ስጋ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582064/products/products/premium-goat-meat.jpg",
      nameAmharic: "የፍየል ስጋ",
      desc: "Tender, locally sourced goat meat perfect for slow-cooked wot.",
      price: 1200,
      category: "meat",
    },
    {
      name: "Lamb Chops (የበግ ስጋ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582067/products/products/lamb-chops.jpg",
      nameAmharic: "የበግ አንጀት ስጋ",
      desc: "Succulent lamb chops, ideal for grilling or traditional yebeg tibs.",
      price: 1400,
      category: "meat",
    },
  ],
  poultry: [
    {
      name: "Whole Doro (ዶሮ) Chicken",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582071/products/products/whole-doro-chicken.jpg",
      nameAmharic: "ሙሉ ዶሮ",
      desc: "Farm-raised whole local chicken, dressed and ready for classic doro wot.",
      price: 650,
      category: "poultry",
    },
    {
      name: "Free-Range Eggs (እንቁላል)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582077/products/products/free-range-eggs.jpg",
      nameAmharic: "የቤት እንቁላል",
      desc: "Pack of 30 organic free-range eggs from highland farms.",
      price: 250,
      category: "poultry",
    },
    {
      name: "Chicken Drumsticks",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582080/products/products/chicken-drumsticks.jpg",
      nameAmharic: "የዶሮ እግር",
      desc: "Fresh chicken drumsticks, perfect for grilled or fried dishes.",
      price: 450,
      category: "poultry",
    },
  ],
  spices: [
    {
      name: "Berbere Spice Blend (በርበሬ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582089/products/products/berbere-spice-blend.jpg",
      nameAmharic: "በርበሬ",
      desc: "Vibrant red Ethiopian berbere blend with chili, fenugreek, and cardamom.",
      price: 350,
      category: "spices",
    },
    {
      name: "Mitmita Hot Pepper (ሚጥሚጣ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582093/products/products/mitmita-hot-pepper.jpg",
      nameAmharic: "ሚጥሚጣ",
      desc: "Fiery orange-red mitmita made from bird's-eye chili peppers, perfect for kitfo.",
      price: 280,
      category: "spices",
    },
    {
      name: "Shiro Powder (ሽሮ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582096/products/products/shiro-powder.jpg",
      nameAmharic: "የሽሮ ዱቄት",
      desc: "Finely milled roasted chickpea and spice blend for classic Ethiopian shiro wot.",
      price: 250,
      category: "spices",
    },
    {
      name: "Korerima (Ethiopian Cardamom)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582103/products/products/korerima-ethiopian-cardamom.jpg",
      nameAmharic: "ኮረሪማ",
      desc: "Aromatic Ethiopian cardamom pods, essential for traditional coffee and stew recipes.",
      price: 400,
      category: "spices",
    },
    {
      name: "Turmeric Powder (ዕርድ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582106/products/products/turmeric-powder.jpg",
      nameAmharic: "ዕርድ",
      desc: "Pure golden turmeric powder used in Ethiopian cooking and natural health remedies.",
      price: 200,
      category: "spices",
    },
  ],
  grains: [
    {
      name: "White Teff Grain (ነጭ ጤፍ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582110/products/products/white-teff-grain.jpg",
      nameAmharic: "ነጭ ጤፍ",
      desc: "Premium white teff grain from Ethiopian highlands, produces the finest soft injera.",
      price: 4500,
      category: "grains",
    },
    {
      name: "Red Teff Grain (ቀይ ጤፍ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582113/products/products/red-teff-grain.jpg",
      nameAmharic: "ቀይ ጤፍ",
      desc: "Nutrient-rich red teff grain, slightly nutty and nutrient-dense for dark injera.",
      price: 4000,
      category: "grains",
    },
    {
      name: "Wheat Flour (የስንዴ ዱቄት)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582116/products/products/wheat-flour.jpg",
      nameAmharic: "የስንዴ ዱቄት",
      desc: "All-purpose wheat flour for making dabo, himbasha and pastries.",
      price: 1800,
      category: "grains",
    },
    {
      name: "Lentils (ምስር)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582119/products/products/lentils.jpg",
      nameAmharic: "ምስር",
      desc: "Red split lentils ideal for misir wot, a staple Ethiopian stew.",
      price: 300,
      category: "grains",
    },
  ],
  honey: [
    {
      name: "Pure Lalibela Honey (ማር)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582124/products/products/pure-lalibela-honey.jpg",
      nameAmharic: "የላሊበላ ንጹህ ማር",
      desc: "100% raw, unfiltered highland honey from Lalibela region.",
      price: 850,
      category: "honey",
    },
    {
      name: "White Gojjam Honey (ነጭ ማር)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582126/products/products/white-gojjam-honey.jpg",
      nameAmharic: "የጎጃም ነጭ ማር",
      desc: "Rare Ethiopian white honey with thick creamy texture and mild sweet taste.",
      price: 1200,
      category: "honey",
    },
    {
      name: "Tigray Mountain Honey",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582129/products/products/tigray-mountain-honey.jpg",
      nameAmharic: "የትግራይ ተራራ ማር",
      desc: "Dark amber wildflower honey from the mountains of Tigray, intensely rich.",
      price: 950,
      category: "honey",
    },
  ],
  clothing: [
    {
      name: "Habesha Kemis (የሀበሻ ቀሚስ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582132/products/products/habesha-kemis.jpg",
      nameAmharic: "የሀበሻ ቀሚስ",
      desc: "Elegant handwoven Ethiopian traditional dress with intricate tilet cross-stitch embroidery.",
      price: 3500,
      category: "clothing",
    },
    {
      name: "Elegant Abaya (አባያ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582136/products/products/elegant-abaya.jpg",
      nameAmharic: "አባያ",
      desc: "Modest, premium-quality abaya with lacework detailing.",
      price: 2200,
      category: "clothing",
    },
    {
      name: "Gabi Cotton Wrap (ጋቢ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582139/products/products/gabi-cotton-wrap.jpg",
      nameAmharic: "ጋቢ",
      desc: "Warm handwoven Ethiopian cotton wrap with thick weave for cold highland evenings.",
      price: 1500,
      category: "clothing",
    },
    {
      name: "Men's Jelebiya (ጀለቢያ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582141/products/products/men-s-jelebiya.jpg",
      nameAmharic: "ጀለቢያ",
      desc: "Traditional flowing men's garment, lightweight and comfortable for prayer and gatherings.",
      price: 1800,
      category: "clothing",
    },
  ],
  bakery: [
    {
      name: "Fresh Injera (እንጀራ) - 10 Rolls",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582143/products/products/fresh-injera-10-rolls.jpg",
      nameAmharic: "እንጀራ",
      desc: "Soft, spongy, and tangy teff injera freshly made daily.",
      price: 200,
      category: "bakery",
    },
    {
      name: "Ambasha Bread (አምባሻ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582146/products/products/ambasha-bread.jpg",
      nameAmharic: "አምባሻ",
      desc: "Sweet festive Ethiopian bread decorated with traditional cross patterns.",
      price: 120,
      category: "bakery",
    },
    {
      name: "Defo Dabo (ድፎ ዳቦ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582150/products/products/defo-dabo.jpg",
      nameAmharic: "ድፎ ዳቦ",
      desc: "Dense traditional spiced celebration bread baked in banana leaves.",
      price: 350,
      category: "bakery",
    },
    {
      name: "Himbasha (ህንባሻ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582162/products/products/himbasha.jpg",
      nameAmharic: "ህንባሻ",
      desc: "Slightly sweet cardamom-spiced celebratory bread.",
      price: 150,
      category: "bakery",
    },
  ],
  perfume: [
    {
      name: "Luxury Oud Perfume (ዑድ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582165/products/products/luxury-oud-perfume.jpg",
      nameAmharic: "የዑድ ሽቶ",
      desc: "Long-lasting alcohol-free Arabian oud fragrance.",
      price: 2500,
      category: "perfume",
    },
    {
      name: "Bakhur Incense (ባኩር)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582168/products/products/bakhur-incense.jpg",
      nameAmharic: "ባኩር",
      desc: "Aromatic incense chips that fill the home with warm, inviting woodsy fragrance.",
      price: 450,
      category: "perfume",
    },
    {
      name: "Musk Attar Oil (ሙስክ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582181/products/products/musk-attar-oil.jpg",
      nameAmharic: "ሙስክ ዘይት",
      desc: "Pure concentrated musk attar perfume oil.",
      price: 800,
      category: "perfume",
    },
  ],
  snacks: [
    {
      name: "Medjool Dates (ተምር)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582186/products/products/medjool-dates.jpg",
      nameAmharic: "ተምር",
      desc: "Premium large medjool dates, sweet and soft.",
      price: 500,
      category: "snacks",
    },
    {
      name: "Sambusa (ሳምቡሳ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582189/products/products/sambusa.jpg",
      nameAmharic: "ሳምቡሳ",
      desc: "Crispy golden fried pastry triangles filled with seasoned lentils and vegetables.",
      price: 80,
      category: "snacks",
    },
    {
      name: "Roasted Kolo (ቆሎ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582193/products/products/roasted-kolo.jpg",
      nameAmharic: "ቆሎ",
      desc: "Freshly roasted barley, chickpeas, and peanut mix — Ethiopia's favorite crunchy snack.",
      price: 150,
      category: "snacks",
    },
    {
      name: "Beso Flour (በሶ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582196/products/products/beso-flour.jpg",
      nameAmharic: "በሶ",
      desc: "Traditional energy-rich toasted barley flour.",
      price: 180,
      category: "snacks",
    },
  ],
  other: [
    {
      name: "Ethiopian Buna Coffee (ቡና)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582203/products/products/ethiopian-buna-coffee.jpg",
      nameAmharic: "ቡና",
      desc: "Fresh roasted premium Ethiopian Yirgacheffe coffee beans.",
      price: 550,
      category: "other",
    },
    {
      name: "Jebena Coffee Pot (ጀበና)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582210/products/products/jebena-coffee-pot.jpg",
      nameAmharic: "ጀበና",
      desc: "Traditional black clay jebena pot, essential for the Ethiopian buna ceremony.",
      price: 350,
      category: "other",
    },
    {
      name: "Frankincense Resin (ዕጣን)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582214/products/products/frankincense-resin.jpg",
      nameAmharic: "ዕጣን",
      desc: "Pure natural frankincense resin from Tigray.",
      price: 200,
      category: "other",
    },
    {
      name: "Niter Kibbeh (ንጥር ቅቤ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582218/products/products/niter-kibbeh.jpg",
      nameAmharic: "ንጥር ቅቤ",
      desc: "Spiced clarified butter infused with rosemary, garlic, ginger, and turmeric.",
      price: 480,
      category: "other",
    },
    {
      name: "Mesob Basket (መሶብ)",
      image: "https://res.cloudinary.com/dmocghbal/image/upload/v1782582222/products/products/mesob-basket.jpg",
      nameAmharic: "መሶብ",
      desc: "Colorful handwoven Ethiopian serving basket used to present injera.",
      price: 2500,
      category: "other",
    },
  ],
};

const adjectives = [
  "Premium",
  "Authentic",
  "Fresh",
  "Organic",
  "Royal",
  "Crown",
  "Golden",
  "Elite",
  "Prime",
  "Green",
  "Pure",
  "Sunrise",
  "Pioneer",
  "Highland",
  "Savannah",
];
const nouns = [
  "Foods",
  "Market",
  "Bazaar",
  "Spices",
  "Harvest",
  "Oasis",
  "Farms",
  "Traders",
  "Boutique",
  "Organics",
  "Meats",
  "Valley",
  "Goods",
];

const buildProductDocument = (
  merchantId,
  selectedProduct,
  category,
  isFeatured = false,
) => {
  const image = selectedProduct.image;
  return {
    merchant: merchantId,
    name: selectedProduct.name,
    nameAmharic: selectedProduct.nameAmharic || "",
    description: selectedProduct.desc,
    price: selectedProduct.price,
    discountPrice:
      Math.random() > 0.5 ? Math.floor(selectedProduct.price * 0.8) : null,
    category: category || selectedProduct.category || "other",
    stock: Math.floor(Math.random() * 200) + 10,
    halalCertified: true,
    isFeatured,
    isApproved: true,
    image,
    images: [{ url: image, isDefault: true }],
    ratingsAverage: parseFloat((Math.random() * (5 - 4) + 4).toFixed(1)),
    ratingsCount: Math.floor(Math.random() * 300) + 5,
  };
};

const seedData = async () => {
  try {
    console.log("🌱 Connecting to MongoDB...");
    const conn = await connectDB();
    const dbName = conn?.connection?.name || "unknown";
    const dbHost = conn?.connection?.host || "unknown";
    console.log(`🌱 Connected to: ${dbHost} (database: ${dbName})`);

    if (isDryRun) {
      console.log("⚠️  DRY RUN — No data will be written.\n");
    }

    if (dbName === "test" || dbName === "admin") {
      console.warn(
        `⚠️  WARNING: Connected to database "${dbName}". Your Atlas URI may be missing a database name.`,
      );
      console.warn(
        "   Add /halal-ecommerce at the end of MONGO_ATLAS_URI before the query string.",
      );
      console.warn(
        "   Example: ...mongodb.net/halal-ecommerce?appName=Cluster0\n",
      );
    }

    // ── Reset Phase (optional, off by default) ────────────
    if (isReset) {
      console.log("⚙️  --reset mode: Wiping existing data...");
      if (!isDryRun) {
        const userDel = await User.deleteMany({
          email: { $regex: "@demo.com" },
        });
        console.log(`   Users deleted: ${userDel.deletedCount}`);
        const merchDel = await Merchant.deleteMany({});
        console.log(`   Merchants deleted: ${merchDel.deletedCount}`);
        const prodDel = await Product.deleteMany({});
        console.log(`   Products deleted: ${prodDel.deletedCount}`);
      } else {
        console.log(
          "   Would delete users (@demo.com), merchants, and products",
        );
      }
    } else {
      console.log(
        "ℹ️  Skipping data wipe (use --reset to clear existing data before reseeding)",
      );
    }

    let createdUsers = 0;
    let createdMerchants = 0;
    let createdProducts = 0;
    let errors = [];

    // ── Helper: seed products for a given merchant ─────────
    const seedProductsForMerchant = async (merchantId, merchantIndex) => {
      const numProducts = Math.floor(Math.random() * 4) + 3;
      let count = 0;

      for (let p = 0; p < numProducts; p++) {
        try {
          const cat = categories[(merchantIndex + p) % categories.length];
          const pool = categoryProducts[cat] || categoryProducts.other;
          const selected = pool[p % pool.length];
          const doc = buildProductDocument(merchantId, selected, cat, false);

          if (!isDryRun) {
            await Product.create(doc);
          }
          count++;
        } catch (prodErr) {
          errors.push(
            `Merchant ${merchantIndex} product ${p}: ${prodErr.message}`,
          );
        }
      }

      if (!isDryRun) {
        await Merchant.findByIdAndUpdate(merchantId, { totalProducts: count });
      }
      return count;
    };

    // ── Mode: Products Only ───────────────────────────────
    if (isProductsOnly) {
      console.log("\n🔄 --products-only mode: Fetching existing merchants...");

      if (!isDryRun) {
        const prodDel = await Product.deleteMany({});
        console.log(`   Old products deleted: ${prodDel.deletedCount}`);
      } else {
        console.log("   Would delete all existing products");
      }

      const existing = isDryRun ? [] : await Merchant.find().lean();

      if (existing.length === 0) {
        console.log(
          "   No merchants found. Run 'node seed.js' (without --products-only) first.",
        );
      } else {
        console.log(
          `   Found ${existing.length} merchants. Seeding products...`,
        );
        for (let m = 0; m < existing.length; m++) {
          const count = await seedProductsForMerchant(existing[m]._id, m);
          createdProducts += count;
        }
        console.log(`   Products seeded: ${createdProducts}`);
      }
    }

    // ── Mode: Full Seed (Users + Merchants + Products) ───
    if (!isProductsOnly) {
      console.log("\n👤 Seeding 30 merchants with users...");
      for (let i = 1; i <= 30; i++) {
        const city = cities[i % cities.length];
        const type = types[i % types.length];
        const name = `${adjectives[i % adjectives.length]} ${nouns[(i * 2) % nouns.length]} ${city}`;

        try {
          let user;
          if (isDryRun) {
            user = { _id: `DRY_USER_${i}` };
          } else {
            user = await User.create({
              firstName: `Merchant${i}`,
              lastName: "Demo",
              email: `merchant${i}@demo.com`,
              password: "Demo1234!",
              phone: `+251911${String(i).padStart(6, "0")}`,
              role: "merchant",
            });
          }
          createdUsers++;

          let merchant;
          if (isDryRun) {
            merchant = { _id: `DRY_MERCHANT_${i}` };
          } else {
            merchant = await Merchant.create({
              user: user._id,
              businessName: name,
              businessNameAmharic: `የ${name} የንግድ ድርጅት`,
              description: `Discover the best quality products from ${name}. We are committed to providing top-tier, halal-certified goods directly to your doorstep in ${city}. Trusted by thousands of happy customers.`,
              businessType: type,
              businessPhone: `+251911${String(i).padStart(6, "0")}`,
              businessEmail: `contact@merchant${i}.com`,
              businessAddress: {
                street: `Main Ave ${i}`,
                city,
                region: cityToRegion[city] || "Addis Ababa",
              },
              verificationStatus: "approved",
              verifiedAt: new Date(),
              ratingsAverage: parseFloat(
                (Math.random() * (5 - 4) + 4).toFixed(1),
              ),
              ratingsCount: Math.floor(Math.random() * 500) + 10,
              totalProducts: 0,
              totalOrders: 0,
              totalRevenue: 0,
              isFeatured: i <= 8,
              isActive: true,
              logo: {
                url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200`,
              },
              socialMedia: {
                telegram: `t.me/merchant${i}`,
                instagram: `@merchant${i}`,
              },
            });
          }
          createdMerchants++;

          const prodCount = await seedProductsForMerchant(merchant._id, i);
          createdProducts += prodCount;
        } catch (merchantErr) {
          errors.push(`Merchant ${i}: ${merchantErr.message}`);
        }
      }
    }

    // ── Featured Products (always, even in products-only) ─
    console.log("\n⭐ Seeding featured products...");
    const featuredMerchant = isDryRun
      ? { _id: "DRY_MERCHANT_1" }
      : await Merchant.findOne().sort({ createdAt: 1 }).lean();

    if (featuredMerchant) {
      const featuredItems = [
        categoryProducts.spices[0],
        categoryProducts.meat[0],
        categoryProducts.grains[0],
        categoryProducts.honey[0],
        categoryProducts.clothing[0],
        categoryProducts.bakery[0],
        categoryProducts.snacks[0],
        categoryProducts.perfume[0],
        categoryProducts.other[0],
        categoryProducts.poultry[0],
      ];
      let featuredCount = 0;
      for (const item of featuredItems) {
        try {
          const doc = buildProductDocument(
            featuredMerchant._id,
            item,
            item.category || "other",
            true,
          );
          if (!isDryRun) {
            await Product.create(doc);
          }
          featuredCount++;
          createdProducts++;
        } catch (featErr) {
          errors.push(`Featured product "${item?.name}": ${featErr.message}`);
        }
      }
      if (!isDryRun && featuredCount > 0) {
        await Merchant.findByIdAndUpdate(featuredMerchant._id, {
          $inc: { totalProducts: featuredCount },
        });
      }
    }

    // ── Summary ──────────────────────────────────────────
    console.log("\n" + "=".repeat(50));
    console.log("📊 SEED SUMMARY");
    console.log("=".repeat(50));
    if (!isProductsOnly) {
      console.log(`   Users created:     ${createdUsers}`);
      console.log(`   Merchants created: ${createdMerchants}`);
    }
    console.log(`   Products created:  ${createdProducts}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Errors (${errors.length}):`);
      errors.slice(0, 10).forEach((e) => console.log(`   • ${e}`));
      if (errors.length > 10)
        console.log(`   ... and ${errors.length - 10} more`);
    }

    if (isDryRun) {
      console.log("\n⚠️  DRY RUN — No data was written to the database.");
    }

    // ── Safety Verification ─────────────────────────────
    if (!isDryRun) {
      try {
        const unsplashProducts = await Product.find({
          image: /images\.unsplash\.com/i,
        }).lean();

        if (unsplashProducts.length > 0) {
          console.warn(
            `\n⚠️  ${unsplashProducts.length} product(s) still have Unsplash URLs!`,
          );
          unsplashProducts.forEach((p) =>
            console.warn(`   • ${p.name} → ${p.image}`),
          );
        } else {
          console.log("\n✅ All product images verified — zero Unsplash URLs.");
        }
      } catch (verifyErr) {
        console.warn(`\n⚠️  Safety verification failed: ${verifyErr.message}`);
      }
    }

    console.log(`\n🎉 Seed completed!\n`);
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed failed:", error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach((key) => {
        console.error(`   Field "${key}": ${error.errors[key].message}`);
      });
    }
    if (error.code === 11000) {
      console.error(
        "   Duplicate key error. Run with --reset to clear existing data.",
      );
    }
    console.error(error.stack);
    process.exit(1);
  }
};

seedData();
