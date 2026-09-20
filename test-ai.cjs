const https = require('https');

const req = https.request('https://moneymate-backend-ten.vercel.app/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-demo-user-id': 'test'
  }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('AI status:', res.statusCode);
    console.log('AI data:', data);
  });
});

req.write(JSON.stringify({ message: 'Hello' }));
req.end();
