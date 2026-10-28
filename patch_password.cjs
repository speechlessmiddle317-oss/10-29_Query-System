const fs = require('fs');

let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// 1. Fix handleUpdateUserPassword
code = code.replace(
  /const res = await adminResetUserPasswordApi\(targetUsername, newPasswordVal\.trim\(\)\);\s+if \(\!res\.success\) \{\s+alert\(`❌ 重設密碼失敗：\$\{res\.message\}`\);\s+return;\s+\}\s+setSysAccountEditingUser\(null\);\s+setSysAccountTempPassword\(""\);/m,
  `const res = await adminResetUserPasswordApi(targetUsername, newPasswordVal.trim());
      if (!res.success) {
        alert(\`❌ 重設密碼失敗：\${res.message}\`);
        return;
      }
      
      setVisiblePasswords(prev => ({
        ...prev,
        [targetUsername]: newPasswordVal.trim()
      }));

      setSysAccountEditingUser(null);
      setSysAccountTempPassword("");`
);

// 2. Fix handleEditPasswordStart
code = code.replace(
  /const handleEditPasswordStart = async \(uname: string\) => \{[\s\S]*?^\s*\};\n/m,
  `const handleEditPasswordStart = (uname: string) => {
    setSysAccountTempPassword("");
    setSysAccountEditingUser(uname);
  };\n`
);

// 3. Remove inline edit UI
code = code.replace(
  `                              {isEditingPassword ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={sysAccountTempPassword}
                                    onChange={(e) => setSysAccountTempPassword(e.target.value)}
                                    placeholder="新密碼"
                                    className="border border-slate-300 rounded px-1.5 py-1 text-xs outline-none bg-white font-mono w-24 text-slate-800"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateUserPassword(uname, sysAccountTempPassword)}
                                    className="p-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    儲存
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSysAccountEditingUser(null);
                                      setSysAccountTempPassword("");
                                    }}
                                    className="p-1 px-2 bg-slate-205 hover:bg-slate-300 text-slate-600 rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    x
                                  </button>
                                </div>
                              ) : currentUser.role === UserRole.SUPER_ADMIN && uObj.role === UserRole.SUPER_ADMIN && uname !== currentUser.username ? (`,
  `                              {currentUser.role === UserRole.SUPER_ADMIN && uObj.role === UserRole.SUPER_ADMIN && uname !== currentUser.username ? (`
);

// 4. Inject Modal at the end of the Dashboard
const modalCode = `
      {sysAccountEditingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-5 flex flex-col flex-1">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-indigo-600" />
                修改 {sysAccountEditingUser} 密碼
              </h2>
              
              <div className="space-y-1.5 mb-6">
                <label className="text-xs font-bold text-slate-500">新密碼</label>
                <input
                  type="text"
                  value={sysAccountTempPassword}
                  onChange={(e) => setSysAccountTempPassword(e.target.value)}
                  placeholder="請輸入新密碼"
                  className="w-full border border-slate-300 bg-slate-50 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-indigo-500 font-mono transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateUserPassword(sysAccountEditingUser, sysAccountTempPassword);
                  }}
                />
              </div>

              <div className="flex gap-2 justify-end mt-auto pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSysAccountEditingUser(null);
                    setSysAccountTempPassword("");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateUserPassword(sysAccountEditingUser, sysAccountTempPassword)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  確認修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  '      {/* Global Banned Alert Modal */}',
  modalCode + '\n      {/* Global Banned Alert Modal */}'
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("Patched password flow");
