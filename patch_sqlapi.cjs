const fs = require('fs');
let code = fs.readFileSync('src/utils/sqlServerApi.ts', 'utf8');

code = code.replace(
  'return await fetchWithAuth("/api/users/passwords");',
  'const res = await authFetch("/api/users/passwords");\n  return await res.json();'
);

fs.writeFileSync('src/utils/sqlServerApi.ts', code);
