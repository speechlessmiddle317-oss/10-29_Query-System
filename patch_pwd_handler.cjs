const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const target = `  const handleUpdateUserPassword = async (targetUsername: string, newPasswordVal: string) => {
    if (!newPasswordVal.trim()) {
      alert("⚠️ 密碼不可為空！");
      return;
    }
    const uList = { ...rbacUsers };
    if (!uList[targetUsername]) return;

    // Security check: Super Admin cannot reset passwords of other Super Admins or Webmaster
    if (currentUser.role === UserRole.SUPER_ADMIN && uList[targetUsername].role === UserRole.SUPER_ADMIN && targetUsername !== currentUser.username) {
      alert("⚠️ 權限不足：同級保護機制生效，超級管理員不可修改同級超級管理員之密碼！僅系統站主可重設。");
      return;
    }
    if (currentUser.role !== UserRole.WEBMASTER && uList[targetUsername].role === UserRole.WEBMASTER) {
      alert("⚠️ 權限不足：任何角色皆不可重設最高支配權站主的密碼！");
      return;
    }
    
    uList[targetUsername].password = newPasswordVal.trim();
    setRbacUsers(uList);
    setSysAccountEditingUser(null);
    setSysAccountTempPassword("");
    
    addLog(
      "ADMIN_PASSWORD_RESET",
      targetUsername,
      \`\${currentUser.role} 修改了系統帳號 \${targetUsername} 的登入密碼\`
    );
    alert(\`🎉 帳號【\${targetUsername}】之密碼已成功更新！\`);
  };`;

const replace = `  const handleUpdateUserPassword = async (targetUsername: string, newPasswordVal: string) => {
    if (!newPasswordVal.trim()) {
      alert("⚠️ 密碼不可為空！");
      return;
    }
    const uList = { ...rbacUsers };
    if (!uList[targetUsername]) return;

    // Security check: Super Admin cannot reset passwords of other Super Admins or Webmaster
    if (currentUser.role === UserRole.SUPER_ADMIN && uList[targetUsername].role === UserRole.SUPER_ADMIN && targetUsername !== currentUser.username) {
      alert("⚠️ 權限不足：同級保護機制生效，超級管理員不可修改同級超級管理員之密碼！僅系統站主可重設。");
      return;
    }
    if (currentUser.role !== UserRole.WEBMASTER && uList[targetUsername].role === UserRole.WEBMASTER) {
      alert("⚠️ 權限不足：任何角色皆不可重設最高支配權站主的密碼！");
      return;
    }
    
    if (currentUser.role === UserRole.WEBMASTER) {
      const res = await adminUpdateUserPasswordApi(targetUsername, newPasswordVal.trim());
      if (res.success) {
        alert(\`🎉 帳號【\${targetUsername}】之密碼已成功更新！\`);
        fetchUsersWithPasswordsFromApi().then(pUsers => {
          if (pUsers) {
            const pwdMap: Record<string, string> = {};
            pUsers.forEach(u => {
              pwdMap[u.username] = u.rawPassword;
            });
            setRbacPasswords(pwdMap);
          }
        });
      } else {
        alert(res.error || "密碼更新失敗");
      }
    } else {
      // Just save to general api if self-updating
      uList[targetUsername].password = newPasswordVal.trim();
      setRbacUsers(uList);
      await saveUserToApi(uList[targetUsername]);
      addLog(
        "ADMIN_PASSWORD_RESET",
        targetUsername,
        \`\${currentUser.role} 修改了系統帳號 \${targetUsername} 的登入密碼\`
      );
      alert(\`🎉 帳號【\${targetUsername}】之密碼已成功更新！\`);
    }
    
    setSysAccountEditingUser(null);
    setSysAccountTempPassword("");
  };`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/Dashboard.tsx', code);
