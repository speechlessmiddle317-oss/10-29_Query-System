const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(/if \(storedUsers\) \{/g, 'if (true) {');
code = code.replace(/let uList = stored \? JSON.parse\(stored\) : \{\};/g, 'let uList = { ...rbacUsers };');

fs.writeFileSync('src/components/Dashboard.tsx', code);
