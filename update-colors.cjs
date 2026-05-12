const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminPanel.tsx', 'utf8');

// Replace black/dark gray backgrounds
content = content.replace(/bg-black(?:\/([0-9]+))?/g, (match, p1) => p1 ? 'bg-black/5' : 'bg-[#F9FAFB]');
content = content.replace(/bg-\[\#121212\]/g, 'bg-[#F9FAFB]');
content = content.replace(/bg-\[#0F0F0F\]/g, 'bg-white');
content = content.replace(/bg-\[#1A1A1A\]/g, 'bg-[#F9FAFB]');

// White borders to light gray borders
content = content.replace(/border-white\/[0-9]+/g, 'border-[#ECECEC]');
content = content.replace(/border-white(?![\w])/g, 'border-[#ECECEC]');

// White background variations to light gray background variations
content = content.replace(/bg-white\/[0-9]+/g, 'bg-[#ECECEC]');

// Replace secondary to primary
content = content.replace(/bg-secondary(?!\w)/g, 'bg-[#E21E26]');
content = content.replace(/bg-secondary\/([0-9]+)/g, 'bg-[#E21E26]/$1');
content = content.replace(/text-secondary(?!\w)/g, 'text-[#E21E26]');
content = content.replace(/text-secondary\/([0-9]+)/g, 'text-[#E21E26]/$1');
content = content.replace(/border-secondary(?!\w)/g, 'border-[#E21E26]');
content = content.replace(/border-secondary\/([0-9]+)/g, 'border-[#E21E26]/$1');
content = content.replace(/shadow-secondary\/([0-9]+)/g, 'shadow-[#E21E26]/$1');

// Text colors
content = content.replace(/text-white\/[0-9]+/g, 'text-[#6B7280]');
content = content.replace(/text-white(?!\w)/g, 'text-[#111111]');

fs.writeFileSync('src/pages/AdminPanel.tsx', content);
console.log('Colors updated.');
