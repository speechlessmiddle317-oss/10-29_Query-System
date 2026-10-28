const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  '[密碼: {currentUser.role === UserRole.WEBMASTER ? (visiblePasswords[rbacSelectedUser] || "••••••••") : "••••••••"}]',
  '[密碼: {currentUser.role === UserRole.WEBMASTER ? (visiblePasswords[rbacSelectedUser] || "●●●●●●●●") : "●●●●●●●●"}]'
);

code = code.replace(
  '<span>•••••••• (同級保密)</span>',
  '<span>●●●●●●●● (同級保密)</span>'
);

code = code.replace(
  '<span>•••••••• (站主保護)</span>',
  '<span>●●●●●●●● (站主保護)</span>'
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("Patched right panel");
