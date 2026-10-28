const fs = require('fs');
let code = fs.readFileSync('server/mssql.ts', 'utf8');

// Replace wrong parentheses
code = code.replace(/sql\.NVarChar\(1024\)\), encryptPassword/g, 'sql.NVarChar(1024), encryptPassword');
// Let's also check if it happened anywhere else (e.g. user.encryptedPassword)
code = code.replace(/sql\.NVarChar\(1024\)\), user\.encryptedPassword/g, 'sql.NVarChar(1024), user.encryptedPassword');
// Let's just catch all cases where I accidentally added an extra parenthesis:
code = code.replace(/sql\.NVarChar\(1024\)\), /g, 'sql.NVarChar(1024), ');

fs.writeFileSync('server/mssql.ts', code);
