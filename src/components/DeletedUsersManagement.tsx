import React, { useState, useEffect } from "react";
import { AppUser, UserRole } from "../types";
import { Trash2, AlertCircle, RefreshCw, CheckSquare, Square } from "lucide-react";
import { fetchDeletedUsersFromApi, purgeDeletedUsersFromApi } from "../utils/sqlServerApi";

interface DeletedUsersManagementProps {
  currentUser: AppUser;
  onAddLog: (action: string, target: string, details: string) => void;
}

export default function DeletedUsersManagement({ currentUser, onAddLog }: DeletedUsersManagementProps) {
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    const data = await fetchDeletedUsersFromApi();
    if (data) {
      setDeletedUsers(data);
    } else {
      setError("無法載入已刪除帳號紀錄");
    }
    setLoading(false);
    setSelectedIds([]);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectAll = () => {
    const unpurged = deletedUsers.filter(u => u.status === "DELETED").map(u => u.username);
    if (selectedIds.length === unpurged.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unpurged);
    }
  };

  const handleSelect = (username: string) => {
    setSelectedIds(prev => 
      prev.includes(username) 
        ? prev.filter(id => id !== username)
        : [...prev, username]
    );
  };

  const handlePurge = async () => {
    if (purgeConfirmText !== "永久清除") return;
    setIsPurging(true);
    const result = await purgeDeletedUsersFromApi(selectedIds);
    setIsPurging(false);
    setShowPurgeModal(false);
    setPurgeConfirmText("");

    if (result.success) {
      onAddLog("永久清除帳號歷史資料", `數量: ${selectedIds.length}`, `已永久清除下列帳號關聯資料: ${selectedIds.join(", ")}`);
      await fetchUsers();
    } else {
      setError(result.error || "清除失敗");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
            <Trash2 className="w-5 h-5 text-rose-600" />
            <span>已刪除帳號歷史資料管理</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            保留已刪除帳號的歷史答題紀錄與稽核紀錄。僅系統站主可執行「永久清除資料」。
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>重新整理</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-medium flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSelectAll}
              className="text-slate-500 hover:text-slate-700"
              disabled={deletedUsers.filter(u => u.status === "DELETED").length === 0}
            >
              {selectedIds.length === deletedUsers.filter(u => u.status === "DELETED").length && deletedUsers.filter(u => u.status === "DELETED").length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <span className="text-xs font-bold text-slate-600">
              已選取 {selectedIds.length} 個帳號
            </span>
          </div>
          
          {currentUser.role === UserRole.WEBMASTER && selectedIds.length > 0 && (
            <button
              onClick={() => setShowPurgeModal(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>永久清除選取資料</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deletedUsers.map(user => {
            const isPurged = user.status === "PURGED";
            const isSelected = selectedIds.includes(user.username);
            
            return (
              <div 
                key={user.id}
                className={`relative p-4 rounded-xl border transition-all ${
                  isPurged ? "bg-slate-50 border-slate-200 opacity-60" : 
                  isSelected ? "bg-blue-50 border-blue-200 shadow-sm" : 
                  "bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow"
                }`}
                onClick={() => !isPurged && handleSelect(user.username)}
              >
                {!isPurged && (
                  <div className="absolute top-4 right-4">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                  </div>
                )}
                
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="break-all">{user.username}</span>
                  {isPurged && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">已清除</span>}
                </h3>
                
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-400">刪除時間：</span> {new Date(user.deletedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 flex justify-between">
                    <span><span className="font-medium text-slate-400">Responses：</span> {user.responseCount}</span>
                    <span><span className="font-medium text-slate-400">Audit Logs：</span> {user.auditLogCount}</span>
                  </p>
                  <p className="text-xs text-slate-500 flex justify-between">
                    <span><span className="font-medium text-slate-400">Cheat Reports：</span> {user.cheatReportCount}</span>
                    <span><span className="font-medium text-slate-400">Quota Requests：</span> {user.quotaRequestCount}</span>
                  </p>
                </div>
                
                {isPurged && (
                  <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                    於 {new Date(user.purgedAt).toLocaleString()} 由 {user.purgedBy} 清除
                  </div>
                )}
              </div>
            );
          })}
          
          {deletedUsers.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-slate-400 text-sm">
              目前沒有已刪除的帳號紀錄
            </div>
          )}
        </div>
      </div>

      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">永久清除歷史資料</h3>
            </div>
            
            <p className="text-sm text-slate-600 leading-relaxed">
              您即將永久清除 <strong className="text-slate-900">{selectedIds.length}</strong> 個帳號的所有關聯歷史資料（含作答紀錄、稽核紀錄等）。此操作不可逆且無法復原。
            </p>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                請輸入「<span className="text-rose-600">永久清除</span>」以確認操作：
              </label>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500"
                placeholder="永久清除"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowPurgeModal(false);
                  setPurgeConfirmText("");
                }}
                disabled={isPurging}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePurge}
                disabled={purgeConfirmText !== "永久清除" || isPurging}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
              >
                {isPurging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>確認永久清除</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
