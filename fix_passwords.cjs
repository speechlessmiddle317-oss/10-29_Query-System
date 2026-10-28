const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  `    const pUsers = await fetchUsersWithPasswordsFromApi();
    if (pUsers) {
      const pwdMap: Record<string, string> = {};
      pUsers.forEach(u => {
        pwdMap[u.username] = u.rawPassword;
      });
      setRbacPasswords(pwdMap);
    }`,
  `    const pUsers = await fetchUsersWithPasswordsFromApi();
    if (pUsers && Array.isArray(pUsers)) {
      const pwdMap: Record<string, string> = {};
      pUsers.forEach(u => {
        pwdMap[u.username] = u.rawPassword;
      });
      setRbacPasswords(pwdMap);
    }`
);

code = code.replace(
  `      const pUsers = await fetchUsersWithPasswordsFromApi();
      if (pUsers) {
        pUsers.forEach(u => {
          pMap[u.username] = u.rawPassword;
        });
        setRbacPasswords(pMap);
      }`,
  `      const pUsers = await fetchUsersWithPasswordsFromApi();
      if (pUsers && Array.isArray(pUsers)) {
        pUsers.forEach(u => {
          pMap[u.username] = u.rawPassword;
        });
        setRbacPasswords(pMap);
      }`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
