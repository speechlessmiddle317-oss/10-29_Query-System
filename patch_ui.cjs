const fs = require('fs');

let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Replace "🙈 隱藏全部" : "👁️ 顯示全部"
code = code.replace(
  '{showAllPasswords ? "🙈 隱藏全部" : "👁️ 顯示全部"}',
  '{showAllPasswords ? "[全部隱藏]" : "[全部查看]"}'
);

// Replace individual password rendering
code = code.replace(
  `                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                                    {(currentUser.role === UserRole.WEBMASTER)
                                      ? (passwordLoading[uname] ? "讀取中..." : ((showAllPasswords || !!visiblePasswords[uname]) 
                                        ? (visiblePasswords[uname] || "••••••••") 
                                        : "••••••••"))
                                      : (isSelf ? "••••••••" : "••••••••")}
                                  </span>
                                  {currentUser.role === UserRole.WEBMASTER && (
                                    <button
                                      onClick={() => handleToggleSinglePassword(uname)}
                                      className="p-1 text-slate-400 hover:text-indigo-650 rounded transition-colors cursor-pointer"
                                      title="顯示/隱藏密碼"
                                    >
                                      {(showAllPasswords || !!visiblePasswords[uname]) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                  )}
                                  {(currentUser.role === UserRole.WEBMASTER || uname === currentUser.username) && (
                                    <button
                                      onClick={() => handleEditPasswordStart(uname)}
                                      className="p-1 text-slate-400 hover:text-indigo-650 rounded transition-colors cursor-pointer ml-1"
                                      title="修改密碼"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )`,
  `                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                                    {(currentUser.role === UserRole.WEBMASTER)
                                      ? (passwordLoading[uname] ? "讀取中..." : ((showAllPasswords || !!visiblePasswords[uname]) 
                                        ? (visiblePasswords[uname] || "●●●●●●●●") 
                                        : "●●●●●●●●"))
                                      : (isSelf ? "●●●●●●●●" : "●●●●●●●●")}
                                  </span>
                                  {currentUser.role === UserRole.WEBMASTER && (
                                    <button
                                      onClick={() => handleToggleSinglePassword(uname)}
                                      className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer px-1"
                                    >
                                      {(showAllPasswords || !!visiblePasswords[uname]) ? "[隱藏]" : "[查看]"}
                                    </button>
                                  )}
                                  {(currentUser.role === UserRole.WEBMASTER || uname === currentUser.username) && (
                                    <button
                                      onClick={() => handleEditPasswordStart(uname)}
                                      className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer px-1"
                                    >
                                      [修改]
                                    </button>
                                  )}
                                </div>
                              )`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("Patched UI");
