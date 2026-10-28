const fs = require('fs');

let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// 1. Replace state declarations
code = code.replace(
  '  const [sysAccountVisiblePasswords, setSysAccountVisiblePasswords] = useState<Set<string>>(new Set());\n  const [rbacPasswords, setRbacPasswords] = useState<Record<string, string>>({});\n  const [sysAccountPasswordsVisible, setSysAccountPasswordsVisible] = useState(false);',
  '  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({});\n  const [passwordLoading, setPasswordLoading] = useState<Record<string, boolean>>({});\n  const [showAllPasswords, setShowAllPasswords] = useState(false);'
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("Updated states");
