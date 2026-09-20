const https = require('https');

// 1. Login
const reqLogin = https.request('https://moneymate-backend-ten.vercel.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const json = JSON.parse(data);
    const token = json.token;
    console.log('Login token received?', !!token);
    
    if (token) {
      // 2. Chat
      const reqChat = https.request('https://moneymate-backend-ten.vercel.app/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, (chatRes) => {
        let chatData = '';
        chatRes.on('data', d => chatData += d);
        chatRes.on('end', () => {
          console.log('Chat status:', chatRes.statusCode);
          console.log('Chat data:', chatData);
        });
      });
      reqChat.write(JSON.stringify({ message: 'Hello' }));
      reqChat.end();
    } else {
      console.log('Login failed:', data);
    }
  });
});

// We'll create a new test user to be safe
const testUser = { name: 'Test', email: 'test' + Date.now() + '@example.com', password: 'password123' };

const reqRegister = https.request('https://moneymate-backend-ten.vercel.app/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Register token received?', !!json.token);
    
    if (json.token) {
      // 2. Chat
      const reqChat = https.request('https://moneymate-backend-ten.vercel.app/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${json.token}`
        }
      }, (chatRes) => {
        let chatData = '';
        chatRes.on('data', d => chatData += d);
        chatRes.on('end', () => {
          console.log('Chat status:', chatRes.statusCode);
          console.log('Chat data:', chatData);
        });
      });
      reqChat.write(JSON.stringify({ message: 'Hello' }));
      reqChat.end();
    } else {
      console.log('Register failed:', data);
    }
  });
});

reqRegister.write(JSON.stringify(testUser));
reqRegister.end();
