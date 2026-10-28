const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
code = code.replace(
  `      }).catch(() => {
              }).catch(() => {
        import("../utils/initialData").then(data => {
          setRbacUsers(data.INITIAL_USERS);
        });
      });`,
  `      }).catch(() => {
        import("../utils/initialData").then(data => {
          setRbacUsers(data.INITIAL_USERS);
        });
      });`
);
fs.writeFileSync('src/components/Dashboard.tsx', code);
