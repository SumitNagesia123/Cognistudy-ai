import fs from 'fs';

const html = fs.readFileSync('scripts/yahoo-search.html', 'utf8');

// Split by <div class="...algo-sr..." or similar
const blocks = html.split(/<div[^>]*class="[^"]*\balgo-sr\b[^"]*"/);
console.log('Total blocks split:', blocks.length);

for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  const ruMatch = block.match(/href="[^"]*RU=([^"&]+)[^"]*"/);
  const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || block.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>/);
  const snippetMatch = block.match(/<div class="compText[^"]*">([\s\S]*?)<\/div>/) || 
                       block.match(/<p class="[^"]*(?:fc-dustygray|fc-gray)[^"]*">([\s\S]*?)<\/p>/);
                       
  console.log(`Block #${i}:`);
  console.log(` - Has URL:`, !!ruMatch, ruMatch ? decodeURIComponent(ruMatch[1]).slice(0, 60) : '');
  console.log(` - Has Title:`, !!titleMatch, titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 60) : '');
  console.log(` - Has Snippet:`, !!snippetMatch, snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 60) : '');
}
