const fs = require('fs');
let code = fs.readFileSync('server/mssql.ts', 'utf8');

// 1. getUserForAuth
code = code.replace(
  'password: row.password,',
  'password: row.passwordHash || row.password,\n      encryptedPassword: row.encryptedPassword,'
);

// 2. update password endpoints
code = code.replace(
  'SET password = @password, passwordChangeApplied = 1, updatedAt = SYSUTCDATETIME()',
  'SET passwordHash = @password, encryptedPassword = @encryptedPassword, passwordChangeApplied = 1, updatedAt = SYSUTCDATETIME()'
);

code = code.replace(
  'SET password = @password, updatedAt = SYSUTCDATETIME()',
  'SET passwordHash = @password, encryptedPassword = @encryptedPassword, updatedAt = SYSUTCDATETIME()'
);

// 3. saveUserToPool inputs
code = code.replace(
  'req.input("password", sql.NVarChar(255), user.password || null);',
  'req.input("passwordHash", sql.NVarChar(255), user.password || null);\n  req.input("encryptedPassword", sql.NVarChar(255), user.encryptedPassword || null);'
);

// 4. saveUserToPool merge statement
code = code.replace(
  'password = ISNULL(@password, target.password),',
  'passwordHash = ISNULL(@passwordHash, target.passwordHash),\n        encryptedPassword = ISNULL(@encryptedPassword, target.encryptedPassword),'
);

code = code.replace(
  'username, password, role, starLevel',
  'username, passwordHash, encryptedPassword, role, starLevel'
);

code = code.replace(
  '@username, @password, @role, @starLevel',
  '@username, @passwordHash, @encryptedPassword, @role, @starLevel'
);

fs.writeFileSync('server/mssql.ts', code);
