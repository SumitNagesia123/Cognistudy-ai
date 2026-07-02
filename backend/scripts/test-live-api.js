import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000
});

const runTests = async () => {
  try {
    // 1. Register a temporary test user
    const email = `testuser_${Date.now()}@example.com`;
    const password = 'Password123!';
    console.log(`Registering temporary user: ${email}...`);
    const regRes = await api.post('/auth/register', {
      name: 'Test User',
      email,
      password
    });
    
    const token = regRes.data.token;
    console.log('Successfully registered and obtained auth token.');
    
    // Set Auth header
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 2. Test /chat with date query
    console.log('\nSending chat message: "What is today\'s date and day of the week?"');
    const chatDateRes = await api.post('/chat', {
      message: "What is today's date and day of the week?"
    });
    console.log('--- Chat Date Response ---');
    console.log(chatDateRes.data.result);
    
    // 3. Test /chat with Ethereum price query
    console.log('\nSending chat message: "What is the current price of Ethereum?"');
    const chatEthRes = await api.post('/chat', {
      message: "What is the current price of Ethereum?"
    });
    console.log('--- Chat Ethereum Price Response ---');
    console.log(chatEthRes.data.result);

    // 4. Test /summary with date query
    console.log('\nSending summary text: "What is today\'s date?"');
    const summaryRes = await api.post('/summary', {
      text: "What is today's date?"
    });
    console.log('--- Summary Date Response ---');
    console.log(summaryRes.data.result);
    
  } catch (err) {
    console.error('Test execution failed:', err.response?.data || err.message);
  }
};

runTests();
