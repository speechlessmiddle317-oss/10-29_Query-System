import React, { useState, useMemo } from "react";
import { AuditLog, AppUser, UserRole } from "../types";
import { 
  Search, 
  ListFilter, 
  Trash2, 
  Calendar, 
  ClipboardList, 
  Lock, 
  Rocket, 
  ShieldCheck, 
  KeyRound, 
  X, 
  AlertTriangle,
  CheckCircle2,
  Shield,
  Link,
  Info,
  RefreshCw,
  Fingerprint
} from "lucide-react";
import ChangelogView from "./ChangelogView";
import { 
  deleteAuditLogFromApi, 
  clearAllAuditLogsFromApi, 
  verifyAuditLogIntegrityFromApi 
} from "../utils/sqlServerApi";
import { 
  saveAuditLogToFirestore, 
  deleteAuditLogFromFirestore, 
  clearAllAuditLogsFromFirestore 
} from "../utils/firebaseDb";

interface LogViewProps {
  logs: AuditLog[];
  onClearLogs?: () => void;
  onUpdateLogs?: (updatedLogs: AuditLog[]) => void;
  showAdminPrivileges: boolean;
  currentUser?: AppUser;
  rbacUsers?: Record<string, AppUser>;
  addLog?: (action: string, target: string, details: string) => void;
}

// 判定日誌是否屬於系統站主的操作（用於嚴格隔離權限）
export function isWebmasterLog(log: AuditLog, rbacUsers?: Record<string, AppUser>): boolean {
  if (!log) return false;
  const role = (log.role || "").trim();
  if (
    role === "系統站主" ||
    role.includes("系統站主") ||
    role === UserRole.WEBMASTER ||
    role.toUpperCase() === "WEBMASTER"
  ) {
    return true;
  }
  const username = (log.user || "").trim().toLowerCase();
  if (username === "webmaster") {
    return true;
  }
  if (rbacUsers && rbacUsers[username]?.role === UserRole.WEBMASTER) {
    return true;
  }
  if (log.details?.startsWith("系統站主") || log.action?.startsWith("系統站主")) {
    return true;
  }
  return false;
}

export default function LogView({ 
  logs, 
  onClearLogs, 
  onUpdateLogs, 
  currentUser, 
  rbacUsers, 
  addLog 
}: LogViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"audit" | "changelog">("audit");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // 1. 權限分級階層判定 (嚴格符合規範)：
  // 一般使用者: 不能修改亦不可存取
  // 一般管理員: 不能刪除、不能清空 (僅供查閱)
  // 有權限管理員: 可以受控刪除 (SUPER_ADMIN 且具備 canManageLogs 授權，或 WEBMASTER)
  // WEBMASTER: 才能清空 (且可受控刪除)
  const isWebmaster = 
    currentUser?.role === UserRole.WEBMASTER || 
    (currentUser?.role as any) === "WEBMASTER" || 
    currentUser?.username?.toLowerCase() === "webmaster";
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const canControlledDelete = isWebmaster || (isSuperAdmin && (
    currentUser?.canManageLogs === true || 
    (rbacUsers && currentUser?.username && rbacUsers[currentUser.username]?.canManageLogs === true)
  ));

  // 站主清空日誌密碼驗證 Modal 狀態 (僅 WEBMASTER 可用)
  const [showClearPasswordModal, setShowClearPasswordModal] = useState(false);
  const [clearPasswordInput, setClearPasswordInput] = useState("");
  const [clearPasswordError, setClearPasswordError] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  // 受控刪除 (Controlled Delete) Modal 狀態
  const [deletingLog, setDeletingLog] = useState<AuditLog | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Hash Chain 防篡改完整性驗證 Modal 狀態
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{
    success: boolean;
    valid: boolean;
    count: number;
    genesisHash?: string;
    headHash?: string;
    message: string;
    error?: string;
    brokenIndex?: number;
    brokenLogId?: string;
  } | null>(null);

  // 區塊鏈密碼學存證查閱 Modal
  const [inspectingBlock, setInspectingBlock] = useState<AuditLog | null>(null);

  // 核心隔離邏輯：系統站主的操作在系統日誌僅自身可見；對超級管理員與其餘角色全域屏蔽
  const visibleLogs = useMemo(() => {
    return logs.filter((log) => {
      if (isWebmasterLog(log, rbacUsers)) {
        return isWebmaster;
      }
      return true;
    });
  }, [logs, isWebmaster, rbacUsers]);

  const filteredLogs = useMemo(() => {
    return visibleLogs.filter((log) => {
      const matchesSearch = 
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.hash && log.hash.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = roleFilter === "ALL" || log.role.includes(roleFilter);

      return matchesSearch && matchesRole;
    });
  }, [visibleLogs, searchTerm, roleFilter]);

  // -------------------------------------------------------------
  // 1. 執行 Hash Chain 防篡改完整性檢驗
  // -------------------------------------------------------------
  const handleVerifyChainIntegrity = async () => {
    setShowIntegrityModal(true);
    setIntegrityLoading(true);
    try {
      const result = await verifyAuditLogIntegrityFromApi();
      setIntegrityResult(result);
    } catch (err: any) {
      setIntegrityResult({
        success: false,
        valid: false,
        count: 0,
        message: err?.message || "無法連線後端進行驗證",
      });
    } finally {
      setIntegrityLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. 觸發受控刪除 (有權限管理員與站主)
  // -------------------------------------------------------------
  const handleOpenControlledDelete = (log: AuditLog) => {
    if (!canControlledDelete) {
      alert("⚠️ 權限不足：一般使用者與一般管理員不能刪除日誌，僅限系統站主或獲得日誌授權之超級管理員執行受控刪除！");
      return;
    }
    if (!isWebmaster && isWebmasterLog(log, rbacUsers)) {
      alert("⚠️ 權限不足：系統站主專屬操作日誌受最高安全保護，不可刪除！");
      return;
    }
    setDeletingLog(log);
    setDeleteReason("管理員受控維護清理");
    setDeleteError("");
  };

  const handleConfirmControlledDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingLog) return;
    if (!deleteReason.trim()) {
      setDeleteError("請填寫受控刪除之事由！");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");
    try {
      const targetId = deletingLog.id;
      const res = await deleteAuditLogFromApi(targetId, deleteReason.trim());

      if (!res.success) {
        setDeleteError(res.message || "受控刪除日誌失敗");
        setIsDeleting(false);
        return;
      }

      // 成功從後端刪除：前端同步移除，並將回傳的「受控刪除存證日誌」加入列表頂部
      const remainingLogs = logs.filter(l => l.id !== targetId);
      const updatedList = res.deletionLog ? [res.deletionLog, ...remainingLogs] : remainingLogs;

      if (onUpdateLogs) {
        onUpdateLogs(updatedList);
      }

      // 災備與通知
      deleteAuditLogFromFirestore(targetId);
      if (res.deletionLog) {
        saveAuditLogToFirestore(res.deletionLog);
      }

      addLog?.(
        "日誌受控刪除",
        `日誌 [${targetId}]`,
        `管理員【${currentUser?.username}】完成受控刪除作業，原因：${deleteReason.trim()}。防篡改存證已自動寫入 Hash Chain。`
      );

      setDeletingLog(null);
      alert(`🛡️ 受控刪除作業完成！\n\n日誌條目 [${targetId}] 已受控刪除，系統已於防篡改 Hash Chain 中自動產生【日誌受控刪除】存證紀錄。`);
    } catch (err: any) {
      setDeleteError(err?.message || "通訊異常，無法完成受控刪除");
    } finally {
      setIsDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // 3. 系統站主清空全站日誌 (WEBMASTER ONLY)
  // -------------------------------------------------------------
  const handleOpenClearModal = () => {
    if (!isWebmaster) {
      alert("⚠️ 權限不足：依照安全規格，清空全站日誌僅限【系統站主 (WEBMASTER)】擁有執行權限！");
      return;
    }
    setClearPasswordInput("");
    setClearPasswordError("");
    setShowClearPasswordModal(true);
  };

  const handleConfirmWebmasterClear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWebmaster) return;
    if (!clearPasswordInput) {
      setClearPasswordError("請輸入站主登入密碼！");
      return;
    }

    setIsClearing(true);
    setClearPasswordError("");
    try {
      const res = await clearAllAuditLogsFromApi(clearPasswordInput);
      if (!res.success) {
        setClearPasswordError(res.message || "清空日誌失敗，密碼可能不正確！");
        setIsClearing(false);
        return;
      }

      // 成功清空：使用後端初始化回傳的 Genesis Block 重新設定日誌
      clearAllAuditLogsFromFirestore();
      setShowClearPasswordModal(false);
      setClearPasswordInput("");

      if (res.genesisBlock) {
        if (onUpdateLogs) {
          onUpdateLogs([res.genesisBlock]);
        }
        saveAuditLogToFirestore(res.genesisBlock);
      } else if (onClearLogs) {
        onClearLogs();
      }

      alert("🎉 站主密碼驗證通過！全站稽核日誌已由系統站主清空，防篡改鏈已重新初始化創始首節點 (Genesis Block)！");
    } catch (err: any) {
      setClearPasswordError(err?.message || "連線異常，無法清空日誌");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-4" id="system-audit-log-view">
      {/* Sub-tab switcher: 操作稽核日誌 vs 網站功能更新日誌 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          id="log-subtab-audit"
          type="button"
          onClick={() => setActiveSubTab("audit")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === "audit"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <ClipboardList className="w-4 h-4 text-indigo-400" />
          <span>📜 系統介面操作稽核日誌</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeSubTab === "audit" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {visibleLogs.length} 筆
          </span>
        </button>

        <button
          id="log-subtab-changelog"
          type="button"
          onClick={() => setActiveSubTab("changelog")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === "changelog"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Rocket className="w-4 h-4 text-amber-300" />
          <span>🚀 網站功能更新日誌 (Changelog)</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeSubTab === "changelog" ? "bg-indigo-500 text-white" : "bg-indigo-50 text-indigo-600"
          }`}>
            具體歷程
          </span>
        </button>
      </div>

      {activeSubTab === "changelog" ? (
        <ChangelogView currentUser={currentUser} addLog={addLog || (() => {})} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {/* Header & Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-800">系統操作稽核日誌</h2>
              
              {/* 權限階層徽章 */}
              {isWebmaster ? (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs font-mono">
                  <span>👑 系統站主 (清空/受控刪除權限)</span>
                </span>
              ) : canControlledDelete ? (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>授權管理員 (受控刪除權限)</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>一般管理員 (僅供查閱・禁止刪改)</span>
                </span>
              )}

              {/* Hash Chain 狀態徽章 */}
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1">
                <Link className="w-3 h-3 text-indigo-600" />
                <span>SHA-256 防篡改鏈</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Hash Chain 完整性校驗按鈕 */}
              <button
                type="button"
                id="verify-chain-integrity-btn"
                onClick={handleVerifyChainIntegrity}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="校驗日誌加密雜湊鏈完整性，偵測任何未經授權的篡改或斷鏈"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>防篡改完整性驗證</span>
              </button>

              {/* 清空日誌按鈕：嚴格限定 WEBMASTER 系統站主才有 */}
              {isWebmaster ? (
                <button
                  type="button"
                  id="webmaster-clear-logs-btn"
                  onClick={handleOpenClearModal}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-rose-200 cursor-pointer shadow-2xs"
                  title="僅系統站主可清空全站日誌（需輸入登入密碼驗證）"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>清空全站日誌 (站主專屬)</span>
                </button>
              ) : (
                <div 
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs font-medium flex items-center gap-1.5 cursor-not-allowed"
                  title="依安全規格：清空日誌僅系統站主 (WEBMASTER) 擁有權限"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>清空僅限站主</span>
                </div>
              )}
            </div>
          </div>

          {/* 系統站主專屬提示條 */}
          {isWebmaster && (
            <div className="mb-4 px-4 py-3 bg-amber-50/90 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 shadow-2xs animate-in fade-in">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 font-bold shrink-0 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-800" />
                  <span className="text-[11px]">站主操作隱私遮蔽生效</span>
                </div>
                <span className="text-[11px] leading-relaxed text-amber-900 font-medium">
                  系統啟用最高安全架構：系統站主所有操作日誌<strong>僅站主自身可見</strong>，一般管理員無法檢視站主操作動態。站主具備<strong>受控刪除與清空全站</strong>權限。
                </span>
              </div>
              <span className="text-[10px] bg-amber-200/80 text-amber-950 px-2.5 py-1 rounded-md font-bold shrink-0 self-start sm:self-auto font-mono">
                👑 站主特權視野
              </span>
            </div>
          )}

          {/* 超級管理員狀態提示條 */}
          {isSuperAdmin && !canControlledDelete && (
            <div className="mb-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700 shadow-2xs animate-in fade-in">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-slate-200 rounded-lg text-slate-700 font-bold shrink-0 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-[11px]">一般管理員查閱模式</span>
                </div>
                <span className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  依安全規格：<strong>一般管理員不能刪除、不能修改亦不能清空日誌</strong>。如需執行「受控刪除」，需由<strong>系統站主</strong>於管理中心授予日誌管理特權。
                </span>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-mono font-bold px-2.5 py-1 rounded-md shrink-0 self-start sm:self-auto">
                🔒 禁止刪改
              </span>
            </div>
          )}

          {isSuperAdmin && canControlledDelete && (
            <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900 shadow-2xs animate-in fade-in">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-800 font-bold shrink-0 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-[11px]">已獲授權受控刪除</span>
                </div>
                <span className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                  您已獲系統站主授予日誌管理特權，可執行<strong>「受控刪除」</strong>作業。刪除時須填寫事由，系統將自動於防篡改鏈中生成不可抵賴存證。
                </span>
              </div>
              <span className="text-[10px] bg-emerald-200 text-emerald-950 font-mono font-bold px-2.5 py-1 rounded-md shrink-0 self-start sm:self-auto">
                ✅ 可受控刪除
              </span>
            </div>
          )}

          {/* Searching & Filtering */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="log-search-term"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜尋操作人員、行為、目標、說明或 SHA-256 雜湊碼..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700"
              />
            </div>

            <div className="flex items-center space-x-2 min-w-[180px]">
              <ListFilter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                id="log-role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-700 font-medium cursor-pointer"
              >
                <option value="ALL">全部權限階級</option>
                {isWebmaster && (
                  <option value="系統站主">👑 系統站主 (僅自身可見)</option>
                )}
                <option value="超級管理員">超級管理員</option>
                <option value="系統管理員">系統管理員</option>
                <option value="操作員">操作員</option>
                <option value="分析員">分析員</option>
                <option value="出題人">出題人</option>
                <option value="系統環境">系統/一般使用者</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">時間戳記</th>
                  <th className="py-3 px-4">操作人員</th>
                  <th className="py-3 px-4">權限階級</th>
                  <th className="py-3 px-4">操作行為</th>
                  <th className="py-3 px-4">目標對象</th>
                  <th className="py-3 px-4">變更詳細描述</th>
                  <th className="py-3 px-4">防篡改 Hash</th>
                  <th className="py-3 px-4 text-center">安全權限</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-mono">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const logIsFromWebmaster = isWebmasterLog(log, rbacUsers);
                    const isControlledDeleteLog = log.action.includes("受控刪除") || log.action.includes("CONTROLLED_DELETE");

                    return (
                      <tr 
                        key={log.id} 
                        className={`transition-colors ${
                          logIsFromWebmaster 
                            ? "bg-amber-50/40 hover:bg-amber-50/70" 
                            : isControlledDeleteLog
                            ? "bg-rose-50/30 hover:bg-rose-50/60"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                        <td className="py-3 px-4 text-indigo-700 font-semibold flex items-center space-x-1.5">
                          <span>{log.user}</span>
                          {logIsFromWebmaster && (
                            <span className="text-[10px]" title="站主私密操作">👑</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            logIsFromWebmaster
                              ? "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold"
                              : log.role === "超級管理員" 
                              ? "bg-slate-900 text-slate-100" 
                              : log.role === "系統管理員"
                              ? "bg-indigo-100 text-indigo-800"
                              : log.role.includes("操作員")
                              ? "bg-blue-100 text-blue-800"
                              : log.role.includes("分析員")
                              ? "bg-purple-100 text-purple-800"
                              : log.role.includes("出題人")
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {logIsFromWebmaster ? (
                              <span title="此紀錄對超級管理員完全隱蔽，僅系統站主可見">👑 系統站主 (🔒 僅自身可見)</span>
                            ) : (
                              log.role
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {isControlledDeleteLog ? (
                            <span className="text-rose-700 flex items-center gap-1 font-bold">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {log.action}
                            </span>
                          ) : (
                            log.action
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{log.target}</td>
                        <td className="py-3 px-4 text-slate-600 font-sans max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>

                        {/* Hash Chain 徽章 */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.hash ? (
                            <button
                              type="button"
                              onClick={() => setInspectingBlock(log)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 text-slate-600 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                              title="點擊查看區塊鏈密碼學存證明細"
                            >
                              <Fingerprint className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span>{log.hash.substring(0, 8)}...</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">未上鏈</span>
                          )}
                        </td>

                        {/* 安全權限欄位：一般管理員不能刪除，有權限者可受控刪除 */}
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          {canControlledDelete ? (
                            (!isWebmaster && logIsFromWebmaster) ? (
                              <span className="text-[10px] text-slate-400 font-sans font-bold">🔒 站主保護</span>
                            ) : (
                              <button
                                type="button"
                                id={`controlled-delete-log-${log.id}`}
                                onClick={() => handleOpenControlledDelete(log)}
                                className="px-2.5 py-1 text-rose-700 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer shadow-2xs"
                                title="受控刪除：將刪除此筆記錄並自動留下不可抵賴之防篡改存證"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>受控刪除</span>
                              </button>
                            )
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400 font-sans bg-slate-100 px-2 py-0.5 rounded">
                              僅供查閱
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-sans text-xs">
                      沒有找到符合篩選條件的日誌記錄
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-sans">
            <span>共 {visibleLogs.length} 筆紀錄 / 篩選出 {filteredLogs.length} 筆</span>
            <span className="flex items-center text-[10px]">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" /> 
              所有重要操作均自動記錄並鏈結至 SHA-256 防篡改鏈
            </span>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 1. 受控刪除確認 Modal (Controlled Deletion Modal) */}
      {/* ----------------------------------------------------------- */}
      {deletingLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">日誌受控刪除確認</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed space-y-1">
              <p className="font-bold flex items-center gap-1 text-amber-950">
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                高安全等級受控作業宣告：
              </p>
              <p>
                依照安全規範，日誌刪除為<strong>「受控刪除」</strong>。系統將刪除指定紀錄，但<strong>會自動於不可篡改之 SHA-256 Hash Chain 中記錄一筆【日誌受控刪除】存證</strong>，註明操作者身份、時間、原日誌 Hash 與刪除事由。
              </p>
            </div>

            {/* 待刪除日誌明細 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-500">
                <span>編號: {deletingLog.id}</span>
                <span>時間: {deletingLog.timestamp}</span>
              </div>
              <div className="text-slate-700 font-sans">
                <strong>操作者:</strong> {deletingLog.user} ({deletingLog.role})
              </div>
              <div className="text-slate-700 font-sans">
                <strong>行為:</strong> {deletingLog.action} / <strong>目標:</strong> {deletingLog.target}
              </div>
              {deletingLog.hash && (
                <div className="text-slate-500 text-[10px] break-all">
                  <strong>原 Hash:</strong> {deletingLog.hash}
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmControlledDelete} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  請填寫受控刪除事由 (必填，將記入防篡改存證)：
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={deleteReason}
                  onChange={(e) => {
                    setDeleteReason(e.target.value);
                    setDeleteError("");
                  }}
                  placeholder="例如：誤觸測試記錄受控清理、例行合規資料受控刪除..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-rose-500 focus:bg-white transition-all font-sans"
                />
              </div>

              {deleteError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeletingLog(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? "處理中..." : "確認執行受控刪除"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 2. 系統站主清空全站日誌密碼驗證 Modal (WEBMASTER Only) */}
      {/* ----------------------------------------------------------- */}
      {showClearPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">系統站主身分密碼驗證</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowClearPasswordModal(false);
                  setClearPasswordError("");
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p className="leading-relaxed">
                ⚠️ 清空全站日誌為<strong>最高等級不可逆操作</strong>。依照安全規格，僅<strong>系統站主 (WEBMASTER)</strong> 具備此特權，且必須輸入<strong>站主登入密碼</strong>確認。
              </p>
              <p className="text-[11px] text-slate-500">
                清空後，系統將自動產生不可篡改的創始首節點 (Genesis Block)。
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] font-medium flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
                <span>站主帳號：<strong className="font-mono text-amber-950">{currentUser?.username || "webmaster"}</strong></span>
              </div>
            </div>

            <form onSubmit={handleConfirmWebmasterClear} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  請輸入系統站主密碼：
                </label>
                <input
                  type="password"
                  id="webmaster-clear-password-input"
                  autoFocus
                  required
                  value={clearPasswordInput}
                  onChange={(e) => {
                    setClearPasswordInput(e.target.value);
                    setClearPasswordError("");
                  }}
                  placeholder="請輸入當前站主登入密碼..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-rose-500 focus:bg-white transition-all font-mono"
                />
              </div>

              {clearPasswordError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{clearPasswordError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={() => {
                    setShowClearPasswordModal(false);
                    setClearPasswordError("");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isClearing}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isClearing ? "驗證清空中..." : "驗證密碼並清空全站"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 3. Hash Chain 防篡改完整性驗證 Modal */}
      {/* ----------------------------------------------------------- */}
      {showIntegrityModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Hash Chain 防篡改完整性檢驗報告</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIntegrityModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {integrityLoading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-600 font-medium">正在校驗每筆日誌 SHA-256 密碼學哈希鏈完整性...</p>
              </div>
            ) : integrityResult ? (
              <div className="space-y-4 text-xs">
                {integrityResult.valid ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-emerald-900 text-sm">密碼學雜湊鏈全線驗證通過！</h4>
                      <p className="text-emerald-800 leading-relaxed text-xs">
                        已對所有 <strong>{integrityResult.count}</strong> 筆稽核日誌節點進行 SHA-256 密碼學哈希驗算，未發現任何未授權修改、刪除或資料庫偽造行為。
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-rose-900 text-sm">警報：雜湊鏈驗證失敗，可能存在非授權篡改！</h4>
                      <p className="text-rose-800 leading-relaxed text-xs">
                        {integrityResult.message}
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500 font-sans">校驗日誌總數：</span>
                    <span className="font-bold text-slate-800">{integrityResult.count} 筆節點</span>
                  </div>
                  {integrityResult.genesisHash && (
                    <div className="space-y-0.5">
                      <span className="text-slate-500 font-sans block text-[10px]">創始節點雜湊 (Genesis Hash)：</span>
                      <span className="text-indigo-700 text-[10px] break-all">{integrityResult.genesisHash}</span>
                    </div>
                  )}
                  {integrityResult.headHash && (
                    <div className="space-y-0.5">
                      <span className="text-slate-500 font-sans block text-[10px]">當前最新鏈頂雜湊 (Head Hash)：</span>
                      <span className="text-emerald-700 text-[10px] break-all">{integrityResult.headHash}</span>
                    </div>
                  )}
                  <div className="pt-1 text-[10px] text-slate-500 font-sans flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>雜湊演算法: SHA-256 (prevHash || id || timestamp || user || role || action || target || details)</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowIntegrityModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                關閉驗證視窗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 4. 區塊鏈密碼學存證查閱 Modal (Block Proof Modal) */}
      {/* ----------------------------------------------------------- */}
      {inspectingBlock && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Fingerprint className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">區塊鏈密碼學存證憑證</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingBlock(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-500">
                <span>區塊 ID: {inspectingBlock.id}</span>
                <span>時間: {inspectingBlock.timestamp}</span>
              </div>
              <div className="text-slate-700 font-sans">
                <strong>操作人員:</strong> {inspectingBlock.user} ({inspectingBlock.role})
              </div>
              <div className="text-slate-700 font-sans">
                <strong>行為:</strong> {inspectingBlock.action} / <strong>目標:</strong> {inspectingBlock.target}
              </div>
              <div className="text-slate-600 font-sans bg-white p-2.5 rounded-lg border border-slate-200">
                <strong className="block text-slate-400 text-[10px]">詳細摘要內容:</strong>
                {inspectingBlock.details}
              </div>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-[11px] font-mono">
              <div className="space-y-0.5">
                <span className="text-indigo-900 font-sans font-bold block text-[10px]">前一節點雜湊 (Prev Hash):</span>
                <span className="text-indigo-700 break-all text-[10px]">{inspectingBlock.prevHash || "0000000000000000000000000000000000000000000000000000000000000000 (創始區塊)"}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-indigo-900 font-sans font-bold block text-[10px]">本節點密碼學雜湊 (Hash):</span>
                <span className="text-emerald-700 break-all font-bold text-[10px]">{inspectingBlock.hash || "無"}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                SHA-256 鏈結有效存證
              </span>
              <button
                type="button"
                onClick={() => setInspectingBlock(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
