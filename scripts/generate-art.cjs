// Regenerates the demo SVG artwork in public/img (hero, about, product and category placeholders).
// Usage: npm run generate-art
const fs = require('node:fs');
const path = require('node:path');
const art = require('./art.cjs');

const img = path.join(__dirname, '..', 'public', 'img');
const products = path.join(img, 'products');
fs.mkdirSync(products, { recursive: true });
fs.writeFileSync(path.join(img, 'hero.svg'), art.hero());
fs.writeFileSync(path.join(img, 'about.svg'), art.about());
fs.writeFileSync(path.join(products, 'repairs.svg'), art.svg('tools'));
console.log('Artwork written to public/img');
