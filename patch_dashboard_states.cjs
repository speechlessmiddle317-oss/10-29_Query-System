const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const newStates = `  const [sysAccountEditingUser, setSysAccountEditingUser] = useState<string | null>(null);
  const [sysAccountTempPassword, setSysAccountTempPassword] = useState("");
  const [showQuickCreateForm, setShowQuickCreateForm] = useState(false);
  const [sysAccountPasswordsVisible, setSysAccountPasswordsVisible] = useState(false);
  const [sysAccountVisiblePasswords, setSysAccountVisiblePasswords] = useState<Set<string>>(new Set());
  const [rbacPasswords, setRbacPasswords] = useState<Record<string, string>>({});`;

code = code.replace(
  '  const [sysAccountEditingUser, setSysAccountEditingUser] = useState<string | null>(null);\n  const [sysAccountTempPassword, setSysAccountTempPassword] = useState("");\n  const [showQuickCreateForm, setShowQuickCreateForm] = useState(false);',
  newStates
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
