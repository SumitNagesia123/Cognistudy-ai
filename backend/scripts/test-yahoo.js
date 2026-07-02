import axios from 'axios';
import fs from 'fs';

const query = 'price of Bitcoin today';
const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;

try {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    timeout: 5000
  });
  
  console.log('Status:', response.status);
  const html = response.data;
  fs.writeFileSync('scripts/yahoo-search.html', html);
  console.log('Saved yahoo-search.html');
  
  // Let's check if there are results
  // Yahoo search results usually have class "compText" or links inside "compTitle"
  const hasResults = html.includes('yahoo.com') && html.includes('href=');
  console.log('Includes Yahoo domain:', html.includes('yahoo.com'));
  console.log('Includes href:', html.includes('href='));
  
  // Let's see if we can find any external links or snippet text
  const links = [];
  const matches = html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g);
  for (const match of matches) {
    const href = match[1];
    if (href.startsWith('http') && !href.includes('yahoo.com') && !href.includes('yimg.com')) {
      links.push(href);
    }
  }
  console.log('External links count:', links.length);
  if (links.length > 0) {
    console.log('First 5 external links:', links.slice(0, 5));
  }
} catch (err) {
  console.error('Error:', err.message);
}
