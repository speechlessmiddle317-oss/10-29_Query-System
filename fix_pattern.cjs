const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(/if \(!storedUsers\) return;\s*const uList = JSON\.parse\(storedUsers\);/g, 'const uList = { ...rbacUsers };');
code = code.replace(/if \(!stored\) return;\s*const uList = JSON\.parse\(stored\);/g, 'const uList = { ...rbacUsers };');

fs.writeFileSync('src/components/Dashboard.tsx', code);
