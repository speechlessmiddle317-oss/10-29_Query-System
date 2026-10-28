import React, { useState, useMemo } from "react";
import { 
  AppUser, 
  Questionnaire, 
  UserRole 
} from "../types";
import { 
  canManageUserBans, 
  getRoleAvailableBanFeatures, 
  BanFeatureItem 
} from "../utils/bannedFeatures";
import { 
  Ban, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  User, 
  Layers, 
  CheckCircle2, 
  AlertOctagon, 
  ChevronRight, 
  X, 
  Filter, 
  Sparkles,
  Lock,
  Unlock,
  ClipboardList,
  FileCheck2,
  Users
} from "lucide-react";

interface FeatureBanPanelProps {
  currentUser: AppUser;
  questionnaires: Questionnaire[];
  allUsers: Record<string, AppUser>;
  onUpdateUserBans: (targetUsername: string, updatedBannedFeatures: string[]) => void;
  onTriggerBannedAlert: (featureName: string, featureKey?: string) => void;
  addLog: (action: string, target: string, details: string) => void;
}

export default function FeatureBanPanel({
  currentUser,
  questionnaires,
  allUsers,
  onUpdateUserBans,
  onTriggerBannedAlert,
  addLog
}: FeatureBanPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  // Filter subordinate users manageable by the currentUser
  const manageableUsers = useMemo(() => {
    return Object.values(allUsers).filter((user) => {
      // Must be subordinate according to rules
      if (!canManageUserBans(currentUser.role, user.role)) {
        return false;
      }
      // Never allow self-ban
      if (user.username.toLowerCase() === currentUser.username.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [allUsers, currentUser.role, currentUser.username]);

  // Filter by search and role
  const filteredUsers = useMemo(() => {
    return manageableUsers.filter((u) => {
      const matchSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = selectedRoleFilter === "ALL" || u.role === selectedRoleFilter;
      return matchSearch && matchRole;
    });
  }, [manageableUsers, searchQuery, selectedRoleFilter]);

  const selectedUser = useMemo(() => {
    if (!selectedUsername) return null;
    if (allUsers[selectedUsername]) return allUsers[selectedUsername];
    const lower = selectedUsername.toLowerCase();
    if (allUsers[lower]) return allUsers[lower];
    return Object.values(allUsers).find((u) => u.username.toLowerCase() === lower) || null;
  }, [allUsers, selectedUsername]);

  const selectedUserFeatures: BanFeatureItem[] = useMemo(() => {
    if (!selectedUser) return [];
    return getRoleAvailableBanFeatures(selectedUser, questionnaires);
  }, [selectedUser, questionnaires]);

  // Group features by category
  const coreFeatures = selectedUserFeatures.filter((f) => f.category === "core");
  const surveyFeatures = selectedUserFeatures.filter((f) => f.category === "survey");
  const privilegeFeatures = selectedUserFeatures.filter((f) => f.category === "privilege");

  const handleToggleFeature = (featureItem: BanFeatureItem) => {
    if (!selectedUser) return;
    const currentBanned = selectedUser.bannedFeatures || [];
    const isCurrentlyBanned = currentBanned.includes(featureItem.id);

    let updatedBanned: string[];
    if (isCurrentlyBanned) {
      updatedBanned = currentBanned.filter((k) => k !== featureItem.id);
      addLog(
        "解除功能封禁",
        selectedUser.username,
        `管理員【${currentUser.username}】解除了【${selectedUser.username}】(${selectedUser.role}) 的「${featureItem.name}」封禁。`
      );
    } else {
      updatedBanned = [...currentBanned, featureItem.id];
      addLog(
        "實施功能封禁",
        selectedUser.username,
        `管理員【${currentUser.username}】封禁了【${selectedUser.username}】(${selectedUser.role}) 的「${featureItem.name}」功能權限。`
      );
    }

    onUpdateUserBans(selectedUser.username, updatedBanned);
  };

  const handleClearAllBans = () => {
    if (!selectedUser) return;
    if (!window.confirm(`確定要一次性解除帳號「${selectedUser.username}」的所有已封禁功能與特權嗎？`)) {
      return;
    }
    onUpdateUserBans(selectedUser.username, []);
    addLog(
      "清空功能封禁",
      selectedUser.username,
      `管理員【${currentUser.username}】清空並完全恢復了【${selectedUser.username}】的所有功能與特權。`
    );
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case UserRole.WEBMASTER:
        return "系統站主";
      case UserRole.SUPER_ADMIN:
        return "超級管理員";
      case UserRole.SYSTEM_ADMIN:
        return "系統管理員";
      case UserRole.OPERATOR:
        return "操作員";
      case UserRole.ANALYST:
        return "分析員";
      case UserRole.QUESTION_CREATOR:
        return "出題人";
      case UserRole.RESPONDENT:
        return "答題市民";
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150" id="feature-ban-panel-root">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-900 via-rose-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-red-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/30 border border-red-500/40 rounded-full text-xs font-bold text-red-200">
              <Ban className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span>下屬權限功能精準管制中心</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>🚫 封禁功能面板</span>
            </h2>
            <p className="text-xs text-red-100/80 max-w-2xl leading-relaxed">
              {currentUser.role === UserRole.WEBMASTER
                ? "系統站主具備全域最高裁決權，可個別封禁超級管理員的系統日誌、封禁功能面板，以及所有下屬角色的操作、出卷、查看與特權。"
                : "超級管理員具備下級管理權，可針對系統管理員、操作員、分析員、出題人及答題市民的特定功能、個別問卷及特權實施單獨封禁。"}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center min-w-[100px]">
              <div className="text-[10px] text-red-200/80 font-bold uppercase tracking-wider">可管轄帳號</div>
              <div className="text-xl font-black text-white">{manageableUsers.length}</div>
            </div>
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center min-w-[100px]">
              <div className="text-[10px] text-red-200/80 font-bold uppercase tracking-wider">受限封禁中</div>
              <div className="text-xl font-black text-rose-400">
                {manageableUsers.filter((u) => u.bannedFeatures && u.bannedFeatures.length > 0).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout: User List (Left) + Detail Ban Toggles (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Manageable Users List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>下屬帳號名冊 ({filteredUsers.length})</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                點選帳號配置封禁項目
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="search-ban-users-input"
                type="text"
                placeholder="搜尋帳號名稱或角色..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Role filter pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["ALL", UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.OPERATOR, UserRole.ANALYST, UserRole.QUESTION_CREATOR, UserRole.RESPONDENT]
                .filter((r) => r === "ALL" || canManageUserBans(currentUser.role, r as UserRole))
                .map((roleKey) => (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => setSelectedRoleFilter(roleKey)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      selectedRoleFilter === roleKey
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    {roleKey === "ALL" ? "全部角色" : getRoleDisplayName(roleKey as UserRole)}
                  </button>
                ))}
            </div>
          </div>

          {/* User Cards List */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredUsers.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                沒有找到符合條件的下屬帳號
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUsername?.toLowerCase() === user.username.toLowerCase();
                const bannedCount = (user.bannedFeatures || []).length;
                const isFullyBanned = user.banned;

                return (
                  <div
                    key={user.username}
                    onClick={() => setSelectedUsername(user.username)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-red-50/70 border-red-500 ring-2 ring-red-500/20 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                          bannedCount > 0 || isFullyBanned
                            ? "bg-red-100 text-red-700 border border-red-300"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {user.username}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                            {getRoleDisplayName(user.role)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{user.starLevel ? `${user.starLevel} 等級/星級` : "標準"}</span>
                          {bannedCount > 0 && (
                            <span className="text-red-600 font-bold flex items-center gap-0.5">
                              <AlertOctagon className="w-2.5 h-2.5" />
                              已封禁 {bannedCount} 項功能
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {bannedCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black border border-red-200">
                          {bannedCount} 受限
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          正常
                        </span>
                      )}
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? "translate-x-0.5 text-red-500" : ""}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Ban Configuration Panel for Selected User */}
        <div className="lg:col-span-7">
          {selectedUser ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              
              {/* Selected User Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-red-950 text-white flex items-center justify-center font-black text-base shadow-md shadow-slate-200">
                    {selectedUser.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">
                        {selectedUser.username}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black border border-red-200">
                        {getRoleDisplayName(selectedUser.role)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>當前已封鎖: <strong className="text-red-600">{(selectedUser.bannedFeatures || []).length}</strong> 項</span>
                      <span>•</span>
                      <span>可管制總項目: <strong>{selectedUserFeatures.length}</strong> 項</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(selectedUser.bannedFeatures || []).length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllBans}
                      className="px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>恢復全部功能</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedUsername(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="關閉選單"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 1. Core Role Features */}
              {coreFeatures.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>角色核心功能封禁</span>
                    </span>
                    <span className="text-[10px] text-slate-400">開關關閉即刻封鎖</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {coreFeatures.map((feat) => {
                      const isBanned = (selectedUser.bannedFeatures || []).includes(feat.id);
                      return (
                        <div
                          key={feat.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                            isBanned
                              ? "bg-red-50/80 border-red-300 shadow-xs"
                              : "bg-slate-50/70 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="pr-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isBanned ? "text-red-700 font-black" : "text-slate-900"}`}>
                                {feat.name}
                              </span>
                              {isBanned && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-red-600 text-white rounded font-bold">
                                  已封禁
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                              {feat.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleFeature(feat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                              isBanned
                                ? "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200"
                                : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                            }`}
                          >
                            {isBanned ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>解除封禁</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5 text-red-500" />
                                <span>立即封禁</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Respondent Upgrade Privileges (可被單獨封禁) */}
              {privilegeFeatures.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                      <span>升級獲得特權（可被單獨封禁）</span>
                    </span>
                    <span className="text-[10px] text-purple-600 font-semibold">
                      單獨封鎖指定高階特權
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {privilegeFeatures.map((feat) => {
                      const isBanned = (selectedUser.bannedFeatures || []).includes(feat.id);
                      return (
                        <div
                          key={feat.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                            isBanned
                              ? "bg-red-50/80 border-red-300 shadow-xs"
                              : "bg-purple-50/40 border-purple-150 hover:bg-purple-50/70"
                          }`}
                        >
                          <div className="pr-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isBanned ? "text-red-700 font-black" : "text-purple-950"}`}>
                                {feat.name}
                              </span>
                              {isBanned && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-red-600 text-white rounded font-bold">
                                  特權已封禁
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                              {feat.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleFeature(feat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                              isBanned
                                ? "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200"
                                : "bg-white hover:bg-purple-100/70 text-purple-900 border border-purple-300"
                            }`}
                          >
                            {isBanned ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>解除封禁</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5 text-red-500" />
                                <span>封禁此特權</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Per-Survey Independent Bans (註：每個問卷可被單獨封禁) */}
              {surveyFeatures.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
                      <span>單獨問卷封禁設定（註：每個問卷可被單獨封禁）</span>
                    </span>
                    <span className="text-[10px] text-amber-700 font-semibold">
                      個別問卷隔離管理
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {surveyFeatures.map((feat) => {
                      const isBanned = (selectedUser.bannedFeatures || []).includes(feat.id);
                      return (
                        <div
                          key={feat.id}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                            isBanned
                              ? "bg-red-50/90 border-red-300 shadow-xs"
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100/60"
                          }`}
                        >
                          <div className="pr-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isBanned ? "text-red-700 font-black" : "text-slate-800"}`}>
                                {feat.name}
                              </span>
                              {isBanned && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-red-600 text-white rounded font-bold">
                                  問卷已封禁
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {feat.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleFeature(feat)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                              isBanned
                                ? "bg-red-600 hover:bg-red-700 text-white shadow-xs"
                                : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                            }`}
                          >
                            {isBanned ? (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>解封</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3 h-3 text-red-500" />
                                <span>封禁</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              <div className="font-bold text-sm text-slate-700">請從左側名冊選取要封禁功能的下屬帳號</div>
              <p className="text-xs text-slate-400 max-w-sm">
                選取後即可針對該帳號的系統日誌、封禁面板、發配問卷、個別問卷操作/查看、出卷/編輯/刪除、以及升級獲得的各項特權實施單獨封禁。
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
