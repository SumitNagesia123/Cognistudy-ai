import fs from 'fs';

const html = fs.readFileSync('scripts/yahoo-search.html', 'utf8');

const matches = html.matchAll(/<div[^>]+class="([^"]+)"/g);
const classes = [];
for (const match of matches) {
  const cls = match[1];
  if (cls.includes('algo') || cls.includes('dd')) {
    classes.push(cls);
  }
}

console.log('Found dd/algo classes:', classes.slice(0, 30));
