const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Replace standard occurrences
code = code.replace(/.*localStorage\.setItem\("sub_users".*/g, '');
code = code.replace(/.*localStorage\.getItem\("sub_users".*/g, '');

fs.writeFileSync('src/components/Dashboard.tsx', code);
