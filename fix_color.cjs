const fs = require('fs');
const glob = require('glob');
// Just manually listing them
const files = [
  'src/components/BottomNav.tsx',
  'src/components/Footer.tsx',
  'src/components/Auth.tsx',
  'src/components/AddressPicker.tsx',
  'src/components/LoadingScreen.tsx',
  'src/components/AddToCart.tsx',
  'src/components/QuickCheckoutToast.tsx',
  'src/pages/Wishlist.tsx',
  'src/pages/DynamicPage.tsx',
  'src/pages/NotFound.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Replace hex colors keeping the brackets if it's tailwind specific, or replace the tailwind classes entirely
    // e.g., text-[#E21E26] -> text-primary
    content = content.replace(/text-\[#E21E26\]/g, 'text-primary');
    content = content.replace(/bg-\[#E21E26\]/g, 'bg-primary');
    content = content.replace(/border-\[#E21E26\]/g, 'border-primary');
    content = content.replace(/from-\[#E21E26\]/g, 'from-primary');
    content = content.replace(/to-\[#E21E26\]/g, 'to-primary');
    content = content.replace(/shadow-\[#E21E26\]/g, 'shadow-primary');
    content = content.replace(/ring-\[#E21E26\]/g, 'ring-primary');
    
    // Sometimes it's #E21E26 instead of #E21E26
    const E21E26 = /#E21E26/g;
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Processed', file);
  }
}
