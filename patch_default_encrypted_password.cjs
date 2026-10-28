const fs = require('fs');
let code = fs.readFileSync('server/mssql.ts', 'utf8');

code = code.replace(
  'const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("123", 10);',
  'const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("123", 10);\nconst DEFAULT_ENCRYPTED_PASSWORD = encryptString("123");'
);

code = code.replace(/password: DEFAULT_PASSWORD_HASH,/g, 'password: DEFAULT_PASSWORD_HASH,\n    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,');

fs.writeFileSync('server/mssql.ts', code);
