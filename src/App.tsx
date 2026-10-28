import React, { useState, useEffect } from "react";
import { Questionnaire, SurveyResponse, AppUser, AuditLog, PromotionApplication, UserRole, AppLanguage } from "./types";
import { INITIAL_QUESTIONNAIRES, INITIAL_RESPONSES, INITIAL_AUDIT_LOGS, INITIAL_PROMOTIONS } from "./utils/initialData";
import {
  fetchQuestionnairesFromApi,
  saveAllQuestionnairesToApi,
  fetchResponsesFromApi,
  saveResponseToApi,
  fetchAuditLogsFromApi,
  saveAuditLogToApi,
  fetchPromotionsFromApi,
  saveAllPromotionsToApi,
  fetchMeFromServer
} from "./utils/sqlServerApi";
import Login from "./components/Login";
import QuestionnaireFill from "./components/QuestionnaireFill";
import QuerySystem from "./components/QuerySystem";
import Dashboard from "./components/Dashboard";
import LanguageSwitcher from "./components/LanguageSwitcher";
import BannedAlertModal from "./components/BannedAlertModal";
import { isFeatureBanned } from "./utils/bannedFeatures";
import { getStoredLanguage, setStoredLanguage, t } from "./utils/i18n";
import { 
  ClipboardList, 
  Settings, 
  ShieldCheck, 
  Eye, 
  PenTool, 
  Search, 
  Heart, 
  HelpCircle, 
  Users, 
  FileSpreadsheet, 
  Compass, 
  Activity,
  LogOut,
  Calendar,
  Lock,
  Smartphone,
  Database
} from "lucide-react";
import SqlServerStatusModal from "./components/SqlServerStatusModal";
import { getAuthToken, setAuthToken, logoutFromServer } from "./utils/sqlServerApi";

export default function App() {
  // Sync state with localStorage to persist surveys and replies durably
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [promotions, setPromotions] = useState<PromotionApplication[]>([]);
  
  // Current logged in user (undefined if guest)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // Router simulation using hash
  const [hash, setHash] = useState(window.location.hash);

  // General app state
  const [selectedSurveyToFill, setSelectedSurveyToFill] = useState<Questionnaire | null>(null);
  const [selectedQuerySystem, setSelectedQuerySystem] = useState<{ survey: Questionnaire, config: any } | null>(null);

  // Internationalization / Language state: zh-TW, zh-CN, en
  const [language, setLanguage] = useState<AppLanguage>(() => getStoredLanguage());

  // Global Banned Feature Alert Modal state
  const [bannedAlert, setBannedAlert] = useState<{
    isOpen: boolean;
    featureName?: string;
    featureKey?: string;
    reason?: string;
  }>({ isOpen: false });

  // Microsoft SQL Server Status & DDL inspection modal state
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);

  // Security constraint: SQL Server status & DDL is exclusively visible to WEBMASTER
  const isWebmaster = currentUser?.role === UserRole.WEBMASTER || (currentUser?.role as any) === "WEBMASTER" || currentUser?.username?.toLowerCase() === "webmaster";

  const handleLanguageChange = (newLang: AppLanguage) => {
    setLanguage(newLang);
    setStoredLanguage(newLang);
  };

  // Synchronize document language and html attributes whenever language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.setAttribute("data-lang", language);
  }, [language]);

  // Initialize data on mount
  useEffect(() => {
    // Purge legacy entity keys from localStorage in compliance with v1.9.4.1 architectural rule:
    // (localStorage is restricted to JWT, language, and session preferences; formal records are governed by Express API)
    localStorage.removeItem("sub_surveys");
    localStorage.removeItem("sub_responses");
    localStorage.removeItem("sub_logs");
    localStorage.removeItem("sub_promotions");
    localStorage.removeItem("sub_users");

    // Initialize in-memory defaults
    setQuestionnaires(INITIAL_QUESTIONNAIRES);
    setResponses(INITIAL_RESPONSES);
    setLogs(INITIAL_AUDIT_LOGS);
    setPromotions(INITIAL_PROMOTIONS);

    // Auth session verification (SQL Server JWT authoritative verification)
    const initAuthSession = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const res = await fetchMeFromServer();
          if (res.success && res.user) {
            setCurrentUser(res.user);
            return;
          } else {
            // Token invalid or expired
            setAuthToken(null);
            setCurrentUser(null);
            return;
          }
        } catch (err) {
          console.warn("Failed to verify JWT session with server:", err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };
    initAuthSession();

    // Express API + SQL Server: Authoritative primary data synchronization
    const syncAuthoritativeData = async () => {
      try {
        // 1. Questionnaire authoritative load from Express API (SQL Server)
        const apiQs = await fetchQuestionnairesFromApi();
        if (Array.isArray(apiQs) && apiQs.length > 0) {
          setQuestionnaires(apiQs);
        } else if (apiQs && apiQs.length === 0) {
          await saveAllQuestionnairesToApi(INITIAL_QUESTIONNAIRES);
          setQuestionnaires(INITIAL_QUESTIONNAIRES);
        }

        // 2. Responses authoritative load from Express API
        const apiResponses = await fetchResponsesFromApi();
        if (Array.isArray(apiResponses)) {
          setResponses(apiResponses);
        }

        // 3. Audit Log authoritative load from Express API
        const apiLogs = await fetchAuditLogsFromApi();
        if (Array.isArray(apiLogs) && apiLogs.length > 0) {
          const sorted = apiLogs.sort((a: any, b: any) => (b.timestamp || "").localeCompare(a.timestamp || ""));
          setLogs(sorted);
        }

        // 4. Promotions authoritative load from Express API
        const apiPromos = await fetchPromotionsFromApi();
        if (Array.isArray(apiPromos)) {
          setPromotions(apiPromos);
        }

        // 5. Refresh current logged in user profile from Express server
        const meRes = await fetchMeFromServer();
        if (meRes.success && meRes.user) {
          setCurrentUser(meRes.user);
          localStorage.setItem("sub_logged_user", JSON.stringify(meRes.user));
        }
      } catch (err) {
        console.warn("Authoritative data synchronization bypassed:", err);
      }
    };
    syncAuthoritativeData();

    // Hash listener
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Primary data handlers writing directly to Express API (SQL Server authoritative)
  const handleUpdateQuestionnaires = (updated: Questionnaire[]) => {
    setQuestionnaires(updated);
    saveAllQuestionnairesToApi(updated).catch(() => {});
  };

  const handleUpdateResponses = (updated: SurveyResponse[]) => {
    setResponses(updated);
  };

  const handleUpdateLogs = (updated: AuditLog[]) => {
    setLogs(updated);
  };

  const handleUpdatePromotions = (updated: PromotionApplication[]) => {
    setPromotions(updated);
    saveAllPromotionsToApi(updated).catch(() => {});
  };

  const addLog = (user: string, role: string, action: string, target: string, details: string) => {
    const newLogItem: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      user,
      role,
      action,
      target,
      details
    };
    const newLogs = [newLogItem, ...logs];
    setLogs(newLogs);
    // Persist to SQL Server via Express API
    saveAuditLogToApi(newLogItem).catch(() => {});
  };

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    // Persist session if "keep-logged-in" is checked.
    // In our Login.tsx we trigger this - simplified check here:
    // If keep-logged-in checked was true, we store in localStorage.
    localStorage.setItem("sub_logged_user", JSON.stringify(user));
  };

  const handleLogout = async () => {
    if (currentUser) {
      addLog(
        currentUser.username,
        currentUser.role,
        "用戶登出",
        "帳號權限宣告",
        "安全登出後台管理系統 (已撤銷伺服器端 Token)"
      );
    }
    await logoutFromServer();
    setCurrentUser(null);
    localStorage.removeItem("sub_logged_user");
    window.location.hash = "";
  };

  const handleSurveySubmit = async (newResp: Omit<SurveyResponse, "id" | "submittedAt"> & { password?: string }): Promise<{ success: boolean; message?: string }> => {
    const fresh: SurveyResponse = {
      ...newResp,
      id: `resp-${Math.floor(100 + Math.random() * 900)}-${Date.now().toString().slice(-4)}`,
      submittedAt: new Date().toISOString().replace("T", " ").substring(0, 19)
    };

    // Express API -> SQL Server is the authoritative validation and persistence path
    const apiResult = await saveResponseToApi({
      ...fresh,
      password: newResp.password
    });

    if (!apiResult.success) {
      return {
        success: false,
        message: apiResult.message || "問卷送出失敗，請確認是否符合填答規範！"
      };
    }

    const updated = [fresh, ...responses];
    handleUpdateResponses(updated);

    // Refresh current user from Express server to sync updated respondentPoints & starLevel
    if (currentUser) {
      try {
        const meRes = await fetchMeFromServer();
        if (meRes.success && meRes.user) {
          setCurrentUser(meRes.user);
          localStorage.setItem("sub_logged_user", JSON.stringify(meRes.user));
        }
      } catch {
        // ignore
      }
    }

    // Get survey title
    const sNode = questionnaires.find(q => q.id === newResp.surveyId);

    addLog(
      currentUser?.username || "一般填答市民",
      currentUser?.role || "使用者",
      "填寫問卷提交",
      sNode ? sNode.title : newResp.surveyId,
      `成功填寫問卷，產生數據憑證 ${fresh.id}。電子信箱/填寫人: ${fresh.submittedBy}`
    );

    return { success: true, message: "問卷作答已成功遞交！" };
  };

  const handleUpdateResponseInQuerySystem = async (updated: SurveyResponse) => {
    const nextAnswers = responses.map(r => r.id === updated.id ? updated : r);
    handleUpdateResponses(nextAnswers);
    await saveResponseToApi(updated);

    const sNode = questionnaires.find(q => q.id === updated.surveyId);

    addLog(
      currentUser?.username || "未知查詢人員",
      currentUser?.role || "查詢代用職位",
      "線上修改更正",
      sNode ? sNode.title : updated.surveyId,
      `透過稽核查詢系統線上即時更正了問卷數據編號: ${updated.id} 內之受管制答案集。`
    );
  };

  // Parsing current route based on Hash router structure
  const parseRoute = () => {
    // 1. Direct filling route: #fill/{surveyId}
    if (hash.startsWith("#fill/")) {
      const surveyId = hash.replace("#fill/", "");
      const matched = questionnaires.find(q => q.id === surveyId);
      if (matched) {
        if (currentUser && currentUser.role === UserRole.RESPONDENT && isFeatureBanned(currentUser, "respondent_answer")) {
          return (
            <div className="text-center p-12 bg-red-50 rounded-2xl border-2 border-red-500 max-w-md mx-auto my-12 shadow-sm space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center mx-auto">
                <span className="text-2xl">🚫</span>
              </div>
              <div className="text-2xl font-black text-red-600">{"{該功能/特權已被封禁}"}</div>
              <p className="text-xs text-red-700 font-medium">
                您的「問卷答題」權限已被管理員封禁，暫時無法參與問卷填答。
              </p>
              <a href="#" className="inline-block mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer">
                {t("backToLobby", language)}
              </a>
            </div>
          );
        }
        return (
          <QuestionnaireFill
            survey={matched}
            onSubmit={handleSurveySubmit}
            isDirectLink={true}
          />
        );
      }
      return (
        <div className="text-center p-12 bg-white rounded-2xl border max-w-md mx-auto my-12 shadow-sm">
          <p className="text-rose-500 font-bold mb-4">⚠️ {t("surveyNotFound", language)}</p>
          <p className="text-sm text-slate-500">{t("surveyNotFoundDesc", language)}</p>
          <a href="#" className="inline-block mt-6 text-xs text-blue-600 font-bold hover:underline">{t("backToLobby", language)}</a>
        </div>
      );
    }

    // 2. Direct query route: #query/{surveyId}/{queryId}
    if (hash.startsWith("#query/")) {
      const queryParams = hash.replace("#query/", "").split("/");
      const surveyId = queryParams[0];
      const queryId = queryParams[1];

      const matchedSurvey = questionnaires.find(q => q.id === surveyId);
      const matchedQueryConfig = matchedSurvey?.querySystems.find(qs => qs.id === queryId);

      if (matchedSurvey && matchedQueryConfig) {
        return (
          <QuerySystem
            survey={matchedSurvey}
            queryConfig={matchedQueryConfig}
            allResponses={responses}
            onUpdateResponse={handleUpdateResponseInQuerySystem}
            isDirectLink={true}
          />
        );
      }
      return (
        <div className="text-center p-12 bg-white rounded-2xl border max-w-md mx-auto my-12 shadow-sm">
          <p className="text-rose-500 font-bold mb-4">⚠️ {t("queryNotFound", language)}</p>
          <p className="text-sm text-slate-500">{t("queryNotFoundDesc", language)}</p>
          <a href="#" className="inline-block mt-6 text-xs text-blue-600 font-bold hover:underline">{t("backToLobby", language)}</a>
        </div>
      );
    }

    // 3. Admin dash state `#admin`
    if (hash === "#admin") {
      if (currentUser) {
        return (
          <Dashboard
            currentUser={currentUser}
            questionnaires={questionnaires}
            responses={responses}
            logs={logs}
            promotions={promotions}
            onUpdateQuestionnaires={handleUpdateQuestionnaires}
            onUpdateResponses={handleUpdateResponses}
            onUpdatePromotions={handleUpdatePromotions}
            onUpdateLogList={handleUpdateLogs}
            onLogout={handleLogout}
            onUpdateCurrentUser={(user) => {
              setCurrentUser(user);
              localStorage.setItem("sub_logged_user", JSON.stringify(user));
            }}
            onSelectQuerySystem={(survey, config) => {
              setSelectedQuerySystem({ survey, config });
              window.location.hash = `#query/${survey.id}/${config.id}`;
            }}
          />
        );
      }
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          addLog={addLog}
        />
      );
    }

    // 4. Default: Lobby "問卷填表及查詢大廳" (Interactive Home)
    return (
      <div className="space-y-8" id="default-lobby-grid">
        
        {/* Welcome Section */}
        <section className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl md:p-12">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl" />
          
          <div className="relative max-w-xl space-y-4">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/10 rounded-full text-xs text-amber-300 font-semibold uppercase tracking-wider backdrop-blur-md">
              <Compass className="w-3.5 h-3.5" />
              <span>{t("heroBadge", language)}</span>
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight md:text-3xl leading-snug">
              {t("heroTitle", language)}
            </h1>
            
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              {t("heroDesc", language)}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="#admin"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>{t("heroAdminBtn", language)}</span>
              </a>
            </div>
          </div>
        </section>

        {/* Home main split view */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel: active surveys list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                <PenTool className="w-5 h-5 text-blue-600" />
                <span>{t("activeSurveysSection", language)}</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {t("surveysOnlinePrefix", language)} {questionnaires.length} {t("surveysOnlineSuffix", language)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {questionnaires.map((q) => (
                <div 
                  key={q.id} 
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left"
                >
                  <div className="space-y-1.5 flex-1 max-w-xl">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                      <span className="text-[9px] bg-blue-50 text-blue-700 font-extrabold px-1.5 py-0.5 rounded font-mono">
                        {t("surveyIdPrefix", language)}: {q.id}
                      </span>
                      {q.passwordRequired && (
                        <span className="text-[9px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded flex items-center">
                          <Lock className="w-3 h-3 mr-1" />
                          {t("passwordProtected", language)}
                        </span>
                      )}
                      {q.emailNotificationEnabled && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                          {t("emailReceipt", language)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-800 leading-snug">{q.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{q.description}</p>
                  </div>

                  <div className="shrink-0 flex items-center space-x-2">
                    <button
                      id={`fill-survey-btn-${q.id}`}
                      onClick={() => {
                        if (currentUser && currentUser.role === UserRole.RESPONDENT && isFeatureBanned(currentUser, "respondent_answer")) {
                          setBannedAlert({
                            isOpen: true,
                            featureName: "問卷答題功能",
                            featureKey: "respondent_answer",
                            reason: "您的「問卷答題」權限已被管理員封禁，暫時無法參與問卷填答。"
                          });
                          return;
                        }
                        setSelectedSurveyToFill(q);
                        window.location.hash = `#fill/${q.id}`;
                      }}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                    >
                      {t("startSurveyBtn", language)}
                    </button>
                  </div>
                </div>
              ))}

              {questionnaires.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
                  {t("emptySurveys", language)}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Sub-query channels list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-md font-bold text-slate-800 flex items-center space-x-2">
                <Search className="w-4.5 h-4.5 text-amber-500" />
                <span>{t("dedicatedQueryPortals", language)}</span>
              </h2>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60 text-left space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                {t("subQueryDesc", language)}
              </p>

              <div className="space-y-2.5">
                {(() => {
                  const visibleSubQueries = questionnaires.flatMap(q => 
                    (q.querySystems || [])
                      .filter(sys => !sys.hideInHall)
                      .map(sys => ({ ...sys, parentSurvey: q }))
                  );

                  if (visibleSubQueries.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 italic text-center py-4">{t("noSubQuery", language)}</p>
                    );
                  }

                  return visibleSubQueries.map((sysItem) => (
                    <div key={sysItem.id} className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between gap-2">
                      <div>
                        <span className="text-[9px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                          {t("channelId", language)}: {sysItem.id}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 mt-1 leading-tight">{sysItem.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-1.5 truncate">{t("belongingSurvey", language)}: {sysItem.parentSurvey.title}</p>
                      </div>
                      
                      <button
                        id={`home-go-query-${sysItem.id}`}
                        onClick={() => {
                          setSelectedQuerySystem({ survey: sysItem.parentSurvey, config: sysItem });
                          window.location.hash = `#query/${sysItem.parentSurvey.id}/${sysItem.id}`;
                        }}
                        className="w-full text-center py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded duration-150 cursor-pointer"
                      >
                        {t("enterSubQueryBtn", language)}
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left space-y-2.5">
              <span className="text-xs font-bold text-blue-900 flex items-center">
                <Smartphone className="w-4 h-4 mr-1 text-blue-600" />
                <span>{t("responsiveDesignTitle", language)}</span>
              </span>
              <p className="text-[11px] text-blue-750 leading-relaxed">
                {t("responsiveDesignDesc", language)}
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const langFontClass = language === "zh-TW" ? "font-lang-zh-tw" : language === "zh-CN" ? "font-lang-zh-cn" : "font-lang-en";

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800 ${langFontClass}`} id="global-layout-wrapper">
      
      {/* Universal Top Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-black text-amber-400 text-sm">
              問
            </div>
            <span className="font-extrabold text-sm text-slate-800 tracking-tight">{t("appTitle", language)}</span>
          </a>

          {/* Right Navigation: Survey Lobby | Language Switcher | Admin Login/Management */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <a 
              id="nav-lobby-link"
              href="#"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 px-2.5 sm:px-3 rounded-lg hover:bg-slate-100/70 transition-colors"
            >
              {t("navLobby", language)}
            </a>

            {/* SQL Server Connection and DDL inspection button (WEBMASTER ONLY) */}
            {isWebmaster && (
              <button
                id="nav-sql-db-btn"
                onClick={() => setIsSqlModalOpen(true)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 px-2.5 sm:px-3 rounded-lg hover:bg-slate-100/70 flex items-center transition-colors"
                title="Microsoft SQL Server 資料庫配置與連線狀態 (僅系統站主可見)"
              >
                <Database className="w-3.5 h-3.5 mr-1 text-blue-600" />
                <span>SQL Server</span>
              </button>
            )}

            {/* Language Switcher strictly between Lobby and Admin Portal */}
            <LanguageSwitcher
              currentLang={language}
              onLanguageChange={handleLanguageChange}
            />

            <a 
              id="nav-admin-link"
              href="#admin"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 px-2.5 sm:px-3 rounded-lg hover:bg-slate-100/70 flex items-center transition-colors"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              <span>{t("navAdmin", language)}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Dynamic Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6" id="applet-main-viewport">
        {parseRoute()}
      </main>

      {/* Universal Sticky Foot */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>{t("footerCopyright", language)}</p>
          <div className="flex space-x-4">
            {isWebmaster && (
              <button
                onClick={() => setIsSqlModalOpen(true)}
                className="hover:text-blue-600 flex items-center gap-1 transition-colors"
                title="僅系統站主可見"
              >
                <Database className="w-3 h-3 text-blue-600" />
                <span>MS SQL Server 資料庫</span>
              </button>
            )}
            <span className="hover:text-slate-600">{t("serverStatus", language)}</span>
            <span className="hover:text-slate-600">{t("rbacStatus", language)}</span>
          </div>
        </div>
      </footer>

      {/* Global Banned Alert Modal */}
      <BannedAlertModal
        alertState={bannedAlert}
        onClose={() => setBannedAlert({ isOpen: false })}
      />

      {/* Microsoft SQL Server Status & DDL inspection Modal (WEBMASTER ONLY) */}
      {isWebmaster && (
        <SqlServerStatusModal
          isOpen={isSqlModalOpen}
          onClose={() => setIsSqlModalOpen(false)}
        />
      )}
    </div>
  );
}
