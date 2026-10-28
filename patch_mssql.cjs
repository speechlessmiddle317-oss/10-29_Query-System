const fs = require('fs');
let code = fs.readFileSync('server/mssql.ts', 'utf8');

// Replace import
code = code.replace(
  'import { encryptString, decryptString } from "./crypto";',
  'import { encryptPassword, decryptPassword } from "./passwordCrypto";'
);

// Replace encryptString -> encryptPassword
code = code.split('encryptString(').join('encryptPassword(');

// Replace decryptString -> decryptPassword
code = code.split('decryptString(').join('decryptPassword(');

// Replace sql.NVarChar(255) for encryptedPassword in various places to sql.NVarChar(1024)
code = code.replace(/req\.input\("encryptedPassword", sql\.NVarChar\(255\)/g, 'req.input("encryptedPassword", sql.NVarChar(1024))');

fs.writeFileSync('server/mssql.ts', code);
