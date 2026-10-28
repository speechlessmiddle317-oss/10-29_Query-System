const fs = require('fs');
let code = fs.readFileSync('server/mssql.ts', 'utf8');

const newFunc = `
export async function getUsersWithPasswords(): Promise<any[]> {
  const p = await getPool();
  if (p) {
    const res = await p.request().query("SELECT * FROM dbo.Users ORDER BY username ASC");
    return res.recordset.map(row => {
      const { passwordHash: _p, ...safe } = row;
      let rawPass = "";
      if (row.encryptedPassword) {
        rawPass = decryptString(row.encryptedPassword);
      }
      return {
        ...safe,
        passwordChangeApplied: Boolean(row.passwordChangeApplied),
        distributedToAdmins: Boolean(row.distributedToAdmins),
        banned: Boolean(row.banned),
        canManageTrivia: Boolean(row.canManageTrivia),
        canManageLogs: Boolean(row.canManageLogs),
        assignedTables: row.assignedTables ? JSON.parse(row.assignedTables) : [],
        bannedFeatures: row.bannedFeatures ? JSON.parse(row.bannedFeatures) : [],
        rawPassword: rawPass
      };
    });
  }
  return [];
}
`;

if (!code.includes('export async function getUsersWithPasswords')) {
  code = code + '\n' + newFunc;
  fs.writeFileSync('server/mssql.ts', code);
}
