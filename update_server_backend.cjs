const fs = require('fs');

// 1. Update server/mssql.ts
let mssql = fs.readFileSync('server/mssql.ts', 'utf8');
const getUserPasswordFunc = `
export async function getUserPassword(username: string): Promise<string | null> {
  const cleanUsername = username.trim().toLowerCase();
  const p = await getPool();
  if (p) {
    const res = await p.request()
      .input("username", cleanUsername)
      .query("SELECT encryptedPassword FROM dbo.Users WHERE LOWER(username) = LOWER(@username)");
    if (res.recordset.length > 0) {
      const encrypted = res.recordset[0].encryptedPassword;
      if (encrypted) {
        return decryptString(encrypted);
      }
    }
  }
  if (fallbackUsers[cleanUsername]) {
    const encrypted = fallbackUsers[cleanUsername].encryptedPassword;
    if (encrypted) return decryptString(encrypted);
  }
  return null;
}
`;
if (!mssql.includes('getUserPassword(username: string)')) {
  mssql += '\n' + getUserPasswordFunc;
  fs.writeFileSync('server/mssql.ts', mssql);
}

// 2. Update server.ts
let server = fs.readFileSync('server.ts', 'utf8');

// Replace PUT /api/users/:username/password with GET
const putEndpoint = `  app.put("/api/users/:username/password", requireAuth, async (req, res) => {
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
        details: \`站主重設了 \${targetUsername} 的密碼\`,
        ip: req.ip || "unknown",
        timestamp: Date.now()
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;

const getEndpoint = `  app.get("/api/users/:username/password", requireAuth, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      if (currentUser.role !== "WEBMASTER") {
        return res.status(403).json({ error: "FORBIDDEN", message: "無權限查看密碼" });
      }
      const targetUsername = req.params.username;
      
      const plainPassword = await mssql.getUserPassword(targetUsername);
      if (plainPassword === null) {
        return res.status(404).json({ error: "NOT_FOUND", message: "找不到密碼" });
      }

      await mssql.saveAuditLog({
        id: "log-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
        action: "VIEW_SINGLE_PASSWORD",
        username: currentUser.username,
        role: currentUser.role,
        targetId: targetUsername,
        details: \`站主查看了 \${targetUsername} 的密碼\`,
        ip: req.ip || "unknown",
        timestamp: Date.now()
      });

      res.json({ password: plainPassword });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;

if (server.includes('app.put("/api/users/:username/password"')) {
  server = server.replace(putEndpoint, getEndpoint);
} else if (!server.includes('app.get("/api/users/:username/password"')) {
  // Just in case it wasn't found exactly, we inject it before the post admin-reset-password
  server = server.replace('app.post("/api/users/admin-reset-password",', getEndpoint + '\n\n  app.post("/api/users/admin-reset-password",');
}
fs.writeFileSync('server.ts', server);

