const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  'fetchUsersFromApi,',
  'fetchUsersFromApi,\n  fetchUsersWithPasswordsFromApi,\n  adminUpdateUserPasswordApi,'
);

// update the fetchUsers logic to also fetch passwords for WEBMASTER
const newFetch = `
      fetchUsersFromApi().then((users) => {
        if (users && Object.keys(users).length > 0) {
          setRbacUsers(users);
        } else {
          import("../utils/initialData").then(data => {
            setRbacUsers(data.INITIAL_USERS);
          });
        }
      }).catch(() => {
        // ...
      });
      
      if (currentUser.role === UserRole.WEBMASTER) {
        fetchUsersWithPasswordsFromApi().then(pUsers => {
          if (pUsers) {
            const pwdMap: Record<string, string> = {};
            pUsers.forEach(u => {
              pwdMap[u.username] = u.rawPassword;
            });
            setRbacPasswords(pwdMap);
          }
        });
      }
`;

code = code.replace(
  `      fetchUsersFromApi().then((users) => {
        if (users && Object.keys(users).length > 0) {
          setRbacUsers(users);
        } else {
          import("../utils/initialData").then(data => {
            setRbacUsers(data.INITIAL_USERS);
          });
        }
      }).catch(() => {`,
  newFetch.split('// ...')[0] + '      }).catch(() => {'
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
