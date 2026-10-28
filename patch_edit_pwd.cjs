const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const oldFunc = `
  const handleEditPasswordStart = async (uname: string) => {
    if (currentUser.role === UserRole.WEBMASTER) {
      await fetchPasswordsIfNeed();
    }
    setSysAccountEditingUser(uname);
    // wait for rbacPasswords to be updated if it wasn't
    setTimeout(() => {
      setSysAccountTempPassword(currentUser.role === UserRole.WEBMASTER ? (rbacPasswords[uname] || "") : "");
    }, 100);
  };`;

const newFunc = `
  const handleEditPasswordStart = async (uname: string) => {
    let pMap = { ...rbacPasswords };
    if (currentUser.role === UserRole.WEBMASTER && Object.keys(pMap).length === 0) {
      const pUsers = await fetchUsersWithPasswordsFromApi();
      if (pUsers) {
        pUsers.forEach(u => {
          pMap[u.username] = u.rawPassword;
        });
        setRbacPasswords(pMap);
      }
    }
    setSysAccountEditingUser(uname);
    setSysAccountTempPassword(currentUser.role === UserRole.WEBMASTER ? (pMap[uname] || "") : "");
  };`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/components/Dashboard.tsx', code);
