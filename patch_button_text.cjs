const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
code = code.replace(
  '{sysAccountPasswordsVisible ? "🙈 隱藏" : "👁️ 顯示"}',
  '{sysAccountPasswordsVisible ? "🙈 隱藏全部" : "👁️ 顯示全部"}'
);
fs.writeFileSync('src/components/Dashboard.tsx', code);
