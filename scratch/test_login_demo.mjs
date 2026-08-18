async function test() {
  const users = [
    { username: "juan.delacruz", pass: "employee123" },
    { username: "maria.santos", pass: "employee123" },
    { username: "pedro.reyes", pass: "employee123" },
  ];

  for (const u of users) {
    const res = await fetch("https://pademco-loan-monitoring.vercel.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u.username, password: u.pass }),
    });
    const data = await res.json();
    console.log(`User ${u.username}: status=${res.status}`, data);
  }
}

test();
