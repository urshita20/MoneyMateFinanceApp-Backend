async function run() {
  const r = await fetch('https://moneymate-backend-ten.vercel.app/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'test_live_7', email: 'test_live_7@test.com', password: 'password123' })
  }).then(r => r.json());
  
  if (!r.token) {
    const l = await fetch('https://moneymate-backend-ten.vercel.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_live_7@test.com', password: 'password123' })
    }).then(l => l.json());
    r.token = l.token;
  }

  const c = await fetch('https://moneymate-backend-ten.vercel.app/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${r.token}` },
    body: JSON.stringify({ message: 'hello' })
  }).then(c => c.json());

  console.log(c);
}
run();
