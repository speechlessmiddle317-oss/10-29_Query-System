const fs = require('fs');
let code = fs.readFileSync('server/mssql.ts', 'utf8');

code = code.replace(
  `      UPDATE dbo.Users 
      SET passwordHash = @password, encryptedPassword = @encryptedPassword, updatedAt = SYSUTCDATETIME()
      WHERE LOWER(username) = LOWER(@username)`,
  `      UPDATE dbo.Users 
      SET passwordHash = @password, encryptedPassword = @encryptedPassword, passwordChangeApplied = 1, updatedAt = SYSUTCDATETIME()
      WHERE LOWER(username) = LOWER(@username)`
);

fs.writeFileSync('server/mssql.ts', code);
