import React, { useState, useMemo, useEffect } from "react";
import { AppUser, UserRole, SiteUpdateLog } from "../types";
import { INITIAL_SITE_UPDATE_LOGS } from "../utils/initialUpdateLogs";
import { 
  Rocket, 
  Search, 
  ListFilter, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Wifi, 
  Database, 
  Crown, 
  Sparkles, 
  Trash2, 
  X, 
  Tag, 
  FileText,
  History,
  Lock,
  Layers
} from "lucide-react";

interface ChangelogViewProps {
  currentUser?: AppUser;
  addLog: (action: string, target: string, details: string) => void;
}

export default function ChangelogView({ currentUser, addLog }: ChangelogViewProps) {
  const isWebmaster = currentUser?.role === UserRole.WEBMASTER;

  // Load update logs from local cache or initial list
  const [logs, setLogs] = useState<SiteUpdateLog[]>(() => {
    try {
      const stored = localStorage.getItem("sub_site_update_logs");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge initial logs with any custom logs added by Webmaster
          const customLogs = parsed.filter(item => item.isCustom);
          // Keep all initial logs, ensuring latest updates are present
          const initialIds = new Set(INITIAL_SITE_UPDATE_LOGS.map(l => l.id));
          const uniqueCustom = customLogs.filter(c => !initialIds.has(c.id));
          return [...uniqueCustom, ...INITIAL_SITE_UPDATE_LOGS].sort((a, b) => 
            b.timestamp.localeCompare(a.timestamp)
          );
        }
      }
    } catch (e) {
      console.error("Failed to parse local site update logs:", e);
    }
    return INITIAL_SITE_UPDATE_LOGS;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Log Form State
  const [newVersion, setNewVersion] = useState("");
  const [newTimestamp, setNewTimestamp] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<SiteUpdateLog["category"]>("FEATURE");
  const [newCategoryLabel, setNewCategoryLabel] = useState("核心功能更新");
  const [newAuthor, setNewAuthor] = useState("系統站主 (Webmaster)");
  const [newSummary, setNewSummary] = useState("");
  const [newDetailsRaw, setNewDetailsRaw] = useState("");
  const [newWebmasterOnly, setNewWebmasterOnly] = useState(false);

  // Sync to Firestore in background if available
  useEffect(() => {
    import("../utils/firebaseDb").then(({ fetchSiteUpdateLogsFromFirestore, saveAllSiteUpdateLogsToFirestore, getIsFirestoreOffline, isWriteQuotaExhausted }) => {
      fetchSiteUpdateLogsFromFirestore().then((fsLogs) => {
        if (fsLogs && fsLogs.length > 0) {
          // Merge Firestore logs
          const initialIds = new Set(INITIAL_SITE_UPDATE_LOGS.map(l => l.id));
          const customFromFs = fsLogs.filter((f: any) => !initialIds.has(f.id));
          const merged = [...customFromFs, ...INITIAL_SITE_UPDATE_LOGS].sort((a, b) => 
            b.timestamp.localeCompare(a.timestamp)
          );
          setLogs(merged);
          localStorage.setItem("sub_site_update_logs", JSON.stringify(merged));
        } else if (!getIsFirestoreOffline() && !isWriteQuotaExhausted()) {
          saveAllSiteUpdateLogsToFirestore(INITIAL_SITE_UPDATE_LOGS);
        }
      }).catch(err => {
        console.warn("[Changelog] Firestore background sync notice:", err);
      });
    });
  }, []);

  // Format current local time helper
  const getCurrentFormattedTime = () => {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const DD = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
  };

  const handleOpenAddModal = () => {
    setNewVersion(`v1.${logs.length - 1 < 0 ? 0 : logs.length - 1}.0`);
    setNewTimestamp(getCurrentFormattedTime());
    setNewTitle("");
    setNewCategory("FEATURE");
    setNewCategoryLabel("業務功能更新");
    setNewAuthor(isWebmaster ? "系統站主 (Webmaster)" : (currentUser?.username || "系統管理員"));
    setNewSummary("");
    setNewDetailsRaw("");
    setNewWebmasterOnly(false);
    setIsAddModalOpen(true);
  };

  const handleCategorySelectChange = (cat: SiteUpdateLog["category"]) => {
    setNewCategory(cat);
    switch (cat) {
      case "SECURITY":
        setNewCategoryLabel("安全防護 & 權限加固");
        break;
      case "NETWORK":
        setNewCategoryLabel("網路通訊 & 協議修復");
        break;
      case "DATABASE":
        setNewCategoryLabel("資料庫架構 & 雲端同步");
        break;
      case "WEBMASTER":
        setNewCategoryLabel("系統站主最高特權專區");
        break;
      case "MONITORING":
        setNewCategoryLabel("即時監控 & 防作弊審核");
        break;
      case "PRIVILEGE":
        setNewCategoryLabel("權限審查 & 特權封禁");
        break;
      case "ARCHITECTURE":
        setNewCategoryLabel("核心架構 & 模組化設計");
        break;
      case "FEATURE":
      default:
        setNewCategoryLabel("核心功能 & 體驗優化");
        break;
    }
  };

  const handleCreateUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim() || !newTitle.trim() || !newTimestamp.trim()) {
      alert("⚠️ 請完整填寫版本號、更新日期時間與更新標題！");
      return;
    }

    const detailsList = newDetailsRaw
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (detailsList.length === 0) {
      alert("⚠️ 請至少填寫一項具體更新內容細項！");
      return;
    }

    const newEntry: SiteUpdateLog = {
      id: `custom-update-${Date.now()}`,
      version: newVersion.trim(),
      timestamp: newTimestamp.trim(),
      title: newTitle.trim(),
      category: newCategory,
      categoryLabel: newCategoryLabel.trim(),
      author: newAuthor.trim() || "系統站主 (Webmaster)",
      summary: newSummary.trim() || newTitle.trim(),
      details: detailsList,
      isCustom: true,
      webmasterOnly: newWebmasterOnly
    };

    const updated = [newEntry, ...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setLogs(updated);
    localStorage.setItem("sub_site_update_logs", JSON.stringify(updated));

    // Save to Firestore
    try {
      const { saveSiteUpdateLogToFirestore } = await import("../utils/firebaseDb");
      await saveSiteUpdateLogToFirestore(newEntry);
    } catch (err) {
      console.warn("[Changelog] Error saving custom update log to Firestore:", err);
    }

    addLog(
      "發布網站更新日誌",
      `版本：${newVersion.trim()}`,
      `系統站主發布了系統版本功能更新日誌【${newVersion.trim()}】${newTitle.trim()}，記錄具體日期時間為 ${newTimestamp.trim()}。`
    );

    setIsAddModalOpen(false);
    alert(`🎉 網站功能更新日誌【${newVersion.trim()}】已成功發布！`);
  };

  const handleDeleteCustomLog = async (id: string, version: string) => {
    if (!isWebmaster) {
      alert("⚠️ 只有系統站主可以刪除自訂更新日誌！");
      return;
    }
    if (!confirm(`⚠️ 確定要刪除版本【${version}】的更新日誌紀錄嗎？`)) {
      return;
    }

    const updated = logs.filter(l => l.id !== id);
    setLogs(updated);
    localStorage.setItem("sub_site_update_logs", JSON.stringify(updated));

    addLog(
      "刪除網站更新日誌",
      `版本：${version}`,
      `系統站主移除了自訂更新日誌紀錄【${version}】。`
    );
  };

  // Filter logs based on search, category, and webmaster privacy
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // Confidential update logs: visible ONLY to System Webmaster
      if (item.webmasterOnly && !isWebmaster) {
        return false;
      }

      const matchesSearch = 
        item.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.timestamp.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoryLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.details.some(d => d.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = categoryFilter === "ALL" || item.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [logs, searchTerm, categoryFilter, isWebmaster]);

  const getCategoryBadgeStyle = (cat: SiteUpdateLog["category"]) => {
    switch (cat) {
      case "SECURITY":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "NETWORK":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "DATABASE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "WEBMASTER":
        return "bg-amber-50 text-amber-800 border-amber-300";
      case "MONITORING":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "PRIVILEGE":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "ARCHITECTURE":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "FEATURE":
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <div className="space-y-6" id="site-changelog-view">
      {/* Header & Overview Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 flex items-center justify-center shadow-xs">
                <Rocket className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">網站功能更新日誌 (Changelog)</h2>
              <span className="text-[11px] font-mono px-2.5 py-0.5 bg-slate-900 text-white rounded-full font-bold">
                {logs[0]?.version || "v1.8.0"}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              詳細記錄本系統每一次版本演進、安全防護、修復修訂與功能更迭，所有紀錄皆載明<strong>具體上線日期與時間</strong>。
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-600" />
              <span>累計收錄 <strong>{logs.length}</strong> 次版本修訂</span>
            </div>

            {isWebmaster && (
              <button
                type="button"
                id="btn-add-changelog-entry"
                onClick={handleOpenAddModal}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>發布新功能更新日誌</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="changelog-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋更新版本、標題、修訂項目、具體日期時間..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-medium"
            />
          </div>

          <div className="flex items-center space-x-2 min-w-[200px]">
            <ListFilter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              id="changelog-category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-700 font-bold"
            >
              <option value="ALL">全部更新類別 ({logs.length})</option>
              <option value="SECURITY">🛡️ 安全防護 & 權限修復</option>
              <option value="NETWORK">🌐 網路韌性 & 協議修復</option>
              <option value="DATABASE">🗄️ 資料架構 & 雲端同步</option>
              <option value="WEBMASTER">👑 系統站主最高特權</option>
              <option value="MONITORING">📡 即時監控 & 防作弊</option>
              <option value="PRIVILEGE">🚫 特權管控 & 封禁</option>
              <option value="ARCHITECTURE">⚙️ 權限體系 & 架構</option>
              <option value="FEATURE">🚀 業務功能 & 題庫</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline List of Updates */}
      <div className="space-y-4" id="changelog-list-container">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((item, idx) => {
            const isLatest = idx === 0 && !searchTerm && categoryFilter === "ALL";

            return (
              <div
                key={item.id}
                id={`changelog-item-${item.version.replace(/[^a-zA-Z0-9]/g, "_")}`}
                className={`bg-white rounded-2xl border transition-all p-6 relative ${
                  isLatest
                    ? "border-indigo-300 shadow-md ring-1 ring-indigo-100"
                    : "border-slate-200/80 shadow-xs hover:border-slate-300"
                }`}
              >
                {/* Top meta strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black border ${
                      isLatest 
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-xs" 
                        : "bg-slate-900 text-white border-slate-950"
                    }`}>
                      {item.version}
                    </span>

                    {isLatest && (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-extrabold rounded-full animate-pulse flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        最新發布版本
                      </span>
                    )}

                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getCategoryBadgeStyle(item.category)}`}>
                      {item.categoryLabel}
                    </span>

                    {item.webmasterOnly && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shadow-2xs">
                        <Lock className="w-3 h-3 text-rose-600" />
                        <span>🔒 僅系統站主可見</span>
                      </span>
                    )}
                  </div>

                  {/* Concrete Date & Time badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-700 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{item.timestamp.split(" ")[0]}</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
                      <span className="text-slate-900 font-bold">{item.timestamp.split(" ")[1]}</span>
                    </div>

                    {isWebmaster && item.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomLog(item.id, item.version)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="刪除自訂更新紀錄"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title & Author */}
                <div className="mb-2.5">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>{item.title}</span>
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-medium">
                    <span>發布審定：<strong className="text-slate-700">{item.author}</strong></span>
                    <span>•</span>
                    <span>具體發布時間：<strong className="text-slate-700 font-mono">{item.timestamp}</strong></span>
                  </div>
                </div>

                {/* Summary */}
                {item.summary && (
                  <p className="text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100 font-sans leading-relaxed mb-4">
                    {item.summary}
                  </p>
                )}

                {/* Detailed Highlights */}
                <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>更新修訂細節與影響範圍</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700 font-sans">
                    {item.details.map((detail, dIdx) => (
                      <li key={dIdx} className="flex items-start gap-2.5 leading-relaxed pl-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="flex-1">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
            <Rocket className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold">沒有符合篩選條件的更新日誌記錄</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("ALL");
              }}
              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              清除搜尋條件
            </button>
          </div>
        )}
      </div>

      {/* Modal: Publish New Update Log Entry (Webmaster Only) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-add-changelog-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto" id="modal-add-changelog">
            <div className="p-5 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold">發布新網站功能更新日誌</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUpdateLog} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">版本編號 (Version) *</label>
                  <input
                    type="text"
                    required
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="例: v1.8.1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">具體日期與時間 (精確至秒) *</label>
                  <input
                    type="text"
                    required
                    value={newTimestamp}
                    onChange={(e) => setNewTimestamp(e.target.value)}
                    placeholder="YYYY-MM-DD HH:mm:ss"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">更新類別 *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => handleCategorySelectChange(e.target.value as SiteUpdateLog["category"])}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="FEATURE">🚀 業務功能 & 題庫</option>
                    <option value="SECURITY">🛡️ 安全防護 & 權限修復</option>
                    <option value="NETWORK">🌐 網路通訊 & 協議修復</option>
                    <option value="DATABASE">🗄️ 資料庫架構 & 雲端同步</option>
                    <option value="WEBMASTER">👑 系統站主最高特權專區</option>
                    <option value="MONITORING">📡 即時監控 & 防作弊審核</option>
                    <option value="PRIVILEGE">🚫 權限審查 & 特權封禁</option>
                    <option value="ARCHITECTURE">⚙️ 核心架構 & 模組化設計</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">發布者稱謂</label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">更新標題 (Update Title) *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例: 修復同級權限降級漏洞與新增更新日誌歷程"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">更新摘要 (Summary)</label>
                <textarea
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="簡要概述此版本的關鍵更新或修訂重點..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  詳細更新細項 (每行一條) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newDetailsRaw}
                  onChange={(e) => setNewDetailsRaw(e.target.value)}
                  placeholder="【項目 1】實作同級權限保護屏障&#10;【項目 2】增設網站功能更新日誌專區&#10;【項目 3】記錄具體日期與時間"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white font-sans"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  ※ 請在每行開頭輸入單一修訂項目，發布後系統將自動排列為清單。
                </span>
              </div>

              {isWebmaster && (
                <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="checkbox"
                      id="new-log-webmaster-only"
                      checked={newWebmasterOnly}
                      onChange={(e) => setNewWebmasterOnly(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                    />
                    <label htmlFor="new-log-webmaster-only" className="text-xs font-bold text-slate-800 cursor-pointer select-none flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      <span>此條系統更新日誌僅系統站主可見 (機密內部安全更新)</span>
                    </label>
                  </div>
                  <span className="text-[10px] text-rose-600 font-mono font-bold bg-rose-100/70 px-2 py-0.5 rounded">
                    Webmaster Only
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  確認發布日誌
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
