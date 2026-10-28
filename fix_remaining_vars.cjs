const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(/if \(\s*storedUsers\s*\) \{[\s\S]*?const uList = JSON\.parse\(storedUsers\);/g, 'if (true) {\n      const uList = { ...rbacUsers };');
code = code.replace(/if \(\s*stored\s*\) \{[\s\S]*?const uList = JSON\.parse\(stored\);/g, 'if (true) {\n      const uList = { ...rbacUsers };');

fs.writeFileSync('src/components/Dashboard.tsx', code);
