const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const fetchLogic = `
  const fetchPasswordsIfNeed = async () => {
    if (Object.keys(rbacPasswords).length > 0) return; // Already fetched
    const pUsers = await fetchUsersWithPasswordsFromApi();
    if (pUsers) {
      const pwdMap: Record<string, string> = {};
      pUsers.forEach(u => {
        pwdMap[u.username] = u.rawPassword;
      });
      setRbacPasswords(pwdMap);
    }
  };

  const handleToggleAllPasswords = async () => {
    if (!sysAccountPasswordsVisible) {
      await fetchPasswordsIfNeed();
    }
    setSysAccountPasswordsVisible(!sysAccountPasswordsVisible);
  };

  const handleToggleSinglePassword = async (uname: string) => {
    const newSet = new Set(sysAccountVisiblePasswords);
    if (newSet.has(uname)) {
      newSet.delete(uname);
      setSysAccountVisiblePasswords(newSet);
    } else {
      await fetchPasswordsIfNeed();
      newSet.add(uname);
      setSysAccountVisiblePasswords(newSet);
    }
  };

  const handleEditPasswordStart = async (uname: string) => {
    if (currentUser.role === UserRole.WEBMASTER) {
      await fetchPasswordsIfNeed();
    }
    setSysAccountEditingUser(uname);
    // wait for rbacPasswords to be updated if it wasn't
    setTimeout(() => {
      setSysAccountTempPassword(currentUser.role === UserRole.WEBMASTER ? (rbacPasswords[uname] || "") : "");
    }, 100);
  };
`;

// Insert the logic before handleUpdateUserRole
code = code.replace(
  'const handleUpdateUserRole = (targetUsername: string, newRole: UserRole) => {',
  fetchLogic + '\n  const handleUpdateUserRole = (targetUsername: string, newRole: UserRole) => {'
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
