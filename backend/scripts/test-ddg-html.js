import axios from 'axios';
import fs from 'fs';

const query = 'price of Bitcoin today';
const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

try {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  console.log('Status:', response.status);
  const html = response.data;
  fs.writeFileSync('scripts/ddg-html.html', html);
  console.log('Saved ddg-html.html');
  
  // Let's check if there are results
  // DuckDuckGo HTML results are usually links inside class "result__snippet"
  const results = [];
  const matches = html.matchAll(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g);
  for (const match of matches) {
    const text = match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (text) results.push(text);
  }
  
  console.log('Results count:', results.length);
  console.log('Snippets:', results.slice(0, 5));
} catch (err) {
  console.error('Error:', err.message);
}
