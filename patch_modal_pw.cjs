const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  '[密碼: {rbacUsers[rbacSelectedUser].password}]',
  '[密碼: {currentUser.role === UserRole.WEBMASTER ? (rbacPasswords[rbacSelectedUser] || "••••••••") : "••••••••"}]'
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
