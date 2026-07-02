import axios from 'axios';

const query = 'Who won the 2026 Super Bowl?';
const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

try {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  console.log('Status:', response.status);
  const html = response.data;
  
  // Basic regex to find snippets
  const snippets = [];
  const matches = html.matchAll(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g);
  for (const match of matches) {
    const text = match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (text) snippets.push(text);
  }
  
  console.log('Snippets count:', snippets.length);
  console.log('Top Snippets:', snippets.slice(0, 5));
} catch (err) {
  console.error('Error:', err.message);
}
