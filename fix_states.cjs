const fs = require('fs');

let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  `  const [showAllPasswords, setSysAccountPasswordsVisible] = useState(false);
  const [sysAccountVisiblePasswords, setSysAccountVisiblePasswords] = useState<Set<string>>(new Set());
  const [rbacPasswords, setRbacPasswords] = useState<Record<string, string>>({});`,
  `  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({});
  const [passwordLoading, setPasswordLoading] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
