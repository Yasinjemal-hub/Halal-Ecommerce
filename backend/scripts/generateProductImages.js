import "../config/env.js";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.resolve(__dirname, "..", "seed.js");
const PROGRESS_FILE = path.resolve(
  __dirname,
  "..",
  ".product-image-progress.json",
);

const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 2000;

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function log(level, msg, data) {
  const prefix = {
    info: "[INFO]",
    ok: " [OK]",
    warn: "[WARN]",
    error: "[ERR]",
    step: "[STEP]",
    skip: "[SKIP]",
  }[level] || "[INFO]";
  const line = `${prefix} ${msg}`;
  console.log(line);
  if (data !== undefined) {
    console.log(`       ${JSON.stringify(data)}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractProducts(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const categoryStartIdx = lines.findIndex((l) =>
    l.includes("const categoryProducts"),
  );
  if (categoryStartIdx === -1) {
    throw new Error("Could not find const categoryProducts in seed.js");
  }

  let categoryEndIdx = -1;
  let braceDepth = 0;
  let inCategoryProducts = false;
  for (let i = categoryStartIdx; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.includes("{") && !inCategoryProducts) {
      inCategoryProducts = true;
    }
    if (inCategoryProducts) {
      for (const ch of lines[i]) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      if (braceDepth === 0 && i > categoryStartIdx) {
        categoryEndIdx = i;
        break;
      }
    }
  }

  if (categoryEndIdx === -1) {
    throw new Error("Could not find end of categoryProducts block");
  }

  const blockLines = lines.slice(categoryStartIdx, categoryEndIdx + 1);
  const products = [];

  let i = 0;
  while (i < blockLines.length) {
    const line = blockLines[i];

    const nameMatch = line.match(/^\s*name:\s*"([^"]+)",\s*$/);
    if (!nameMatch) {
      i++;
      continue;
    }

    const productName = nameMatch[1];

    const imageLineMatch = blockLines
      .slice(i, i + 6)
      .find((l) => l.includes('image: "'));

    let imageLineIdx = -1;
    let imageUrl = "";
    if (imageLineMatch) {
      const idxInBlock = i + blockLines.slice(i, i + 6).indexOf(imageLineMatch);
      const urlMatch = imageLineMatch.match(/image:\s*"([^"]+)"/);
      if (urlMatch) {
        imageUrl = urlMatch[1];
        imageLineIdx = categoryStartIdx + idxInBlock;
      }
    }

    const nameAmharicMatch = blockLines
      .slice(i, i + 6)
      .find((l) => l.includes("nameAmharic:"));

    let nameAmharic = "";
    if (nameAmharicMatch) {
      const amMatch = nameAmharicMatch.match(/nameAmharic:\s*"([^"]+)"/);
      if (amMatch) {
        nameAmharic = amMatch[1];
      }
    }

    const descMatch = blockLines
      .slice(i, i + 8)
      .find((l) => l.includes("desc:"));

    let description = "";
    if (descMatch) {
      const dMatch = descMatch.match(/desc:\s*"([^"]+)"/);
      if (dMatch) {
        description = dMatch[1];
      }
    }

    const catMatch = blockLines
      .slice(i, i + 10)
      .find((l) => l.includes("category:"));

    let category = "";
    if (catMatch) {
      const cMatch = catMatch.match(/category:\s*"([^"]+)"/);
      if (cMatch) {
        category = cMatch[1];
      }
    }

    if (imageLineIdx !== -1 && imageUrl) {
      products.push({
        name: productName,
        nameAmharic,
        description,
        category,
        imageUrl,
        imageLineIdx,
      });
    }

    i++;
  }

  return { products, lines, categoryStartIdx, categoryEndIdx };
}

function buildSearchQuery(product) {
  const parts = [product.name, product.nameAmharic, product.description];
  const query = parts
    .filter(Boolean)
    .join(" ")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const ethiopianPrefixes = [
    "Ethiopian",
    "Ethiopia",
    "Habesha",
    "traditional",
    "African",
  ];

  if (
    !ethiopianPrefixes.some((p) =>
      query.toLowerCase().includes(p.toLowerCase()),
    )
  ) {
    return `Ethiopian ${query}`;
  }

  return query;
}

async function searchPexels(query) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    log("warn", "No PEXELS_API_KEY set, skipping Pexels search");
    return null;
  }

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=square`;

  try {
    const resp = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      log("warn", `Pexels returned ${resp.status} for "${query}"`);
      return null;
    }

    const data = await resp.json();
    if (!data.photos || data.photos.length === 0) {
      log("warn", `No Pexels results for "${query}"`);
      return null;
    }

    const photo = data.photos[0];
    const imageUrl = photo.src?.large || photo.src?.original;
    const photographer = photo.photographer;

    if (!imageUrl) {
      return null;
    }

    return {
      url: imageUrl,
      source: "pexels",
      photographer,
      alt: photo.alt || query,
    };
  } catch (err) {
    log("warn", `Pexels search failed for "${query}": ${err.message}`);
    return null;
  }
}

async function searchPixabay(query) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    log("warn", "No PIXABAY_API_KEY set, skipping Pixabay search");
    return null;
  }

  const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=10&image_type=photo&orientation=horizontal&safesearch=true`;

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      log("warn", `Pixabay returned ${resp.status} for "${query}"`);
      return null;
    }

    const data = await resp.json();
    if (!data.hits || data.hits.length === 0) {
      log("warn", `No Pixabay results for "${query}"`);
      return null;
    }

    const hit = data.hits[0];

    return {
      url: hit.largeImageURL || hit.webformatURL,
      source: "pixabay",
      photographer: hit.user,
      alt: hit.tags || query,
    };
  } catch (err) {
    log("warn", `Pixabay search failed for "${query}": ${err.message}`);
    return null;
  }
}

async function searchWikimedia(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=10&srnamespace=6`;

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      log("warn", `Wikimedia returned ${resp.status} for "${query}"`);
      return null;
    }

    const data = await resp.json();
    const results = data?.query?.search;

    if (!results || results.length === 0) {
      log("warn", `No Wikimedia results for "${query}"`);
      return null;
    }

    for (const result of results) {
      const pageTitle = result.title;
      const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(pageTitle)}?width=800`;

      try {
        const headResp = await fetch(imageUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        });
        if (headResp.ok) {
          return {
            url: imageUrl,
            source: "wikimedia",
            photographer: "",
            alt: pageTitle,
          };
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch (err) {
    log("warn", `Wikimedia search failed for "${query}": ${err.message}`);
    return null;
  }
}

async function downloadImage(url) {
  const ext = path.extname(new URL(url).pathname) || ".jpg";
  const tmpFile = path.join(
    os.tmpdir(),
    `halal-image-${crypto.randomUUID()}${ext}`,
  );

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      throw new Error(`Download failed: HTTP ${resp.status}`);
    }

    const buffer = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(tmpFile, buffer);

    return tmpFile;
  } catch (err) {
    if (fs.existsSync(tmpFile)) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
    }
    throw err;
  }
}

async function uploadToCloudinary(filePath, productName) {
  const publicId = `products/${productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      folder: "products",
      resource_type: "image",
      overwrite: true,
      transformation: [
        { width: 600, height: 400, crop: "fit", quality: "auto" },
      ],
    });

    return result.secure_url;
  } catch (err) {
    throw new Error(`Cloudinary upload failed: ${err.message}`);
  } finally {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
  }
}

function updateSeedFile(filePath, oldUrl, newUrl) {
  let content = fs.readFileSync(filePath, "utf-8");

  if (!content.includes(oldUrl)) {
    throw new Error(`URL not found in seed.js: ${oldUrl}`);
  }

  content = content.replace(oldUrl, newUrl);
  fs.writeFileSync(filePath, content, "utf-8");
  return true;
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), "utf-8");
  } catch (err) {
    log("warn", `Failed to save progress: ${err.message}`);
  }
}

function isCloudinaryUrl(url) {
  return url.includes("res.cloudinary.com");
}

async function processProduct(product) {
  const { name, imageUrl, imageLineIdx } = product;

  if (isCloudinaryUrl(imageUrl)) {
    log("skip", `Already has Cloudinary URL: "${name}"`);
    return { status: "skipped", reason: "already cloudinary" };
  }

  const query = buildSearchQuery(product);
  log("info", `Searching: "${name}"`);
  log("info", `  Query: "${query}"`);

  let imageResult = null;

  imageResult = await searchPexels(query);

  if (!imageResult) {
    imageResult = await searchPixabay(query);
  }

  if (!imageResult) {
    imageResult = await searchWikimedia(query);
  }

  if (!imageResult) {
    log("warn", `No image found for "${name}" from any source`);
    return { status: "failed", reason: "no image source returned results" };
  }

  log("ok", `  Found: ${imageResult.url} (${imageResult.source})`);

  let downloadedPath;
  try {
    downloadedPath = await downloadImage(imageResult.url);
    log("ok", `  Downloaded to temp: ${path.basename(downloadedPath)}`);
  } catch (err) {
    log("error", `  Download failed: ${err.message}`);
    return { status: "failed", reason: `download failed: ${err.message}` };
  }

  let cloudinaryUrl;
  try {
    cloudinaryUrl = await uploadToCloudinary(downloadedPath, name);
    log("ok", `  Uploaded: ${cloudinaryUrl}`);
  } catch (err) {
    log("error", `  Upload failed: ${err.message}`);
    return { status: "failed", reason: `upload failed: ${err.message}` };
  }

  try {
    updateSeedFile(SEED_FILE, imageUrl, cloudinaryUrl);
    log("ok", `  Updated seed.js with new URL`);
  } catch (err) {
    log("error", `  seed.js update failed: ${err.message}`);
    return { status: "failed", reason: `update failed: ${err.message}` };
  }

  return {
    status: "success",
    oldUrl: imageUrl,
    newUrl: cloudinaryUrl,
    source: imageResult.source,
  };
}

async function main() {
  console.log("\n============================================");
  console.log("  Halal Ecommerce - Product Image Generator");
  console.log("============================================\n");

  const dryRun = process.argv.includes("--dry-run");

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    if (dryRun) {
      log(
        "warn",
        "CLOUDINARY_CLOUD_NAME not set. Dry-run will parse and log intended actions only.",
      );
    } else {
      console.error(
        "ERROR: CLOUDINARY_CLOUD_NAME is not set. Configure all Cloudinary env vars first.",
      );
      console.error(
        "Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
      );
      console.error(
        "Optional: PEXELS_API_KEY, PIXABAY_API_KEY (for better image search)",
      );
      process.exit(1);
    }
  }

  if (!process.env.PEXELS_API_KEY && !process.env.PIXABAY_API_KEY) {
    log(
      "warn",
      "No PEXELS_API_KEY or PIXABAY_API_KEY set. Will only search Wikimedia Commons.\n" +
        "       Get a free Pexels API key at https://www.pexels.com/api/",
    );
  }
  if (dryRun) {
    log("info", "DRY RUN — No images will be downloaded, uploaded, or replaced.\n");
  }

  let products;
  let lines;
  try {
    const parsed = extractProducts(SEED_FILE);
    products = parsed.products;
    lines = parsed.lines;
  } catch (err) {
    log("error", `Failed to parse seed.js: ${err.message}`);
    process.exit(1);
  }

  log("info", `Found ${products.length} product templates in seed.js\n`);

  const progress = loadProgress();
  const summary = { success: 0, skipped: 0, failed: 0, total: products.length };

  for (let idx = 0; idx < products.length; idx++) {
    const product = products[idx];

    if (progress[product.name]?.status === "success") {
      log("skip", `Already completed: "${product.name}"`);
      summary.skipped++;
      continue;
    }

    const progressKey = `product_${idx}`;

    if (dryRun) {
      const query = buildSearchQuery(product);
      const wouldSkip = isCloudinaryUrl(product.imageUrl);
      log(
        wouldSkip ? "skip" : "step",
        `[${idx + 1}/${products.length}] "${product.name}"`,
      );
      log("info", `  Image URL: ${product.imageUrl}`);
      log("info", `  Status: ${wouldSkip ? "already Cloudinary, would skip" : "would search with query: " + query}`);
      if (!wouldSkip) summary.success++;
      else summary.skipped++;
      continue;
    }

    let lastError = null;
    let result = null;

    for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
      if (attempt > 1) {
        log("warn", `  Retry ${attempt}/${RETRY_LIMIT}...`);
        await delay(RETRY_DELAY_MS * attempt);
      }

      log(
        "step",
        `[${idx + 1}/${products.length}] Attempt ${attempt}/${RETRY_LIMIT}: "${product.name}"`,
      );

      result = await processProduct(product);

      if (result.status === "success" || result.status === "skipped") {
        break;
      }

      lastError = result.reason;
    }

    if (!result) {
      log("error", `Failed after ${RETRY_LIMIT} attempts for "${product.name}": ${lastError}`);
      summary.failed++;
      continue;
    }

    if (result.status === "success") {
      progress[product.name] = {
        status: "success",
        oldUrl: result.oldUrl,
        newUrl: result.newUrl,
        source: result.source,
        updatedAt: new Date().toISOString(),
      };
      saveProgress(progress);
      summary.success++;
    } else if (result.status === "skipped") {
      progress[product.name] = {
        status: "skipped",
        reason: result.reason,
        updatedAt: new Date().toISOString(),
      };
      saveProgress(progress);
      summary.skipped++;
    } else {
      progress[product.name] = {
        status: "failed",
        reason: result.reason,
        updatedAt: new Date().toISOString(),
      };
      saveProgress(progress);
      summary.failed++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("  COMPLETE");
  console.log("=".repeat(50));
  console.log(`  Total products:  ${summary.total}`);
  console.log(`  Successful:      ${summary.success}`);
  console.log(`  Skipped:         ${summary.skipped}`);
  console.log(`  Failed:          ${summary.failed}`);

  if (dryRun) {
    log("info", "\nDRY RUN complete — no changes were made.");
  }

  if (summary.failed > 0) {
    log(
      "warn",
      `\n${summary.failed} product(s) failed. Check logs above and re-run to retry.`,
    );
    process.exit(summary.success > 0 ? 0 : 1);
  }

  console.log("\nAll product images updated successfully!\n");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
