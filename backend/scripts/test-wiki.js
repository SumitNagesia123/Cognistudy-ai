import axios from 'axios';

const query = 'Who won the 2026 Super Bowl?';
const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;

try {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'CogniStudy/1.0 (contact@cognistudy.com)'
    }
  });
  console.log('Status:', response.status);
  const data = response.data;
  
  const searchResults = data?.query?.search || [];
  console.log('Results count:', searchResults.length);
  
  const formattedResults = searchResults.map(result => {
    // Strip HTML tags from snippet
    const snippet = result.snippet.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').trim();
    return `- **${result.title}**: ${snippet}`;
  }).join('\n');
  
  console.log('Formatted Results:\n', formattedResults);
} catch (err) {
  console.error('Error:', err.message);
}
