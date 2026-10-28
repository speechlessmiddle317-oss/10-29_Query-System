const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Fix toggleViewPassword
code = code.replace(
`        const pwd = await getUserPasswordApi(uname);
        if (pwd) {
          setRbacPasswords(prev => ({ ...prev, [uname]: pwd }));
        }`,
`        const res = await getUserPasswordApi(uname);
        if (res.success && res.password) {
          setRbacPasswords(prev => ({ ...prev, [uname]: res.password }));
        }`
);

// Fix handleEditPasswordStart
code = code.replace(
`      const pwd = await getUserPasswordApi(uname);
      if (pwd) {
        pMap[uname] = pwd;
        setRbacPasswords(prev => ({ ...prev, [uname]: pwd }));
      }`,
`      const res = await getUserPasswordApi(uname);
      if (res.success && res.password) {
        pMap[uname] = res.password;
        setRbacPasswords(prev => ({ ...prev, [uname]: res.password }));
      }`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("Fixed Dashboard.tsx");
