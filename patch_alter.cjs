const fs = require('fs');
let code = fs.readFileSync('server/mssql.ts', 'utf8');

code = code.replace(
  "ALTER TABLE dbo.Users ADD encryptedPassword NVARCHAR(1024) NULL;",
  "ALTER TABLE dbo.Users ADD encryptedPassword NVARCHAR(1024) NULL;\n        END\n        ELSE\n        BEGIN\n            ALTER TABLE dbo.Users ALTER COLUMN encryptedPassword NVARCHAR(1024) NULL;"
);

fs.writeFileSync('server/mssql.ts', code);
