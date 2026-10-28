const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(/fetchSingleUserPasswordApi/g, 'getUserPasswordApi');

code = code.replace(/const pwd = await getUserPasswordApi\(uname\);\s+setTargetPassword\(pwd \|\| ""\);/g, 
  'const res = await getUserPasswordApi(uname);\n        setTargetPassword(res.password || "");');
  
fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("Updated Dashboard.tsx");
