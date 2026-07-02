import fs from 'fs';

const html = fs.readFileSync('scripts/google.html', 'utf8');

console.log('HTML length:', html.length);
console.log('Includes url?q=:', html.includes('url?q='));
console.log('Includes /search?:', html.includes('/search?'));
console.log('Includes <a href=":', html.includes('<a href="'));

// Let's find some links that look like actual search results
const linkMatches = [];
const matches = html.matchAll(/<a href="([^"]+)"/g);
for (const match of matches) {
  const url = match[1];
  if (url.includes('google.com') || url.startsWith('/') || url.startsWith('#')) continue;
  linkMatches.push(url);
}

console.log('Non-Google links count:', linkMatches.length);
console.log('First 20 non-Google links:', linkMatches.slice(0, 20));

// Let's search for snippet indicators like class names or text paragraphs
const classes = new Set();
const classMatches = html.matchAll(/class="([^"]+)"/g);
for (const match of classMatches) {
  match[1].split(' ').forEach(c => classes.add(c));
}
console.log('Found classes:', Array.from(classes).slice(0, 50));
