const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  '    app.get("/api/users/:username/password", requireAuth, async (req, res) => {',
  '    app.get("/api/users/:username/password", requireAuth, requireRole("WEBMASTER"), async (req, res) => {'
);

fs.writeFileSync('server.ts', code);
