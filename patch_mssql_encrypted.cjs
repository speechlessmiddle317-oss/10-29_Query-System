const fs = require('fs');
let code = fs.readFileSync('server/mssql.ts', 'utf8');

code = code.replace(
  '    req.input("password", sql.NVarChar(255), newHash);\n    await req.query(`\n      UPDATE dbo.Users \n      SET passwordHash = @password, encryptedPassword = @encryptedPassword, passwordChangeApplied = 1, updatedAt = SYSUTCDATETIME()',
  '    req.input("password", sql.NVarChar(255), newHash);\n    req.input("encryptedPassword", sql.NVarChar(255), encryptString(newPass));\n    await req.query(`\n      UPDATE dbo.Users \n      SET passwordHash = @password, encryptedPassword = @encryptedPassword, passwordChangeApplied = 1, updatedAt = SYSUTCDATETIME()'
);

code = code.replace(
  '    req.input("password", sql.NVarChar(255), newHash);\n    await req.query(`\n      UPDATE dbo.Users \n      SET passwordHash = @password, encryptedPassword = @encryptedPassword, updatedAt = SYSUTCDATETIME()',
  '    req.input("password", sql.NVarChar(255), newHash);\n    req.input("encryptedPassword", sql.NVarChar(255), encryptString(newPass));\n    await req.query(`\n      UPDATE dbo.Users \n      SET passwordHash = @password, encryptedPassword = @encryptedPassword, updatedAt = SYSUTCDATETIME()'
);

fs.writeFileSync('server/mssql.ts', code);
