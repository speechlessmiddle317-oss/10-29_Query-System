const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'res.json({ password: plainPassword });',
  'res.json({ success: true, username: targetUsername, password: plainPassword });'
);

fs.writeFileSync('server.ts', code);
