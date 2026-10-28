const fs = require('fs');
let code = fs.readFileSync('server/mssql.ts', 'utf8');

const target = `  // Ensure password is encrypted with bcrypt if not already a hash
  let finalPassword = user.password;
  if (finalPassword && !/^\\$2[aby]\\$/.test(finalPassword)) {
    finalPassword = bcrypt.hashSync(finalPassword, 10);
  }`;

const replace = `  // Ensure password is encrypted with bcrypt if not already a hash
  let finalPassword = user.password;
  let finalEncrypted = user.encryptedPassword;
  
  if (finalPassword && !/^\\$2[aby]\\$/.test(finalPassword)) {
    // If it's plain text, generate both
    finalEncrypted = encryptString(finalPassword);
    finalPassword = bcrypt.hashSync(finalPassword, 10);
  }`;

const target2 = `  const cleanUser = {
    ...user,
    password: finalPassword
  };`;

const replace2 = `  const cleanUser = {
    ...user,
    password: finalPassword,
    encryptedPassword: finalEncrypted
  };`;

code = code.replace(target, replace);
code = code.replace(target2, replace2);

fs.writeFileSync('server/mssql.ts', code);
