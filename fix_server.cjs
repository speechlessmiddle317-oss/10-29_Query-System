const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace the PUT completely
const startIndex = code.indexOf('app.put("/api/users/:username/password"');
if (startIndex !== -1) {
  // Find the end of this app.put block. It ends right before app.post("/api/users/admin-reset-password"
  const endIndex = code.indexOf('app.post("/api/users/admin-reset-password"');
  if (endIndex !== -1) {
    const before = code.substring(0, startIndex);
    const after = code.substring(endIndex);
    
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
  });

  `;
  
    code = before + getEndpoint + after;
    fs.writeFileSync('server.ts', code);
    console.log("Successfully replaced PUT with GET");
  } else {
    console.log("Could not find next endpoint");
  }
} else {
  console.log("Could not find PUT endpoint");
}
