const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminPanel.tsx', 'utf8');

// Replace text-[#111111] and text-black with text-white if adjacent to bg-[#E21E26]
content = content.replace(/bg-\[#E21E26\] text-\[#111111\]/g, 'bg-[#E21E26] text-white');
content = content.replace(/bg-\[#E21E26\] text-black/g, 'bg-[#E21E26] text-white');
// And reverse.
content = content.replace(/text-\[#111111\] bg-\[#E21E26\]/g, 'text-white bg-[#E21E26]');
content = content.replace(/text-black bg-\[#E21E26\]/g, 'text-white bg-[#E21E26]');

// One more pass: Sometimes there are classes between them
content = content.replace(/(bg-\[#E21E26\][^"]*)text-\[#111111\]/g, '$1text-white');
content = content.replace(/(bg-\[#E21E26\][^"]*)text-black/g, '$1text-white');

fs.writeFileSync('src/pages/AdminPanel.tsx', content);

// Also look at other pages where we might have the same issues.
const allFiles = fs.readdirSync('src/pages').map(f => 'src/pages/'+f);
allFiles.forEach(f => {
  if(f.endsWith('AdminPanel.tsx')) return;
  if(!f.endsWith('.tsx')) return;
  let text = fs.readFileSync(f, 'utf8');
  let original = text;
  text = text.replace(/bg-black(?:\/([0-9]+))?/g, (match, p1) => p1 ? 'bg-[#F9FAFB]' : 'bg-[#111111]');
  if(text !== original) {
    // Only if necessary... wait, no we don't want to mess up user app where a particular color is needed... 
  }
});

