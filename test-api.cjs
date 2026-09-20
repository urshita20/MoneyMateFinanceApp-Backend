const https = require('https');

const req = https.request('https://moneymate-backend-ten.vercel.app/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('Login status:', res.statusCode);
    console.log('Login data:', data);
  });
});

req.write(JSON.stringify({ email: 'demo@moneymate.com', password: 'password' }));
req.end();
