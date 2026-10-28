const fs = require('fs');

let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  `{(currentUser.role === UserRole.WEBMASTER)
                                      ? ((showAllPasswords || !!visiblePasswords[uname]) 
                                        ? (visiblePasswords[uname] || "••••••••") 
                                        : "••••••••")
                                      : (isSelf ? "••••••••" : "••••••••")}`,
  `{(currentUser.role === UserRole.WEBMASTER)
                                      ? (passwordLoading[uname] ? "讀取中..." : ((showAllPasswords || !!visiblePasswords[uname]) 
                                        ? (visiblePasswords[uname] || "••••••••") 
                                        : "••••••••"))
                                      : (isSelf ? "••••••••" : "••••••••")}`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("Patched loading state");
