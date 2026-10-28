const fs = require('fs');

let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// 1. Replace states
code = code.replace(
  '  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({});\n  const [passwordLoading, setPasswordLoading] = useState<Record<string, boolean>>({});\n  const [showAllPasswords, setShowAllPasswords] = useState(false);',
  '  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({});\n  const [passwordLoading, setPasswordLoading] = useState<Record<string, boolean>>({});\n  const [showAllPasswords, setShowAllPasswords] = useState(false);'
); // Already there from my previous edit. Let's make sure.

// Remove fetchPasswordsIfNeed
const fpni = code.indexOf('const fetchPasswordsIfNeed = async () => {');
if (fpni !== -1) {
  const endFpni = code.indexOf('};', fpni) + 2;
  code = code.substring(0, fpni) + code.substring(endFpni);
}

// Rewrite handleToggleAllPasswords
code = code.replace(
  /const handleToggleAllPasswords = async \(\) => \{[\s\S]*?\};\n/,
  `const handleToggleAllPasswords = async () => {
    if (showAllPasswords) {
      setShowAllPasswords(false);
    } else {
      setShowAllPasswords(true);
      // Fetch all if not already fetched
      const usersToFetch = Object.keys(rbacUsers).filter(u => !visiblePasswords[u]);
      usersToFetch.forEach(async (uname) => {
        setPasswordLoading(prev => ({ ...prev, [uname]: true }));
        try {
          const res = await getUserPasswordApi(uname);
          if (res.success && res.password) {
            setVisiblePasswords(prev => ({ ...prev, [uname]: res.password }));
          }
        } finally {
          setPasswordLoading(prev => ({ ...prev, [uname]: false }));
        }
      });
    }
  };\n`
);

// Rewrite handleToggleSinglePassword
code = code.replace(
  /const handleToggleSinglePassword = async \(uname: string\) => \{[\s\S]*?^\s*\};\n/m,
  `const handleToggleSinglePassword = async (uname: string) => {
    if (visiblePasswords[uname]) {
      const newMap = { ...visiblePasswords };
      delete newMap[uname];
      setVisiblePasswords(newMap);
    } else {
      setPasswordLoading(prev => ({ ...prev, [uname]: true }));
      try {
        const res = await getUserPasswordApi(uname);
        if (res.success && res.password) {
          setVisiblePasswords(prev => ({ ...prev, [uname]: res.password }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setPasswordLoading(prev => ({ ...prev, [uname]: false }));
      }
    }
  };\n`
);

// Rewrite handleEditPasswordStart
code = code.replace(
  /const handleEditPasswordStart = async \(uname: string\) => \{[\s\S]*?^\s*\};\n/m,
  `const handleEditPasswordStart = async (uname: string) => {
    if (currentUser.role === UserRole.WEBMASTER && !visiblePasswords[uname]) {
      setPasswordLoading(prev => ({ ...prev, [uname]: true }));
      try {
        const res = await getUserPasswordApi(uname);
        if (res.success && res.password) {
          setVisiblePasswords(prev => ({ ...prev, [uname]: res.password }));
          setSysAccountTempPassword(res.password);
        }
      } catch (err) {
      } finally {
        setPasswordLoading(prev => ({ ...prev, [uname]: false }));
      }
    } else {
      setSysAccountTempPassword(currentUser.role === UserRole.WEBMASTER ? (visiblePasswords[uname] || "") : "");
    }
    setSysAccountEditingUser(uname);
  };\n`
);

// Replace sysAccountPasswordsVisible and sysAccountVisiblePasswords in JSX
code = code.replace(/sysAccountPasswordsVisible/g, 'showAllPasswords');
code = code.replace(/sysAccountVisiblePasswords\.has\(uname\)/g, '!!visiblePasswords[uname]');

// Replace rbacPasswords[uname] with visiblePasswords[uname]
code = code.replace(/rbacPasswords\[/g, 'visiblePasswords[');

// Fix the render where we show the password loading state or value
// Previous: (showAllPasswords || !!visiblePasswords[uname]) ? (visiblePasswords[uname] || "••••••••") : "••••••••"
// We want: 
// {passwordLoading[uname] ? "Loading..." : visiblePasswords[uname] || "••••••••"}
// Let's manually replace the <td> content for password.

fs.writeFileSync('src/components/Dashboard.tsx', code);
