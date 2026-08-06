/**
 * fix_favicons.js
 * 
 * 1. Replaces Cloudinary favicon links in storefront HTML with /assets/logo.webp
 * 2. Injects a <link rel="icon"> with inline SVG data-URI into all admin HTML files (no network request)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');
const ADMIN = path.join(FRONTEND, 'admin');

// Tiny inline SVG favicon — a shopping bag icon matching admin theme color #0f766e
// Used as data-URI so it costs zero network requests
const INLINE_FAVICON = `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230f766e'><path d='M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z'/><line x1='3' y1='6' x2='21' y2='6' stroke='white' stroke-width='2'/><path d='M16 10a4 4 0 0 1-8 0' fill='none' stroke='white' stroke-width='2'/></svg>" type="image/svg+xml">`;

// Storefront favicon: replace Cloudinary URL with local asset
const CLOUDINARY_FAVICON_PATTERN = /https:\/\/res\.cloudinary\.com\/sundura\/image\/upload\/v1778758433\/ecommerce-uploads\/1778758432917-917399313\.png/g;
const LOCAL_FAVICON = '/assets/logo.webp';

// ── 1. Fix storefront HTML favicon links ──────────────────────────────────────
const storefrontFiles = fs.readdirSync(FRONTEND)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(FRONTEND, f));

let storefrontFixed = 0;
for (const filePath of storefrontFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (CLOUDINARY_FAVICON_PATTERN.test(content)) {
    content = content.replace(CLOUDINARY_FAVICON_PATTERN, LOCAL_FAVICON);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Fixed storefront favicon: ${path.basename(filePath)}`);
    storefrontFixed++;
  }
  // Reset lastIndex after test()
  CLOUDINARY_FAVICON_PATTERN.lastIndex = 0;
}
console.log(`\nStorefront: fixed ${storefrontFixed} file(s)\n`);

// ── 2. Inject inline favicon into admin HTML files ────────────────────────────
const adminFiles = fs.readdirSync(ADMIN)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(ADMIN, f));

let adminFixed = 0;
for (const filePath of adminFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has a favicon link
  if (content.includes('rel="icon"')) {
    console.log(`  ⏭  Already has icon: ${path.basename(filePath)}`);
    continue;
  }
  
  // Insert after <meta charset="UTF-8">
  const charsetTag = '<meta charset="UTF-8">';
  if (content.includes(charsetTag)) {
    content = content.replace(charsetTag, `${charsetTag}\n  ${INLINE_FAVICON}`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Added favicon: ${path.basename(filePath)}`);
    adminFixed++;
  } else {
    console.log(`  ⚠️  Could not find charset tag in: ${path.basename(filePath)}`);
  }
}
console.log(`\nAdmin: added favicon to ${adminFixed} file(s)`);
