import React, { useState, useMemo } from "react";
import { AppUser, Questionnaire, UserRole, StarLevel } from "../types";
import { isFeatureBanned } from "../utils/bannedFeatures";
import { 
  Share2, 
  Search, 
  Filter, 
  CheckCircle2, 
  Ban, 
  Sliders, 
  FileText, 
  Users, 
  AlertCircle,
  Sparkles,
  Info
} from "lucide-react";

interface SystemAdminDistributePanelProps {
  currentUser: AppUser;
  questionnaires: Questionnaire[];
  rbacUsers: Record<string, AppUser>;
  onToggleUserTable: (username: string, surveyId: string) => void;
  onUpdateUserStar: (username: string, starLevel: number) => void;
  onTriggerBannedAlert: (featureName: string, featureKey?: string) => void;
  checkFeatureAccess: (featureKey: string, featureName: string) => boolean;
}

export default function SystemAdminDistributePanel({
  currentUser,
  questionnaires,
  rbacUsers,
  onToggleUserTable,
  onUpdateUserStar,
  onTriggerBannedAlert,
  checkFeatureAccess
}: SystemAdminDistributePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");

  const isBanned = isFeatureBanned(currentUser, "distribute_questionnaires");

  // Subordinate users for System Admin to distribute questionnaires to
  const subordinateUsers = useMemo(() => {
    return Object.entries(rbacUsers).filter(([uname, user]) => {
      // Exclude self and higher roles (Webmaster, Super Admin)
      if (uname.toLowerCase() === currentUser.username.toLowerCase()) return false;
      if (user.role === UserRole.WEBMASTER || user.role === UserRole.SUPER_ADMIN) return false;
      return true;
    });
  }, [rbacUsers, currentUser.username]);

  // Filtered by search and role
  const filteredUsers = useMemo(() => {
    return subordinateUsers.filter(([uname, user]) => {
      const matchSearch =
        uname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = selectedRoleFilter === "ALL" || user.role === selectedRoleFilter;
      return matchSearch && matchRole;
    });
  }, [subordinateUsers, searchQuery, selectedRoleFilter]);

  const handleStarChange = (username: string, newStar: number) => {
    if (!checkFeatureAccess("distribute_questionnaires", "發配問卷功能")) {
      return;
    }
    onUpdateUserStar(username, newStar);
  };

  const handleTableToggle = (username: string, surveyId: string) => {
    if (!checkFeatureAccess("distribute_questionnaires", "發配問卷功能")) {
      return;
    }
    onToggleUserTable(username, surveyId);
  };

  if (isBanned) {
    return (
      <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-8 text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center mx-auto">
          <Ban className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-red-900">⛔ 問卷發配功能已被凍結封禁</h3>
        <p className="text-xs text-red-700 max-w-md mx-auto leading-relaxed">
          您的「發配問卷功能」目前已被超級管理員或系統站主封禁。您當前無法對任何下屬帳號進行問卷發配、表單指派或星級調控。
        </p>
        <button
          type="button"
          onClick={() => onTriggerBannedAlert("發配問卷功能", "distribute_questionnaires")}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-all"
        >
          查看封禁警示
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Share2 className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-800">📤 問卷發配與指派中心</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            系統管理員專屬調控模組：為轄下操作員、分析師及出題人指派負責之問卷表單，並配置認證星階上限。
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2 text-center">
            <span className="text-[10px] text-slate-400 font-bold block">全站問卷數</span>
            <span className="text-sm font-extrabold text-slate-800 font-mono">{questionnaires.length}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-150 rounded-xl px-3.5 py-2 text-center">
            <span className="text-[10px] text-emerald-600 font-bold block">在線填寫中</span>
            <span className="text-sm font-extrabold text-emerald-700 font-mono">
              {questionnaires.filter(q => q.isActive).length}
            </span>
          </div>
          <div className="bg-indigo-50 border border-indigo-150 rounded-xl px-3.5 py-2 text-center">
            <span className="text-[10px] text-indigo-600 font-bold block">可管理下屬</span>
            <span className="text-sm font-extrabold text-indigo-700 font-mono">{subordinateUsers.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋下屬帳號名稱或角色..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">身分篩選:</span>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">全部下屬角色</option>
            <option value={UserRole.OPERATOR}>問卷操作員 (OPERATOR)</option>
            <option value={UserRole.ANALYST}>數據分析員 (ANALYST)</option>
            <option value={UserRole.QUESTION_CREATOR}>出題人 (CREATOR)</option>
            <option value={UserRole.RESPONDENT}>答題市民 (RESPONDENT)</option>
          </select>
        </div>
      </div>

      {/* User Table & Questionnaire Distribution Cards */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-xs font-bold">沒有符合條件的下屬帳號</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">下屬用戶名稱</th>
                  <th className="py-3.5 px-4">角色職務</th>
                  <th className="py-3.5 px-4">認證星級 (配額上限)</th>
                  <th className="py-3.5 px-4 min-w-[320px]">已發配問卷表單 ({questionnaires.length}份可選)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredUsers.map(([uname, uObj]) => {
                  const maxAllowed = uObj.starLevel || 1;
                  const assignedCount = (uObj.assignedTables || []).length;
                  const isAtLimit = assignedCount >= maxAllowed;

                  return (
                    <tr key={uname} className="hover:bg-slate-50/70 transition-colors">
                      {/* Username */}
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-[11px]">
                            {uname.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-sans text-xs font-bold text-slate-800">{uname}</span>
                            <span className="text-[10px] text-slate-400 font-sans">
                              {uObj.banned ? "⛔ 帳號已凍結" : "✅ 正常在線"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-block font-sans ${
                          uObj.role === UserRole.OPERATOR 
                            ? "bg-blue-50 text-blue-700 border border-blue-150" 
                            : uObj.role === UserRole.ANALYST 
                            ? "bg-purple-50 text-purple-700 border border-purple-150" 
                            : uObj.role === UserRole.QUESTION_CREATOR 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-150" 
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {uObj.role === UserRole.OPERATOR ? "操作員" :
                           uObj.role === UserRole.ANALYST ? "分析員" :
                           uObj.role === UserRole.QUESTION_CREATOR ? "出題人" : "答題人"}
                        </span>
                      </td>

                      {/* Star Level Select */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <select
                            value={uObj.starLevel || 1}
                            onChange={(e) => handleStarChange(uname, Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-700 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-sans"
                          >
                            <option value={1}>⭐ 1星 (上限 1 表)</option>
                            <option value={2}>⭐⭐ 2星 (上限 2 表)</option>
                            <option value={3}>⭐⭐⭐ 3星 (上限 3 表)</option>
                          </select>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isAtLimit ? "bg-amber-100 text-amber-800" : "bg-slate-150 text-slate-600"
                          }`}>
                            {assignedCount}/{maxAllowed}
                          </span>
                        </div>
                      </td>

                      {/* Assigned Questionnaires Pills */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            {questionnaires.map((q) => {
                              const isAssigned = uObj.assignedTables?.includes(q.id);
                              return (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => handleTableToggle(uname, q.id)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                                    isAssigned
                                      ? "bg-indigo-600 text-white shadow-xs hover:bg-indigo-700"
                                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
                                  }`}
                                  title={`${q.title} (${q.isActive ? "填寫中" : "已停用"})`}
                                >
                                  {isAssigned && <CheckCircle2 className="w-3 h-3 text-indigo-200" />}
                                  <span>{q.title.substring(0, 14)}{q.title.length > 14 ? "..." : ""}</span>
                                </button>
                              );
                            })}
                            {questionnaires.length === 0 && (
                              <span className="text-[10px] text-slate-400 italic">目前系統無任何問卷可供發配</span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guide Note */}
      <div className="p-4 bg-indigo-50/40 border border-indigo-150 rounded-2xl flex items-start space-x-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 space-y-1">
          <p className="font-bold">系統管理員發配規則說明：</p>
          <ul className="list-disc pl-4 text-[11px] text-indigo-800 space-y-0.5">
            <li><strong>星等上限限制</strong>：下屬帳號所能指派的問卷數量不能超過其認證星等（1星上限 1 張，2星上限 2 張，3星上限 3 張）。</li>
            <li><strong>動態解除指派</strong>：點擊已發配的紫色問卷標籤即可即時取消指派，點選白色標籤則可指派新增。</li>
            <li><strong>相容封禁控制</strong>：若您的「發配問卷功能」權限被上級超級管理員或站主封禁，所有發配與星級調校操作將立即受到阻擋。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
