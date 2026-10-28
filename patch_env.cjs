const fs = require('fs');
let code = fs.readFileSync('.env.example', 'utf8');

if (!code.includes('PASSWORD_ENCRYPTION_KEY')) {
  code = code.replace(
    'JWT_SECRET=',
    'JWT_SECRET=\n# 用於雙軌加密機制的 AES-256 金鑰\nPASSWORD_ENCRYPTION_KEY='
  );
  fs.writeFileSync('.env.example', code);
}
