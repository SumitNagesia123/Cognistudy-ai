import axios from 'axios';
import fs from 'fs';

const query = 'price of Bitcoin today';

const uas = {
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  firefox_esr: 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0',
  lynx: 'Lynx/2.8.9rel.1 libwww-FM/2.14 SSL-MM/1.4.1 OpenSSL/1.1.1d',
  w3m: 'w3m/0.5.3',
  curl: 'curl/7.68.0'
};

for (const [name, ua] of Object.entries(uas)) {
  try {
    const headers = { 'User-Agent': ua };
    const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}`, {
      headers,
      timeout: 5000
    });
    
    console.log(`UA [${name}] Status:`, response.status);
    const html = response.data;
    
    const hasRedirect = html.includes('enablejs');
    const hasUnsupported = html.includes('not supported anymore') || html.includes('Update your browser');
    const hasSearchLinks = html.includes('url?q=');
    const hasRegularLinks = html.includes('<a href="https://');
    
    console.log(`  - Has Redirect:`, hasRedirect);
    console.log(`  - Has Unsupported Wall:`, hasUnsupported);
    console.log(`  - Has search links (url?q=):`, hasSearchLinks);
    console.log(`  - Has regular links (href="https://):`, hasRegularLinks);
    
    if (!hasRedirect && !hasUnsupported) {
      fs.writeFileSync(`scripts/google-${name}.html`, html);
      console.log(`  - Saved scripts/google-${name}.html (Length: ${html.length})`);
    }
  } catch (err) {
    console.error(`UA [${name}] Error:`, err.message);
  }
}
