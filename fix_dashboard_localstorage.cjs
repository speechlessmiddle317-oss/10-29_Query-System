const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// The pattern was:
// if (stored) {
//   const uList = JSON.parse(stored);
// we replace it with:
// if (true) {
//   const uList = { ...rbacUsers };
code = code.replace(/if\s*\(\s*stored\s*\)\s*\{\s*const uList = JSON\.parse\s*\(\s*stored\s*\);/g, 'if (true) {\n      const uList = { ...rbacUsers };');
code = code.replace(/if\s*\(\s*storedUsers\s*\)\s*\{\s*const uList = JSON\.parse\s*\(\s*storedUsers\s*\);/g, 'if (true) {\n      const uList = { ...rbacUsers };');
code = code.replace(/const uList = JSON\.parse\s*\(\s*storedUsers\s*\|\|\s*"{}"\s*\);/g, 'const uList = { ...rbacUsers };');
code = code.replace(/const uList = JSON\.parse\s*\(\s*storedUsers\s*\|\|\s*".*?"\s*\);/g, 'const uList = { ...rbacUsers };');
code = code.replace(/const uList = storedUsers \? JSON\.parse\s*\(\s*storedUsers\s*\)\s*:\s*\{\s*\};/g, 'const uList = { ...rbacUsers };');
code = code.replace(/const uList = stored \? JSON\.parse\s*\(\s*stored\s*\)\s*:\s*\{\s*\};/g, 'const uList = { ...rbacUsers };');

fs.writeFileSync('src/components/Dashboard.tsx', code);
