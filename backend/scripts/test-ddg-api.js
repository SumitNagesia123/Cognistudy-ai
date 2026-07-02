import axios from 'axios';

const query = 'price of Bitcoin';
const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

try {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'CogniStudy/1.0 (contact@cognistudy.com)'
    },
    timeout: 5000
  });
  
  console.log('Status:', response.status);
  console.log('Keys:', Object.keys(response.data));
  console.log('Abstract:', response.data.AbstractText);
  console.log('Answer:', response.data.Answer);
  console.log('Results:', response.data.Results);
  console.log('RelatedTopics:', response.data.RelatedTopics?.slice(0, 3));
} catch (err) {
  console.error('Error:', err.message);
}
