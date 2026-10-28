const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const passEndpoints = `
  app.get("/api/users/passwords", requireAuth, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      if (currentUser.role !== "WEBMASTER") {
        return res.status(403).json({ error: "FORBIDDEN", message: "無權限查看密碼" });
      }
      const users = await mssql.getUsersWithPasswords();
      
      // Log this access
      await mssql.saveAuditLog({
        id: "log-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
        action: "VIEW_PASSWORDS",
        username: currentUser.username,
        role: currentUser.role,
        targetId: "ALL_USERS",
        details: "站主查看了全站帳號密碼",
        ip: req.ip || "unknown",
        timestamp: Date.now()
      });

      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/users/:username/password", requireAuth, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      if (currentUser.role !== "WEBMASTER") {
        return res.status(403).json({ error: "FORBIDDEN", message: "無權限修改密碼" });
      }
      const targetUsername = req.params.username;
      const { newPassword } = req.body;
      
      const result = await mssql.adminResetUserPassword(targetUsername, newPassword);
      
      await mssql.saveAuditLog({
        id: "log-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
        action: "EDIT_PASSWORD",
        username: currentUser.username,
        role: currentUser.role,
        targetId: targetUsername,
        details: \`站主修改了 \${targetUsername} 的密碼\`,
        ip: req.ip || "unknown",
        timestamp: Date.now()
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
`;

if (!code.includes('/api/users/passwords')) {
  code = code.replace(
    'app.get("/api/users", requireAuth, async (req, res) => {',
    passEndpoints + '\n  app.get("/api/users", requireAuth, async (req, res) => {'
  );
  fs.writeFileSync('server.ts', code);
}
