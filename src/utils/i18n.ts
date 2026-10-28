import { AppLanguage } from "../types";

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  shortLabel: string;
  fontClass: string;
  fontFamily: string;
  names: Record<AppLanguage, string>;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: "zh-TW",
    label: "繁體中文",
    nativeLabel: "繁體中文",
    shortLabel: "繁中",
    fontClass: "font-lang-zh-tw",
    fontFamily: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
    names: {
      "zh-TW": "繁體中文",
      "zh-CN": "繁体中文",
      en: "Traditional Chinese"
    }
  },
  {
    code: "zh-CN",
    label: "簡體中文",
    nativeLabel: "简体中文",
    shortLabel: "简中",
    fontClass: "font-lang-zh-cn",
    fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    names: {
      "zh-TW": "簡體中文",
      "zh-CN": "简体中文",
      en: "Simplified Chinese"
    }
  },
  {
    code: "en",
    label: "英文",
    nativeLabel: "English",
    shortLabel: "EN",
    fontClass: "font-lang-en",
    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    names: {
      "zh-TW": "英文 (English)",
      "zh-CN": "英语 (English)",
      en: "English"
    }
  }
];

export const translations = {
  // Navigation & Header
  appTitle: {
    "zh-TW": "問卷暨查詢管理子系統 (繁體中文版)",
    "zh-CN": "问卷暨查询管理子系统 (简体中文版)",
    en: "Survey & Query Audit Subsystem (English)"
  },
  navLobby: {
    "zh-TW": "問卷大廳",
    "zh-CN": "问卷大厅",
    en: "Survey Lobby"
  },
  navAdmin: {
    "zh-TW": "後台登入/管理",
    "zh-CN": "后台登录/管理",
    en: "Admin Portal"
  },
  languageSelector: {
    "zh-TW": "語言切換",
    "zh-CN": "语言切换",
    en: "Language"
  },
  languageDropdownHeader: {
    "zh-TW": "語言選擇 / Language",
    "zh-CN": "语言选择 / Language",
    en: "Select Language"
  },
  languageTooltip: {
    "zh-TW": "切換語言 (繁中 / 简中 / EN)",
    "zh-CN": "切换语言 (繁中 / 简中 / EN)",
    en: "Switch Language"
  },

  // Lobby Hero
  heroBadge: {
    "zh-TW": "全台學術暨市民滿意度調查平台",
    "zh-CN": "全国学术暨市民满意度调查平台",
    en: "Academic & Public Opinion Survey Platform"
  },
  heroTitle: {
    "zh-TW": "公開透明的反饋、更正與統計查核通道。",
    "zh-CN": "公开透明的反馈、更正与统计查核通道。",
    en: "Transparent Feedback, Correction & Audit Subsystem."
  },
  heroDesc: {
    "zh-TW": "本平台致力於提供市民與學子公平、私密且合規的安全反饋空間。您可以在此填寫問卷，或是使用特邀代表指派的單一通道「專屬直達網址」安全查詢並即時進行線上資訊修正！",
    "zh-CN": "本平台致力于提供市民与学子公平、私密且合规的安全反馈空间。您可以在此填写问卷，或是使用特邀代表指派的单一通道「专属直达网址」安全查询并即时进行在线信息修正！",
    en: "Providing a secure, confidential, and compliant survey platform. Complete questionnaires here, or use authorized direct URLs to inspect and correct submissions in real-time."
  },
  heroAdminBtn: {
    "zh-TW": "登入管理員與分級後台 (RBAC)",
    "zh-CN": "登录管理员与分级后台 (RBAC)",
    en: "Log in to Admin Portal (RBAC)"
  },
  activeSurveysSection: {
    "zh-TW": "開放進行中之統計問卷填寫",
    "zh-CN": "开放进行中之统计问卷填写",
    en: "Active Questionnaires Open for Submission"
  },
  surveysOnlinePrefix: {
    "zh-TW": "共",
    "zh-CN": "共",
    en: "Total"
  },
  surveysOnlineSuffix: {
    "zh-TW": "張問卷在線",
    "zh-CN": "张问卷在线",
    en: "surveys active"
  },
  surveyIdPrefix: {
    "zh-TW": "問卷ID",
    "zh-CN": "问卷ID",
    en: "Survey ID"
  },

  // Lobby
  availableSurveys: {
    "zh-TW": "現行可填寫問卷",
    "zh-CN": "当前可填写问卷",
    en: "Available Questionnaires"
  },
  dedicatedQueryPortals: {
    "zh-TW": "專門稽核：獨立子查詢通道",
    "zh-CN": "专门稽核：独立子查询通道",
    en: "Dedicated Sub-query Audit Portals"
  },
  startSurveyBtn: {
    "zh-TW": "進入填報填寫表單",
    "zh-CN": "进入填报填写表单",
    en: "Start Questionnaire"
  },
  passwordProtected: {
    "zh-TW": "密碼防護開啟",
    "zh-CN": "密码防护开启",
    en: "Password Protected"
  },
  emailReceipt: {
    "zh-TW": "自動電郵憑證",
    "zh-CN": "自动电邮凭证",
    en: "Email Receipt"
  },
  subQueryDesc: {
    "zh-TW": "不同問卷配有專屬密碼的「獨立查詢窗口」，點選進入對應的窗口僅可查詢、線上修改該問卷數據：",
    "zh-CN": "不同问卷配有专属密码的「独立查询窗口」，点击进入对应的窗口仅可查询、在线修改该问卷数据：",
    en: "Each questionnaire has an isolated query window with password protection to inspect and update submissions:"
  },
  channelId: {
    "zh-TW": "通道ID",
    "zh-CN": "通道ID",
    en: "Portal ID"
  },
  belongingSurvey: {
    "zh-TW": "所屬",
    "zh-CN": "所属",
    en: "Survey"
  },
  enterSubQueryBtn: {
    "zh-TW": "經授權通道 進入自主查詢更正",
    "zh-CN": "经授权通道 进入自主查询更正",
    en: "Enter Authorized Sub-Query Channel"
  },
  noSubQuery: {
    "zh-TW": "目前系統管理端尚無制定任何子查詢系統。",
    "zh-CN": "目前系统管理端尚无制定任何子查询系统。",
    en: "No sub-query portals configured by administrator."
  },
  emptySurveys: {
    "zh-TW": "目前尚無任何發布中的問卷！",
    "zh-CN": "目前暂无任何发布中的问卷！",
    en: "No active questionnaires currently published!"
  },
  responsiveDesignTitle: {
    "zh-TW": "完美行動流暢響應式設計",
    "zh-CN": "完美移动流畅响应式设计",
    en: "Fully Responsive Multi-Device Design"
  },
  responsiveDesignDesc: {
    "zh-TW": "本系統原生符合響應式佈局規格，使用者不論在手機端、平板電腦或是寬型電腦桌面，皆能完美載入、流暢直覺地填寫所有題型與查詢。",
    "zh-CN": "本系统原生符合响应式布局规格，使用者不论在手机端、平板电脑或是宽型电脑桌面，皆能完美载入、流畅直觉地填写所有题型与查询。",
    en: "Natively engineered with responsive design standards, ensuring seamless and intuitive survey completion across phones, tablets, and desktops."
  },

  // Footer
  footerCopyright: {
    "zh-TW": "© 2026 本問卷暨獨立隔離子查詢稽核系統. 原生支援行動裝置響應式設計.",
    "zh-CN": "© 2026 本问卷暨独立隔离子查询稽核系统. 原生支持移动设备响应式设计.",
    en: "© 2026 Survey & Audit Subsystem. Multi-device responsive support."
  },
  serverStatus: {
    "zh-TW": "伺服器連線：正常 ●",
    "zh-CN": "服务器连接：正常 ●",
    en: "Server Status: Normal ●"
  },
  rbacStatus: {
    "zh-TW": "權限控制：RBAC 精細化分級啟用",
    "zh-CN": "权限控制：RBAC 精细化分级启用",
    en: "Role Access: RBAC Fine-Grained Active"
  },

  // Route Fallbacks
  surveyNotFound: {
    "zh-TW": "問卷編號錯誤",
    "zh-CN": "问卷编号错误",
    en: "Questionnaire ID Error"
  },
  surveyNotFoundDesc: {
    "zh-TW": "找不到指定的問卷直達填寫頁面，本問卷可能已被管理員下架移除。",
    "zh-CN": "找不到指定的问卷直达填写页面，本问卷可能已被管理员下架移除。",
    en: "The questionnaire direct link could not be found. It may have been archived or removed by administrator."
  },
  queryNotFound: {
    "zh-TW": "查詢通道失效",
    "zh-CN": "查询通道失效",
    en: "Query Portal Unavailable"
  },
  queryNotFoundDesc: {
    "zh-TW": "此子查詢系統直達網址可能不正確，或該子系統已被管理端卸載。",
    "zh-CN": "此子查询系统直达网址可能不正确，或该子系统已被管理端卸载。",
    en: "The direct URL for this sub-query system is incorrect or has been unmounted by administrators."
  },
  backToLobby: {
    "zh-TW": "返回首頁大廳",
    "zh-CN": "返回首页大厅",
    en: "Back to Survey Lobby"
  }
} as const;

export type TranslationKey = keyof typeof translations;

export function getStoredLanguage(): AppLanguage {
  const saved = localStorage.getItem("app_language");
  if (saved === "zh-TW" || saved === "zh-CN" || saved === "en") {
    return saved;
  }
  return "zh-TW";
}

export function setStoredLanguage(lang: AppLanguage): void {
  localStorage.setItem("app_language", lang);
}

export function t(key: TranslationKey, lang: AppLanguage): string {
  const item = translations[key];
  if (!item) return key;
  return item[lang] || item["zh-TW"] || key;
}
