import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public/icons");
const appDir = join(root, "src/app");
const source = join(iconsDir, "icon-source.png");

if (!existsSync(source)) {
  console.error("Missing icon source: public/icons/icon-source.png");
  process.exit(1);
}

mkdirSync(iconsDir, { recursive: true });

function resize(input, output, size) {
  execSync(`sips -z ${size} ${size} "${input}" --out "${output}"`, {
    stdio: "ignore",
  });
}

for (const size of [192, 512]) {
  resize(source, join(iconsDir, `icon-${size}.png`), size);
}

copyFileSync(
  join(iconsDir, "icon-512.png"),
  join(iconsDir, "icon-maskable-512.png")
);

resize(source, join(appDir, "icon.png"), 32);
resize(source, join(appDir, "apple-icon.png"), 180);

console.log("PWA icons generated from public/icons/icon-source.png");
