import axios from 'axios';

const queries = [
  'current Prime Minister of the UK',
  'who won the Super Bowl in 2026',
  'current price of Ethereum'
];

const searchYahoo = async (query) => {
  try {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });
    
    const html = response.data;
    const results = [];
    const blocks = html.split(/<div[^>]*class="[^"]*\balgo-sr\b[^"]*"/);
    
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      
      const ruMatch = block.match(/href="[^"]*RU=([^"&]+)[^"]*"/);
      if (!ruMatch) continue;
      
      let targetUrl = decodeURIComponent(ruMatch[1]);
      const cleanUrlMatch = targetUrl.match(/^(https?:\/\/[^\/]+(?:\/[^\/]+)*\/?)/);
      if (cleanUrlMatch) {
        targetUrl = cleanUrlMatch[1];
      }
      
      if (!targetUrl.startsWith('http') || targetUrl.includes('yahoo.com') || targetUrl.includes('yimg.com')) {
        continue;
      }
      
      const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || block.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      let title = "";
      if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      }
      
      const snippetMatch = block.match(/<div class="compText[^"]*">([\s\S]*?)<\/div>/) || 
                           block.match(/<p class="[^"]*(?:fc-dustygray|fc-gray)[^"]*">([\s\S]*?)<\/p>/);
      let snippet = "";
      if (snippetMatch) {
        snippet = snippetMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      }
      
      if (title && (snippet || targetUrl)) {
        results.push({ url: targetUrl, title, snippet });
      }
    }
    return results;
  } catch (err) {
    console.error(`Search failed for "${query}":`, err.message);
    return [];
  }
};

for (const query of queries) {
  console.log(`\n🔍 Searching Yahoo for: "${query}"...`);
  const results = await searchYahoo(query);
  console.log(`Found ${results.length} results.`);
  results.slice(0, 3).forEach((r, i) => {
    console.log(`  Result #${i + 1}:`);
    console.log(`   - Title: ${r.title}`);
    console.log(`   - URL:   ${r.url}`);
    console.log(`   - Snippet: ${r.snippet}`);
  });
}
