const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  'onClick={() => setSysAccountPasswordsVisible(!sysAccountPasswordsVisible)}',
  'onClick={handleToggleAllPasswords}'
);

code = code.replace(
  `onClick={() => {
                                        const newSet = new Set(sysAccountVisiblePasswords);
                                        if (newSet.has(uname)) newSet.delete(uname);
                                        else newSet.add(uname);
                                        setSysAccountVisiblePasswords(newSet);
                                      }}`,
  'onClick={() => handleToggleSinglePassword(uname)}'
);

code = code.replace(
  `onClick={() => {
                                        setSysAccountEditingUser(uname);
                                        setSysAccountTempPassword(currentUser.role === UserRole.WEBMASTER ? (rbacPasswords[uname] || "") : "");
                                      }}`,
  'onClick={() => handleEditPasswordStart(uname)}'
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
