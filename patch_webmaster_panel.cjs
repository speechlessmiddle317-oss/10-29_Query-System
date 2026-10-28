const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// 1. Ban button -> Webmaster exempt
code = code.replace(
  `                            {currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN ? (
                              <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-500 font-bold text-[11px] rounded-lg flex items-center space-x-1">
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>同級保護</span>
                              </div>
                            ) : (
                              <button`,
  `                            {rbacUsers[rbacSelectedUser].role === UserRole.WEBMASTER ? (
                              <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px] rounded-lg flex items-center space-x-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>豁免</span>
                              </div>
                            ) : currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN ? (
                              <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-500 font-bold text-[11px] rounded-lg flex items-center space-x-1">
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>同級保護</span>
                              </div>
                            ) : (
                              <button`
);

// 2. Delete button -> show fool-proof protection instead of just hiding
code = code.replace(
  `                            {/* Deletion button is shielded for WEBMASTER and peer SUPER_ADMIN accounts */}
                            {rbacUsers[rbacSelectedUser].role !== UserRole.WEBMASTER &&
                              !(currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSubUser(rbacSelectedUser)}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center space-x-1 shadow-sm font-sans"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>永久刪除帳號</span>
                              </button>
                            )}`,
  `                            {/* Deletion button is shielded for WEBMASTER and peer SUPER_ADMIN accounts */}
                            {rbacUsers[rbacSelectedUser].role === UserRole.WEBMASTER ? (
                              <div className="px-3.5 py-1.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-[11px] rounded-lg flex items-center space-x-1 font-sans">
                                <Lock className="w-3.5 h-3.5" />
                                <span>防呆保護</span>
                              </div>
                            ) : currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN ? (
                              null
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteSubUser(rbacSelectedUser)}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center space-x-1 shadow-sm font-sans"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>永久刪除帳號</span>
                              </button>
                            )}`
);

// 3. Rename input -> block for Webmaster
code = code.replace(
  `                            {currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN ? (
                              <div className="p-2 bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>同為超級管理員，受同級權限保護，不可變更名稱</span>
                              </div>
                            ) : (
                              <input`,
  `                            {rbacUsers[rbacSelectedUser].role === UserRole.WEBMASTER ? (
                              <div className="p-2 bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>最高權限站主不可變更名稱</span>
                              </div>
                            ) : currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN ? (
                              <div className="p-2 bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>同為超級管理員，受同級權限保護，不可變更名稱</span>
                              </div>
                            ) : (
                              <input`
);

// 4. Rename button -> hide for Webmaster
code = code.replace(
  `                          {!(currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN) && (
                            <button
                              type="button"
                              onClick={handleRenameUser}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-md transition-colors cursor-pointer shrink-0"
                            >
                              確認更改名稱
                            </button>
                          )}`,
  `                          {rbacUsers[rbacSelectedUser].role !== UserRole.WEBMASTER && !(currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN) && (
                            <button
                              type="button"
                              onClick={handleRenameUser}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-md transition-colors cursor-pointer shrink-0"
                            >
                              確認更改名稱
                            </button>
                          )}`
);

// 5. Role change -> block for Webmaster
code = code.replace(
  `                          {currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN ? (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-800 flex items-center gap-2">
                              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>同級權限保護：同為超級管理員，不可調整或降級同級權限（僅系統站主擁有調派特權）。</span>
                            </div>
                          ) : (
                            <div className="flex gap-2">`,
  `                          {rbacUsers[rbacSelectedUser].role === UserRole.WEBMASTER ? (
                            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-800 flex items-center gap-2">
                              <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span>站主特權保護：系統站主擁有全域最高地位，不可被降級或調整角色。</span>
                            </div>
                          ) : currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN ? (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-800 flex items-center gap-2">
                              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>同級權限保護：同為超級管理員，不可調整或降級同級權限（僅系統站主擁有調派特權）。</span>
                            </div>
                          ) : (
                            <div className="flex gap-2">`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("Patched Webmaster protections in Right Panel");
