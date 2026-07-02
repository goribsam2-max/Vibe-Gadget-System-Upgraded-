const fs = require('fs');
const path = require('path');

const filesToPatch = [
  './components/ui/ProductCard.tsx',
  './components/ui/offers-carousel.tsx',
  './components/ui/flash-sale-carousel.tsx',
  './components/DesktopLayout.tsx',
  './components/MysteryBox.tsx',
  './pages/Profile.tsx',
  './pages/Cart.tsx',
  './pages/ProductDetails.tsx',
  './pages/BundleDeals.tsx',
  './pages/Checkout.tsx',
  './pages/Home.tsx',
];

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add formatPrice import if it doesn't exist
  if (!content.includes('formatPrice') && /৳/.test(content)) {
    // try to import nicely
    content = `import { formatPrice } from "@/lib/utils";\n` + content;
  }
  
  // Replace ৳{expr} with {formatPrice(expr)}
  content = content.replace(/৳\{([^\}]+)\}/g, '{formatPrice($1)}');
  
  // Replace ৳{{expr}} which might be invalid but lets catch it just in case
  // What about ৳100 ?
  content = content.replace(/৳(\d+(\.\d+)?)/g, ' {formatPrice($1)}');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched:', filePath);
}

filesToPatch.forEach(patchFile);
