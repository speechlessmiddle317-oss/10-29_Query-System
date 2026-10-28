const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const target = `  const handleUpdateUserPassword = async (username: string, newPass: string) => {
    if (!newPass.trim()) {
      alert("密碼不能為空！");
      return;
    }
    const updated = { ...rbacUsers };
    if (updated[username]) {
      updated[username] = { ...updated[username], password: newPass.trim() };
      setRbacUsers(updated);
      await saveUserToApi(updated[username]);
    }
    setSysAccountEditingUser(null);
    setSysAccountTempPassword("");
  };`;

const replace = `  const handleUpdateUserPassword = async (username: string, newPass: string) => {
    if (!newPass.trim()) {
      alert("密碼不能為空！");
      return;
    }
    
    // Call the specific password update API if it's admin updating
    if (currentUser.role === UserRole.WEBMASTER) {
      const res = await adminUpdateUserPasswordApi(username, newPass.trim());
      if (res.success) {
        // Fetch fresh to get updated encrypted password
        fetchUsersWithPasswordsFromApi().then(pUsers => {
          if (pUsers) {
            const pwdMap: Record<string, string> = {};
            pUsers.forEach(u => {
              pwdMap[u.username] = u.rawPassword;
            });
            setRbacPasswords(pwdMap);
          }
        });
        alert(res.message || "密碼已更新");
      } else {
        alert(res.error || "密碼更新失敗");
      }
    } else {
      // Just save to general api if self-updating
      const updated = { ...rbacUsers };
      if (updated[username]) {
        updated[username] = { ...updated[username], password: newPass.trim() };
        setRbacUsers(updated);
        await saveUserToApi(updated[username]);
      }
    }
    setSysAccountEditingUser(null);
    setSysAccountTempPassword("");
  };`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/Dashboard.tsx', code);
