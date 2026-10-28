const fs = require('fs');
let code = fs.readFileSync('server/mssql.ts', 'utf8');

// replace the CREATE TABLE
code = code.replace(
  'password NVARCHAR(255) NULL,',
  'passwordHash NVARCHAR(255) NULL,\n          encryptedPassword NVARCHAR(255) NULL,'
);

// Add ALTER TABLE
const alterBlock = `
    // Migration: add passwordHash and encryptedPassword if they don't exist
    try {
      await p.request().batch(\`
        IF COL_LENGTH('dbo.Users', 'passwordHash') IS NULL
        BEGIN
            ALTER TABLE dbo.Users ADD passwordHash NVARCHAR(255) NULL;
        END
        IF COL_LENGTH('dbo.Users', 'encryptedPassword') IS NULL
        BEGIN
            ALTER TABLE dbo.Users ADD encryptedPassword NVARCHAR(255) NULL;
        END
        
        -- Migrate legacy passwords
        IF COL_LENGTH('dbo.Users', 'password') IS NOT NULL
        BEGIN
            -- we can't easily auto-hash in T-SQL, but we can just map it for now
            EXEC('UPDATE dbo.Users SET passwordHash = password WHERE passwordHash IS NULL AND password IS NOT NULL');
            -- don't drop the column just yet to prevent issues
        END
      \`);
      console.log("✅ [MSSQL] User table migrated with passwordHash/encryptedPassword.");
    } catch(err) {
      console.error("Migration error:", err);
    }
`;

code = code.replace(
  '// Create Users table',
  alterBlock + '\n    // Create Users table'
);

fs.writeFileSync('server/mssql.ts', code);
