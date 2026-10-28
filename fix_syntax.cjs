const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Find the broken piece:
code = code.replace(
  `          pUsers.forEach(u => {
        pwdMap[u.username] = u.rawPassword;
      });
      setRbacPasswords(pwdMap);
    }
  };`, ''
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
