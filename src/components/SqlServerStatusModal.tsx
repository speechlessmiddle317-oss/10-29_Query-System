import React, { useState, useEffect } from "react";
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check, Download, Server, Key, Shield, HelpCircle, X } from "lucide-react";
import { checkSqlServerStatus, fetchDdlSchemaFromApi, SqlServerStatus } from "../utils/sqlServerApi";

interface SqlServerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SqlServerStatusModal({ isOpen, onClose }: SqlServerStatusModalProps) {
  const [status, setStatus] = useState<SqlServerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ddlText, setDdlText] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"status" | "schema" | "guide">("status");

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const s = await checkSqlServerStatus();
      setStatus(s);
    } finally {
      setLoading(false);
    }
  };

  const fetchDdl = async () => {
    try {
      const text = await fetchDdlSchemaFromApi();
      setDdlText(text);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
      fetchDdl();
    }
  }, [isOpen]);

  const handleCopyDdl = async () => {
    if (!ddlText) return;
    try {
      await navigator.clipboard.writeText(ddlText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadDdl = () => {
    if (!ddlText) return;
    const blob = new Blob([ddlText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mssql-schema.sql";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Microsoft SQL Server 資料庫配置</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  status?.connected
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : status?.configured
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {status?.connected ? "已連線" : status?.configured ? "待連線 / 離線備援中" : "雙軌離線備援中"}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                支援 Azure SQL, AWS RDS SQL Server 或企業地端 Microsoft SQL Server 實例
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-5 gap-2 text-xs font-semibold bg-white">
          <button
            onClick={() => setActiveTab("status")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "status"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>連線狀態</span>
          </button>
          <button
            onClick={() => setActiveTab("schema")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "schema"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>T-SQL 資料庫綱要 (DDL)</span>
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "guide"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>環境變數設定指南</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === "status" && (
            <div className="space-y-4">
              {/* Connection Status Card */}
              <div className={`p-4 rounded-2xl border ${
                status?.connected 
                  ? "bg-emerald-50/50 border-emerald-200 text-emerald-900" 
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {status?.connected ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                    )}
                    <div>
                      <h3 className="text-sm font-bold">
                        {status?.connected
                          ? "SQL Server 資料庫運作正常"
                          : status?.configured
                          ? "SQL Server 連線失敗或重試中"
                          : "尚未配置 SQL Server 連線變數"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {status?.connected
                          ? "所有問卷、回覆、稽核日誌與使用者資料均即時寫入 Microsoft SQL Server，並保留本地備援快照。"
                          : "系統已自動啟用「雙軌降級同步」，資料目前持續安全保存於本地 LocalStorage，並具備自動重送隊列，連線恢復後將自動回傳。"}
                      </p>
                      {status?.error && (
                        <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-mono break-all">
                          {status.error}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={refreshStatus}
                    disabled={loading}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
                    <span>重新檢測</span>
                  </button>
                </div>
              </div>

              {/* Server Parameters */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 font-mono block">資料庫名稱 (Database)</span>
                  <span className="font-bold text-slate-700 font-mono">{status?.database || "QuerySystemDb"}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 font-mono block">主機伺服器 (Server)</span>
                  <span className="font-bold text-slate-700 font-mono">{status?.server || "未設定 (等待 .env)"}</span>
                </div>
              </div>

              {/* Architecture diagram description */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>雙軌同步與安全性說明</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li><strong>資料庫連線由 Express 後端統一管理</strong>：所有連線帳號與密碼均保存在伺服器環境變數中，瀏覽器端完全無法讀取，保障企業資料庫安全性。</li>
                  <li><strong>防 SQL 注入 (SQL Injection)</strong>：後端所有 T-SQL 查詢皆使用 Parameterized Queries（參數化查詢）與 MERGE 語法。</li>
                  <li><strong>零中斷運行機制</strong>：即使 SQL Server 網路短暫波動，前端填寫問卷與查詢功能也不會中斷，將自動降級保護使用者輸入。</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "schema" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                  共包含 10 個核心資料表、索引及預設管理員帳號種子腳本
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyDdl}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "已複製腳本" : "複製 T-SQL"}</span>
                  </button>
                  <button
                    onClick={handleDownloadDdl}
                    className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>下載 .sql 檔案</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-80 leading-relaxed border border-slate-800">
                <pre>{ddlText || "-- 正在載入資料庫 DDL 腳本..."}</pre>
              </div>
            </div>
          )}

          {activeTab === "guide" && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>如何設定 SQL Server 連線環境變數</span>
                </h4>
                <p className="text-slate-600">
                  請在專案環境變數（或平台的 Settings 選單中）填寫下列環境變數：
                </p>
                <div className="bg-slate-900 text-amber-300 p-3 rounded-xl font-mono text-[11px] leading-relaxed">
                  MSSQL_SERVER=your-server.database.windows.net<br />
                  MSSQL_PORT=1433<br />
                  MSSQL_DATABASE=QuerySystemDb<br />
                  MSSQL_USER=your_db_user<br />
                  MSSQL_PASSWORD=your_db_password<br />
                  MSSQL_ENCRYPT=true<br />
                  MSSQL_TRUST_SERVER_CERTIFICATE=true
                </div>
                <p className="text-slate-500 text-[11px]">
                  * 如果使用的是本機或自建的 SQL Server，請確保已開啟 <strong>TCP/IP</strong> 協定並開放連接埠 1433 防火牆。
                </p>
              </div>

              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
                <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>自動初始化資料表</span>
                </h4>
                <p className="text-emerald-800 leading-relaxed">
                  後端服務連線至 SQL Server 後，會自動執行 <code>IF OBJECT_ID(...) IS NULL</code> 檢測並自動建立所需之全部資料表，無需手動執行建表指令。若您希望由企業 DBA 預先審核建立，亦可直接使用「T-SQL 資料庫綱要」標籤頁中的腳本在 SSMS 中執行。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
