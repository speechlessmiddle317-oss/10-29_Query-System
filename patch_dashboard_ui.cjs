const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const headerTarget = '<th className="py-3.5 px-4 font-bold">密碼管理 (Password)</th>';
const headerReplace = `<th className="py-3.5 px-4 font-bold">
                        <div className="flex items-center gap-2">
                          <span>密碼管理 (Password)</span>
                          {currentUser.role === UserRole.WEBMASTER && (
                            <button
                              type="button"
                              onClick={() => setSysAccountPasswordsVisible(!sysAccountPasswordsVisible)}
                              className="text-[10px] font-normal bg-slate-200/50 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              {sysAccountPasswordsVisible ? "🙈 隱藏" : "👁️ 顯示"}
                            </button>
                          )}
                        </div>
                      </th>`;

const tdTarget = `<td className="py-3 px-4">
                              {isEditingPassword ? (
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
                              ) : currentUser.role === UserRole.SUPER_ADMIN && uObj.role === UserRole.SUPER_ADMIN && uname !== currentUser.username ? (
                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <span>•••••••• (同級保密)</span>
                                </div>
                              ) : currentUser.role !== UserRole.WEBMASTER && uObj.role === UserRole.WEBMASTER ? (
                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  <Lock className="w-3 h-3 text-indigo-600" />
                                  <span>•••••••• (站主保護)</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                                    {uObj.password}
                                  </span>
                                  {(currentUser.role === UserRole.WEBMASTER || uname === currentUser.username) && (
                                    <button
                                      onClick={() => {
                                        setSysAccountEditingUser(uname);
                                        setSysAccountTempPassword(uObj.password);
                                      }}
                                      className="p-1 text-slate-400 hover:text-indigo-650 rounded transition-colors cursor-pointer"
                                      title="修改密碼"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>`;

const tdReplace = `<td className="py-3 px-4">
                              {isEditingPassword ? (
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
                              ) : currentUser.role === UserRole.SUPER_ADMIN && uObj.role === UserRole.SUPER_ADMIN && uname !== currentUser.username ? (
                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <span>•••••••• (同級保密)</span>
                                </div>
                              ) : currentUser.role !== UserRole.WEBMASTER && uObj.role === UserRole.WEBMASTER ? (
                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  <Lock className="w-3 h-3 text-indigo-600" />
                                  <span>•••••••• (站主保護)</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                                    {(currentUser.role === UserRole.WEBMASTER)
                                      ? ((sysAccountPasswordsVisible || sysAccountVisiblePasswords.has(uname)) 
                                        ? (rbacPasswords[uname] || "••••••••") 
                                        : "••••••••")
                                      : (isSelf ? "••••••••" : "••••••••")}
                                  </span>
                                  {currentUser.role === UserRole.WEBMASTER && (
                                    <button
                                      onClick={() => {
                                        const newSet = new Set(sysAccountVisiblePasswords);
                                        if (newSet.has(uname)) newSet.delete(uname);
                                        else newSet.add(uname);
                                        setSysAccountVisiblePasswords(newSet);
                                      }}
                                      className="p-1 text-slate-400 hover:text-indigo-650 rounded transition-colors cursor-pointer"
                                      title="顯示/隱藏密碼"
                                    >
                                      {(sysAccountPasswordsVisible || sysAccountVisiblePasswords.has(uname)) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                  )}
                                  {(currentUser.role === UserRole.WEBMASTER || uname === currentUser.username) && (
                                    <button
                                      onClick={() => {
                                        setSysAccountEditingUser(uname);
                                        setSysAccountTempPassword(currentUser.role === UserRole.WEBMASTER ? (rbacPasswords[uname] || "") : "");
                                      }}
                                      className="p-1 text-slate-400 hover:text-indigo-650 rounded transition-colors cursor-pointer ml-1"
                                      title="修改密碼"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>`;

code = code.replace(headerTarget, headerReplace);
code = code.replace(tdTarget, tdReplace);

fs.writeFileSync('src/components/Dashboard.tsx', code);
