/**
 * revert_favicons.js
 * 
 * Removes all favicon link tags that were added by fix_favicons.js:
 * 1. Removes inline SVG <link rel="icon"> from all admin HTML files
 * 2. Reverts storefront <link rel="icon"> from /assets/logo.webp back to original Cloudinary URL
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');
const ADMIN = path.join(FRONTEND, 'admin');

const INLINE_FAVICON_PATTERN = /\n?\s*<link rel="icon" href="data:image\/svg\+xml,[^"]*" type="image\/svg\+xml">/g;

// Original Cloudinary favicon URL that was in storefront pages
const ORIGINAL_FAVICON_URL = 'https://res.cloudinary.com/sundura/image/upload/v1778758433/ecommerce-uploads/1778758432917-917399313.png';

// ── 1. Remove inline SVG favicon from all admin HTML files ────────────────────
const adminFiles = fs.readdirSync(ADMIN)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(ADMIN, f));

let adminFixed = 0;
for (const filePath of adminFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (INLINE_FAVICON_PATTERN.test(content)) {
    INLINE_FAVICON_PATTERN.lastIndex = 0;
    content = content.replace(INLINE_FAVICON_PATTERN, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Removed inline favicon: ${path.basename(filePath)}`);
    adminFixed++;
  }
  INLINE_FAVICON_PATTERN.lastIndex = 0;
}
console.log(`\nAdmin: removed inline favicon from ${adminFixed} file(s)\n`);

// ── 2. Revert storefront <link rel="icon"> from /assets/logo.webp ─────────────
// Some were single-line, some multi-line with a line break between link and href
const storefrontFiles = fs.readdirSync(FRONTEND)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(FRONTEND, f));

// Replace the local /assets/logo.webp favicon back to original Cloudinary URL
const LOCAL_FAVICON_PATTERN = /(<link rel="icon"[\s\S]*?href=")(\/assets\/logo\.webp)(")/g;

let storefrontFixed = 0;
for (const filePath of storefrontFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  LOCAL_FAVICON_PATTERN.lastIndex = 0;
  if (LOCAL_FAVICON_PATTERN.test(content)) {
    LOCAL_FAVICON_PATTERN.lastIndex = 0;
    content = content.replace(LOCAL_FAVICON_PATTERN, `$1${ORIGINAL_FAVICON_URL}$3`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Reverted storefront favicon: ${path.basename(filePath)}`);
    storefrontFixed++;
  }
  LOCAL_FAVICON_PATTERN.lastIndex = 0;
}
console.log(`\nStorefront: reverted favicon in ${storefrontFixed} file(s)`);
