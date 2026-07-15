import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public/icons");
const publicDir = join(root, "public");
const appDir = join(root, "src/app");
const source = join(iconsDir, "icon-source.png");

if (!existsSync(source)) {
  console.error("Missing icon source: public/icons/icon-source.png");
  process.exit(1);
}

mkdirSync(iconsDir, { recursive: true });

async function resize(input, output, size) {
  await sharp(input)
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(output);
}

for (const size of [192, 512]) {
  await resize(source, join(iconsDir, `icon-${size}.png`), size);
}

copyFileSync(
  join(iconsDir, "icon-512.png"),
  join(iconsDir, "icon-maskable-512.png")
);

await resize(source, join(appDir, "icon.png"), 32);
await resize(source, join(appDir, "apple-icon.png"), 180);
await resize(source, join(publicDir, "apple-touch-icon.png"), 180);

console.log("PWA icons generated from public/icons/icon-source.png");
