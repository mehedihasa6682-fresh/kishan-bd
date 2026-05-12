const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminPanel.tsx', 'utf8');

// Replace black/dark gray backgrounds
content = content.replace(/bg-black(\/[0-9]+)?/g, 'bg-white');
content = content.replace(/bg-\[\#121212\]/g, 'bg-white');
// White borders to light gray borders
content = content.replace(/border-white\/([0-9]+)/g, 'border-[#ECECEC]');
content = content.replace(/border-white/g, 'border-[#ECECEC]');

// White background variations to light gray background variations
content = content.replace(/bg-white\/5/g, 'bg-[#F9FAFB]');
content = content.replace(/bg-white\/10/g, 'bg-[#F9FAFB]');

// Replace secondary to primary
content = content.replace(/bg-secondary(?!\w)/g, 'bg-[#E21E26]');
content = content.replace(/bg-secondary\/([0-9]+)/g, 'bg-[#E21E26]/$1');
content = content.replace(/text-secondary(?!\w)/g, 'text-[#E21E26]');
content = content.replace(/text-secondary\/([0-9]+)/g, 'text-[#E21E26]/$1');
content = content.replace(/border-secondary(?!\w)/g, 'border-[#E21E26]');
content = content.replace(/border-secondary\/([0-9]+)/g, 'border-[#E21E26]/$1');

// Text colors
content = content.replace(/text-white\/[0-9]+/g, 'text-[#6B7280]');
content = content.replace(/text-white(?!\w)/g, 'text-[#111111]');

fs.writeFileSync('src/pages/AdminPanel.tsx', content);
console.log('Colors updated.');
