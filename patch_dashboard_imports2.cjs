const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  '  Eye,',
  '  Eye,\n  EyeOff,'
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
