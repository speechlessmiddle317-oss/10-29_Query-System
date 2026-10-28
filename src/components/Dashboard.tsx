import React, { useState, useEffect } from "react";
import { 
  AppUser, 
  Questionnaire, 
  SurveyResponse, 
  UserRole, 
  StarLevel, 
  AuditLog, 
  PromotionApplication, 
  Question,
  QuerySystemConfig,
  QuestionType
} from "../types";
import { exportSurveyToCSV } from "../utils/csv";
import { 
  UserCheck, 
  PlusCircle, 
  Trash2, 
  Download, 
  Edit2, 
  Unlock, 
  Settings, 
  Database, 
  PieChart, 
  UserCog, 
  LockKeyhole, 
  Check, 
  X, 
  ArrowUpCircle, 
  Share2, 
  Mail, 
  Eye,
  EyeOff, 
  Undo2, 
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Lock,
  Link,
  ShieldAlert,
  ShieldCheck,
  Bell,
  BellOff,
  Users,
  User,
  Trophy,
  Sparkles,
  Send,
  Ban,
  HelpCircle,
  AlertTriangle,
  FileText,
  Pencil,
  BookOpen,
  ClipboardList
} from "lucide-react";
import LogView, { isWebmasterLog } from "./LogView";
import BannedAlertModal, { BannedAlertState } from "./BannedAlertModal";
import FeatureBanPanel from "./FeatureBanPanel";
import SystemAdminDistributePanel from "./SystemAdminDistributePanel";
import DeletedUsersManagement from "./DeletedUsersManagement";
import { isFeatureBanned } from "../utils/bannedFeatures";
import { saveUserToFirestore, saveAuditLogToFirestore, deleteUserFromFirestore } from "../utils/firebaseDb";
import { 
  changeUserPasswordApi, 
  adminResetUserPasswordApi,
  promoteFriendApi,
  temporaryBanUserApi,
  savePromotionToApi,
  saveQuotaRequestToApi,
  fetchMeFromServer,
  deleteUserFromApi,
  fetchUsersFromApi,
  fetchUsersWithPasswordsFromApi,
  getUserPasswordApi,
  adminUpdateUserPasswordApi,
  saveUserToApi
} from "../utils/sqlServerApi";

interface DashboardProps {
  currentUser: AppUser;
  questionnaires: Questionnaire[];
  responses: SurveyResponse[];
  logs: AuditLog[];
  promotions: PromotionApplication[];
  onUpdateQuestionnaires: (updated: Questionnaire[]) => void;
  onUpdateResponses: (updated: SurveyResponse[]) => void;
  onUpdatePromotions: (updated: PromotionApplication[]) => void;
  onUpdateLogList: (updated: AuditLog[]) => void;
  onLogout: () => void;
  onSelectQuerySystem: (survey: Questionnaire, query: QuerySystemConfig) => void;
  onUpdateCurrentUser?: (updated: AppUser) => void;
}

export interface RespondentRankInfo {
  tier: number; // 1 to 7
  tierName: string; // 黑鐵, 青銅, 白銀, 黃金, 白金, 鑽石, 傳奇
  subRank: string; // III, II, I, IV, V etc.
  legendaryScroll?: number; // for Tier 7
  legendarySegment?: number; // for Tier 7
  questionsCount: number;
  points: number;
  nextRankQuestionsNeeded: number;
}

export function calculateRespondentRank(points: number): RespondentRankInfo {
  const normPoints = Math.max(0, points);
  const Q = Math.floor(normPoints / 20);
  
  if (Q < 9) {
    // Tier 1: 0 - 8 Q, 3 sub-ranks (III, II, I), 3 Q per sub-rank
    const subIdx = Math.floor(Q / 3); // 0, 1, 2
    const subRanks = ["III", "II", "I"];
    return {
      tier: 1,
      tierName: "黑鐵",
      subRank: subRanks[subIdx] || "I",
      questionsCount: Q,
      points: normPoints,
      nextRankQuestionsNeeded: 3 - (Q % 3)
    };
  } else if (Q < 18) {
    // Tier 2: 9 - 17 Q, 3 sub-ranks (III, II, I), 3 Q per sub-rank
    const adjustedQ = Q - 9;
    const subIdx = Math.floor(adjustedQ / 3);
    const subRanks = ["III", "II", "I"];
    return {
      tier: 2,
      tierName: "青銅",
      subRank: subRanks[subIdx] || "I",
      questionsCount: Q,
      points: normPoints,
      nextRankQuestionsNeeded: 3 - (adjustedQ % 3)
    };
  } else if (Q < 34) {
    // Tier 3: 18 - 33 Q, 4 sub-ranks (IV, III, II, I), 4 Q per sub-rank
    const adjustedQ = Q - 18;
    const subIdx = Math.floor(adjustedQ / 4);
    const subRanks = ["IV", "III", "II", "I"];
    return {
      tier: 3,
      tierName: "白銀",
      subRank: subRanks[subIdx] || "I",
      questionsCount: Q,
      points: normPoints,
      nextRankQuestionsNeeded: 4 - (adjustedQ % 4)
    };
  } else if (Q < 50) {
    // Tier 4: 34 - 49 Q, 4 sub-ranks (IV, III, II, I), 4 Q per sub-rank
    const adjustedQ = Q - 34;
    const subIdx = Math.floor(adjustedQ / 4);
    const subRanks = ["IV", "III", "II", "I"];
    return {
      tier: 4,
      tierName: "黃金",
      subRank: subRanks[subIdx] || "I",
      questionsCount: Q,
      points: normPoints,
      nextRankQuestionsNeeded: 4 - (adjustedQ % 4)
    };
  } else if (Q < 75) {
    // Tier 5: 50 - 74 Q, 5 sub-ranks (V, IV, III, II, I), 5 Q per sub-rank
    const adjustedQ = Q - 50;
    const subIdx = Math.floor(adjustedQ / 5);
    const subRanks = ["V", "IV", "III", "II", "I"];
    return {
      tier: 5,
      tierName: "白金",
      subRank: subRanks[subIdx] || "I",
      questionsCount: Q,
      points: normPoints,
      nextRankQuestionsNeeded: 5 - (adjustedQ % 5)
    };
  } else if (Q < 100) {
    // Tier 6: 75 - 99 Q, 5 sub-ranks (V, IV, III, II, I), 5 Q/sub-rank
    const adjustedQ = Q - 75;
    const subIdx = Math.floor(adjustedQ / 5);
    const subRanks = ["V", "IV", "III", "II", "I"];
    return {
      tier: 6,
      tierName: "鑽石",
      subRank: subRanks[subIdx] || "I",
      questionsCount: Q,
      points: normPoints,
      nextRankQuestionsNeeded: 5 - (adjustedQ % 5)
    };
  } else {
    // Tier 7: 100+ Q, 3 Q per sub-rank, every 5 sub-ranks = 1 scroll
    const adjustedQ = Q - 100;
    const totalSubRanks = Math.floor(adjustedQ / 3);
    const scroll = Math.floor(totalSubRanks / 5) + 1;
    const seg = (totalSubRanks % 5) + 1;
    
    return {
      tier: 7,
      tierName: "傳奇",
      subRank: `卷 ${scroll} 第 ${seg} 階`,
      legendaryScroll: scroll,
      legendarySegment: seg,
      questionsCount: Q,
      points: normPoints,
      nextRankQuestionsNeeded: 3 - (adjustedQ % 3)
    };
  }
}

export const TRIVIA_QUESTIONS = [
  {
    id: 1,
    question: "下列哪一個行星通常被稱為『紅色星球』？",
    options: ["金星", "火星", "木星", "水星"],
    correctAnswer: "火星",
    explanation: "火星因為表面覆蓋大量的氧化鐵膠體，外觀呈現橘紅色，故常被稱為紅色星球。"
  },
  {
    id: 2,
    question: "光在真空中傳播的速度大約是多少？",
    options: ["每秒 30 萬公里", "每秒 3 萬公里", "每秒 300 萬公里", "每秒 3,000 公里"],
    correctAnswer: "每秒 30 萬公里",
    explanation: "光在真空中傳播的速度精確值為 299,792.458 公里/秒，約等同於每秒 30 萬公里。"
  },
  {
    id: 3,
    question: "網頁主要排版與結構語言『HTML』的全稱是什麼？",
    options: [
      "HyperText Markup Language",
      "HighTransfer Markup Language",
      "HyperTech Media Link",
      "Home Tool Markup Language"
    ],
    correctAnswer: "HyperText Markup Language",
    explanation: "HTML 指的是超文字標記語言 (HyperText Markup Language)，是用於建立前端網頁的標準標記語言。"
  },
  {
    id: 4,
    question: "世界三大洋中，面積最大、最深的是哪一個洋？",
    options: ["大西洋", "印度洋", "太平洋", "北冰洋"],
    correctAnswer: "太平洋",
    explanation: "太平洋是地球上最大、最深的海洋，占地球表面積的三分之一，蓄水量大且島嶼眾多。"
  },
  {
    id: 5,
    question: "空氣中含量最高、占比約為百分之 78 的氣體是什麼？",
    options: ["氧氣", "二氧化碳", "氮氣", "氬氣"],
    correctAnswer: "氮氣",
    explanation: "乾燥空氣的化學組成中，氮氣約占 78%，氧氣約占 21%，氬氣約占 0.93%。"
  },
  {
    id: 6,
    question: "著名電腦圖靈測試 (Turing Test) 是由哪一位著名科學家提出的？",
    options: ["亞倫·圖靈", "阿爾伯特·愛因斯坦", "約翰·馮·諾伊曼", "史蒂芬·霍金"],
    correctAnswer: "亞倫·圖靈",
    explanation: "亞倫·圖靈 (Alan Turing) 在 1950 年的論文中提出圖靈測試，用以判定機器是否具有人類水平的智能。"
  },
  {
    id: 7,
    question: "植物經由光合作用，吸收二氧化碳並釋放出的主要氣體是？",
    options: ["一氧化碳", "水蒸氣", "氫氣", "氧氣"],
    correctAnswer: "氧氣",
    explanation: "植物行光合作用時，葉綠體會吸收光能，將水和二氧化碳轉化為糖類，並釋放出氧氣。"
  },
  {
    id: 8,
    question: "在標準大氣壓下，水分子開始凝固或結冰的溫度（冰點）是？",
    options: ["100 攝氏度", "0 攝氏度", "-10 攝氏度", "4 攝氏度"],
    correctAnswer: "0 攝氏度",
    explanation: "在標準大氣壓下，水的冰點定為攝氏 0 度，沸點則是攝氏 100 度。"
  },
  {
    id: 9,
    question: "世界著名畫作《蒙娜麗莎》是哪位文藝復興大師的代表作？",
    options: ["米開朗基羅", "拉斐爾", "達文西", "畢卡索"],
    correctAnswer: "達文西",
    explanation: "《蒙娜麗莎》(Mona Lisa) 是義大利文藝復興時期巨匠李奧納多·達文西作於 16 世紀初的肖像繪畫傑作。"
  },
  {
    id: 10,
    question: "人類身體中，最大的排毒與代謝器官是什麼？",
    options: ["心臟", "肝臟", "肺臟", "腎臟"],
    correctAnswer: "肝臟",
    explanation: "肝臟是人體最大、功能最複雜的實質性臟器，主導解毒、醣類代謝及蛋白質合成等多種重要生理程序。"
  }
];

export default function Dashboard({
  currentUser,
  questionnaires,
  responses,
  logs,
  promotions,
  onUpdateQuestionnaires,
  onUpdateResponses,
  onUpdatePromotions,
  onUpdateLogList,
  onLogout,
  onSelectQuerySystem,
  onUpdateCurrentUser
}: DashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<string>(
    currentUser.role === UserRole.RESPONDENT ? "respondent_game" : "analytics"
  );

  const canManageTriviaQuestions = 
    currentUser.role === UserRole.WEBMASTER || 
    currentUser.canManageTrivia === true;

  const canViewLogs = 
    currentUser.role === UserRole.WEBMASTER || 
    currentUser.role === UserRole.SUPER_ADMIN;

  // ================= RESPONDENT STATES =================
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [selectedTriviaOption, setSelectedTriviaOption] = useState<string>("");
  const [triviaIsCorrect, setTriviaIsCorrect] = useState<boolean | null>(null);

  // Perks Interactive modals state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeSurveyId, setDisputeSurveyId] = useState("");
  const [disputeText, setDisputeText] = useState("");

  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestSurveyId, setSuggestSurveyId] = useState("");
  const [suggestQTitle, setSuggestQTitle] = useState("");
  const [suggestQType, setSuggestQType] = useState<QuestionType>("SINGLE_CHOICE");
  const [suggestQOptions, setSuggestQOptions] = useState<string[]>(["", ""]);

  const [showStopModal, setShowStopModal] = useState(false);
  const [stopSurveyId, setStopSurveyId] = useState("");
  const [stopReason, setStopReason] = useState("");

  const [showPromoFriendModal, setShowPromoFriendModal] = useState(false);
  const [promoFriendName, setPromoFriendName] = useState("");
  const [promoFriendType, setPromoFriendType] = useState<"T3" | "T5">("T3"); // T3 (白銀), T5 (白金)

  const [showBanRequestModal, setShowBanRequestModal] = useState(false);
  const [banReqTarget, setBanReqTarget] = useState("");
  const [banReqReason, setBanReqReason] = useState("");

  // Banned Feature Alert Modal State
  const [bannedAlert, setBannedAlert] = useState<BannedAlertState>({
    isOpen: false,
    featureName: "",
    featureKey: ""
  });

  const checkFeatureAccess = (featureKey: string, featureName: string): boolean => {
    if (isFeatureBanned(currentUser, featureKey)) {
      setBannedAlert({
        isOpen: true,
        featureName,
        featureKey
      });
      return false;
    }
    return true;
  };

  // Quota addition request states (Tier 7+)
  const [quotaRequests, setQuotaRequests] = useState<any[]>([]);
  const [showQuotaRequestModal, setShowQuotaRequestModal] = useState(false);
  const [quotaPerkType, setQuotaPerkType] = useState<"T3" | "T5" | "BAN_OTHER">("T3");
  const [quotaRequestCount, setQuotaRequestCount] = useState(5);

  // Cheat Reporting States
  const [showCheatReportModal, setShowCheatReportModal] = useState(false);
  const [showPrivilegeDescModal, setShowPrivilegeDescModal] = useState(false);
  const [cheatReportTarget, setCheatReportTarget] = useState("");
  const [cheatReportReason, setCheatReportReason] = useState("");
  const [cheatReports, setCheatReports] = useState<any[]>([]);

  // Account-Independent Survey Order state
  const [surveyOrder, setSurveyOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`sub_survey_order_${currentUser.username}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [expandedHistId, setExpandedHistId] = useState<string | null>(null);

  // Stateful Trivia Questions loaded persistent from localStorage
  const [triviaQuestions, setTriviaQuestions] = useState<any[]>(() => {
    const saved = localStorage.getItem("sub_trivia_questions");
    if (saved) return JSON.parse(saved);
    return TRIVIA_QUESTIONS;
  });

  // New Trivia question form substate hooks
  const [newTriviaQText, setNewTriviaQText] = useState("");
  const [newTriviaOptA, setNewTriviaOptA] = useState("");
  const [newTriviaOptB, setNewTriviaOptB] = useState("");
  const [newTriviaOptC, setNewTriviaOptC] = useState("");
  const [newTriviaOptD, setNewTriviaOptD] = useState("");
  const [newTriviaCorrectLetter, setNewTriviaCorrectLetter] = useState("A");
  const [newTriviaExplanation, setNewTriviaExplanation] = useState("");

  // Selection
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(questionnaires[0]?.id || "");

  // Personal account details & username changes
  const [newPersonalUsername, setNewPersonalUsername] = useState(currentUser.username);
  const [personalUsernameMsg, setPersonalUsernameMsg] = useState("");
  const [personalUsernameError, setPersonalUsernameError] = useState("");

  // Password edit state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");

  // Edit response modal
  const [editingResponse, setEditingResponse] = useState<SurveyResponse | null>(null);
  const [editingAnswers, setEditingAnswers] = useState<Record<string, any>>({});
  const [editingMsg, setEditingMsg] = useState("");

  // Survey Creation / Editing parameters
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState("");
  const [newSurveyDesc, setNewSurveyDesc] = useState("");
  const [newSurveyPwReq, setNewSurveyPwReq] = useState(false);
  const [newSurveyPw, setNewSurveyPw] = useState("");
  const [newSurveyEmail, setNewSurveyEmail] = useState(false);
  const [newSurveyStart, setNewSurveyStart] = useState("");
  const [newSurveyEnd, setNewSurveyEnd] = useState("");
  const [newSurveyQs, setNewSurveyQs] = useState<Question[]>([]);

  // Temp Q state
  const [tempQTitle, setTempQTitle] = useState("");
  const [tempQType, setTempQType] = useState<any>("SINGLE_CHOICE");
  const [tempQOptions, setTempQOptions] = useState("");
  const [tempQRequired, setTempQRequired] = useState(true);

  // Sub-Query config state inside Survey Configs
  const [configNewQueryName, setConfigNewQueryName] = useState("");
  const [configNewQueryPwReq, setConfigNewQueryPwReq] = useState(false);
  const [configNewQueryPw, setConfigNewQueryPw] = useState("");
  const [configNewQueryEditable, setConfigNewQueryEditable] = useState<string[]>([]);

  // Promo Select Option states
  const [showPromoSelect, setShowPromoSelect] = useState(false);
  const [promoTargetRole, setPromoTargetRole] = useState<UserRole>(UserRole.OPERATOR);
  const [promoTargetStar, setPromoTargetStar] = useState<number>(1);

  // Dynamic Questionnaire Editor state
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [editSurveyTitle, setEditSurveyTitle] = useState("");
  const [editSurveyDesc, setEditSurveyDesc] = useState("");
  const [editSurveyPwReq, setEditSurveyPwReq] = useState(false);
  const [editSurveyPw, setEditSurveyPw] = useState("");
  const [editSurveyEmail, setEditSurveyEmail] = useState(false);
  const [editSurveyStart, setEditSurveyStart] = useState("");
  const [editSurveyEnd, setEditSurveyEnd] = useState("");
  const [editSurveyQuestions, setEditSurveyQuestions] = useState<Question[]>([]);
  const [editSurveyDistributedToAdmins, setEditSurveyDistributedToAdmins] = useState(true);

  const [newSurveyDistributedToAdmins, setNewSurveyDistributedToAdmins] = useState(true);

  // Dynamic Questionnaire Editor's "+ Add New Question" temp state
  const [editTempQTitle, setEditTempQTitle] = useState("");
  const [editTempQType, setEditTempQType] = useState<QuestionType>("SHORT_TEXT");
  const [editTempQOptions, setEditTempQOptions] = useState("");
  const [editTempQRequired, setEditTempQRequired] = useState(true);

  // Merged sub-query subsystem states inside editor
  const [editNewQueryName, setEditNewQueryName] = useState("");
  const [editNewQueryEditable, setEditNewQueryEditable] = useState<string[]>([]);
  const [editNewQueryPwReq, setEditNewQueryPwReq] = useState(false);
  const [editNewQueryPw, setEditNewQueryPw] = useState("");
  const [editNewQuerySearchQId, setEditNewQuerySearchQId] = useState(""); // EMPTY means default Response ID, otherwise question ID
  const [editNewQueryHideInHall, setEditNewQueryHideInHall] = useState(false); // 新增功能：是否在問卷大廳的路徑隱藏此子查詢入口
  const [editingSubQueryId, setEditingSubQueryId] = useState<string | null>(null); // 當前正在編輯修改的子查詢系統 ID (null 為新增模式)

  // RBAC rename states
  const [rbacRenameInput, setRbacRenameInput] = useState("");

  // RBAC User Star or Table assign state (Super Admin only)
  const [rbacUsers, setRbacUsers] = useState<Record<string, any>>({});
  const [rbacSelectedUser, setRbacSelectedUser] = useState<string>("");

  // New user registration state (Super Admin use)
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.OPERATOR);
  const [newUserStar, setNewUserStar] = useState<number>(1);

  // Webmaster System Account Management specific filter states
  const [sysAccountSearch, setSysAccountSearch] = useState("");
  const [sysAccountRoleFilter, setSysAccountRoleFilter] = useState<string>("ALL");
  const [sysAccountEditingUser, setSysAccountEditingUser] = useState<string | null>(null);
  const [sysAccountTempPassword, setSysAccountTempPassword] = useState("");
  const [showQuickCreateForm, setShowQuickCreateForm] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({});
  const [passwordLoading, setPasswordLoading] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);

  useEffect(() => {
    setNewPersonalUsername(currentUser.username);
  }, [currentUser.username]);

  useEffect(() => {
    // Purge legacy localStorage sub_users from formal data paths
    try {
      localStorage.removeItem("sub_users");
    } catch {
      // ignore
    }

    // Sync authoritative users list strictly via Express API GET /api/users backed by SQL Server
    if (
      currentUser.role === UserRole.WEBMASTER ||
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.SYSTEM_ADMIN
    ) {
      fetchUsersFromApi().then((users) => {
        if (users && typeof users === "object") {
          setRbacUsers(users);
        }
      }).catch((err) => {
        console.error("Failed to load users from GET /api/users:", err);
      });
    }
  }, [currentUser.role]);

  useEffect(() => {
    const saved = localStorage.getItem("global_cheat_reports");
    if (saved) {
      setCheatReports(JSON.parse(saved));
    } else {
      setCheatReports([]);
    }

    const savedQuotas = localStorage.getItem("global_quota_requests");
    if (savedQuotas) {
      setQuotaRequests(JSON.parse(savedQuotas));
    } else {
      setQuotaRequests([]);
    }
  }, []);

  const addLog = (action: string, target: string, details: string) => {
    const roleString = currentUser.role === UserRole.WEBMASTER
      ? "系統站主"
      : currentUser.role === UserRole.SUPER_ADMIN 
      ? "超級管理員" 
      : currentUser.role === UserRole.SYSTEM_ADMIN
      ? "系統管理員"
      : currentUser.role === UserRole.OPERATOR
      ? `操作員 (${currentUser.starLevel}星)`
      : currentUser.role === UserRole.ANALYST
      ? `分析員 (${currentUser.starLevel}星)`
      : currentUser.role === UserRole.QUESTION_CREATOR
      ? `出題人 (${currentUser.starLevel || 1}階)`
      : `答題人 (${currentUser.starLevel || 1}階)`;

    const newLogItem: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      user: currentUser.username,
      role: roleString,
      action,
      target,
      details
    };
    onUpdateLogList([newLogItem, ...logs]);
    saveAuditLogToFirestore(newLogItem);
  };

  // Helper check if current user is allowed to access specific table
  const checkTableAccess = (surveyId: string): boolean => {
    if (
      currentUser.role === UserRole.WEBMASTER ||
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.SYSTEM_ADMIN
    ) {
      return true;
    }

    const targetSurvey = questionnaires.find(q => q.id === surveyId);

    if (currentUser.role === UserRole.QUESTION_CREATOR) {
      return targetSurvey ? targetSurvey.createdBy === currentUser.username : false;
    }

    if (targetSurvey && targetSurvey.distributedToAdmins === false) {
      return false;
    }
    return currentUser.assignedTables?.includes(surveyId) || false;
  };

  // Filter questionnaires based on access restrictions
  const accessibleQuestionnaires = questionnaires.filter(q => checkTableAccess(q.id));

  // Determine current active survey
  const surveysToRender = accessibleQuestionnaires;
  const currentSurvey = accessibleQuestionnaires.find(q => q.id === selectedSurveyId);

  // Account-Independent custom order sorting
  const getSortedQuestionnaires = (list: Questionnaire[]) => {
    const orderMap = new Map<string, number>();
    surveyOrder.forEach((id, idx) => {
      orderMap.set(id, idx);
    });

    return [...list].sort((a, b) => {
      const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999 + list.indexOf(a);
      const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999 + list.indexOf(b);
      return indexA - indexB;
    });
  };

  const handleMoveSurveyLocal = (id: string, direction: "up" | "down") => {
    const sortedList = getSortedQuestionnaires(accessibleQuestionnaires);
    const index = sortedList.findIndex(q => q.id === id);
    if (index === -1) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sortedList.length) return;

    const newList = [...sortedList];
    const temp = newList[index];
    newList[index] = newList[targetIdx];
    newList[targetIdx] = temp;

    const newOrder = newList.map(q => q.id);
    setSurveyOrder(newOrder);
    localStorage.setItem(`sub_survey_order_${currentUser.username}`, JSON.stringify(newOrder));

    addLog(
      "調整自訂排序",
      `排列次序變更: ${temp.title}`,
      `用戶 ${currentUser.username} 移動了其個人專屬列表中問卷【${temp.title}】的排序位次。`
    );
  };

  const handleToggleUserTriviaPrivilege = (targetUsername: string, isChecked: boolean) => {
    if (currentUser.role !== UserRole.WEBMASTER) {
      alert("⚠️ 權限不足：市民「答題學知識」題庫管理特權已統一移交由系統站主分配！");
      return;
    }
    const uList = { ...rbacUsers };
    if (!uList[targetUsername]) return;

    uList[targetUsername].canManageTrivia = isChecked;

    setRbacUsers(uList);
    saveUserToFirestore(targetUsername, uList[targetUsername]);

    if (targetUsername === currentUser.username) {
      const updated = { ...currentUser, canManageTrivia: isChecked };
      onUpdateCurrentUser(updated);
      localStorage.setItem("sub_logged_user", JSON.stringify(updated));
    }

    addLog(
      "站主分配題庫特權",
      `特權異動：${targetUsername}`,
      `系統站主將帳號【${targetUsername}】「答題學知識題庫管理」特權設定為：${isChecked ? "已開啟授權" : "已關閉收回"}`
    );
    alert(`🎉 已成功將帳號【${targetUsername}】的題庫管理特權${isChecked ? "開啟授權" : "關閉收回"}！`);
  };

  const handleToggleUserLogManagePrivilege = (targetUsername: string, isChecked: boolean) => {
    if (currentUser.role !== UserRole.WEBMASTER) {
      alert("⚠️ 權限不足：超級管理員之系統日誌修改、刪除及清空特權僅限系統站主統一授權！");
      return;
    }
    const uList = { ...rbacUsers };
    if (!uList[targetUsername]) return;

    uList[targetUsername].canManageLogs = isChecked;

    setRbacUsers(uList);
    saveUserToFirestore(targetUsername, uList[targetUsername]);

    if (targetUsername === currentUser.username) {
      const updated = { ...currentUser, canManageLogs: isChecked };
      onUpdateCurrentUser(updated);
      localStorage.setItem("sub_logged_user", JSON.stringify(updated));
    }

    addLog(
      "站主授權日誌管理",
      `特權異動：${targetUsername}`,
      `系統站主將超級管理員帳號【${targetUsername}】「系統日誌修改/刪除/清空」管理特權設定為：${isChecked ? "已開啟授權" : "已關閉收回"}`
    );
    alert(`🎉 已成功將超級管理員【${targetUsername}】的日誌管理特權${isChecked ? "開啟授權" : "關閉收回"}！`);
  };

  const handleUpdateUserBans = (targetUsername: string, updatedBannedFeatures: string[]) => {
    const uList = { ...rbacUsers };
    const key = targetUsername.toLowerCase();
    let foundKey = key;
    if (!uList[key]) {
      const matched = Object.keys(uList).find(k => k.toLowerCase() === key);
      if (matched) foundKey = matched;
    }
    if (uList[foundKey]) {
      uList[foundKey] = {
        ...uList[foundKey],
        bannedFeatures: updatedBannedFeatures
      };
    } else {
      uList[key] = {
        username: targetUsername,
        role: UserRole.RESPONDENT,
        bannedFeatures: updatedBannedFeatures
      };
    }


    setRbacUsers(uList);

    // Persist bannedFeatures to Firestore
    saveUserToFirestore(targetUsername, { bannedFeatures: updatedBannedFeatures });

    // If modifying the currently logged-in account
    if (targetUsername.toLowerCase() === currentUser.username.toLowerCase()) {
      const updatedUser = {
        ...currentUser,
        bannedFeatures: updatedBannedFeatures
      };
      if (onUpdateCurrentUser) {
        onUpdateCurrentUser(updatedUser);
      }
      localStorage.setItem("sub_logged_user", JSON.stringify(updatedUser));
    }
  };

  const handleImportSuggestion = (surveyId: string, sug: any) => {
    const updated = questionnaires.map(q => {
      if (q.id === surveyId) {
        const newQ: Question = {
          id: `q-${Date.now()}`,
          title: sug.title,
          type: sug.type as QuestionType,
          options: sug.options,
          required: false,
          minRating: 1,
          maxRating: 5
        };
        const currentQuestions = q.questions || [];
        const suggestions = (q as any).suggestions || [];
        const nextSuggestions = suggestions.filter((s: any) => s.id !== sug.id);
        
        return {
          ...q,
          questions: [...currentQuestions, newQ],
          suggestions: nextSuggestions
        };
      }
      return q;
    });

    onUpdateQuestionnaires(updated);
    addLog(
      "採納市民薦題",
      surveyId,
      `採納並匯入了市民推薦的題目「${sug.title}」至問卷編號 [${surveyId}]`
    );
    alert("🎉 已成功採納市民薦題並匯入該問卷！題目已自動新增至問卷末尾！");
  };

  const handleRejectSuggestion = (surveyId: string, sugId: string) => {
    const updated = questionnaires.map(q => {
      if (q.id === surveyId) {
        const suggestions = (q as any).suggestions || [];
        const nextSuggestions = suggestions.filter((s: any) => s.id !== sugId);
        return {
          ...q,
          suggestions: nextSuggestions
        };
      }
      return q;
    });
    onUpdateQuestionnaires(updated);
    alert("已忽略/清除此項市民推薦薦題。");
  };

  const handleAddNewTriviaQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTriviaQText.trim()) {
      alert("⚠️ 請輸入問題題目文字！");
      return;
    }
    if (!newTriviaOptA.trim() || !newTriviaOptB.trim() || !newTriviaOptC.trim() || !newTriviaOptD.trim()) {
      alert("⚠️ 請填寫完整四個選項！");
      return;
    }

    const options = [newTriviaOptA.trim(), newTriviaOptB.trim(), newTriviaOptC.trim(), newTriviaOptD.trim()];
    let correctAnswer = options[0];
    if (newTriviaCorrectLetter === "B") correctAnswer = options[1];
    if (newTriviaCorrectLetter === "C") correctAnswer = options[2];
    if (newTriviaCorrectLetter === "D") correctAnswer = options[3];

    const nextId = triviaQuestions.length > 0 ? Math.max(...triviaQuestions.map((t: any) => t.id)) + 1 : 1;
    const newQ = {
      id: nextId,
      question: newTriviaQText.trim(),
      options,
      correctAnswer,
      explanation: newTriviaExplanation.trim() || "無補充電書解釋說明。"
    };

    const updated = [...triviaQuestions, newQ];
    setTriviaQuestions(updated);
    localStorage.setItem("sub_trivia_questions", JSON.stringify(updated));

    addLog(
      "擴充知識庫題目",
      newQ.question.substring(0, 15) + "...",
      `自主新增市民研習答題學知識學科題目一組，題號: ${nextId}`
    );

    alert("🎉 知識庫問題新增成功！");
    setNewTriviaQText("");
    setNewTriviaOptA("");
    setNewTriviaOptB("");
    setNewTriviaOptC("");
    setNewTriviaOptD("");
    setNewTriviaExplanation("");
  };

  const handleDeleteTriviaQuestion = (id: number) => {
    if (confirm("確定要在知識題庫中徹底刪除此題嗎？這會立即對所有市民答題端生效。")) {
      const updated = triviaQuestions.filter(t => t.id !== id);
      setTriviaQuestions(updated);
      localStorage.setItem("sub_trivia_questions", JSON.stringify(updated));
      alert("已成功將該問題自知識題庫中移除！");
    }
  };

  // Auto-correct Selected Survey ID if access is lost or non-existent
  useEffect(() => {
    if (surveysToRender.length > 0 && !surveysToRender.map(q => q.id).includes(selectedSurveyId)) {
      setSelectedSurveyId(surveysToRender[0].id);
    }
  }, [questionnaires, currentUser, selectedSurveyId]);

  // Promote Apply center (Operator/Analyst/Creator can apply for promotion and choose target)
  const canApplyPromotion = (): boolean => {
    if (currentUser.role === UserRole.OPERATOR || currentUser.role === UserRole.ANALYST) return true;
    if (currentUser.role === UserRole.QUESTION_CREATOR && (currentUser.starLevel || 1) < 3) return true;
    return false;
  };

  const handleApplyPromotionSubmit = () => {
    const existingActive = promotions.find(p => p.username === currentUser.username && p.status === "PENDING");
    if (existingActive) {
      alert("⚠️ 您已有一筆審核中的晉級申請，請静候超級管理員核准！");
      return;
    }

    const resolvedTargetRole = currentUser.role === UserRole.QUESTION_CREATOR ? UserRole.QUESTION_CREATOR : promoTargetRole;
    const resolvedTargetStar = currentUser.role === UserRole.QUESTION_CREATOR ? (promoTargetStar as StarLevel) : (promoTargetRole === UserRole.SYSTEM_ADMIN ? undefined : (promoTargetStar as StarLevel));

    const app: PromotionApplication = {
      id: `promo-${Date.now()}`,
      username: currentUser.username,
      currentRole: currentUser.role,
      currentStar: currentUser.starLevel,
      targetRole: resolvedTargetRole,
      targetStar: resolvedTargetStar,
      status: "PENDING",
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19)
    };

    onUpdatePromotions([app, ...promotions]);
    savePromotionToApi(app).catch(() => {});
    
    const targetString = resolvedTargetRole === UserRole.QUESTION_CREATOR
      ? `出題人 (${resolvedTargetStar}階)`
      : resolvedTargetRole === UserRole.RESPONDENT
      ? `答題人 (${resolvedTargetStar}階)`
      : resolvedTargetRole === UserRole.SYSTEM_ADMIN
      ? "系統管理員"
      : `${resolvedTargetRole === UserRole.OPERATOR ? "操作員" : "分析員"} (${resolvedTargetStar}星)`;

    addLog(
      "提出職級晉升申請",
      "用戶權限分級制度",
      `${currentUser.username} 提出權限晉升申請，請求晉升為：${targetString}`
    );
    alert(`🎉 您的晉升申請（期望職位: ${targetString}）已成功送出！將提報予超級管理員進行審批。`);
    setShowPromoSelect(false);
  };

  // Approve Promotion
  const handleApprovePromo = (app: PromotionApplication) => {
    // 1. Update promotion status
    const updatedApp = { ...app, status: "APPROVED" as const };
    const updatedApps = promotions.map(p => p.id === app.id ? updatedApp : p);
    onUpdatePromotions(updatedApps);
    savePromotionToApi(updatedApp).catch(() => {});

    // 2. Update user info in local storage list

    if (true) {
      const uList = { ...rbacUsers };
      if (uList[app.username]) {
        uList[app.username].role = app.targetRole;
        uList[app.username].starLevel = app.targetStar;
        if (app.targetRole === UserRole.SYSTEM_ADMIN) {
          uList[app.username].assignedTables = [];
        }

        setRbacUsers(uList);
      }
    }

    const roleString = app.targetRole === UserRole.QUESTION_CREATOR
      ? `出題人 (${app.targetStar}階)`
      : `${app.targetRole} (${app.targetStar || ""}星)`;

    addLog(
      "批准職級晉級申請",
      "核備人員: " + app.username,
      `超級管理員核准了 ${app.username} 的申請。角色地位轉換為: ${roleString}`
    );
    alert(`已批准 ${app.username} 的晉級申請！階級設定已同步更新為 ${roleString}。`);
  };

  // Reject Promotion
  const handleRejectPromo = (app: PromotionApplication) => {
    const updatedApp = { ...app, status: "REJECTED" as const };
    const updatedApps = promotions.map(p => p.id === app.id ? updatedApp : p);
    onUpdatePromotions(updatedApps);
    savePromotionToApi(updatedApp).catch(() => {});

    addLog(
      "駁回職級晉級申請",
      "核備人員: " + app.username,
      `超級管理員駁回了 ${app.username} 的晉級申請。`
    );
    alert(`已駁回 ${app.username} 的晉級申請。`);
  };

  // ================= RESPONDENT ACTIONS & PERKS LOGIC =================
  const handleTriviaAnswerSubmit = () => {
    if (currentUser.role === UserRole.RESPONDENT && !checkFeatureAccess("respondent_answer", "答題功能")) {
      return;
    }
    if (!selectedTriviaOption) {
      alert("⚠️ 請先選擇一個答案選項！");
      return;
    }
    const currentQ = triviaQuestions[triviaIndex];
    if (!currentQ) {
      alert("⚠️ 題庫中目前沒有更多題目！");
      return;
    }
    const isCorrect = selectedTriviaOption === currentQ.correctAnswer;
    
    setTriviaIsCorrect(isCorrect);
    
    if (isCorrect) {
      const currentPts = currentUser.respondentPoints || 0;
      const newPts = currentPts + 7;


      if (true) {
      const uList = { ...rbacUsers };
        if (uList[currentUser.username]) {
          uList[currentUser.username].respondentPoints = newPts;
          
          const rankInfo = calculateRespondentRank(newPts);
          uList[currentUser.username].starLevel = rankInfo.tier;
          

          setRbacUsers(uList);
          
          if (onUpdateCurrentUser) {
            onUpdateCurrentUser({
              ...currentUser,
              respondentPoints: newPts,
              starLevel: rankInfo.tier as StarLevel
            });
          }
        }
      }

      addLog(
        "答題闖關成功",
        `題目: ${currentQ.question}`,
        `答題人答對並獲得 7 點積分。當前總積分: ${newPts} 點`
      );
      alert(`🎉 答對囉！太棒了！獲得 7 點積分！\n解析：${currentQ.explanation}`);
    } else {
      addLog(
        "答題闖關失敗",
        `題目: ${currentQ.question}`,
        `答題人答錯，選擇了：${selectedTriviaOption}`
      );
      alert(`❌ 答錯囉，要再試一次嗎？你可以重新選擇答案！\n提示：提示就在選項中。`);
    }
  };

  const nextTriviaQuestion = () => {
    setTriviaIndex((prev) => (prev + 1) % (triviaQuestions.length || 1));
    setSelectedTriviaOption("");
    setTriviaIsCorrect(null);
  };

  // Promote a friend's account directly
  const handlePromoFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const friend = promoFriendName.trim().toLowerCase();
    
    if (!friend) {
      alert("⚠️ 請輸入朋友的帳號名稱！");
      return;
    }
    if (friend === currentUser.username.toLowerCase()) {
      alert("⚠️ 您不能直接晉升自己的帳號！");
      return;
    }

    try {
      // Server-authoritative privilege verification and promotion
      const result = await promoteFriendApi(friend, promoFriendType);
      if (!result.success) {
        alert(`❌ 伺服器驗證未通過：${result.message || "朋友晉升失敗！"}`);
        return;
      }

      // Refresh logged user from server to synchronize updated quota
      const meRes = await fetchMeFromServer();
      if (meRes.success && meRes.user) {
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser(meRes.user);
        }
        localStorage.setItem("sub_logged_user", JSON.stringify(meRes.user));
      }

      // Sync local users cache

      if (true) {
      const uList = { ...rbacUsers };
        if (uList[friend]) {
          uList[friend].role = UserRole.RESPONDENT;
          uList[friend].respondentPoints = Math.max(uList[friend].respondentPoints || 0, promoFriendType === "T5" ? 1000 : 360);
          uList[friend].starLevel = promoFriendType === "T5" ? 5 : 3;
        }
        if (meRes.success && meRes.user && uList[currentUser.username]) {
          uList[currentUser.username] = { ...uList[currentUser.username], ...meRes.user };
        }

        setRbacUsers(uList);
      }

      if (promoFriendType === "T3") {
        alert(`🎉 伺服器驗證通過！已將朋友 ${friend} 帳號直接提拔為 3 階白銀答題人！`);
      } else {
        alert(`⚡ 傳奇神威！伺服器驗證通過！已將朋友 ${friend} 帳號直接提拔為 5 階白金等級！`);
      }
    } catch (err: any) {
      alert(`❌ 伺服器通訊異常：${err?.message || "無法完成提拔朋友操作"}`);
    }

    setPromoFriendName("");
    setShowPromoFriendModal(false);
  };

  // Submit dispute (Tier 2+)
  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeSurveyId) {
      alert("⚠️ 請選擇一個您要質疑其題目的問卷！");
      return;
    }
    if (!disputeText.trim()) {
      alert("⚠️ 請輸入具體的題目爭議/質疑說明！");
      return;
    }

    const updated = questionnaires.map(q => {
      if (q.id === disputeSurveyId) {
        const itemDisputes = q.disputes || [];
        return {
          ...q,
          disputes: [
            ...itemDisputes,
            {
              id: `disp-${Date.now()}`,
              username: currentUser.username,
              reason: disputeText.trim(),
              timestamp: new Date().toISOString().replace("T", " ").substring(0, 19)
            }
          ]
        };
      }
      return q;
    });

    onUpdateQuestionnaires(updated);
    addLog(
      "對出題人題目提出質疑申訴",
      disputeSurveyId,
      `答題人針對問卷 [${disputeSurveyId}] 提出質疑申訴：${disputeText.trim()}`
    );

    alert("🎉 質疑申訴送出成功！出題人將在問卷管理與回收數據庫中檢視本條質疑提報。");
    setDisputeText("");
    setShowDisputeModal(false);
  };

  // Submit suggest question (Tier 4+)
  const handleSuggestQSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestSurveyId) {
      alert("⚠️ 請選取建議增設題目的問卷！");
      return;
    }
    if (!suggestQTitle.trim()) {
      alert("⚠️ 請輸入建議的題目文字！");
      return;
    }

    const updated = questionnaires.map(q => {
      if (q.id === suggestSurveyId) {
        const suggestions = (q as any).suggestions || [];
        return {
          ...q,
          suggestions: [
            ...suggestions,
            {
              id: `sug-${Date.now()}`,
              author: currentUser.username,
              title: suggestQTitle.trim(),
              type: suggestQType,
              options: suggestQOptions.filter(Boolean),
              createdAt: new Date().toISOString().replace("T", " ").substring(0, 19)
            }
          ]
        };
      }
      return q;
    });

    onUpdateQuestionnaires(updated);
    addLog(
      "協助出題：設計題目推薦",
      suggestSurveyId,
      `答題人協助出題，向問卷 [${suggestSurveyId}] 推薦增設題目「${suggestQTitle.trim()}」`
    );

    alert("🎉 建議題目提報成功！出題人可以直接在設置頁面內一鍵核對並匯入您所撰寫的題目！");
    setSuggestQTitle("");
    setSuggestQOptions(["", ""]);
    setShowSuggestModal(false);
  };

  // Apply to stop questionnaire (Tier 5+)
  const handleStopSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopSurveyId) {
      alert("⚠️ 請選取欲提報停用的問卷！");
      return;
    }
    if (!stopReason.trim()) {
      alert("⚠️ 請輸入提報停用的正當法律/資安/侵權理由！");
      return;
    }

    const qObj = questionnaires.find(q => q.id === stopSurveyId);
    const targetCreator = qObj?.createdBy || "system";

    const updated = questionnaires.map(q => {
      if (q.id === stopSurveyId) {
        const stops = (q as any).stopApplied || [];
        return {
          ...q,
          stopApplied: [
            ...stops,
            {
              id: `stopapp-${Date.now()}`,
              user: currentUser.username,
              reason: stopReason.trim(),
              createdAt: new Date().toISOString().replace("T", " ").substring(0, 19)
            }
          ]
        };
      }
      return q;
    });

    onUpdateQuestionnaires(updated);

    // Merge into general cheat reports:
    const savedReports = JSON.parse(localStorage.getItem("global_cheat_reports") || "[]");
    const newReport = {
      id: `cheat-${Date.now()}`,
      reporter: currentUser.username,
      target: targetCreator,
      surveyId: stopSurveyId,
      surveyTitle: qObj?.title || stopSurveyId,
      reason: `【檢舉問卷停用申請】問卷 ID: ${stopSurveyId} (標題: ${qObj?.title || "未知"}), 理由：${stopReason.trim()}`,
      status: "PENDING",
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
      type: "STOP_SURVEY"
    };
    savedReports.push(newReport);
    localStorage.setItem("global_cheat_reports", JSON.stringify(savedReports));
    setCheatReports(savedReports);

    addLog(
      "提請管理員封禁停用問卷",
      stopSurveyId,
      `答題人提請停用問卷 [${stopSurveyId}]，並已同步提報至開掛/作弊與違規審查中心，理由：${stopReason.trim()}`
    );

    alert("🎉 停用與檢舉申請提報成功！已同步合併至【開掛/作弊嫌疑檢舉審查中心】，管理員或站主將優先進行審查。");
    setStopReason("");
    setShowStopModal(false);
  };

  // Submit ban request (Tier 7+)
  const handleBanOtherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = banReqTarget.trim().toLowerCase();
    if (!target) {
      alert("⚠️ 請輸入欲申訴封鎖的對象帳號名稱！");
      return;
    }
    if (target === currentUser.username.toLowerCase()) {
      alert("⚠️ 您不能申請封鎖自己的帳號！");
      return;
    }
    if (!banReqReason.trim()) {
      alert("⚠️ 請輸入合理的帳號舉報封禁理由！");
      return;
    }

    try {
      // Server-authoritative temporary ban verification and execution
      const result = await temporaryBanUserApi(target, banReqReason.trim());
      if (!result.success) {
        alert(`❌ 伺服器驗證未通過：${result.message || "臨時封鎖失敗！"}`);
        return;
      }

      // Refresh current user quota from server
      const meRes = await fetchMeFromServer();
      if (meRes.success && meRes.user) {
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser(meRes.user);
        }
        localStorage.setItem("sub_logged_user", JSON.stringify(meRes.user));
      }


      if (true) {
      const uList = { ...rbacUsers };
        if (uList[target]) {
          uList[target].banned = true;
          uList[target].bannedBy = currentUser.role;
          uList[target].bannedReason = "CHEAT";
          uList[target].bannedUntil = Date.now() + 3600 * 1000;
          uList[target].banType = "TEMP_LEGEND";
        }
        if (meRes.success && meRes.user && uList[currentUser.username]) {
          uList[currentUser.username] = { ...uList[currentUser.username], ...meRes.user };
        }

        setRbacUsers(uList);
      }

      // Save report in local cheat reports for visual feedback
      const savedReports = JSON.parse(localStorage.getItem("global_cheat_reports") || "[]");
      const newReport = {
        id: `cheat-${Date.now()}`,
        reporter: currentUser.username,
        target: target,
        reason: `【傳奇市民特權 - 臨時封鎖啟動】涉嫌人「${target}」（已被 7 階傳奇答題市民強制臨時封鎖 1 小時！請系統站主審查是否永久終身封鎖）。事由：${banReqReason.trim()}`,
        status: "PENDING",
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
        type: "LEGEND_TEMP_BAN"
      };
      savedReports.push(newReport);
      localStorage.setItem("global_cheat_reports", JSON.stringify(savedReports));
      setCheatReports(savedReports);

      alert(`🎉 傳奇神威顯赫！伺服器已成功核准並對違規帳號「${target}」實施立竿見影的 1 小時臨時封禁！`);
    } catch (err: any) {
      alert(`❌ 伺服器通訊異常：${err?.message || "無法執行臨時封鎖"}`);
    }

    setBanReqTarget("");
    setBanReqReason("");
    setShowBanRequestModal(false);
  };

  // Submit privilege quota requests (Tier 7+)
  const handleQuotaRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (quotaPerkType === "T3") {
      const maxT3 = 15 + (currentUser.extraT3Quota || 0);
      const usedT3 = currentUser.promotedFriendsThisMonthCount_T3 || 0;
      if (usedT3 < maxT3) {
        alert(`⚠️ 您的「白銀直升額度」尚未用完（當前已用 ${usedT3} / 可用 ${maxT3}），暫不需申請追加！`);
        return;
      }
    } else if (quotaPerkType === "T5") {
      const maxT5 = 2 + (currentUser.extraT5Quota || 0);
      const usedT5 = currentUser.promotedFriendsThisWeekCount_T5 || 0;
      if (usedT5 < maxT5) {
        alert(`⚠️ 您的「白金直升額度」尚未用完（當前已用 ${usedT5} / 可用 ${maxT5}），暫不需申請追加！`);
        return;
      }
    } else if (quotaPerkType === "BAN_OTHER") {
      const maxBan = 4 + (currentUser.extraBanQuota || 0);
      const usedBan = currentUser.bannedOtherAppliedThisMonthCount || 0;
      if (usedBan < maxBan) {
        alert(`⚠️ 您的「臨時封鎖額度」尚未用完（當前已用 ${usedBan} / 可用 ${maxBan}），暫不需申請追加！`);
        return;
      }
    }

    let perkName = "";
    if (quotaPerkType === "T3") perkName = "3階 (白銀) 朋友直接晉升額度";
    else if (quotaPerkType === "T5") perkName = "5階 (白金) 朋友直接晉升額度";
    else if (quotaPerkType === "BAN_OTHER") perkName = "強制臨時封鎖違規帳戶額度";

    const newReq = {
      id: `quota-${Date.now()}`,
      requester: currentUser.username,
      perkType: quotaPerkType,
      perkName: perkName,
      requestedCount: quotaRequestCount,
      status: "PENDING",
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19)
    };

    const list = JSON.parse(localStorage.getItem("global_quota_requests") || "[]");
    list.push(newReq);
    localStorage.setItem("global_quota_requests", JSON.stringify(list));
    setQuotaRequests(list);
    saveQuotaRequestToApi(newReq).catch(() => {});

    addLog(
      "申請追加特權次數",
      currentUser.username,
      `7階傳奇市民申請將【${perkName}】特權額度，額外加碼 ${quotaRequestCount} 次。`
    );

    alert(`🎉 申請已送出！藍綠色的特權加碼申請已提報至站主控制中心的答題人分類上方，請靜候站主核准審派！`);
    setShowQuotaRequestModal(false);
  };

  const handleApproveQuotaRequest = (req: any) => {
    const savedQuotas = localStorage.getItem("global_quota_requests");
    if (!savedQuotas) return;
    let qList = JSON.parse(savedQuotas);
    const reqObj = qList.find((r: any) => r.id === req.id);
    if (!reqObj) return;


    if (true) {
      const uList = { ...rbacUsers };
      const rUser = uList[req.requester];
      if (rUser) {
        if (req.perkType === "T3") {
          rUser.extraT3Quota = (rUser.extraT3Quota || 0) + req.requestedCount;
        } else if (req.perkType === "T5") {
          rUser.extraT5Quota = (rUser.extraT5Quota || 0) + req.requestedCount;
        } else if (req.perkType === "BAN_OTHER") {
          rUser.extraBanQuota = (rUser.extraBanQuota || 0) + req.requestedCount;
        }

        setRbacUsers(uList);

        // If the approved requester is current user, update current user too!
        if (req.requester === currentUser.username) {
          if (onUpdateCurrentUser) {
            onUpdateCurrentUser({
              ...currentUser,
              extraT3Quota: rUser.extraT3Quota,
              extraT5Quota: rUser.extraT5Quota,
              extraBanQuota: rUser.extraBanQuota
            });
            // Update logged user in local storage to prevent staled session info
            const storedLogged = localStorage.getItem("sub_logged_user");
            if (storedLogged) {
              const parsedLogged = JSON.parse(storedLogged);
              parsedLogged.extraT3Quota = rUser.extraT3Quota;
              parsedLogged.extraT5Quota = rUser.extraT5Quota;
              parsedLogged.extraBanQuota = rUser.extraBanQuota;
              localStorage.setItem("sub_logged_user", JSON.stringify(parsedLogged));
            }
          }
        }
      }
    }

    reqObj.status = "APPROVED";
    localStorage.setItem("global_quota_requests", JSON.stringify(qList));
    setQuotaRequests(qList);
    saveQuotaRequestToApi(reqObj).catch(() => {});

    addLog(
      "核准特權加碼",
      req.requester,
      `系統站主批准了傳奇市民 ${req.requester} 的特權加碼申請，成功為其額外加碼 ${req.requestedCount} 次【${req.perkName}】。`
    );

    alert(`🎉 已成功批准 ${req.requester} 的加碼申請！已順利加派其【${req.perkName}】 ${req.requestedCount} 次的額度！`);
  };

  const handleRejectQuotaRequest = (req: any) => {
    const savedQuotas = localStorage.getItem("global_quota_requests");
    if (!savedQuotas) return;
    let qList = JSON.parse(savedQuotas);
    const reqObj = qList.find((r: any) => r.id === req.id);
    if (!reqObj) return;

    reqObj.status = "REJECTED";
    localStorage.setItem("global_quota_requests", JSON.stringify(qList));
    setQuotaRequests(qList);
    saveQuotaRequestToApi(reqObj).catch(() => {});

    addLog(
      "駁回特權加碼",
      req.requester,
      `系統站主駁回了傳奇市民 ${req.requester} 申請追加 【${req.perkName}】特權額度的請求。`
    );

    alert(`已成功駁回這項加碼申請。`);
  };

  // Submit cheat suspicion report (Any Respondent)
  const handleCheatReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = cheatReportTarget.trim().toLowerCase();
    if (!target) {
      alert("⚠️ 請選取被檢舉者帳號名稱！");
      return;
    }
    if (target === currentUser.username.toLowerCase()) {
      alert("⚠️ 您不能檢舉自己！");
      return;
    }
    if (!cheatReportReason.trim()) {
      alert("⚠️ 請輸入合理的帳號舉報封禁理由！");
      return;
    }


    const uList = { ...rbacUsers };
    if (!uList[target]) {
      alert(`⚠️ 系統找不到名為「${target}」的活動帳戶，請重新確認！`);
      return;
    }

    const savedReports = JSON.parse(localStorage.getItem("global_cheat_reports") || "[]");
    const newReport = {
      id: `cheat-${Date.now()}`,
      reporter: currentUser.username,
      target: target,
      reason: cheatReportReason.trim(),
      status: "PENDING",
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19)
    };
    savedReports.push(newReport);
    localStorage.setItem("global_cheat_reports", JSON.stringify(savedReports));
    setCheatReports(savedReports);

    addLog(
      "舉報市民開掛嫌疑",
      target,
      `${currentUser.username} 提交了對答題人 [${target}] 的開掛疑似嫌疑舉報。事由：${cheatReportReason.trim()}`
    );

    alert(`🎉 舉報成功！站主與管理員已收到對「${target}」的開掛、作弊等不當行為通報，我們將儘速查辦。`);
    setCheatReportTarget("");
    setCheatReportReason("");
    setShowCheatReportModal(false);
  };

  // Process cheat suspicion report (Admin/Webmaster)
  const handleCheatReportAction = (reportId: string, action: "BAN" | "DISMISS" | "BLOCK_SURVEY_ONLY" | "BLOCK_CREATOR_AND_ALL_SURVEYS") => {
    const saved = localStorage.getItem("global_cheat_reports");
    if (!saved) return;
    let list = JSON.parse(saved);
    const repObj = list.find((r: any) => r.id === reportId);
    if (!repObj) return;


    const uList = { ...rbacUsers };

    if (action === "BLOCK_SURVEY_ONLY") {
      // Deactivate only the specific questionnaire
      if (repObj.surveyId) {
        const updatedQ = questionnaires.map(q => {
          if (q.id === repObj.surveyId) {
            return { ...q, isActive: false };
          }
          return q;
        });
        onUpdateQuestionnaires(updatedQ);
      }
      repObj.status = "APPROVED_SURVEY_ONLY_BAN";
      addLog(
        "只封鎖該問卷",
        repObj.target,
        `管理員核准停用問卷申請：只封鎖停用該項違規問卷 [${repObj.surveyId}]。`
      );
      alert(`🎉 處理成功！已成功將問卷「${repObj.surveyTitle || repObj.surveyId}」單獨停用關閉！`);
    }
    else if (action === "BLOCK_CREATOR_AND_ALL_SURVEYS") {
      const creatorUsername = repObj.target;
      // Ban the creator account with SURVEY_ISSUE
      if (uList[creatorUsername]) {
        uList[creatorUsername].banned = true;
        uList[creatorUsername].bannedBy = currentUser.role;
        uList[creatorUsername].bannedReason = "SURVEY_ISSUE";
        uList[creatorUsername].banType = "REPORT";

        setRbacUsers(uList);
      }

      // Deactivate all questionnaires created by this user
      const updatedQ = questionnaires.map(q => {
        if (q.createdBy === creatorUsername) {
          return { ...q, isActive: false };
        }
        return q;
      });
      onUpdateQuestionnaires(updatedQ);

      repObj.status = "APPROVED_CREATOR_AND_SURVEYS_BAN";
      addLog(
        "封禁出題人與名下所有問卷",
        creatorUsername,
        `管理員核准特權申請：已將出題人「${creatorUsername}」帳號全面封鎖，且名下所有發布問卷一併強制停用關閉！`
      );
      alert(`🎉 處理成功！已將出題人「${creatorUsername}」帳號實行封禁停用，其發布的所有問卷已同步全面關閉！`);
    }
    else if (action === "BAN") {
      if (true) {
        // Ban the target user if they exist
        if (uList[repObj.target]) {
          uList[repObj.target].banned = true;
          uList[repObj.target].bannedBy = currentUser.role;
          uList[repObj.target].bannedReason = "CHEAT";
          if (repObj.type === "LEGEND_TEMP_BAN") {
            uList[repObj.target].banType = "PERM_LEGEND";
          } else {
            uList[repObj.target].banType = "REPORT";
          }

          setRbacUsers(uList);
        }

        // If the report was a STOP_SURVEY or has an associated surveyId, deactivate the questionnaire too!
        if (repObj.surveyId) {
          const updatedQ = questionnaires.map(q => {
            if (q.id === repObj.surveyId) {
              return { ...q, isActive: false };
            }
            return q;
          });
          onUpdateQuestionnaires(updatedQ);
        }

        addLog(
          "證實嫌疑並實施封禁",
          repObj.target,
          `管理員審核 ${repObj.reporter} 的檢舉/停用案件：證實違規嫌疑，對涉嫌人「${repObj.target}」實施永久系統停用封鎖！${repObj.surveyId ? `關聯問卷 [${repObj.surveyId}] 已同步停用。` : ""}`
        );
        alert(`🎉 已成功將帳號「${repObj.target}」永久封禁停用，目前無法登入系統！${repObj.surveyId ? `且其關聯問卷「${repObj.surveyTitle || repObj.surveyId}」已被同步停用關閉！` : ""}`);
      }
      repObj.status = "APPROVED_BAN";
    } else {
      addLog(
        "駁回開掛疑似通報",
        repObj.target,
        `管理員審核 ${repObj.reporter} 的舉報案件：查無實據，駁回該項開掛嫌疑不法通報。`
      );
      repObj.status = "DISMISSED";
      alert(`已成功駁回此無效通報。`);
    }

    localStorage.setItem("global_cheat_reports", JSON.stringify(list));
    setCheatReports(list);
  };

  // Modify individual's own username (姓名/帳號名稱) for all accounts
  const handlePersonalUsernameChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalUsernameMsg("");
    setPersonalUsernameError("");

    const cleanedName = newPersonalUsername.trim();
    if (!cleanedName) {
      setPersonalUsernameError("❌ 姓名 / 帳號名稱不能為空項目！");
      return;
    }

    if (cleanedName === currentUser.username) {
      setPersonalUsernameMsg("💡 姓名 / 帳號名稱與原有設定一致，無需更新。");
      return;
    }


    if (true) {
      const uList = { ...rbacUsers };
      if (uList[cleanedName]) {
        setPersonalUsernameError("❌ 該帳號名稱與現存的後台其他帳號重複，請換一個新名稱。");
        return;
      }

      const userRecord = uList[currentUser.username];
      if (userRecord) {
        userRecord.username = cleanedName;
        uList[cleanedName] = userRecord;
        delete uList[currentUser.username];

        // Save back users

        setRbacUsers(uList);

        // Notify parent application
        const updatedUser = { ...currentUser, username: cleanedName };
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser(updatedUser);
        }

        setPersonalUsernameMsg("🎉 恭喜！您已成功將後台登入與身分顯示名稱更名為：" + cleanedName);
        addLog(
          "更名操作",
          "修改自身帳號名稱",
          `用戶 ${currentUser.username} 線上自行變更其身分識別帳號名稱為 [${cleanedName}]。`
        );
      } else {
        // If super admin is not in local storage we can still allow them to rename session and insert
        const newRecord = {
          username: cleanedName,
          password: "123", // default fallback password
          role: currentUser.role,
          assignedTables: currentUser.assignedTables || []
        };
        uList[cleanedName] = newRecord;

        setRbacUsers(uList);

        const updatedUser = { ...currentUser, username: cleanedName };
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser(updatedUser);
        }
        setPersonalUsernameMsg("🎉 成功定義並初始化您的後台帳密對並完成更名為：" + cleanedName);
      }
    }
  };

  // Update own password (Server-side bcrypt verification & hashing)
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setProfileError("請填寫所有密碼欄位！");
      return;
    }

    if (newPassword !== confirmPassword) {
      setProfileError("新密碼與確認新密碼輸入不一致！");
      return;
    }

    try {
      const result = await changeUserPasswordApi(oldPassword, newPassword);
      if (!result.success) {
        setProfileError(result.message || "舊密碼驗證有誤，請重試！");
        return;
      }

      setProfileMsg("🎉 個人帳號密碼修改成功！");
      addLog(
        "更改帳號密碼",
        "後端加密密碼變更",
        `用戶 ${currentUser.username} 透過伺服器成功重設了個人登入密碼 (bcrypt 加密存入 SQL Server)。`
      );
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setProfileError(err?.message || "伺服器通訊失敗，請稍後再試！");
    }
  };

  // Allocate tables & stars inside Super Admin RBAC control module
  const handleSaveUserRBAC = (username: string, starVal: number, list: string[]) => {

    if (true) {
      const uList = { ...rbacUsers };
      if (uList[username]) {
        // Enforce maximum tables boundary rule per star
        // 1-star: max 1, 2-star: max 2, 3-star: max 3
        const truncatedList = list.slice(0, starVal);

        uList[username].starLevel = starVal as StarLevel;
        uList[username].assignedTables = truncatedList;

        setRbacUsers(uList);
        saveUserToApi(uList[username]).catch(() => {});
        saveUserToFirestore(username, uList[username]).catch(() => {});

        addLog(
          "變更操作權限",
          username + " 權限更新",
          `超級管理員更新了 ${username}：認證星級=${starVal}，授予表格：[${truncatedList.join(", ")}] (多餘指定被自動按星等截斷)`
        );
        alert(`已成功儲存用戶 ${username} 的RBAC控制設定！核發表格數已限制於星等上限。`);
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = newUsername.trim().toLowerCase();
    if (!cleanUser) {
      alert("⚠️ 請輸入想要建立的帳號名稱！");
      return;
    }
    if (!newUserPassword.trim()) {
      alert("⚠️ 請輸入存取密碼！");
      return;
    }

    if (rbacUsers[cleanUser] || cleanUser === "super_admin") {
      alert("⚠️ 該帳號名稱已存在，請使用其他名稱！");
      return;
    }

    const newUserPayload = {
      username: cleanUser,
      password: newUserPassword.trim(),
      role: newUserRole,
      starLevel: (newUserRole === UserRole.OPERATOR || newUserRole === UserRole.ANALYST) ? newUserStar : undefined,
      assignedTables: []
    };

    // 1. 新增帳號先 POST /api/users → SQL Server
    const ok = await saveUserToApi(newUserPayload);
    if (!ok) {
      alert("❌ 建立帳號失敗：無法寫入 SQL Server 資料庫，請檢查伺服器與資料庫連線！");
      return;
    }

    // 2. SQL Server 成功後再重新抓帳號清單 (GET /api/users)
    try {
      const refreshedUsers = await fetchUsersFromApi();
      if (refreshedUsers && typeof refreshedUsers === "object") {
        setRbacUsers(refreshedUsers);
      } else {
        setRbacUsers(prev => ({ ...prev, [cleanUser]: newUserPayload }));
      }
    } catch {
      setRbacUsers(prev => ({ ...prev, [cleanUser]: newUserPayload }));
    }

    // 3. 確保移除 localStorage.sub_users，絕不再作為正式資料鏈路
    try {
      localStorage.removeItem("sub_users");
    } catch {
      // ignore
    }

    // 4. 同步至 Firestore 災備副本 (非同步非阻塞)
    saveUserToFirestore(cleanUser, newUserPayload).catch(() => {});

    addLog(
      "新增系統帳號",
      "帳號授權: " + cleanUser,
      `管理者新增了全新後台帳號: ${cleanUser}，指派角色: ${newUserRole}${
        (newUserRole === UserRole.OPERATOR || newUserRole === UserRole.ANALYST) ? ` (${newUserStar}星)` : ""
      }，已持久化至 SQL Server。`
    );

    alert(`🎉 帳號 ${cleanUser} 創建成功並已寫入 SQL Server！`);
    setNewUsername("");
    setNewUserPassword("");
    setRbacSelectedUser(cleanUser); // Auto-select newly created user for convenience
  };

  // Add question to questionnaire creator
  const handleAddQuestionToTemp = () => {
    if (!tempQTitle.trim()) {
      alert("請補全題目標題！");
      return;
    }
    const q: Question = {
      id: `q-${Date.now()}`,
      title: tempQTitle,
      type: tempQType,
      required: tempQRequired,
      options: tempQOptions ? tempQOptions.split(",").map(o => o.trim()).filter(Boolean) : undefined
    };
    setNewSurveyQs(prev => [...prev, q]);
    setTempQTitle("");
    setTempQOptions("");
  };

  // Create full questionnaire
  const handleSaveNewSurvey = () => {
    if ((currentUser.role === UserRole.QUESTION_CREATOR || currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("creator_create", "出卷功能")) {
      return;
    }
    if (!newSurveyTitle.trim()) {
      alert("請填寫問卷標題！");
      return;
    }
    if (newSurveyQs.length === 0) {
      alert("問卷內必須至少包含一題項目設定！");
      return;
    }

    const nSurvey: Questionnaire = {
      id: `survey-${Date.now().toString().slice(-6)}`,
      title: newSurveyTitle,
      description: newSurveyDesc,
      isActive: true,
      startTime: newSurveyStart || undefined,
      endTime: newSurveyEnd || undefined,
      passwordRequired: newSurveyPwReq,
      password: newSurveyPwReq ? newSurveyPw : undefined,
      querySystems: [],
      emailNotificationEnabled: newSurveyEmail,
      questions: newSurveyQs,
      distributedToAdmins: newSurveyDistributedToAdmins,
      createdBy: currentUser.username
    };

    const updated = [...questionnaires, nSurvey];
    onUpdateQuestionnaires(updated);

    addLog(
      "新增問卷",
      nSurvey.title,
      `新增問卷 ID: ${nSurvey.id}，下發至系統管理員=${nSurvey.distributedToAdmins ? "是" : "否"}`
    );

    // reset
    setNewSurveyTitle("");
    setNewSurveyDesc("");
    setNewSurveyPwReq(false);
    setNewSurveyPw("");
    setNewSurveyEmail(false);
    setNewSurveyStart("");
    setNewSurveyEnd("");
    setNewSurveyQs([]);
    setNewSurveyDistributedToAdmins(true);
    setIsCreatingSurvey(false);
    alert("問卷成功發布！");
  };

  // Delete questionnaire
  const handleDeleteSurvey = (id: string, sTitle: string) => {
    if ((currentUser.role === UserRole.QUESTION_CREATOR || currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("creator_delete", "刪除功能")) {
      return;
    }
    if (confirm(`確定要刪除問卷「${sTitle}」與其所有的填答與回覆數據嗎？此動作將立即生效且無法復原。`)) {
      const updatedS = questionnaires.filter(q => q.id !== id);
      onUpdateQuestionnaires(updatedS);

      // Clean answers linked to it
      const updatedR = responses.filter(r => r.surveyId !== id);
      onUpdateResponses(updatedR);

      addLog(
        "刪除問卷數據",
        sTitle,
        `移除問卷、清除所有旗下回收填寫記錄。問卷編號: ${id}`
      );
      alert("問卷已徹底刪除。");
    }
  };

  const handleMoveSurvey = (id: string, direction: "up" | "down") => {
    const index = questionnaires.findIndex(q => q.id === id);
    if (index === -1) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questionnaires.length) return;

    const list = [...questionnaires];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    onUpdateQuestionnaires(list);

    addLog(
      "調整問卷位置",
      `移動問卷位置：${temp.title}`,
      `超級管理員將問卷【${temp.title}】在列表中${direction === "up" ? "向上" : "向下"}移動了一位。`
    );
  };

  // Add query subystem to a survey
  const handleAddQuerySubsystem = (surveyId: string) => {
    if (!configNewQueryName.trim()) {
      alert("請輸入子查詢系統名稱！");
      return;
    }

    const newSystem: QuerySystemConfig = {
      id: `sub-query-${Date.now()}`,
      name: configNewQueryName,
      passwordRequired: configNewQueryPwReq,
      password: configNewQueryPwReq ? configNewQueryPw : undefined,
      editableQuestionIds: configNewQueryEditable
    };

    const updated = questionnaires.map(q => {
      if (q.id === surveyId) {
        return {
          ...q,
          querySystems: [...q.querySystems, newSystem]
        };
      }
      return q;
    });

    onUpdateQuestionnaires(updated);
    addLog(
      "指派子查詢系統",
      queryConfigName(id => q => q.id === surveyId, newSystem.name),
      `為問卷「${surveyId}」新建獨立查詢通路：${newSystem.name}，可更正題目包括 [${newSystem.editableQuestionIds.join(", ")}]`
    );

    // reset
    setConfigNewQueryName("");
    setConfigNewQueryPwReq(false);
    setConfigNewQueryPw("");
    setConfigNewQueryEditable([]);
    alert("獨立子查詢系統建置成功！");
  };

  const queryConfigName = (filterFn: any, name: string): string => {
    return name;
  };

  // Delete/Remove query subsystem
  const handleDeleteQuerySubsystem = (surveyId: string, queryId: string, qName: string) => {
    if (currentUser.role === UserRole.QUESTION_CREATOR && currentUser.starLevel < 3) {
      alert("⚠️ 您的出題人等階尚未達到 3 階，無權下線刪除子查詢系統！");
      return;
    }
    if (confirm(`確定要移除「${qName}」子查詢系統嗎？`)) {
      const updated = questionnaires.map(q => {
        if (q.id === surveyId) {
          return {
            ...q,
            querySystems: q.querySystems.filter(qs => qs.id !== queryId)
          };
        }
        return q;
      });
      onUpdateQuestionnaires(updated);
      addLog(
        "移除子查詢系統",
        qName,
        `自問卷 ${surveyId} 卸載此查詢通路。`
      );
    }
  };

  // Synchronize rbac rename input
  useEffect(() => {
    if (rbacSelectedUser) {
      setRbacRenameInput(rbacSelectedUser);
    } else {
      setRbacRenameInput("");
    }
  }, [rbacSelectedUser]);

  const handleRenameUser = () => {
    const cleanNewName = rbacRenameInput.trim().toLowerCase();
    if (!cleanNewName) {
      alert("⚠️ 請輸入想要修改的新帳號名稱！");
      return;
    }
    if (cleanNewName === rbacSelectedUser) {
      alert("⚠️ 新帳號名稱與舊名稱一致，未作修改。");
      return;
    }
    if (cleanNewName === "super_admin" || rbacUsers[cleanNewName]) {
      alert("⚠️ 此帳號名稱已被佔用，請換一個！");
      return;
    }

    const uList = { ...rbacUsers };
    const userToMove = uList[rbacSelectedUser];
    if (!userToMove) return;

    if (userToMove.role === UserRole.WEBMASTER && currentUser.role !== UserRole.WEBMASTER) {
      alert("⚠️ 系統主控站主帳號受全域最高特權保護，不可變更名稱！");
      return;
    }
    if (currentUser.role === UserRole.SUPER_ADMIN && userToMove.role === UserRole.SUPER_ADMIN) {
      alert("⚠️ 權限不足：超級管理員不可變更同級（超級管理員）帳號之名稱！");
      return;
    }

    // Remove old property, add new property
    delete uList[rbacSelectedUser];
    uList[cleanNewName] = {
      ...userToMove,
      username: cleanNewName
    };


    setRbacUsers(uList);

    // Also, we must update all promotions list matching the old username
    const updatedPromotions = promotions.map(p => {
      if (p.username === rbacSelectedUser) {
        return { ...p, username: cleanNewName };
      }
      return p;
    });
    onUpdatePromotions(updatedPromotions);

    addLog(
      "修改系統帳號名稱",
      `更改帳號：${rbacSelectedUser} → ${cleanNewName}`,
      `超級管理員將帳號名稱從 ${rbacSelectedUser} 變更為 ${cleanNewName}。`
    );

    alert(`🎉 帳號名稱已成功變更為 ${cleanNewName}！`);
    setRbacSelectedUser(cleanNewName); // Switch selection to new name!
  };

  const handleDeleteSubUser = async (targetUser: string) => {
    if (!targetUser) return;
    const targetLower = targetUser.toLowerCase();
    const targetObj = rbacUsers[targetUser] || rbacUsers[targetLower];

    if (targetLower === "webmaster" || (targetObj && targetObj.role === UserRole.WEBMASTER)) {
      alert("⚠️ 系統主控站主帳號受全域最高安全特權保護，不可被刪除！");
      return;
    }
    if (currentUser.role === UserRole.SUPER_ADMIN && targetObj?.role === UserRole.SUPER_ADMIN) {
      alert("⚠️ 權限不足：超級管理員不可刪除同級（超級管理員）帳號！僅系統站主有權處置。");
      return;
    }
    if (targetLower === "super_admin" && currentUser.role !== UserRole.WEBMASTER) {
      alert("⚠️ 超級管理員核心預設帳號不可被非系統站主刪除！");
      return;
    }
    if (currentUser.role === UserRole.SYSTEM_ADMIN && targetObj && [UserRole.WEBMASTER, UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN].includes(targetObj.role)) {
      alert("⚠️ 權限不足：系統管理員僅可管理與刪除一般編制人員（操作員、分析員、出題人）與市民帳號！");
      return;
    }

    const confirmDelete = window.confirm(`⚠️ 確定要永久刪除帳號【${targetUser}】嗎？此動作將同步自 SQL Server 資料庫與系統實體完全清除，且無法復原！`);
    if (!confirmDelete) return;

    // 1. Authoritative Backend SQL Server deletion
    const apiResult = await deleteUserFromApi(targetUser);
    if (!apiResult.success) {
      alert(`⚠️ 資料庫刪除失敗：${apiResult.message || "未知伺服器錯誤"}`);
      return;
    }

    // 2. Disaster Recovery / Local Storage purge
    await deleteUserFromFirestore(targetUser);

    const uList = { ...rbacUsers };
    delete uList[targetUser];
    delete uList[targetLower];

    setRbacUsers(uList);

    // Also update promotions list by deleting pending/or all promotions matching username
    const updatedPromotions = promotions.filter(p => p.username !== targetUser && p.username !== targetLower);
    onUpdatePromotions(updatedPromotions);

    addLog(
      "刪除下屬系統帳號",
      `刪除帳號：${targetUser}`,
      `管理層【${currentUser.username}】永久自 SQL Server 及全系統刪除了編制人員【${targetUser}】之帳號。`
    );

    alert(`🎉 帳號【${targetUser}】已自 SQL Server 資料庫永久刪除！`);
    setRbacSelectedUser(""); // Reset selection
  };

  const [mutedPromotions, setMutedPromotions] = useState<string[]>(() => {
    const stored = localStorage.getItem("muted_promotions");
    return stored ? JSON.parse(stored) : [];
  });

  const handleToggleMutePromo = (promoId: string) => {
    const updated = mutedPromotions.includes(promoId)
      ? mutedPromotions.filter(id => id !== promoId)
      : [...mutedPromotions, promoId];
    setMutedPromotions(updated);
    localStorage.setItem("muted_promotions", JSON.stringify(updated));
    
    const isMuted = updated.includes(promoId);
    addLog(
      "消息免打擾調整",
      `案件編號: ${promoId}`,
      `將特定職編晉升申請案件 ID ${promoId} 設定免打擾為：${isMuted ? "開啟" : "關閉"}`
    );
  };

  const handleToggleBanUser = (targetUser: string) => {
    if (!targetUser) return;
    if (targetUser === "webmaster" || (rbacUsers[targetUser] && rbacUsers[targetUser].role === UserRole.WEBMASTER)) {
      alert("⚠️ 系統主控站主帳號受全域最高特權保護，不可被封禁！");
      return;
    }
    if (currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[targetUser]?.role === UserRole.SUPER_ADMIN) {
      alert("⚠️ 權限不足：超級管理員不可封禁同級（超級管理員）帳號！僅系統站主有權處置。");
      return;
    }
    if (targetUser === currentUser.username) {
      alert("⚠️ 為了維護當前連線，您不可以直接封禁非其他作用中的當前自我帳戶！");
      return;
    }

    const uList = { ...rbacUsers };
    if (!uList[targetUser]) return;

    const currentBanState = !!uList[targetUser].banned;
    uList[targetUser].banned = !currentBanState;
    if (uList[targetUser].banned) {
      uList[targetUser].bannedBy = currentUser.role;
      uList[targetUser].banType = "MANUAL";
      if (uList[targetUser].role === UserRole.QUESTION_CREATOR) {
        uList[targetUser].bannedReason = "SURVEY_ISSUE";
      } else {
        uList[targetUser].bannedReason = "CHEAT";
      }
    } else {
      delete uList[targetUser].bannedBy;
      delete uList[targetUser].bannedReason;
      delete uList[targetUser].banType;
    }


    setRbacUsers(uList);

    addLog(
      uList[targetUser].banned ? "封禁使用者帳號" : "解除封禁使用者",
      `帳號屬性異動：${targetUser}`,
      `管理者將帳號【${targetUser}】的連線存取狀態設為【${uList[targetUser].banned ? "封禁停用" : "正常啟用"}】。`
    );

    alert(`🎉 帳號【${targetUser}】已儲存變更為【${uList[targetUser].banned ? "封禁停用" : "正常啟用"}】狀態！`);
  };

  const handleUpdateUserPassword = async (targetUsername: string, newPasswordVal: string) => {
    if (!newPasswordVal.trim()) {
      alert("⚠️ 密碼不可為空！");
      return;
    }
    const uList = { ...rbacUsers };
    if (!uList[targetUsername]) return;

    // Security check: Super Admin cannot reset passwords of other Super Admins or Webmaster
    if (currentUser.role === UserRole.SUPER_ADMIN && uList[targetUsername].role === UserRole.SUPER_ADMIN && targetUsername !== currentUser.username) {
      alert("⚠️ 權限不足：同級保護機制生效，超級管理員不可修改同級超級管理員之密碼！僅系統站主可重設。");
      return;
    }
    if (uList[targetUsername].role === UserRole.WEBMASTER && currentUser.role !== UserRole.WEBMASTER) {
      alert("⚠️ 權限不足：系統站主擁有全域最高特權，任何其他管理員皆不可修改系統站主密碼！");
      return;
    }

    try {
      const res = await adminResetUserPasswordApi(targetUsername, newPasswordVal.trim());
      if (!res.success) {
        alert(`❌ 重設密碼失敗：${res.message}`);
        return;
      }
      
      setVisiblePasswords(prev => ({
        ...prev,
        [targetUsername]: newPasswordVal.trim()
      }));

      setSysAccountEditingUser(null);
      setSysAccountTempPassword("");

      addLog(
        "管理者重設密碼",
        `管理對象：${targetUsername}`,
        `管理員【${currentUser.username}】透過後端重設了使用者【${targetUsername}】的密碼 (bcrypt 加密存儲)。`
      );
      alert(`🎉 帳號 ${targetUsername} 的密碼已成功重新設定！`);
    } catch (err: any) {
      alert(`❌ 重設密碼發生錯誤：${err?.message || "伺服器異常"}`);
    }
  };


  const handleToggleAllPasswords = async () => {
    if (showAllPasswords) {
      setShowAllPasswords(false);
    } else {
      setShowAllPasswords(true);
      // Fetch all if not already fetched
      const usersToFetch = Object.keys(rbacUsers).filter(u => !visiblePasswords[u]);
      usersToFetch.forEach(async (uname) => {
        setPasswordLoading(prev => ({ ...prev, [uname]: true }));
        try {
          const res = await getUserPasswordApi(uname);
          if (res.success && res.password) {
            setVisiblePasswords(prev => ({ ...prev, [uname]: res.password }));
          }
        } finally {
          setPasswordLoading(prev => ({ ...prev, [uname]: false }));
        }
      });
    }
  };

  const handleToggleSinglePassword = async (uname: string) => {
    if (visiblePasswords[uname]) {
      const newMap = { ...visiblePasswords };
      delete newMap[uname];
      setVisiblePasswords(newMap);
    } else {
      setPasswordLoading(prev => ({ ...prev, [uname]: true }));
      try {
        const res = await getUserPasswordApi(uname);
        if (res.success && res.password) {
          setVisiblePasswords(prev => ({ ...prev, [uname]: res.password }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setPasswordLoading(prev => ({ ...prev, [uname]: false }));
      }
    }
  };

  const handleEditPasswordStart = (uname: string) => {
    setSysAccountTempPassword("");
    setSysAccountEditingUser(uname);
  };

  const handleUpdateUserRole = (targetUsername: string, newRole: UserRole) => {
    const uList = { ...rbacUsers };
    if (!uList[targetUsername]) return;

    const targetUser = uList[targetUsername];
    const oldRole = targetUser.role;

    // 1. Webmaster immunity: No one can demote or alter the role of the Webmaster
    if (oldRole === UserRole.WEBMASTER && currentUser.role !== UserRole.WEBMASTER) {
      alert("⚠️ 權限不足：系統站主擁有最高全權地位，任何其他角色皆不可調整或降級系統站主身分！");
      return;
    }

    // 2. Super Admin peer demotion protection: Super Admins cannot demote or alter other Super Admins
    if (currentUser.role === UserRole.SUPER_ADMIN && oldRole === UserRole.SUPER_ADMIN) {
      alert("⚠️ 權限不足：超級管理員不可調整或降級同級（超級管理員）帳號之權限！僅系統站主可調派同級超級管理員。");
      return;
    }

    // 3. Super Admin promoting someone to Webmaster: Super Admin cannot create Webmasters
    if (currentUser.role === UserRole.SUPER_ADMIN && newRole === UserRole.WEBMASTER) {
      alert("⚠️ 權限不足：僅現任系統站主可指派站主身分！");
      return;
    }

    // 4. Super Admin promoting someone to Super Admin: Only Webmaster can create Super Admins
    if (currentUser.role === UserRole.SUPER_ADMIN && newRole === UserRole.SUPER_ADMIN) {
      alert("⚠️ 權限不足：僅系統站主有權指派超級管理員！");
      return;
    }

    uList[targetUsername].role = newRole;

    // reset or setup stars/assignedTables correctly
    if (
      newRole === UserRole.SYSTEM_ADMIN ||
      newRole === UserRole.SUPER_ADMIN ||
      newRole === UserRole.WEBMASTER ||
      newRole === UserRole.QUESTION_CREATOR ||
      newRole === UserRole.RESPONDENT
    ) {
      uList[targetUsername].assignedTables = [];
      if (
        newRole === UserRole.SYSTEM_ADMIN ||
        newRole === UserRole.SUPER_ADMIN ||
        newRole === UserRole.WEBMASTER
      ) {
        uList[targetUsername].starLevel = undefined;
      } else {
        uList[targetUsername].starLevel = uList[targetUsername].starLevel || 1;
      }
    } else {
      uList[targetUsername].starLevel = uList[targetUsername].starLevel || 1;
      uList[targetUsername].assignedTables = uList[targetUsername].assignedTables || [];
    }


    setRbacUsers(uList);

    if (targetUsername === currentUser.username) {
      const updated = { 
        ...currentUser, 
        role: newRole, 
        starLevel: uList[targetUsername].starLevel, 
        assignedTables: uList[targetUsername].assignedTables 
      };
      onUpdateCurrentUser(updated);
      localStorage.setItem("sub_logged_user", JSON.stringify(updated));
    }

    const performerTitle = currentUser.role === UserRole.WEBMASTER ? "系統站主" : "超級管理員";

    addLog(
      `${performerTitle}調整身分職級`,
      `管理角色異動：${targetUsername}`,
      `${performerTitle}將帳號【${targetUsername}】的角色從 [${oldRole}] 調整為 [${newRole}]。`
    );
    alert(`🎉 帳號 ${targetUsername} 的身分角色已成功調升/調整為【${
      newRole === UserRole.SUPER_ADMIN ? "超級管理員" :
      newRole === UserRole.SYSTEM_ADMIN ? "系統管理員" :
      newRole === UserRole.OPERATOR ? "操作員" :
      newRole === UserRole.ANALYST ? "分析員" :
      newRole === UserRole.QUESTION_CREATOR ? "出題人" : "答題人"
    }】！`);
  };

  const handleUpdateUserStar = (targetUsername: string, newStar: number) => {
    if ((currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("distribute_questionnaires", "發配問卷功能")) {
      return;
    }
    const uList = { ...rbacUsers };
    if (!uList[targetUsername]) return;

    uList[targetUsername].starLevel = newStar;

    // Keep tables assigned within the bound of star level
    let currentAlloc = uList[targetUsername].assignedTables || [];
    if (currentAlloc.length > newStar) {
      currentAlloc = currentAlloc.slice(0, newStar);
      uList[targetUsername].assignedTables = currentAlloc;
    }


    setRbacUsers(uList);

    if (targetUsername === currentUser.username) {
      const updated = { 
        ...currentUser, 
        starLevel: newStar as StarLevel, 
        assignedTables: uList[targetUsername].assignedTables 
      };
      onUpdateCurrentUser(updated);
      localStorage.setItem("sub_logged_user", JSON.stringify(updated));
    }

    addLog(
      "站主異動授權星等",
      `星等異動：${targetUsername}`,
      `系統站主調整【${targetUsername}】的認證星階為 ${newStar} 星，最多指派問卷上限設為 ${newStar}。`
    );
    alert(`🎉 帳號【${targetUsername}】已成功調整為 ${newStar} 星！`);
  };

  const handleUpdateRespondentPoints = (targetUsername: string, points: number) => {
    const uList = { ...rbacUsers };
    if (!uList[targetUsername]) return;

    uList[targetUsername].respondentPoints = points;
    const rankInfo = calculateRespondentRank(points);
    uList[targetUsername].starLevel = rankInfo.tier;


    setRbacUsers(uList);

    if (targetUsername === currentUser.username) {
      const updated = { 
        ...currentUser, 
        respondentPoints: points, 
        starLevel: rankInfo.tier as StarLevel 
      };
      onUpdateCurrentUser(updated);
      localStorage.setItem("sub_logged_user", JSON.stringify(updated));
    }

    addLog(
      "站主調整答題人積分等階",
      `積分調整：${targetUsername}`,
      `系統站主將答題人【${targetUsername}】的積分調升至 ${points} 點，使其等階躍升為【${rankInfo.tierName} (${rankInfo.subRank})】。`
    );
    alert(`🎉 答題人【${targetUsername}】已儲存調整！\n等階目前為：${rankInfo.tierName} (${rankInfo.subRank})，當前積分：${points} 分！`);
  };

  const handleToggleUserTable = (targetUsername: string, surveyId: string) => {
    if ((currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("distribute_questionnaires", "發配問卷功能")) {
      return;
    }
    const uList = { ...rbacUsers };
    if (!uList[targetUsername]) return;

    const currentTables: string[] = uList[targetUsername].assignedTables || [];
    const maxAllowed = uList[targetUsername].starLevel || 1;
    const isCurrentlyAssigned = currentTables.includes(surveyId);

    let updatedTables = [...currentTables];
    if (isCurrentlyAssigned) {
      updatedTables = updatedTables.filter(id => id !== surveyId);
    } else {
      if (updatedTables.length >= maxAllowed) {
        alert(`⚠️ 帳號【${targetUsername}】當前最高核給星等為 ${maxAllowed} 星，最多只能對應指派 ${maxAllowed} 張表單！`);
        return;
      }
      updatedTables.push(surveyId);
    }

    uList[targetUsername].assignedTables = updatedTables;

    setRbacUsers(uList);

    addLog(
      "站主調派管轄問卷",
      `指派對象：${targetUsername}`,
      `系統站主變更了【${targetUsername}】指派問卷列表：[${updatedTables.join(", ")}]。`
    );
  };

  const handleDeleteOwnAccount = async () => {
    if (currentUser.role === UserRole.WEBMASTER || currentUser.username === "webmaster") {
      alert("⚠️ 系統站主具有全域唯一終極支配權益，為了確保主機安全，站主帳號不允許自毀！");
      return;
    }
    if (currentUser.username === "super_admin" || currentUser.role === UserRole.SUPER_ADMIN) {
      alert("⚠️ 超級管理員帳號是預設管理帳戶，為安全起見不可刪除！");
      return;
    }

    const confirmDelete = window.confirm(`⚠️ 【危險警報】您確定要註銷並永久刪除您自己的帳號【${currentUser.username}】嗎？此操作將使您立刻被登出、移出系統，並且此決定完全無法還原！`);
    if (!confirmDelete) return;

    // Call authoritative API
    const apiResult = await deleteUserFromApi(currentUser.username);
    if (!apiResult.success) {
      alert(`⚠️ 註銷失敗：${apiResult.message || "伺服器拒絕註銷請求"}`);
      return;
    }

    // Call disaster recovery
    await deleteUserFromFirestore(currentUser.username);

    // Load sub-users and delete self

    let uList = { ...rbacUsers };
    
    delete uList[currentUser.username];
    delete uList[currentUser.username.toLowerCase()];


    // Update promotions list to clear self requests
    const updatedPromotions = promotions.filter(p => p.username !== currentUser.username);
    onUpdatePromotions(updatedPromotions);

    // Add log before logging out
    addLog(
      "使用者註銷自身帳號",
      `帳號自毀：${currentUser.username}`,
      `用戶 ${currentUser.username} 註銷並永久刪除了自己的帳號。`
    );

    alert("🎉 您的帳號已成功註銷並自系統永久移除！期待與您的下次相見。");
    onLogout();
  };

  // Save survey modifications and custom questions inside editor
  const handleSaveSurveyEditor = () => {
    if ((currentUser.role === UserRole.QUESTION_CREATOR || currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("creator_edit", "編輯功能")) {
      return;
    }
    if (currentUser.role === UserRole.OPERATOR && (!checkFeatureAccess("operator_all_operations", "問卷整體操作權限") || !checkFeatureAccess(`operator_operate_${editingSurveyId}`, "問卷操作功能"))) {
      return;
    }
    if (!editSurveyTitle.trim()) {
      alert("⚠️ 請輸入問卷標題！");
      return;
    }
    if (editSurveyQuestions.length === 0) {
      alert("⚠️ 問卷至少需要包含一個填寫欄位/題目！");
      return;
    }

    const updated = questionnaires.map(q => {
      if (q.id === editingSurveyId) {
        return {
          ...q,
          title: editSurveyTitle,
          description: editSurveyDesc,
          startTime: editSurveyStart || undefined,
          endTime: editSurveyEnd || undefined,
          passwordRequired: editSurveyPwReq,
          password: editSurveyPwReq ? editSurveyPw : undefined,
          emailNotificationEnabled: editSurveyEmail,
          questions: editSurveyQuestions,
          distributedToAdmins: editSurveyDistributedToAdmins
        };
      }
      return q;
    });

    onUpdateQuestionnaires(updated);
    addLog(
      "更新問卷設定",
      editSurveyTitle,
      `系統管理員編輯了問卷 ${editingSurveyId} 的基本設定，自定義並修改了題目與填寫框規格。`
    );
    alert("🎉 問卷設定、填寫規格與題目已全部儲存同步！");
    setEditingSurveyId(null);
  };

  // Add question inside Questionnaire configuration editor
  const handleEditorAddQuestion = () => {
    if (!editTempQTitle.trim()) {
      alert("⚠️ 請輸入題目敘述！");
      return;
    }

    let searchArr: string[] = [];
    if (editTempQType === "SINGLE_CHOICE" || editTempQType === "MULTI_CHOICE") {
      if (!editTempQOptions.trim()) {
        alert("⚠️ 單選或多選題目必須輸入選項內容！");
        return;
      }
      searchArr = editTempQOptions.split(",").map(s => s.trim()).filter(Boolean);
    }

    const newQ: Question = {
      id: `q-${Date.now()}`,
      title: editTempQTitle,
      type: editTempQType,
      options: searchArr.length > 0 ? searchArr : undefined,
      required: editTempQRequired
    };

    setEditSurveyQuestions(prev => [...prev, newQ]);
    setEditTempQTitle("");
    setEditTempQOptions("");
  };

  // Delete question inside editor
  const handleEditorRemoveQuestion = (qId: string) => {
    setEditSurveyQuestions(prev => prev.filter(q => q.id !== qId));
    if (editNewQuerySearchQId === qId) {
      setEditNewQuerySearchQId("");
    }
  };

  // Re-order questions
  const handleEditorMoveQuestion = (index: number, direction: "up" | "down") => {
    const list = [...editSurveyQuestions];
    if (direction === "up" && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === "down" && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    }
    setEditSurveyQuestions(list);
  };

  // Create or Modify sub-query system inside questionnaire setting editor
  const handleEditorAddQuerySubsystem = () => {
    if (!editNewQueryName.trim()) {
      alert("⚠️ 請輸入子查詢系統名稱！");
      return;
    }

    // MODIFICATION MODE (修改既有子查詢系統)
    if (editingSubQueryId) {
      const updated = questionnaires.map(q => {
        if (q.id === editingSurveyId) {
          return {
            ...q,
            querySystems: q.querySystems.map(sys => {
              if (sys.id === editingSubQueryId) {
                return {
                  ...sys,
                  name: editNewQueryName,
                  passwordRequired: editNewQueryPwReq,
                  password: editNewQueryPwReq ? editNewQueryPw : undefined,
                  editableQuestionIds: editNewQueryEditable,
                  searchQuestionId: editNewQuerySearchQId || undefined,
                  hideInHall: editNewQueryHideInHall
                };
              }
              return sys;
            })
          };
        }
        return q;
      });

      onUpdateQuestionnaires(updated);

      addLog(
        "修改子查詢系統",
        editNewQueryName,
        `在編輯器中更新問卷「${editingSurveyId}」之子查詢通道：${editNewQueryName}，大廳路徑：${editNewQueryHideInHall ? "已隱藏 (不在大廳顯示)" : "公開 (大廳顯示)"}`
      );

      // Reset
      setEditingSubQueryId(null);
      setEditNewQueryName("");
      setEditNewQueryEditable([]);
      setEditNewQueryPwReq(false);
      setEditNewQueryPw("");
      setEditNewQuerySearchQId("");
      setEditNewQueryHideInHall(false);

      alert("🎉 子查詢系統設定已成功更新！");
      return;
    }

    // CREATION MODE (新增子查詢系統)
    const newSys: QuerySystemConfig = {
      id: `sub-query-${Date.now()}`,
      name: editNewQueryName,
      passwordRequired: editNewQueryPwReq,
      password: editNewQueryPwReq ? editNewQueryPw : undefined,
      editableQuestionIds: editNewQueryEditable,
      searchQuestionId: editNewQuerySearchQId || undefined,
      hideInHall: editNewQueryHideInHall
    };

    const updated = questionnaires.map(q => {
      if (q.id === editingSurveyId) {
        return {
          ...q,
          querySystems: [...q.querySystems, newSys]
        };
      }
      return q;
    });

    onUpdateQuestionnaires(updated);

    addLog(
      "指派子查詢系統",
      editNewQueryName,
      `在編輯器中為問卷「${editingSurveyId}」新增查詢通路：${editNewQueryName}，自訂搜尋屬性為：${editNewQuerySearchQId ? "指定問卷題目" : "預設填寫編號"}，大廳路徑：${editNewQueryHideInHall ? "已隱藏" : "公開顯示"}`
    );

    // Reset subquery fields
    setEditNewQueryName("");
    setEditNewQueryEditable([]);
    setEditNewQueryPwReq(false);
    setEditNewQueryPw("");
    setEditNewQuerySearchQId("");
    setEditNewQueryHideInHall(false);

    alert("🎉 子查詢系統通道已成功建立，並即時合併於本問卷設定中！");
  };

  // Start editing existing sub-query
  const handleStartEditSubQuery = (sys: QuerySystemConfig) => {
    setEditingSubQueryId(sys.id);
    setEditNewQueryName(sys.name);
    setEditNewQueryEditable(sys.editableQuestionIds || []);
    setEditNewQueryPwReq(Boolean(sys.passwordRequired));
    setEditNewQueryPw(sys.password || "");
    setEditNewQuerySearchQId(sys.searchQuestionId || "");
    setEditNewQueryHideInHall(Boolean(sys.hideInHall));
  };

  // Cancel editing sub-query
  const handleCancelEditSubQuery = () => {
    setEditingSubQueryId(null);
    setEditNewQueryName("");
    setEditNewQueryEditable([]);
    setEditNewQueryPwReq(false);
    setEditNewQueryPw("");
    setEditNewQuerySearchQId("");
    setEditNewQueryHideInHall(false);
  };

  // Fast toggle hideInHall on existing sub-query
  const handleToggleSubQueryHideInHall = (surveyId: string, queryId: string) => {
    let targetSysName = "";
    let nextHideState = false;
    const updated = questionnaires.map(q => {
      if (q.id === surveyId) {
        return {
          ...q,
          querySystems: q.querySystems.map(sys => {
            if (sys.id === queryId) {
              targetSysName = sys.name;
              nextHideState = !sys.hideInHall;
              return {
                ...sys,
                hideInHall: nextHideState
              };
            }
            return sys;
          })
        };
      }
      return q;
    });

    onUpdateQuestionnaires(updated);
    addLog(
      "切換子查詢大廳路徑",
      targetSysName,
      `將問卷「${surveyId}」之子查詢通路「${targetSysName}」大廳路徑切換為：${nextHideState ? "已隱藏 (不在大廳顯示)" : "公開 (大廳顯示)"}`
    );
  };

  // Edit Response Save Modal
  const handleOpenEditResponseModal = (resp: SurveyResponse) => {
    if (currentUser.role === UserRole.OPERATOR) {
      if (!checkFeatureAccess("operator_all_operations", "問卷整體操作權限")) return;
      if (!checkFeatureAccess(`operator_operate_${resp.surveyId}`, `問卷操作權限 (${resp.surveyId})`)) return;
    }
    setEditingResponse(resp);
    setEditingAnswers({ ...resp.answers });
    setEditingMsg("");
  };

  const handleSaveModalResponse = () => {
    if (!editingResponse) return;
    if (currentUser.role === UserRole.OPERATOR) {
      if (!checkFeatureAccess("operator_all_operations", "問卷整體操作權限")) return;
      if (!checkFeatureAccess(`operator_operate_${editingResponse.surveyId}`, `問卷操作權限 (${editingResponse.surveyId})`)) return;
    }

    const updated = responses.map(r => {
      if (r.id === editingResponse.id) {
        return {
          ...r,
          answers: {
            ...r.answers,
            ...editingAnswers
          }
        };
      }
      return r;
    });

    onUpdateResponses(updated);
    addLog(
      "修改問卷答案",
      `填寫卷編號: ${editingResponse.id}`,
      `手動覆寫並儲存此一在資料庫中的問卷答案紀錄，對應問卷編號=${editingResponse.surveyId}`
    );
    setEditingMsg("✅ 答案已成功線上更正改寫！");
    setTimeout(() => {
      setEditingResponse(null);
    }, 1000);
  };

  // Delete Response individually (For operator and administrators)
  const handleDeleteResponse = (respId: string, surveyTitle: string, surveyId?: string) => {
    if (currentUser.role === UserRole.OPERATOR) {
      if (!checkFeatureAccess("operator_all_operations", "問卷整體操作權限")) return;
      if (surveyId && !checkFeatureAccess(`operator_operate_${surveyId}`, `問卷操作權限 (${surveyId})`)) return;
    }
    if (confirm(`確定從資料庫中將此筆答案數據記錄 (${respId}) 刪除嗎？`)) {
      const updated = responses.filter(r => r.id !== respId);
      onUpdateResponses(updated);
      addLog(
        "刪除問卷數據",
        `單筆填寫紀錄 ${respId}`,
        `刪除此筆記錄。所屬問卷為: ${surveyTitle}`
      );
      alert("單筆填答數據已徹底刪除！");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto my-4 space-y-6" id="dashboard-main-container">
      {/* Upper Brand Info Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-slate-900 text-amber-400 rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">問卷統計與反饋稽核中心</h1>
            <p className="text-slate-500 text-xs mt-1">
              當前登入身分：
              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                {currentUser.username} ({
                  currentUser.role === UserRole.WEBMASTER ? "系統站主 👑" :
                  currentUser.role === UserRole.SUPER_ADMIN ? "超級管理員 👑" :
                  currentUser.role === UserRole.SYSTEM_ADMIN ? "系統管理員 🛡️" :
                  currentUser.role === UserRole.OPERATOR ? `操作員 ${currentUser.starLevel}星 ⭐` :
                  currentUser.role === UserRole.ANALYST ? `分析員 ${currentUser.starLevel}星 📊` :
                  currentUser.role === UserRole.QUESTION_CREATOR ? `出題人 ${currentUser.starLevel || 1}階 📝` :
                  `答題人 ${currentUser.starLevel || 1}階 ✍️`
                })
              </span>
            </p>
          </div>
        </div>

        {/* Action Header bar */}
        <div className="flex flex-col space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {canApplyPromotion() && (
              <button
                id="dash-apply-upgrade-btn"
                onClick={() => {
                  if (!showPromoSelect) {
                    if (currentUser.role === UserRole.QUESTION_CREATOR) {
                      setPromoTargetRole(UserRole.QUESTION_CREATOR);
                      setPromoTargetStar(Math.min((currentUser.starLevel || 1) + 1, 3));
                    } else {
                      setPromoTargetRole(UserRole.OPERATOR);
                      setPromoTargetStar(1);
                    }
                  }
                  setShowPromoSelect(prev => !prev);
                }}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-100 flex items-center space-x-1.5 transition-all cursor-pointer cursor-emerald"
              >
                <ArrowUpCircle className="w-4 h-4 animate-bounce" />
                <span>{showPromoSelect ? "⚙️ 關閉申請設定欄" : "向上級申請晉階級"}</span>
              </button>
            )}

            <button
              id="dash-logout-btn"
              onClick={onLogout}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-100 transition-all cursor-pointer"
            >
              登出管理系統
            </button>
          </div>

          {/* Subordinate promotion destination selector */}
          {canApplyPromotion() && showPromoSelect && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl w-full max-w-lg text-left space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-indigo-100/50 pb-1.5">
                <span className="text-xs font-bold text-indigo-900 flex items-center space-x-1">
                  <ArrowUpCircle className="w-4 h-4 text-indigo-600" />
                  <span>請選取期望晉級的「職稱角色與核發星等」</span>
                </span>
                <button onClick={() => setShowPromoSelect(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold select-none cursor-pointer">✕ 關閉</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">期望晉升職位</label>
                  {currentUser.role === UserRole.QUESTION_CREATOR ? (
                    <select
                      value={UserRole.QUESTION_CREATOR}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-sans text-slate-500 font-semibold cursor-not-allowed"
                    >
                      <option value={UserRole.QUESTION_CREATOR}>出題人 (Question Creator)</option>
                    </select>
                  ) : (
                    <select 
                      value={promoTargetRole} 
                      onChange={(e) => {
                        const r = e.target.value as UserRole;
                        setPromoTargetRole(r);
                        if (r === UserRole.SYSTEM_ADMIN) {
                          setPromoTargetStar(1);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans text-slate-700 font-semibold"
                    >
                      <option value={UserRole.OPERATOR}>操作員 (Operator)</option>
                      <option value={UserRole.ANALYST}>分析員 (Analyst)</option>
                      <option value={UserRole.SYSTEM_ADMIN}>系統管理員 (System Admin)</option>
                    </select>
                  )}
                </div>

                {currentUser.role === UserRole.QUESTION_CREATOR ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">期望核准等級</label>
                    <select 
                      value={promoTargetStar} 
                      onChange={(e) => setPromoTargetStar(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-amber-600"
                    >
                      {(currentUser.starLevel || 1) < 2 && <option value={2}>⭐⭐ 2 階 (可創並修改問卷)</option>}
                      <option value={3}>⭐⭐⭐ 3 階 (可刪除與進階管理)</option>
                    </select>
                  </div>
                ) : (promoTargetRole === UserRole.OPERATOR || promoTargetRole === UserRole.ANALYST) ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">期望核准等級</label>
                    <select 
                      value={promoTargetStar} 
                      onChange={(e) => setPromoTargetStar(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-amber-600"
                    >
                      <option value={1}>⭐ 1 星級 (可指派 1 張表格)</option>
                      <option value={2}>⭐⭐ 2 星級 (可指派 2 張表格)</option>
                      <option value={3}>⭐⭐⭐ 3 星級 (可指派 3 張表格)</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 block pb-1">管理特別說明</span>
                    <span className="text-[10px] text-slate-400 leading-tight">系統管理員自帶所有表格管理權限，不細分星等限制。</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleApplyPromotionSubmit}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  向超級管理員送出申請
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid Layout: Navigation Left / Contents Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar Drawer */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-4 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 block px-3 uppercase tracking-wider mb-2">管理控制選單</span>

            {currentUser.role === UserRole.RESPONDENT && (
              <button
                id="tab-btn-respondent-game"
                onClick={() => setActiveTab("respondent_game")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "respondent_game"
                    ? "bg-slate-900 text-white"
                    : "text-indigo-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
                  <span>🎮 答題闖關賺積分</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            {currentUser.role === UserRole.RESPONDENT && (
              <button
                id="tab-btn-respondent-history"
                onClick={() => setActiveTab("respondent_history")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "respondent_history"
                    ? "bg-slate-900 text-white"
                    : "text-slate-650 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ClipboardList className="w-4 h-4 text-emerald-500" />
                  <span>📋 歷史問卷紀錄</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            {currentUser.role !== UserRole.RESPONDENT && (
              <button
                id="tab-btn-analytics"
                onClick={() => {
                  if ((currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("view_data", "查看功能")) return;
                  if (currentUser.role === UserRole.ANALYST && !checkFeatureAccess("analyst_view", "統計分析查看權限")) return;
                  setActiveTab("analytics");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "analytics"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <PieChart className="w-4 h-4" />
                  <span>📊 問卷統計與分析</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            {/* Operator, Creator, and Administrator can see / edit submissions list */}
            {currentUser.role !== UserRole.RESPONDENT && currentUser.role !== UserRole.ANALYST && (
              <button
                id="tab-btn-submissions"
                onClick={() => {
                  if ((currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("view_data", "查看功能")) return;
                  if (currentUser.role === UserRole.OPERATOR && !checkFeatureAccess("operator_all_views", "問卷整體查看權限")) return;
                  setActiveTab("submissions");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "submissions"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>🗃️ 所有問卷及回覆</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            {/* Config center: open to all non-respondents to sort or configure their questionnaires */}
            {currentUser.role !== UserRole.RESPONDENT && (
              <button
                id="tab-btn-survey-configs"
                onClick={() => {
                  if ((currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("view_data", "查看功能")) return;
                  if (currentUser.role === UserRole.OPERATOR && !checkFeatureAccess("operator_all_operations", "問卷整體操作權限")) return;
                  setActiveTab("survey_configs");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "survey_configs"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>⚙️ 問卷與子查詢系統設定</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            {/* Trivia questions control center selection */}
            {canManageTriviaQuestions && (
              <button
                id="tab-btn-trivia-questions"
                onClick={() => {
                  if (!checkFeatureAccess("privilege_manage_trivia", "特權：題庫自主擴充管理")) return;
                  setActiveTab("trivia_questions");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "trivia_questions"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span>📚 答題學知識題庫管理</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            {/* RBAC user center: restricted to Super Admin or Webmaster only */}
            {currentUser.role !== UserRole.RESPONDENT && (currentUser.role === UserRole.WEBMASTER || currentUser.role === UserRole.SUPER_ADMIN) && (
              <button
                id="tab-btn-rbac"
                onClick={() => setActiveTab("rbac")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "rbac"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <UserCog className="w-4 h-4" />
                  <span>👤 帳號權限與晉升批准</span>
                </div>
                {promotions.filter(p => p.status === "PENDING").length > 0 && (
                  <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.5 text-[9px] animate-pulse">
                    {promotions.filter(p => p.status === "PENDING").length}
                  </span>
                )}
              </button>
            )}

            {/* Dedicated Questionnaire Distribution Center for System Admin */}
            {currentUser.role === UserRole.SYSTEM_ADMIN && (
              <button
                id="tab-btn-distribute-questionnaires"
                onClick={() => {
                  if (!checkFeatureAccess("distribute_questionnaires", "發配問卷功能")) return;
                  setActiveTab("distribute_surveys");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "distribute_surveys"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Share2 className="w-4 h-4 text-indigo-500" />
                  <span>📤 問卷發配指派中心</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            {/* Feature Ban Panel: restricted to Webmaster and Super Admin only */}
            {currentUser.role !== UserRole.RESPONDENT && (currentUser.role === UserRole.WEBMASTER || currentUser.role === UserRole.SUPER_ADMIN) && (
              <button
                id="tab-btn-feature-bans"
                onClick={() => {
                  if (!checkFeatureAccess("ban_management", "封禁功能面板")) return;
                  setActiveTab("feature_bans");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "feature_bans"
                    ? "bg-red-900 text-white shadow-sm"
                    : "text-red-700 hover:bg-red-50/70"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Ban className="w-4 h-4 text-red-500" />
                  <span>🚫 封禁功能面板</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            {/* System Account Management: restricted to Webmaster only */}
            {currentUser.role !== UserRole.RESPONDENT && currentUser.role === UserRole.WEBMASTER && (
              <button
                id="tab-btn-system-accounts"
                onClick={() => setActiveTab("system_accounts")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "system_accounts"
                    ? "bg-emerald-950 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>🛡️ 系統帳號全權管理</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            {currentUser.role !== UserRole.RESPONDENT && (currentUser.role === UserRole.WEBMASTER || currentUser.role === UserRole.SUPER_ADMIN) && (
              <button
                id="tab-btn-deleted-users"
                onClick={() => setActiveTab("deleted_users")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "deleted_users"
                    ? "bg-rose-950 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Trash2 className={`w-4 h-4 ${activeTab === "deleted_users" ? "text-rose-400" : "text-rose-600"}`} />
                  <span>已刪除帳號管理</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

            <button
              id="tab-btn-profile"
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>👤 修改個人資訊</span>
              </div>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>

            {/* Audit Logs: only open to webmaster and super admin */}
            {canViewLogs && (
              <button
                id="tab-btn-logs"
                onClick={() => {
                  if (!checkFeatureAccess("audit_logs", "系統日誌")) return;
                  setActiveTab("logs");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "logs"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileCheck2 className="w-4 h-4" />
                  <span>📜 系統稽核操作日誌</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}

          </div>

          {/* Quick selection dropdown for table context */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-2">當前對應表單</span>
            {surveysToRender.length > 0 ? (
              <select
                id="dash-survey-selector"
                value={selectedSurveyId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const targetSurvey = questionnaires.find(q => q.id === targetId);
                  const surveyName = targetSurvey?.title || targetId;

                  if (currentUser.role === UserRole.OPERATOR) {
                    if (isFeatureBanned(currentUser, "operator_all_views")) {
                      setBannedAlert({
                        isOpen: true,
                        featureName: "問卷整體查看權限",
                        featureKey: "operator_all_views",
                        reason: "您的「問卷整體查看權限」已被上級管理員封禁。"
                      });
                      return;
                    }
                    if (isFeatureBanned(currentUser, `operator_view_${targetId}`)) {
                      setBannedAlert({
                        isOpen: true,
                        featureName: `查看問卷：${surveyName}`,
                        featureKey: `operator_view_${targetId}`,
                        reason: `您對「${surveyName}」的查看權限已被上級管理員單獨封禁。`
                      });
                      return;
                    }
                  }
                  setSelectedSurveyId(targetId);
                }}
                className="w-full bg-white border border-slate-200 text-xs rounded-lg p-2 focus:border-indigo-500 font-semibold text-slate-700 outline-none"
              >
                {surveysToRender.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            ) : (
              <p className="text-rose-500 font-bold text-xs p-1">⚠️ 尚未獲配任何表格，請向超級管理員申請分配！</p>
            )}
          </div>
        </div>

        {/* Tab content area */}
        <div className="lg:col-span-3">

          {/* TAB: Respondent Historical Questionnaires */}
          {activeTab === "respondent_history" && (
            <div className="space-y-6 font-sans">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-800 flex items-center space-x-2">
                      <ClipboardList className="w-5 h-5 text-emerald-500" />
                      <span>📋 個人已填寫問卷歷史</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      您在此可查看過去所有曾填選提交的問卷與詳細作答時間。
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-mono">
                    已填寫: {responses.filter(r => r.submittedBy?.toLowerCase() === currentUser.username.toLowerCase()).length} 份
                  </span>
                </div>

                {(() => {
                  const myHistory = responses.filter(r => r.submittedBy?.toLowerCase() === currentUser.username.toLowerCase());
                  if (myHistory.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-400">
                        <p className="text-sm font-medium">📭 目前還沒有填寫過任何問卷喔！</p>
                        <button
                          onClick={() => setActiveTab("respondent_game")}
                          className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition cursor-pointer"
                        >
                          去賺積分 / 闖關 ➔
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {myHistory.map((resItem) => {
                        const survey = questionnaires.find(q => q.id === resItem.surveyId);
                        const isExpanded = expandedHistId === resItem.id;
                        return (
                          <div 
                            key={resItem.id} 
                            className="bg-slate-50 rounded-2xl border border-slate-150 p-5 space-y-4 hover:shadow-xs transition duration-150"
                          >
                            <div className="flex justify-between items-start flex-wrap gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                    問卷 ID: {resItem.surveyId}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    憑證: {resItem.id}
                                  </span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">
                                  {survey?.title || "已刪除的問卷 (歷史紀錄保留)"}
                                </h3>
                                <p className="text-xs text-slate-500">
                                  {survey?.description || "此問卷已被管理員移除。"}
                                </p>
                              </div>
                              <div className="text-right text-xs">
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  📅 提交時間
                                </span>
                                <span className="font-semibold text-slate-700 font-mono">
                                  {resItem.submittedAt}
                                </span>
                              </div>
                            </div>

                            {/* Details Toggle */}
                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                              <span className="text-[11px] text-emerald-600 font-bold flex items-center">
                                <Check className="w-3.5 h-3.5 mr-1" /> 已成功送出
                              </span>

                              <button
                                type="button"
                                onClick={() => setExpandedHistId(isExpanded ? null : resItem.id)}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center cursor-pointer"
                              >
                                {isExpanded ? "收起填答明細 ▲" : "查看我填寫的內容 目錄 ▼"}
                              </button>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="bg-white rounded-xl border border-slate-200 p-4 mt-2 space-y-3.5 text-xs animate-fade-in">
                                <h4 className="font-extrabold text-slate-700 border-b pb-2 text-left">📋 當時我的填答答案明細</h4>
                                <div className="space-y-3">
                                  {survey ? (
                                    survey.questions.map((q: any, idx: number) => {
                                      const answerVal = resItem.answers[q.id];
                                      let displayVal = "";
                                      if (answerVal === undefined || answerVal === null) {
                                        displayVal = "（未回答或跳過）";
                                      } else if (Array.isArray(answerVal)) {
                                        displayVal = answerVal.length > 0 ? answerVal.join(", ") : "（未選擇）";
                                      } else if (typeof answerVal === "object") {
                                        displayVal = JSON.stringify(answerVal);
                                      } else {
                                        displayVal = String(answerVal);
                                      }

                                      return (
                                        <div key={q.id} className="space-y-1 border-b border-dashed border-slate-100 last:border-b-0 pb-2.5 last:pb-0">
                                          <div className="text-slate-600 font-medium text-left">
                                            Q{idx+1}. {q.title} 
                                            <span className="text-[10px] font-mono text-slate-400 ml-1.5 uppercase font-bold">
                                              ({q.type === "SINGLE_CHOICE" ? "單選" : q.type === "MULTI_CHOICE" ? "多選" : q.type === "RATING" ? "評分" : "文字"})
                                            </span>
                                          </div>
                                          <div className="bg-slate-50/75 p-2 rounded-lg border border-slate-100 font-mono text-xs text-indigo-950 font-bold text-left">
                                            {displayVal}
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="text-slate-400 italic">問卷原始資料已卸載，無法讀取題目詳情。</p>
                                  )}
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

              </div>
            </div>
          )}

          {/* TAB 0: Respondent Gamified Portal */}
          {activeTab === "respondent_game" && (
            <div className="space-y-6 font-sans">
              {/* Rank Dashboard Card */}
              {(() => {
                const rank = calculateRespondentRank(currentUser.respondentPoints || 0);
                const nextRequired = rank.nextRankQuestionsNeeded;
                const progressPct = Math.min(((rank.points % 20) / 20) * 100, 100);
                
                return (
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl space-y-6 relative overflow-hidden">
                    {/* Decorative Background Glows */}
                    <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -z-0"></div>
                    <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -z-0"></div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                            LEVEL {rank.tier}
                          </span>
                          <span className="text-indigo-200 text-xs font-mono font-bold">
                            RESPONDENT PORTAL
                          </span>
                        </div>
                        <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                          <span>{rank.tierName === "傳奇" ? "👑 傳奇段位" : `🏆 ${rank.tierName}階`}</span>
                          {rank.subRank && <span className="text-amber-400 font-mono text-xl ml-1">{rank.subRank}</span>}
                        </h2>
                        <p className="text-slate-300 text-xs">
                          已解鎖答題量：<span className="text-white font-bold">{rank.questionsCount} 題</span>
                          {" · "}當前總積分：<span className="text-amber-300 font-extrabold font-mono text-sm">{rank.points}</span> 點 (每 20 點兌 1 題)
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-2xl p-4.5 border border-white/10 shrink-0 text-right backdrop-blur-sm">
                        <span className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold font-mono text-xs">下一級進度</span>
                        <div className="text-xl font-black font-mono text-amber-300 mt-0.5">
                          {rank.tierName === "傳奇" ? "MAX" : `差 ${nextRequired} 題晉級`}
                        </div>
                        <p className="text-[10px] text-slate-300">
                          {rank.tierName === "傳奇" ? "積分無上限" : `當前答題進度`}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 z-10 relative">
                      <div className="flex justify-between text-[10px] font-mono text-slate-300 font-semibold">
                        <span>目前轉換進度: {rank.points % 20} / 20 點 (20點兌換為1答題權限)</span>
                        <span>{Math.round(progressPct)}%</span>
                      </div>
                      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/5 p-0.5">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-400 to-amber-400 rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Perks Section */}
                    <div className="border-t border-white/10 pt-5 space-y-3 z-10 relative">
                      <h3 className="text-xs font-extrabold tracking-wider text-indigo-200 uppercase flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>已解鎖階級對等特權 操作面板</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {/* Perk 1 (Tier 1+) */}
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col justify-between hover:bg-white/10 transition-all text-left">
                          <div>
                            <span className="text-[10px] text-slate-400 font-mono block">1階 黑鐵解鎖</span>
                            <span className="text-xs font-extrabold block text-white mt-0.5">🎮 常規自主答題闖關</span>
                            <span className="text-[10px] text-slate-350 leading-tight block mt-1">
                              可全天候在線進行答題挑戰，答對一律加 7 積分，答錯可重選。
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              const elem = document.getElementById("trivia-playground-card");
                              if (elem) elem.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="w-full text-center mt-3 py-1 bg-white/10 rounded text-[10px] font-bold text-white hover:bg-white/20 duration-150 cursor-pointer"
                          >
                            立即去答題 ➔
                          </button>
                        </div>

                        {/* Perk 2 (Tier 2+) */}
                        <div className={`border rounded-xl p-3 flex flex-col justify-between transition-all text-left ${
                          rank.tier >= 2 
                            ? "bg-amber-500/10 border-amber-500/20 text-white" 
                            : "bg-slate-900/40 border-dashed border-white/5 text-slate-500 opacity-50"
                        }`}>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider block text-amber-400">2階 青銅解鎖</span>
                            <span className="text-xs font-extrabold block mt-0.5">⚠️ 質疑出題人的題目</span>
                            <span className="text-[10px] leading-tight block mt-1">
                              可針對出題作答中任何存有法規疑義、錯漏字、爭議瑕疵的題目直接提出質疑申訴。
                            </span>
                          </div>
                          {rank.tier >= 2 ? (
                            <button
                              onClick={() => {
                                if (currentUser.role === UserRole.RESPONDENT && !checkFeatureAccess("respondent_perk_dispute", "特權：質疑出題人題目")) {
                                  return;
                                }
                                setDisputeSurveyId(questionnaires[0]?.id || "");
                                setShowDisputeModal(true);
                              }}
                              className="w-full text-center mt-3 py-1 bg-amber-500 text-slate-950 rounded text-[10px] font-bold hover:bg-amber-400 duration-150 cursor-pointer"
                            >
                              建立質疑申訴 ➔
                            </button>
                          ) : (
                            <span className="text-center text-[10px] mt-3 font-medium text-slate-500">🔒 達 青銅階級 解鎖</span>
                          )}
                        </div>

                        {/* Perk 3 (Tier 3+) */}
                        <div className={`border rounded-xl p-3 flex flex-col justify-between transition-all text-left ${
                          rank.tier >= 3 
                            ? "bg-indigo-500/10 border-indigo-500/20 text-white" 
                            : "bg-slate-900/40 border-dashed border-white/5 text-slate-500 opacity-50"
                        }`}>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider block text-indigo-400">3階 白銀解鎖</span>
                            <span className="text-xs font-extrabold block mt-0.5">🔗複製 外連問卷 邀請朋友</span>
                            <span className="text-[10px] leading-tight block mt-1">
                              獲准直接複製並導出任何問卷的專屬直達邀請，便於發送給親朋好友作答。
                            </span>
                          </div>
                          {rank.tier >= 3 ? (
                            <div className="space-y-1.5 mt-3">
                              <select
                                id="perk3-survey-select"
                                className="w-full bg-slate-800 text-[10px] font-bold text-indigo-200 border border-slate-700 rounded p-1"
                                onChange={(e) => {
                                  const sid = e.target.value;
                                  if (sid) {
                                    if (currentUser.role === UserRole.RESPONDENT && !checkFeatureAccess("respondent_perk_invite_link", "特權：複製問卷邀請連結")) {
                                      e.target.value = "";
                                      return;
                                    }
                                    const directUrl = `${window.location.origin}${window.location.pathname}#fill/${sid}`;
                                    navigator.clipboard.writeText(directUrl);
                                    alert(`🔗 已完美複製問卷「${sid}」直達邀請鏈結：\n${directUrl}`);
                                  }
                                }}
                              >
                                <option value="">[請選擇問卷一鍵複製連結]</option>
                                {questionnaires.map((q) => (
                                  <option key={q.id} value={q.id}>{q.title}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="text-center text-[10px] mt-3 font-medium text-slate-500">🔒 達 白銀階級 解鎖</span>
                          )}
                        </div>

                        {/* Perk 4 (Tier 4+) */}
                        <div className={`border rounded-xl p-3 flex flex-col justify-between transition-all text-left ${
                          rank.tier >= 4 
                            ? "bg-emerald-500/10 border-emerald-500/25 text-white" 
                            : "bg-slate-900/40 border-dashed border-white/5 text-slate-500 opacity-50"
                        }`}>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider block text-emerald-400">4階 黃金解鎖</span>
                            <span className="text-xs font-extrabold block mt-0.5">📝 協助出題與推薦</span>
                            <span className="text-[10px] leading-tight block mt-1">
                              可發揮主動出題意願，向出題人直接提議及推薦新設計的問卷題目。
                            </span>
                          </div>
                          {rank.tier >= 4 ? (
                            <button
                              onClick={() => {
                                if (currentUser.role === UserRole.RESPONDENT && !checkFeatureAccess("respondent_perk_suggest", "特權：向出題人推薦題目")) {
                                  return;
                                }
                                setSuggestSurveyId(questionnaires[0]?.id || "");
                                setSuggestQTitle("");
                                setSuggestQOptions(["", ""]);
                                setShowSuggestModal(true);
                              }}
                              className="w-full text-center mt-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold duration-150 cursor-pointer"
                            >
                              向出題人提議出題 ➔
                            </button>
                          ) : (
                            <span className="text-center text-[10px] mt-3 font-medium text-slate-500">🔒 達 黃金階級 解鎖</span>
                          )}
                        </div>

                        {/* Perk 5 (Tier 5+) */}
                        <div className={`border rounded-xl p-3 flex flex-col justify-between transition-all text-left ${
                          rank.tier >= 5 
                            ? "bg-rose-500/10 border-rose-500/20 text-white" 
                            : "bg-slate-900/40 border-dashed border-white/5 text-slate-500 opacity-50"
                        }`}>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider block text-rose-400">5階 白金解鎖</span>
                            <span className="text-xs font-extrabold block mt-0.5">🛑 提請封鎖停用問卷</span>
                            <span className="text-[10px] leading-tight block mt-1">
                              發現惡意問卷或釣魚問卷？您可隨時向管理者一鍵發出高防戶停用問卷申請。
                            </span>
                          </div>
                          {rank.tier >= 5 ? (
                            <button
                              onClick={() => {
                                if (currentUser.role === UserRole.RESPONDENT && !checkFeatureAccess("respondent_perk_stop_survey", "特權：提請封鎖停用問卷")) {
                                  return;
                                }
                                setStopSurveyId(questionnaires[0]?.id || "");
                                setStopReason("");
                                setShowStopModal(true);
                              }}
                              className="w-full text-center mt-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold duration-150 cursor-pointer"
                            >
                              提報停用問卷 ➔
                            </button>
                          ) : (
                            <span className="text-center text-[10px] mt-3 font-medium text-slate-500">🔒 達 白金階級 解鎖</span>
                          )}
                        </div>

                        {/* Perk 6 (Tier 6+) */}
                        <div className={`border rounded-xl p-3 flex flex-col justify-between transition-all text-left ${
                          rank.tier >= 6 
                            ? "bg-purple-500/10 border-purple-500/20 text-white" 
                            : "bg-slate-900/40 border-dashed border-white/5 text-slate-500 opacity-50"
                        }`}>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider block text-purple-400">6階 鑽石解鎖</span>
                            <span className="text-xs font-extrabold block mt-0.5">⚡ 直接升級朋友白銀 (3階)</span>
                            <span className="text-[10px] leading-tight block mt-1">
                              每月高達 {4 + (currentUser.extraT3Quota || 0)} 次機會！輸入對方帳號名稱即可強行直升其至 3 階 (白銀)。
                            </span>
                            {rank.tier >= 6 && (
                              <p className="text-[9px] text-purple-400 font-mono mt-1">
                                本月已用: {currentUser.promotedFriendsThisMonthCount_T3 || 0} / {(rank.tier === 7 ? 15 : 4) + (currentUser.extraT3Quota || 0)} 次
                              </p>
                            )}
                          </div>
                          {rank.tier >= 6 ? (
                            <button
                              onClick={() => {
                                if (currentUser.role === UserRole.RESPONDENT && !checkFeatureAccess("respondent_perk_promote_friend", "特權：直接升級朋友")) {
                                  return;
                                }
                                setPromoFriendName("");
                                setPromoFriendType("T3");
                                setShowPromoFriendModal(true);
                              }}
                              className="w-full text-center mt-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold duration-150 cursor-pointer"
                            >
                              一鍵拔擢朋友至白銀 ➔
                            </button>
                          ) : (
                            <span className="text-center text-[10px] mt-3 font-medium text-slate-500">🔒 達 鑽石階級 解鎖</span>
                          )}
                        </div>

                        {/* Perk 7 (Tier 7+) */}
                        <div className={`border rounded-xl p-3 flex flex-col justify-between transition-all text-left ${
                          rank.tier >= 7 
                            ? "bg-teal-500/10 border-teal-500/20 text-white" 
                            : "bg-slate-900/40 border-dashed border-white/5 text-slate-500 opacity-50"
                        }`}>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider block text-teal-400">7階 傳奇解鎖</span>
                            <span className="text-xs font-extrabold block mt-0.5">🛡️ 封禁其他帳號/直升白金(5階)</span>
                            <span className="text-[10px] leading-tight block mt-1">
                              可直升朋友至 5 階 (每週 {2 + (currentUser.extraT5Quota || 0)} 次)，並且可向站主申請直接封禁違規帳戶 (每月 {4 + (currentUser.extraBanQuota || 0)} 次)！
                            </span>
                            {rank.tier >= 7 && (
                              <div className="text-[9px] text-teal-400 font-mono mt-1 space-y-0.5">
                                <p>白金已用 / 額度: {currentUser.promotedFriendsThisWeekCount_T5 || 0} / {2 + (currentUser.extraT5Quota || 0)} 次/每週</p>
                                <p>封鎖已用 / 額度: {currentUser.bannedOtherAppliedThisMonthCount || 0} / {4 + (currentUser.extraBanQuota || 0)} 次/每月</p>
                              </div>
                            )}
                          </div>
                          {rank.tier >= 7 ? (
                            <div className="flex gap-2 mt-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentUser.role === UserRole.RESPONDENT && !checkFeatureAccess("respondent_perk_promote_friend", "特權：直升白金5階")) {
                                    return;
                                  }
                                  setPromoFriendName("");
                                  setPromoFriendType("T5");
                                  setShowPromoFriendModal(true);
                                }}
                                className="flex-1 text-center py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[9px] font-bold duration-150 cursor-pointer"
                              >
                                直升白金5階
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentUser.role === UserRole.RESPONDENT && !checkFeatureAccess("respondent_perk_ban_request", "特權：填封鎖舉報")) {
                                    return;
                                  }
                                  setBanReqTarget("");
                                  setBanReqReason("");
                                  setShowBanRequestModal(true);
                                }}
                                className="flex-1 text-center py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-[9px] font-bold duration-150 cursor-pointer"
                              >
                                填封鎖舉報
                              </button>
                            </div>
                          ) : (
                            <span className="text-center text-[10px] mt-3 font-medium text-slate-500">🔒 達 傳奇階級 解鎖</span>
                          )}
                        </div>
                      </div>

                      {/* Tier 7: Request more quota panel */}
                      {rank.tier >= 7 && (
                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden mt-3 animate-fade-in">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 font-mono block">💎 傳奇至尊特權加碼</span>
                            <span className="text-xs font-extrabold block text-white">向系統站主請求增量特權次數</span>
                            <p className="text-[10px] text-slate-300 leading-tight">
                              如您的白銀直升次數、白金直升次數，或臨時封鎖次數已額滿用完，可在此向站主直接申派添加特權額度！
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (currentUser.role === UserRole.RESPONDENT && !checkFeatureAccess("respondent_perk_quota_apply", "特權：申請追加特權次數")) {
                                return;
                              }
                              setQuotaPerkType("T3");
                              setQuotaRequestCount(5);
                              setShowQuotaRequestModal(true);
                            }}
                            className="shrink-0 px-4 py-2 bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 active:from-teal-600 text-slate-950 text-xs font-black rounded-lg shadow-md cursor-pointer transition-all"
                          >
                            💎 申請追加特權次數 ➔
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* CHEAT REPORT CARD */}
              <div id="cheat-reporting-community-card" className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-2xl border border-rose-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                  <h3 className="text-sm font-extrabold text-rose-950 flex items-center space-x-1.5">
                    <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                    <span>🛡️ 社群公正維安：提報他人疑似開掛嫌疑</span>
                  </h3>
                  <p className="text-xs text-rose-800/85 leading-relaxed">
                    維護公平作答環境！若您發現有其他答題人帳號疑似使用作弊腳本、刷積分或不正常快速晉級，請立即向管理員通報審查。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCheatReportTarget("");
                    setCheatReportReason("");
                    setShowCheatReportModal(true);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-sm duration-150 cursor-pointer shrink-0 self-start md:self-center"
                >
                  🚨 立即舉報開掛
                </button>
              </div>

              {/* TRIVIA CARD PLAYGROUND */}
              <div id="trivia-playground-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                <div>
                  <h3 className="text-md font-bold text-slate-800 flex items-center space-x-1.5 border-b border-slate-100 pb-3">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span>答題學知識：關卡闖關挑戰 (答對: +7點)</span>
                  </h3>
                </div>

                {(() => {
                  const activeQ = triviaQuestions[triviaIndex];
                  if (!activeQ) {
                    return (
                      <p className="text-xs text-slate-400 italic">目前知識題庫中尚無任何題目可作答。</p>
                    );
                  }
                  return (
                    <div className="space-y-4 text-left">
                      {/* Trivia Question Header */}
                      <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-600 tracking-wider">QUESTION #{triviaIndex + 1}</span>
                          <span className="text-[10px] bg-slate-200/50 text-slate-500 rounded px-1.5 py-0.5 font-mono">
                            題庫總計 {triviaQuestions.length} 題
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-800 leading-relaxed">
                          {activeQ.question}
                        </h4>
                      </div>

                      {/* Options List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeQ.options.map((opt) => {
                          const isSelected = selectedTriviaOption === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                if (triviaIsCorrect === null) {
                                  setSelectedTriviaOption(opt);
                                }
                              }}
                              className={`w-full text-left p-3.5 rounded-xl text-xs font-bold transition-all border outline-none cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-705 hover:bg-slate-50 hover:border-slate-300 border-slate-100"
                              }`}
                            >
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Control and Validation button */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100/50">
                        <div>
                          {triviaIsCorrect === true && (
                            <div className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse flex items-center space-x-1.5">
                              <span>✅ 答對了！恭喜增加 7 點積分！</span>
                            </div>
                          )}
                          {triviaIsCorrect === false && (
                            <div className="text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5">
                              <span>❌ 答錯了，請重新核定作答！</span>
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2.5">
                          {triviaIsCorrect === null ? (
                            <button
                              type="button"
                              onClick={handleTriviaAnswerSubmit}
                              className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow hover:bg-indigo-700 transition-colors cursor-pointer"
                            >
                              驗證答案並拿積分
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={nextTriviaQuestion}
                              className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              下一關 (下一題) ➔
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

              {/* MODALS RENDERING START */}
              {/* Modal: Privilege Hierarchy Description */}
              {showPrivilegeDescModal && (
                <div id="privilege-desc-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-3xl p-6 border border-slate-100 shadow-2xl space-y-4 text-left max-h-[88vh] overflow-y-auto animate-fade-in font-sans">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-base font-extrabold text-slate-800 flex items-center space-x-2">
                          <span className="text-indigo-600 text-lg">🔑</span>
                          <span>系統帳戶權限分級與星階權益說明書</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                            RBAC v1.8.4 最新修訂版
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          基於角色型存取控制 (RBAC) 與動態等階 / 星級縮放賦權架構之官方權限指南
                        </p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowPrivilegeDescModal(false)} 
                        className="text-slate-400 hover:text-slate-600 font-bold text-xs select-none cursor-pointer w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                        title="關閉說明書"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                      {/* Webmaster & Super Admin */}
                      <div className="bg-gradient-to-r from-amber-500/5 to-amber-600/10 p-4 rounded-xl border border-amber-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-amber-600 text-base">👑</span>
                            <span className="font-extrabold text-slate-900 text-xs">
                              系統最頂階：系統站主 (WEBMASTER) ＆ 超級管理員 (SUPER_ADMIN)
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                            全域最高主控層
                          </span>
                        </div>

                        <div className="space-y-2 text-slate-600 text-xs">
                          <div className="bg-white/80 p-3 rounded-lg border border-amber-200/60">
                            <p className="font-bold text-amber-900 flex items-center gap-1">
                              <span>👑 系統站主 (Webmaster)</span>
                              <span className="text-[10px] text-amber-700 font-mono font-normal">〔全域終極裁決者〕</span>
                            </p>
                            {/* In accordance with privacy rules: full details visible only to Webmaster and Super Admin; other accounts see the concise universal policy */}
                            {currentUser.role === UserRole.WEBMASTER || currentUser.role === UserRole.SUPER_ADMIN ? (
                              <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px] mt-1.5">
                                <li><strong>全域最高安全特權保護</strong>：系統唯一主控核心，享有防封禁、防刪除、防更名、防降級之硬體級安全免疫機制。</li>
                                <li><strong>全域帳號與權限統籌</strong>：可直接新增、編輯、微調所有成員（含超級管理員）之角色、等階、星級與登入密碼，並支援即時全域啟用或手動封鎖。</li>
                                <li><strong>功能封禁總控制台 (Feature Ban)</strong>：擁有最高層級功能禁用權，可封鎖任一身分之各項業務特權。</li>
                                <li><strong>全域稽核日誌完整權限</strong>：具備日誌檢閱、修改、2 選 1 刪除模式（永久無痕銷毀 / 普通刪除合規留痕）以及輸入站主自身密碼清空全域日誌之權利。</li>
                                <li><strong>站主專屬私密日誌隔離</strong>：系統站主自身的操作日誌受全域最高安全隔離，<strong>僅站主本人可見</strong>，對超級管理員與其餘角色完全遮蔽。</li>
                                <li><strong>專屬特權審批中心</strong>：獨家審核「市民答題學知識」題庫擴充特權分配、超級管理員「日誌管理權」授權、傳奇市民「神聖干預 (臨時封鎖) 審查中心」以及「額度追加申請」。</li>
                              </ul>
                            ) : (
                              <div className="mt-1.5 p-2 bg-amber-50/60 rounded border border-amber-150 text-slate-700 text-[11px] leading-relaxed">
                                <span className="font-bold text-amber-900">全域最高權限：</span>
                                <span>可隨意對任何帳號進行修改、降級...等操作，不受任何操作修改</span>
                              </div>
                            )}
                          </div>

                          <div className="bg-white/80 p-3 rounded-lg border border-slate-200">
                            <p className="font-bold text-slate-800 flex items-center gap-1">
                              <span>⭐ 超級管理員 (Super Admin)</span>
                              <span className="text-[10px] text-slate-500 font-mono font-normal">〔次高階營運管理〕</span>
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px] mt-1.5">
                              <li><strong>人事與權限管理</strong>：可管理除系統站主以外的所有人員，調整其姓名、密碼、指派角色與認證星等，並執行常規封鎖或解除限制。</li>
                              <li><strong>同級管理保護</strong>：同為超級管理員之帳號受到同級保護機制約束，彼此之間不可互相修改名稱、重置密碼或降級權限。</li>
                              <li><strong>日誌安全規範 (重要更新)</strong>：超級管理員<strong>默認僅具備「查看」系統稽核日誌之權限</strong>；若需修改、單筆刪除或清空日誌，必須由系統站主於 RBAC 控制中心專屬授權；且超管全域無法查看系統站主私密日誌。</li>
                              <li><strong>功能封禁中心操作</strong>：可進入功能封禁控制台，依營運需求限制特定角色或人員之子功能權限。</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* General Admin & Staff */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-indigo-600 text-sm">🛡️</span>
                            <span className="font-extrabold text-slate-800 text-xs">
                              中階營運層：系統管理員、操作人員、分析人員
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-150">
                            業務流轉與數據處置
                          </span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1.5 text-slate-600 text-[11px]">
                          <li>
                            <strong>系統管理員 (System Admin)</strong>：專責「問卷發布與指派分發 (Distribute Surveys)」。具備全域所有問卷之 100% 查看與資料統計權限，不受分發限制；可將未受管之問卷指派給指定操作員或分析員。獲站主授權時亦可擴充 Trivia 題庫。
                          </li>
                          <li>
                            <strong>操作人員 (Operator)</strong>：採星級認證制度 (⭐ 1星 ~ ⭐⭐⭐ 3星)。星階對應其可受派負責之問卷數量（1星限1份、2星限2份、3星限3份）。專責於受派問卷之日常題目維護、填答數據審核、問卷上下架流轉。達到 3 星後可提交升遷申請至審批中心。
                          </li>
                          <li>
                            <strong>分析人員 (Analyst)</strong>：採星級認證制度 (⭐ 1星 ~ ⭐⭐⭐ 3星)。星階對應其可受派分析之問卷數量（1星限1份、2星限2份、3星限3份）。專責於受派問卷回收數據之交叉篩選、圖表統計視覺化及深度趨勢分析。達到 3 星後可提交升遷申請至審批中心。
                          </li>
                        </ul>
                      </div>

                      {/* Creator star divisions */}
                      <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-150 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-indigo-700 text-sm">📝</span>
                            <span className="font-extrabold text-slate-800 text-xs">出題人員 (QUESTION_CREATOR) 等階與特權體系</span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-full border border-indigo-200">
                            自主問卷設計與排程
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">出題人員僅能存取與統計個人創建之問卷，依等階解鎖更豐富之排程與發行特權：</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                          <div className="bg-white p-3 rounded-lg border border-slate-200 text-left">
                            <span className="font-extrabold text-slate-700 block text-xs">⭐ 1 階 (基礎出題)</span>
                            <span className="text-[10px] text-slate-400 font-medium leading-relaxed block mt-1">僅可發布最常規的一般問卷，無法設定任何開始或結束時間之排程限制。</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-200 text-left">
                            <span className="font-extrabold text-amber-600 block text-xs">⭐⭐ 2 階 (時效出題)</span>
                            <span className="text-[10px] text-slate-400 font-medium leading-relaxed block mt-1">可建立時效性問卷，額外解鎖設定問卷開放之「開始時間限制 (startTime)」控制特權。</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-indigo-200 text-left">
                            <span className="font-extrabold text-indigo-700 block text-xs">⭐⭐⭐ 3 階 (全功能出題)</span>
                            <span className="text-[10px] text-indigo-600 font-medium leading-relaxed block mt-1">解鎖全功能問卷控制，包含完整起訖時間排程限制、問卷置頂、任意指定填答市民受眾與配發。</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-indigo-700/80 bg-white/70 p-2 rounded border border-indigo-100">
                          💡 <strong>題庫自主擴充特權</strong>：經系統站主專屬審核核准後，出題人員可額外獲得「市民答題學知識」知識題庫擴充特權，直接新增自主設計之挑戰題目。
                        </p>
                      </div>

                      {/* Respondent privilege divisions */}
                      <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-150 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-emerald-700 text-sm">🏆</span>
                            <span className="font-extrabold text-slate-800 text-xs">答題市民 (RESPONDENT) 1~7 階特權體系</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
                            自主填答與積分榮譽
                          </span>
                        </div>
                        <div className="space-y-1.5 text-slate-500 text-xs">
                          <p className="text-[11px] leading-relaxed">
                            答題市民透過自主填答常規問卷與完成趣味問答（Trivia）累積積分與題數。隨積分晉升，解鎖完全不同的神聖特權：
                          </p>
                          <div className="space-y-2 pt-1 font-mono text-xs">
                            <div className="flex items-start space-x-2 bg-white/70 p-2 rounded border border-slate-150">
                              <span className="font-bold text-slate-700 shrink-0 text-[11px]">1 ~ 2 階 (黑鐵/青銅)：</span>
                              <div className="text-[11px] text-slate-600 font-sans space-y-0.5">
                                <div><strong>1 階 黑鐵 (0 ~ 179 分)</strong>：享標準 1.0x 答題積分回饋與日常自主答題闖關權。</div>
                                <div><strong>2 階 青銅 (180 ~ 359 分)</strong>：享 1.2x 積分加成，解鎖<strong>「針對出題題目提出質疑申訴」</strong>特權。</div>
                              </div>
                            </div>
                            <div className="flex items-start space-x-2 bg-white/70 p-2 rounded border border-slate-150">
                              <span className="font-bold text-slate-700 shrink-0 text-[11px]">3 ~ 4 階 (白銀/黃金)：</span>
                              <div className="text-[11px] text-slate-600 font-sans space-y-0.5">
                                <div><strong>3 階 白銀 (360 ~ 679 分)</strong>：享 1.5x 積分加成，解鎖<strong>「複製外連問卷直達邀請連結」</strong>特權。</div>
                                <div><strong>4 階 黃金 (680 ~ 999 分)</strong>：享 1.6x 積分加成，解鎖<strong>「向出題人直接提議及推薦新題目」</strong>特權。</div>
                              </div>
                            </div>
                            <div className="flex items-start space-x-2 bg-white/70 p-2 rounded border border-slate-150">
                              <span className="font-bold text-indigo-700 shrink-0 text-[11px]">5 ~ 6 階 (白金/鑽石)：</span>
                              <div className="text-[11px] text-slate-600 font-sans space-y-0.5">
                                <div><strong>5 階 白金 (1000 ~ 1499 分)</strong>：享 1.8x 積分加成，解鎖<strong>「提請封鎖停用惡意/釣魚問卷」</strong>特權。</div>
                                <div><strong>6 階 鑽石 (1500 ~ 1999 分)</strong>：享 2.0x 積分加成，解鎖<strong>「直接升級朋友至 3階 (白銀)」</strong>特權（每月 4 次）。</div>
                              </div>
                            </div>
                            <div className="flex items-start space-x-2 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-teal-500/10 p-3 rounded-xl border border-red-200">
                              <span className="font-extrabold text-red-700 shrink-0 text-[11px]">🔴 7 階 (傳奇市民)：</span>
                              <div className="space-y-1 text-slate-700 text-[11px] font-sans">
                                <p className="font-bold text-red-800">
                                  累積達 2000 分以上（答題達 100 題以上）。享有 2.5x 頂級積分回饋與至高神聖特權：
                                </p>
                                <ul className="list-disc pl-4 space-y-1">
                                  <li><strong>每月保薦提拔好友</strong>：每月高達 15 次將好友帳號強制直接直升至 3階 (白銀)；每週 2 次直接提拔至 5階 (白金)！</li>
                                  <li><strong>神聖干預 (1小時強制臨時封鎖)</strong>：每月 4 次可直接將涉嫌開掛作弊或惡意洗板的疑似市民帳號<strong>直接強制臨時封禁 1 小時</strong>，裁決令直通系統站主審查中心！</li>
                                  <li><strong>向站主申請追加特權次數</strong>：額度用罄時，每週可透過專屬表單向系統站主提出「藍綠色特權加碼申請」，核備增補使用次數。</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Security & Isolation Summary */}
                      <div className="bg-slate-100/80 p-3.5 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <span>🛡️ 系統安全防護與隔離機制說明</span>
                        </div>
                        <p>
                          1. <strong>站主極致防護</strong>：系統站主帳號受全域不可封禁、不可更名、不可降級與不可刪除機制保護。<br />
                          2. <strong>日誌私密隔離</strong>：站主操作日誌全域隔離，僅站主自身可見；超級管理員日誌操作權限需站主單獨授權。<br />
                          3. <strong>同級保護約束</strong>：同為超級管理員不可互相修改密碼或降級；出題人與答題人具備完全獨立之業務生命週期。
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[11px] text-slate-400">
                        提示：若對權限分級或特權申請有疑問，請隨時向系統站主提出諮詢。
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setShowPrivilegeDescModal(false)} 
                        className="px-5 py-2 bg-slate-900 border border-slate-950 text-white font-extrabold text-xs rounded-xl hover:bg-slate-800 transition cursor-pointer select-none"
                      >
                        我已瞭解並同意此權限架構
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Modal 1: Create Dispute */}
              {showDisputeModal && (
                <div id="dispute-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-100 shadow-xl space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center space-x-1">
                        <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                        <span>對問卷題目提出質疑申訴</span>
                      </h4>
                      <button type="button" onClick={() => setShowDisputeModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs select-none cursor-pointer">✕</button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">申訴目標問卷</label>
                        <select
                          value={disputeSurveyId}
                          onChange={(e) => setDisputeSurveyId(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                        >
                          {questionnaires.map((q) => (
                            <option key={q.id} value={q.id}>{q.title} ({q.id})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">質疑原因與題目修正建議</label>
                        <textarea
                          rows={4}
                          value={disputeText}
                          onChange={(e) => setDisputeText(e.target.value)}
                          placeholder="例如：問卷 第 2 題 的選項 B 存有錯別字，應更正為 ... ; 或者法律問答引用條款有爭議等。"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs font-sans text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                        ></textarea>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                      <button type="button" onClick={() => setShowDisputeModal(false)} className="px-3.5 py-1.5 border border-slate-200 text-slate-500 rounded-lg font-bold text-xs cursor-pointer">取消</button>
                      <button type="button" onClick={handleDisputeSubmit} className="px-5 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 cursor-pointer">送出質疑申訴</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal 2: Suggest Question */}
              {showSuggestModal && (
                <div id="suggest-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-100 shadow-xl space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center space-x-1">
                        <HelpCircle className="w-5 h-5 text-emerald-500" />
                        <span>協助出題人出題 (推薦題目)</span>
                      </h4>
                      <button type="button" onClick={() => setShowSuggestModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs select-none cursor-pointer">✕</button>
                    </div>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">欲推薦的問卷</label>
                        <select
                          value={suggestSurveyId}
                          onChange={(e) => setSuggestSurveyId(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                        >
                          {questionnaires.map((q) => (
                            <option key={q.id} value={q.id}>{q.title} ({q.id})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">設計的題目說明</label>
                        <input
                          type="text"
                          value={suggestQTitle}
                          onChange={(e) => setSuggestQTitle(e.target.value)}
                          placeholder="例如：您認為本平台未來最應優化哪一特權？"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">推薦題型</label>
                        <select
                          value={suggestQType}
                          onChange={(e) => setSuggestQType(e.target.value as QuestionType)}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                        >
                          <option value="SINGLE_CHOICE">單選題 (Single Choice)</option>
                          <option value="MULTI_CHOICE">多選題 (Multiple Choice)</option>
                          <option value="SHORT_TEXT">簡答申論題 (Text / Essay)</option>
                        </select>
                      </div>

                      {suggestQType !== "SHORT_TEXT" && (
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 flex justify-between">
                            <span>推薦選項清單 (至少提供兩項選項)</span>
                            <button
                              type="button"
                              onClick={() => setSuggestQOptions([...suggestQOptions, ""])}
                              className="text-emerald-600 font-bold text-[10px] underline"
                            >
                              + 新增選項
                            </button>
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {suggestQOptions.map((opt, oIdx) => (
                              <input
                                key={oIdx}
                                type="text"
                                value={opt}
                                placeholder={`項目 ${oIdx + 1}`}
                                onChange={(e) => {
                                  const c = [...suggestQOptions];
                                  c[oIdx] = e.target.value;
                                  setSuggestQOptions(c);
                                }}
                                className="border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                      <button type="button" onClick={() => setShowSuggestModal(false)} className="px-3.5 py-1.5 border border-slate-200 text-slate-500 rounded-lg font-bold text-xs cursor-pointer">取消</button>
                      <button type="button" onClick={handleSuggestQSubmit} className="px-5 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-500 cursor-pointer">向作者提議題目</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal 3: Request Stopsurvey */}
              {showStopModal && (
                <div id="stop-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-100 shadow-xl space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center space-x-1">
                        <Ban className="w-5 h-5 text-rose-500" />
                        <span>提請停用停辦出題人問卷</span>
                      </h4>
                      <button type="button" onClick={() => setShowStopModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs select-none cursor-pointer">✕</button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">預計封暫停的問卷對象</label>
                        <select
                          value={stopSurveyId}
                          onChange={(e) => setStopSurveyId(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                        >
                          {questionnaires.map((q) => (
                            <option key={q.id} value={q.id}>{q.title} ({q.id})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">申訴及停關之正當事由</label>
                        <textarea
                          rows={4}
                          value={stopReason}
                          onChange={(e) => setStopReason(e.target.value)}
                          placeholder="例如：此問卷蒐集法規條款疑存有侵犯個人用戶私密隱私、詐欺钓鱼疑慮，理由為 ..."
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none text-slate-700 focus:ring-1 focus:ring-rose-500"
                        ></textarea>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                      <button type="button" onClick={() => setShowStopModal(false)} className="px-3.5 py-1.5 border border-slate-200 text-slate-500 rounded-lg font-bold text-xs cursor-pointer">取消</button>
                      <button type="button" onClick={handleStopSurveySubmit} className="px-5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer">提出暫停申請</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal 4: Promo Friend modal */}
              {showPromoFriendModal && (
                <div id="promo-friend-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-100 shadow-xl space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center space-x-1">
                        <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                        <span>特權操作：拔擢親友等階</span>
                      </h4>
                      <button type="button" onClick={() => setShowPromoFriendModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs select-none cursor-pointer">✕</button>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-xl p-3 text-slate-650 text-[11px] leading-relaxed border border-slate-100">
                        提示：請輸入您朋友在平台上註冊的完整帳號名稱。提拔操作不需要經過超級管理員審核，其積分跟等階將立刻全體即時生效！
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-505">朋友的帳號名稱 (Username)</label>
                        <input
                          type="text"
                          value={promoFriendName}
                          onChange={(e) => setPromoFriendName(e.target.value)}
                          placeholder="例如: test_user"
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">提拔定位</label>
                        <div className="flex gap-4 pt-1">
                          <label className="flex items-center space-x-2 text-xs font-bold">
                            <input
                              type="radio"
                              name="friend-promo-type"
                              checked={promoFriendType === "T3"}
                              onChange={() => setPromoFriendType("T3")}
                            />
                            <span>直接晉升成 3階 白銀 🌟</span>
                          </label>
                          <label className="flex items-center space-x-2 text-xs font-bold">
                            <input
                              type="radio"
                              name="friend-promo-type"
                              checked={promoFriendType === "T5"}
                              disabled={calculateRespondentRank(currentUser.respondentPoints || 0).tier < 7}
                              onChange={() => setPromoFriendType("T5")}
                            />
                            <span className={calculateRespondentRank(currentUser.respondentPoints || 0).tier < 7 ? "text-slate-400 line-through" : ""}>
                              直接晉升成 5階 白金 ⚡ (傳奇限享)
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                      <button type="button" onClick={() => setShowPromoFriendModal(false)} className="px-3.5 py-1.5 border border-slate-200 text-slate-500 rounded-lg font-bold text-xs cursor-pointer">取消</button>
                      <button type="button" onClick={handlePromoFriendSubmit} className="px-5 py-1.5 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-500 cursor-pointer">強制直升到位</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal 5: Ban request target */}
              {showBanRequestModal && (
                <div id="ban-request-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-100 shadow-xl space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center space-x-1">
                        <Ban className="w-5 h-5 text-rose-500 animate-bounce" />
                        <span>傳奇尊爵特權：向站主提請封禁他人帳號</span>
                      </h4>
                      <button type="button" onClick={() => setShowBanRequestModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs select-none cursor-pointer">✕</button>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-rose-50 rounded-xl p-3 text-rose-800 text-[11px] leading-normal border border-rose-100">
                        注意：檢舉屬重大維安事件。身為傳奇級別頂尖用戶，您每月有 4 次直發封鎖要求之權利。一經核對不法，系統將會將該對象實行系統封鎖註銷！
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">欲封鎖檢舉帳號</label>
                        <input
                          type="text"
                          value={banReqTarget}
                          onChange={(e) => setBanReqTarget(e.target.value)}
                          placeholder="例如: rogue_user"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:ring-rose-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">事證/不法行為理由說明</label>
                        <textarea
                          rows={3}
                          value={banReqReason}
                          onChange={(e) => setBanReqReason(e.target.value)}
                          placeholder="例如：該用戶在質疑欄惡意洗板、發布不雅/仇恨訊息，甚至使用腳本刷積分事宜。"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:ring-rose-500"
                        ></textarea>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                      <button type="button" onClick={() => setShowBanRequestModal(false)} className="px-3.5 py-1.5 border border-slate-200 text-slate-500 rounded-lg font-bold text-xs cursor-pointer">取消</button>
                      <button type="button" onClick={handleBanOtherSubmit} className="px-5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer">送交封禁檢舉</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal 6: Cheat report modal */}
              {showCheatReportModal && (
                <div id="cheat-report-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-100 shadow-xl space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center space-x-1.5">
                        <ShieldAlert className="w-5 h-5 text-rose-500 animate-bounce" />
                        <span>舉報市民涉嫌開掛/作弊行為</span>
                      </h4>
                      <button type="button" onClick={() => setShowCheatReportModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs select-none cursor-pointer">✕</button>
                    </div>

                    <form onSubmit={handleCheatReportSubmit} className="space-y-4 font-sans">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">被檢舉的答題人帳號</label>
                        <select
                          value={cheatReportTarget}
                          onChange={(e) => setCheatReportTarget(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-lg p-2 text-xs text-slate-700 outline-none font-medium"
                          required
                        >
                          <option value="">-- 請選擇欲檢舉的答題市民 --</option>
                          {Object.values(rbacUsers)
                            .filter((u: any) => u.role === UserRole.RESPONDENT && u.username !== currentUser.username)
                            .map((u: any) => (
                              <option key={u.username} value={u.username}>
                                {u.username} (積分: {u.respondentPoints || 0})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="bg-amber-50 rounded-lg p-2.5 text-amber-800 text-[10px] leading-normal border border-amber-100 flex items-start space-x-1">
                        <span className="text-xs">💡</span>
                        <span>注意：惡意檢舉或無事證濫訴將受站管制！請客觀附述該用戶疑似開掛、異常積分飆升、作答速度異常之理由。</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">涉嫌事由與異常特徵描述</label>
                        <textarea
                          rows={3}
                          value={cheatReportReason}
                          onChange={(e) => setCheatReportReason(e.target.value)}
                          placeholder="例如：在短短數秒內答完上千道知識關卡、多帳號相互勾結、積分短時間暴增等。"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-none focus:border-rose-500 font-sans"
                          required
                        ></textarea>
                      </div>

                      <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                        <button type="button" onClick={() => setShowCheatReportModal(false)} className="px-3.5 py-1.5 border border-slate-200 text-slate-500 rounded-lg font-bold text-xs cursor-pointer">取消</button>
                        <button type="submit" className="px-5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer">送出調查檢舉</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Modal 7: Quota request modal */}
              {showQuotaRequestModal && (
                <div id="quota-request-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-100 shadow-xl space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center space-x-1.5">
                        <span className="text-teal-600 text-lg">💎</span>
                        <span>傳奇市民特權：向站主申請追加特權次數</span>
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => setShowQuotaRequestModal(false)} 
                        className="text-slate-400 hover:text-slate-600 font-bold text-xs select-none cursor-pointer w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleQuotaRequestSubmit} className="space-y-4 font-sans">
                      <div className="bg-teal-55 rounded-lg p-2.5 text-teal-800 text-[10px] leading-normal border border-teal-100 flex items-start space-x-1">
                        <span className="text-xs">💡</span>
                        <span>作為 7 階傳奇市民，當您的限制特權用完時，您可以挑選特定的特權技能並申請追加更多額度次數，提交後將呈報至站主後台審核。</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-550 block">選擇需要追加額度的特權種類</label>
                        <select
                          value={quotaPerkType}
                          onChange={(e) => setQuotaPerkType(e.target.value as any)}
                          className="w-full border border-slate-205 bg-white rounded-lg p-2 text-xs text-slate-705 outline-none font-bold"
                          required
                        >
                          <option value="T3">白銀 (3 階) 朋友一鍵提拔直升額度</option>
                          <option value="T5">白金 (5 階) 朋友一鍵提拔直升額度</option>
                          <option value="BAN_OTHER">傳奇 1 小時強制臨時封鎖違規帳戶額度</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-550 block">選擇或填寫需要追加的次數</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={quotaRequestCount}
                            onChange={(e) => setQuotaRequestCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                            className="w-24 border border-slate-205 rounded-lg p-2 text-xs text-slate-705 outline-none font-bold font-mono"
                            required
                          />
                          <span className="text-xs text-slate-500 font-semibold">次 (限定 1 ~ 50 次)</span>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                        <button 
                          type="button" 
                          onClick={() => setShowQuotaRequestModal(false)} 
                          className="px-3.5 py-1.5 border border-slate-200 text-slate-505 rounded-lg font-bold text-xs cursor-pointer hover:bg-slate-50"
                        >
                          取消
                        </button>
                        <button 
                          type="submit" 
                          className="px-5 py-1.5 bg-teal-650 hover:bg-teal-550 text-white font-extrabold rounded-lg text-xs cursor-pointer shadow-xs transition-all"
                        >
                          遞交加碼申請
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              {/* MODALS RENDERING END */}

          {/* TAB 1: Analytics Report */}
          {activeTab === "analytics" && (
            <div className="space-y-6 font-sans">
              {currentSurvey ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                  
                  {/* Title banner */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        問卷統計報告 ({currentSurvey.id})
                      </span>
                      <h2 className="text-lg font-bold text-slate-800 mt-1">{currentSurvey.title}</h2>
                    </div>
                    
                    {/* CSV Export Button */}
                    <button
                      id="export-csv-btn"
                      onClick={() => exportSurveyToCSV(currentSurvey, responses.filter(r => r.surveyId === currentSurvey.id))}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs text-white rounded-xl flex items-center space-x-1 shadow-sm shrink-0 duration-150 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>匯出此問卷 CSV 格式</span>
                    </button>
                  </div>

                  {/* Summary Bento stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                      <span className="text-xs text-slate-400">總填答回收份數</span>
                      <p className="text-2xl font-bold font-mono text-slate-800 mt-1">
                        {responses.filter(r => r.surveyId === currentSurvey.id).length} <span className="text-xs text-slate-500 font-normal">份</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                      <span className="text-xs text-slate-400">密碼防護狀態</span>
                      <div className="flex items-center space-x-1 text-slate-800 mt-1.5">
                        {currentSurvey.passwordRequired ? (
                          <>
                            <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                            <span className="text-xs font-bold text-rose-600">密碼驗證: {currentSurvey.password}</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs font-bold text-emerald-600">開放填寫 (無密碼)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                      <span className="text-xs text-slate-400">開放效期狀態</span>
                      <p className="text-xs font-semibold text-slate-700 mt-1.5 leading-tight">
                        {currentSurvey.startTime ? `${new Date(currentSurvey.startTime).toLocaleDateString()}` : "即日起"} 
                        <span> ~ </span>
                        {currentSurvey.endTime ? `${new Date(currentSurvey.endTime).toLocaleDateString()}` : "無期限限制"}
                      </p>
                    </div>
                  </div>

                  {/* Question analysis */}
                  <div className="space-y-6 pt-2">
                    <h3 className="text-sm font-bold text-slate-700 border-l-4 border-indigo-500 pl-2">📊 填答分布統計</h3>
                    
                    {currentSurvey.questions.map((q, idx) => {
                      const qResponses = responses.filter(r => r.surveyId === currentSurvey.id);
                      const qAnswers = qResponses.map(r => r.answers[q.id]).filter(val => val !== undefined && val !== null);

                      return (
                        <div key={q.id} className="p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-xs font-bold text-indigo-900 leading-relaxed mb-3">
                            問項 {idx + 1}：{q.title} <span className="font-normal text-slate-400">({q.type})</span>
                          </p>

                          {/* Render statistics according to type */}
                          {q.type === "SINGLE_CHOICE" && q.options && (
                            <div className="space-y-2">
                              {q.options.map((opt) => {
                                const count = qAnswers.filter(a => a === opt).length;
                                const pct = qAnswers.length > 0 ? Math.round((count / qAnswers.length) * 100) : 0;
                                return (
                                  <div key={opt} className="space-y-1">
                                    <div className="flex justify-between text-xs font-medium">
                                      <span className="text-slate-700">{opt}</span>
                                      <span className="text-slate-500 font-mono">{count} 票 ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                      <div className="bg-indigo-500 h-full cursor-pointer transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.type === "MULTI_CHOICE" && q.options && (
                            <div className="space-y-2">
                              {q.options.map((opt) => {
                                const count = qAnswers.filter((a: any) => Array.isArray(a) && a.includes(opt)).length;
                                const pct = qAnswers.length > 0 ? Math.round((count / qAnswers.length) * 100) : 0;
                                return (
                                  <div key={opt} className="space-y-1">
                                    <div className="flex justify-between text-xs font-medium">
                                      <span className="text-slate-700">{opt}</span>
                                      <span className="text-slate-500 font-mono">{count} 人選中 ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                      <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.type === "RATING" && (
                            <div>
                              <div className="flex items-center space-x-1.5 mb-2 font-mono">
                                <span className="text-xs text-slate-500">平均星等：</span>
                                {qAnswers.length > 0 ? (
                                  <>
                                    <span className="text-lg font-bold text-amber-600">
                                      {(qAnswers.reduce((sum: number, cur: any) => sum + Number(cur), 0) / qAnswers.length).toFixed(1)}
                                    </span>
                                    <span className="text-xs text-slate-400">/ 5 星</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400">暫無評分</span>
                                )}
                              </div>
                              <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const count = qAnswers.filter(a => Number(a) === star).length;
                                  const pct = qAnswers.length > 0 ? Math.round((count / qAnswers.length) * 100) : 0;
                                  return (
                                    <div key={star} className="flex-1 bg-white p-2 border border-slate-100 rounded text-center">
                                      <span className="text-[10px] text-slate-400 font-semibold">{star}星</span>
                                      <div className="h-10 bg-slate-50 rounded mt-1 relative flex items-end overflow-hidden">
                                        <div className="bg-amber-400 w-full" style={{ height: `${pct}%` }} />
                                      </div>
                                      <span className="text-[9px] font-mono font-bold text-slate-500 block mt-1">{count}人</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {(q.type === "SHORT_TEXT" || q.type === "PARAGRAPH") && (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {qAnswers.length > 0 ? (
                                qAnswers.map((ans, aIdx) => (
                                  <div key={aIdx} className="bg-white p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 font-mono">
                                    {String(ans)}
                                  </div>
                                ))
                              ) : (
                                <p className="text-[11px] text-slate-400">目前尚無回收意見文本</p>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                </div>
              ) : (
                <div className="bg-white p-12 text-center rounded-2xl border text-slate-400">
                  ⚠️ 請在側邊欄指定您欲查看的可存取表單統計
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Submissions Manager */}
          {activeTab === "submissions" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">📋 資料庫回收表單原始數據</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    當前篩選問卷：<strong className="text-slate-800 font-bold">{currentSurvey?.title}</strong>
                  </p>
                </div>
                <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">
                  管理者與操作員均具備改寫問卷之編輯特權
                </div>
              </div>

              {currentSurvey ? (
                <div className="space-y-4">
                  {/* DataTable */}
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-bold tracking-wider uppercase">
                          <th className="py-2.5 px-3">填寫編號</th>
                          <th className="py-2.5 px-3">提交時間</th>
                          <th className="py-2.5 px-3">填答者 (信箱)</th>
                          <th className="py-2.5 px-3">答案預覽 (主要部分題)</th>
                          <th className="py-2.5 px-3 text-center">特權動作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {responses.filter(r => r.surveyId === currentSurvey.id).length > 0 ? (
                          responses.filter(r => r.surveyId === currentSurvey.id).map((res) => (
                            <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-3 text-slate-600 font-bold font-mono">{res.id}</td>
                              <td className="py-3 px-3 text-slate-400">{res.submittedAt}</td>
                              <td className="py-3 px-3 font-medium text-slate-700 max-w-[120px] truncate">{res.submittedBy || "匿名"}</td>
                              <td className="py-3 px-3 text-slate-500 font-sans max-w-[200px] truncate">
                                {Object.entries(res.answers).map(([qid, val]) => {
                                  const qNode = currentSurvey.questions.find(q => q.id === qid);
                                  return qNode ? `${qNode.title.slice(0, 5)}...: ${Array.isArray(val) ? val.join(",") : val}; ` : "";
                                })}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  {/* Prominent Online correction button (線上修改更正) */}
                                  <button
                                    id={`edit-resp-btn-${res.id}`}
                                    onClick={() => handleOpenEditResponseModal(res)}
                                    className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-[10px] text-white rounded shadow-sm border border-amber-300 hover:scale-[1.03] transition-all cursor-pointer"
                                  >
                                    線上修改更正
                                  </button>

                                  <button
                                    id={`delete-resp-btn-${res.id}`}
                                    onClick={() => handleDeleteResponse(res.id, currentSurvey.title, currentSurvey.id)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                                    title="刪除此筆問卷"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-slate-400 font-sans">
                              此問卷目前暫無任何被記錄的填答回收。
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Sub-Query system launchers tied to this questionnaire */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                        <Share2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>獨立查詢子系統通道 (互不受切換干擾、專屬直連填寫/查詢點)</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">您可以點擊以下通道進入特定專門職等人員的獨立密碼修正查詢頁面：</p>
                    </div>

                    {currentSurvey.querySystems && currentSurvey.querySystems.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentSurvey.querySystems.map((sys) => {
                          const directUrlFill = `${window.location.origin}/#fill/${currentSurvey.id}`;
                          const directUrlQuery = `${window.location.origin}/#query/${currentSurvey.id}/${sys.id}`;

                          return (
                            <div key={sys.id} className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm space-y-2">
                              <span className="text-[9px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded font-mono">
                                子系統 ID: {sys.id}
                              </span>
                              <h4 className="text-xs font-bold text-slate-800">{sys.name}</h4>
                              <p className="text-[10px] text-slate-400 max-w-xs truncate">更正項目包括：{sys.editableQuestionIds.join(", ")}</p>
                              
                              <div className="space-y-1.5 pt-1.5 border-t border-slate-50">
                                <button
                                  id={`launch-query-sys-${sys.id}`}
                                  onClick={() => onSelectQuerySystem(currentSurvey, sys)}
                                  className="w-full py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded transition-all cursor-pointer text-center"
                                >
                                  進入查詢子系統 UI
                                </button>
                                
                                <div className="text-[9px] text-slate-400 font-mono space-y-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 shrink-0">直達填寫：</span>
                                    <span className="text-slate-800 font-bold select-all truncate max-w-[120px]" title={directUrlFill}>{directUrlFill}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 shrink-0">直達查詢：</span>
                                    <span className="text-amber-800 font-bold select-all truncate max-w-[120px]" title={directUrlQuery}>{directUrlQuery}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">此問卷目前暫無任何指派的子查詢系統防線。</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center py-6 text-slate-400">目前尚無指定數據</p>
              )}
            </div>
          )}

          {/* TAB 3: Survey planner and query subsystem management */}
          {activeTab === "survey_configs" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-8">
              
              {editingSurveyId ? (
                /* SECTION A: THE UNIFIED INTEGRATED SURVEY & SUB-QUERY PLANNER EDITOR */
                <div className="p-1 space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-2">
                    <div>
                      <span className="text-[10px] bg-slate-900 text-white font-extrabold px-2 py-0.5 rounded font-mono">問卷編輯識別碼：{editingSurveyId}</span>
                      <h3 className="text-lg font-bold text-slate-805 mt-1">🔧 問卷欄位規格與子系統防護整合編輯器</h3>
                      <p className="text-xs text-slate-400">在此自由變更問題說明文字、新增或拖曳排序欄位，並將子查詢頻道與查核鍵合併於此頁統一管控。</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingSurveyId(null)}
                      className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      ✕ 關閉並返回列表
                    </button>
                  </div>

                  {/* PROMINENT DIRECT LINKS VISUALIZER WITH COPY */}
                  <div className="bg-blue-50/85 border border-blue-100 p-4 rounded-2xl space-y-3.5">
                    <h4 className="text-xs font-extrabold text-blue-900 flex items-center">
                      <Link className="w-3.5 h-3.5 mr-1" />
                      <span>🔗 問卷填寫及安全子系統直達網址一鍵複製 (前台填寫與後台查詢)</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="p-3.5 bg-white border border-blue-100 rounded-xl space-y-1.5 shadow-sm">
                        <span className="text-[10px] font-bold text-slate-400 block">📝 問卷直接填寫通道連結</span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}${window.location.pathname}#fill/${editingSurveyId}`}
                            className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded font-mono text-[10px] text-slate-600 outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#fill/${editingSurveyId}`);
                              alert("🎉 問卷直達填寫網址已成功複製！");
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm cursor-pointer shrink-0"
                          >
                            複製
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 bg-white border border-blue-105 rounded-xl space-y-1.5 shadow-sm">
                        <span className="text-[10px] font-bold text-slate-400 block">🛡️ 安全防護子查詢分流直達連結</span>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                          {questionnaires.find(q => q.id === editingSurveyId)?.querySystems?.map((sys) => {
                            const sysUrl = `${window.location.origin}${window.location.pathname}#query/${editingSurveyId}/${sys.id}`;
                            return (
                              <div key={sys.id} className="flex items-center justify-between p-1.5 bg-slate-50 rounded border-b border-slate-100 last:border-b-0">
                                <div className="flex items-center space-x-1.5 truncate max-w-[170px]">
                                  <span className="text-[10px] font-bold text-slate-700 truncate" title={sys.name}>
                                    {sys.name}
                                  </span>
                                  {sys.hideInHall ? (
                                    <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-200 px-1 rounded font-bold shrink-0">
                                      大廳隱藏
                                    </span>
                                  ) : (
                                    <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1 rounded font-bold shrink-0">
                                      大廳公開
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(sysUrl);
                                    alert(`🎉 子查詢分流「${sys.name}」直達網址已複製至剪貼簿！`);
                                  }}
                                  className="px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] rounded-md shadow-sm cursor-pointer shrink-0 transition-transform active:scale-95"
                                >
                                  複製通道網址
                                </button>
                              </div>
                            );
                          })}
                          {(!questionnaires.find(q => q.id === editingSurveyId)?.querySystems || questionnaires.find(q => q.id === editingSurveyId)?.querySystems.length === 0) && (
                            <p className="text-[10px] text-slate-400 italic mt-1.5">此問卷目前尚未指派建立任何安全查詢子系統。請在下方建立第一個。</p>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* STEP 1: Survey Basic configurations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2 p-4 bg-white rounded-2xl border border-slate-150 shadow-sm">
                    <div className="space-y-1 col-span-2">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest border-l-2 border-slate-700 pl-2">一、問卷基礎名稱與日期限制</h4>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-550">問卷標題</label>
                      <input
                        type="text"
                        value={editSurveyTitle}
                        onChange={(e) => setEditSurveyTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold focus:border-slate-800 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-550">啟用與截止時間</label>
                      <div className="flex space-x-1">
                        <input
                          type="datetime-local"
                          value={editSurveyStart}
                          onChange={(e) => setEditSurveyStart(e.target.value)}
                          className="w-1/2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-mono"
                        />
                        <input
                          type="datetime-local"
                          value={editSurveyEnd}
                          onChange={(e) => setEditSurveyEnd(e.target.value)}
                          className="w-1/2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-bold text-slate-550">填表說明/前導文描述內容</label>
                      <textarea
                        rows={2}
                        value={editSurveyDesc}
                        onChange={(e) => setEditSurveyDesc(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs focus:border-slate-800 focus:bg-white"
                      />
                    </div>

                    <div className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-105 col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editSurveyPwReq}
                            onChange={(e) => setEditSurveyPwReq(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                          />
                          <span>限制必須填寫問卷金鑰解鎖密碼</span>
                        </label>
                        {editSurveyPwReq && (
                          <input
                            type="text"
                            placeholder="設定前台填表解鎖密碼..."
                            value={editSurveyPw}
                            onChange={(e) => setEditSurveyPw(e.target.value)}
                            className="bg-white border rounded border-slate-200 p-2 w-full text-xs font-mono"
                          />
                        )}
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer select-none mb-2">
                          <input
                            type="checkbox"
                            checked={editSurveyEmail}
                            onChange={(e) => setEditSurveyEmail(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                          />
                          <span>填答送出自動派發電子郵件副本（給填寫人自留）</span>
                        </label>
                      </div>

                      {currentUser.role === UserRole.SUPER_ADMIN && (
                        <div className="md:col-span-2 pt-2 border-t border-slate-200 mt-1">
                          <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={editSurveyDistributedToAdmins}
                              onChange={(e) => setEditSurveyDistributedToAdmins(e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-teal-600 cursor-pointer"
                            />
                            <span className="flex items-center text-teal-900 font-bold">
                              <span className="bg-teal-100 text-teal-950 text-[9px] px-1.5 py-0.5 rounded font-extrabold mr-1.5 shrink-0">特權下發</span>
                              <span>下發授權此問卷項目至「系統管理員」（開啟後，系統管理員具有對此表格的所有共同檢閱與編輯權限）</span>
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STEP 2: Questions customized builder List */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-150 shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-605 uppercase tracking-widest border-l-2 border-indigo-700 pl-2">
                      二、問卷題目自訂（可直接修改題目、必填與選項內容，並拖拽排序）
                    </h4>

                    {/* Draggable/Re-ordered items */}
                    <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                      {editSurveyQuestions.map((q, qidx) => (
                        <div key={q.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200/50 pb-1.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-200/40 px-1.5 py-0.5 rounded">
                              編輯問題項目 #{qidx + 1} (技術唯一鍵: {q.id})
                            </span>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                disabled={qidx === 0}
                                onClick={() => handleEditorMoveQuestion(qidx, "up")}
                                className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-40 font-bold text-xs select-none cursor-pointer"
                                title="上移題目順序"
                              >
                                ↑ 上移
                              </button>
                              <button
                                type="button"
                                disabled={qidx === editSurveyQuestions.length - 1}
                                onClick={() => handleEditorMoveQuestion(qidx, "down")}
                                className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-40 font-bold text-xs select-none cursor-pointer"
                                title="下移題目順序"
                              >
                                ↓ 下移
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditorRemoveQuestion(q.id)}
                                className="px-2.5 py-1 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold rounded-md cursor-pointer"
                              >
                                移除此題目
                              </button>
                            </div>
                          </div>

                          {/* Options editor */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1 md:col-span-1.5">
                              <label className="text-[9px] font-bold text-slate-400 block">題目說明文字</label>
                              <input
                                type="text"
                                value={q.title}
                                onChange={(e) => {
                                  const updated = [...editSurveyQuestions];
                                  updated[qidx].title = e.target.value;
                                  setEditSurveyQuestions(updated);
                                }}
                                className="bg-white border rounded border-slate-200 text-xs p-1.5 w-full font-medium"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 block">欄位格式</label>
                              <select
                                value={q.type}
                                onChange={(e) => {
                                  const updated = [...editSurveyQuestions];
                                  updated[qidx].type = e.target.value as QuestionType;
                                  if (updated[qidx].type !== "SINGLE_CHOICE" && updated[qidx].type !== "MULTI_CHOICE") {
                                    delete updated[qidx].options;
                                  } else {
                                    updated[qidx].options = updated[qidx].options || ["選項A", "選項B"];
                                  }
                                  setEditSurveyQuestions(updated);
                                }}
                                className="bg-white border rounded border-slate-200 text-xs p-1.5 w-full font-bold select-none"
                              >
                                <option value="SHORT_TEXT">簡答輸入框 (Short Text)</option>
                                <option value="PARAGRAPH">申論大段落 (Paragraph)</option>
                                <option value="SINGLE_CHOICE">單選對話按鈕 (MCQ)</option>
                                <option value="MULTI_CHOICE">多選核取方框 (Checkbox)</option>
                                <option value="RATING">滿意度星級評論 (Rating 1-5)</option>
                              </select>
                            </div>

                            <div className="flex items-center pt-3.5">
                              <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={q.required}
                                  onChange={(e) => {
                                    const updated = [...editSurveyQuestions];
                                    updated[qidx].required = e.target.checked;
                                    setEditSurveyQuestions(updated);
                                  }}
                                  className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                />
                                <span>強制定為「必填」欄位</span>
                              </label>
                            </div>
                          </div>

                          {(q.type === "SINGLE_CHOICE" || q.type === "MULTI_CHOICE") && (
                            <div className="space-y-1 pt-1">
                              <label className="text-[9px] font-bold text-slate-400 block">自訂選單選項值 (以英文半形逗號「 , 」隔開各選項)</label>
                              <input
                                type="text"
                                value={q.options ? q.options.join(",") : ""}
                                onChange={(e) => {
                                  const updated = [...editSurveyQuestions];
                                  updated[qidx].options = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                  setEditSurveyQuestions(updated);
                                }}
                                className="bg-white border rounded border-slate-200 text-xs p-1.5 font-mono w-full"
                                placeholder="例如: 滿意,一般,不滿意"
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {editSurveyQuestions.length === 0 && (
                        <p className="text-xs text-slate-400 italic">目前本問卷清單為空。請添加下方題目。</p>
                      )}
                    </div>

                    {/* Dynamic add new question inside editor */}
                    <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl space-y-3.5">
                      <span className="text-[11px] font-bold text-slate-600 block">➕ 新增另一題自訂題目與填寫框規格：</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="space-y-1 md:col-span-1.5">
                          <label className="text-[9px] font-bold text-slate-400 block">題目敘述內容</label>
                          <input
                            type="text"
                            value={editTempQTitle}
                            onChange={(e) => setEditTempQTitle(e.target.value)}
                            placeholder="例如: 您的主要工作或建議分流？"
                            className="bg-white border border-slate-250 p-1.5 rounded-lg text-xs w-full"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 block">欄位格式與行為</label>
                          <select
                            value={editTempQType}
                            onChange={(e) => setEditTempQType(e.target.value as QuestionType)}
                            className="bg-white border border-slate-250 p-1.5 rounded-lg text-xs w-full font-bold select-none"
                          >
                            <option value="SHORT_TEXT">簡答輸入框 (Short Text)</option>
                            <option value="PARAGRAPH">申論大段落 (Paragraph)</option>
                            <option value="SINGLE_CHOICE">單選對話按鈕 (MCQ)</option>
                            <option value="MULTI_CHOICE">多選核取方框 (Checkbox)</option>
                            <option value="RATING">滿意度星級評論 (Rating 1-5)</option>
                          </select>
                        </div>

                        <div className="flex items-center pt-3">
                          <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={editTempQRequired}
                              onChange={(e) => setEditTempQRequired(e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-blue-600"
                            />
                            <span>定為必填項目</span>
                          </label>
                        </div>
                      </div>

                      {(editTempQType === "SINGLE_CHOICE" || editTempQType === "MULTI_CHOICE") && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 block">選項內容設定 (請用半形英文逗號 [ , ] 隔開每個項目)</label>
                          <input
                            type="text"
                            value={editTempQOptions}
                            onChange={(e) => setEditTempQOptions(e.target.value)}
                            placeholder="選項一,選項二,選項三"
                            className="bg-white border border-slate-250 p-1.5 rounded-lg text-xs w-full font-mono"
                          />
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleEditorAddQuestion}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow duration-150 cursor-pointer"
                        >
                          + 填入此題目至問卷規格中
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: MERGED SUB-QUERY CONFIGURATION PANEL (合併只查詢系統的設定功能) */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-150 shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-605 uppercase tracking-widest border-l-2 border-amber-500 pl-2">
                      三、合併子查詢維護系統設定（挑選問卷中某特定題目作為查詢鎖鑰，並限制金鑰更正權限）
                    </h4>

                    {/* Existing specific sub-query templates listed inside this editor page */}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {questionnaires.find(q => q.id === editingSurveyId)?.querySystems?.map((sys) => {
                        const hasCustomKey = !!sys.searchQuestionId;
                        const customKeyNode = hasCustomKey 
                          ? editSurveyQuestions.find(q => q.id === sys.searchQuestionId) 
                          : null;
                        const lookupDesc = customKeyNode 
                          ? `重點定位題目: 「${customKeyNode.title}」` 
                          : "問卷預設之填答編號 (resp-xxx)";
                        const isBeingEdited = editingSubQueryId === sys.id;

                        return (
                          <div 
                            key={sys.id} 
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono gap-3 transition-colors ${
                              isBeingEdited 
                                ? "bg-amber-100/60 border-amber-400 shadow-sm ring-2 ring-amber-300/50" 
                                : "bg-amber-50/40 border-amber-200/70"
                            }`}
                          >
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <span className="font-bold text-slate-800 text-sm font-sans">{sys.name}</span>
                                <span className="text-[9px] bg-indigo-50 border border-indigo-250/25 text-indigo-700 px-1.5 py-0.5 rounded font-sans font-bold">
                                  查核校對鍵：{lookupDesc}
                                </span>
                                {sys.hideInHall ? (
                                  <span className="text-[9px] bg-rose-50 border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded font-sans font-bold flex items-center gap-1">
                                    🔒 大廳路徑已隱藏
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded font-sans font-bold flex items-center gap-1">
                                    🌐 大廳公開顯示
                                  </span>
                                )}
                                {isBeingEdited && (
                                  <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-sans font-bold animate-pulse">
                                    編輯修改中
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400">
                                安全防核: {sys.passwordRequired ? `密鑰鎖: ${sys.password || "已啟用"}` : "不設防"} | 更正授權問題數: {sys.editableQuestionIds?.length || 0} 個 | 前台大廳: {sys.hideInHall ? "🚫 隱藏路徑 (僅直達連結存取)" : "✅ 公開展示"}
                              </p>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0 flex-wrap gap-y-1">
                              {/* Quick Hall Visibility Toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleSubQueryHideInHall(editingSurveyId, sys.id)}
                                title={sys.hideInHall ? "點擊改為在問卷大廳公開顯示" : "點擊改為在問卷大廳隱藏路徑"}
                                className={`px-2 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-colors border ${
                                  sys.hideInHall
                                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                                }`}
                              >
                                {sys.hideInHall ? "切換為大廳公開" : "切換為大廳隱藏"}
                              </button>

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleStartEditSubQuery(sys)}
                                className="px-2.5 py-1 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-md cursor-pointer border border-blue-200"
                              >
                                ✏️ 修改設定
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteQuerySubsystem(editingSurveyId, sys.id, sys.name)}
                                className="px-2.5 py-1 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold rounded-md cursor-pointer border border-rose-200"
                              >
                                卸載並停用
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {(!questionnaires.find(q => q.id === editingSurveyId)?.querySystems || questionnaires.find(q => q.id === editingSurveyId)?.querySystems.length === 0) && (
                        <p className="text-xs text-slate-400 italic">目前尚未為此問卷配置任何獨立專利子查詢通道系統。</p>
                      )}
                    </div>

                    {/* Builder layout for adding nested sub-queries with customizable search options */}
                    <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          {editingSubQueryId ? (
                            <span className="text-blue-700 flex items-center gap-1.5">
                              <span>✏️ 正在修改子查詢系統設定：</span>
                              <span className="font-mono text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                                {editNewQueryName || editingSubQueryId}
                              </span>
                            </span>
                          ) : (
                            <span>➕ 派生此問卷之防護子查詢分流，並自訂查找項目欄：</span>
                          )}
                        </span>
                        {editingSubQueryId && (
                          <button
                            type="button"
                            onClick={handleCancelEditSubQuery}
                            className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                          >
                            ✕ 放棄修改，切換回新增模式
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500">分流顯示名稱 (例如: 社區理監事專用更正鍵)</label>
                          <input
                            type="text"
                            value={editNewQueryName}
                            onChange={(e) => setEditNewQueryName(e.target.value)}
                            placeholder="請填入子查詢渠道名"
                            className="w-full bg-white border border-slate-250 p-2 rounded-lg text-xs"
                          />
                        </div>

                        {/* SELECT QUESTION DIRECTLY AS SEARCH IDENTIFIER */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-indigo-900 flex items-center space-x-1">
                            <span>🎯 配置查核鍵 (子查詢定位校對鍵值)</span>
                            <span className="text-[8px] bg-indigo-100 text-indigo-850 px-1 py-0.2 rounded uppercase select-none font-extrabold">核心功能</span>
                          </label>
                          <select
                            value={editNewQuerySearchQId}
                            onChange={(e) => setEditNewQuerySearchQId(e.target.value)}
                            className="w-full bg-white border border-indigo-200 p-2 rounded-lg text-xs font-semibold text-indigo-950 focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="">預設系統：系統自動核發的填答申報碼 (resp-xxx)</option>
                            {editSurveyQuestions.map((q) => (
                              <option key={q.id} value={q.id}>
                                選擇題目：{q.title} ({q.type === "SHORT_TEXT" ? "簡答輸入" : "單多選評估"})
                              </option>
                            ))}
                          </select>
                          <p className="text-[9px] text-slate-400">系統支持此自定欄位！查詢人在首頁使用此分流查詢時，輸入該問題答案即可匹配出填表回覆！</p>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500">授權該子系統端「允許修改編輯」的資料問題範圍</label>
                          <div className="flex flex-wrap gap-2 p-2 bg-white rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                            {editSurveyQuestions.map((ques) => {
                              const isChecked = editNewQueryEditable.includes(ques.id);
                              return (
                                <label key={ques.id} className="flex items-center space-x-1.5 text-[10px] bg-slate-50 border border-slate-100 px-2 py-1 rounded-md cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditNewQueryEditable(prev => [...prev, ques.id]);
                                      } else {
                                        setEditNewQueryEditable(prev => prev.filter(i => i !== ques.id));
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded text-amber-600"
                                  />
                                  <span className="truncate max-w-[120px]" title={ques.title}>{ques.title}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 items-center">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editNewQueryPwReq}
                            onChange={(e) => setEditNewQueryPwReq(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-600">限制特權校驗密碼保護</span>
                        </div>

                        {editNewQueryPwReq && (
                          <input
                            type="text"
                            value={editNewQueryPw}
                            onChange={(e) => setEditNewQueryPw(e.target.value)}
                            placeholder="設定查詢端特權登入鎖..."
                            className="w-full bg-white border border-slate-300 p-1.5 rounded-lg text-xs font-mono"
                          />
                        )}
                      </div>

                      {/* NEW OPTION: HIDE IN QUESTIONNAIRE HALL TOGGLE (新增功能：選擇是否隱藏在問卷大廳的路徑) */}
                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-250/60 space-y-1">
                        <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            id="editNewQueryHideInHall"
                            checked={editNewQueryHideInHall}
                            onChange={(e) => setEditNewQueryHideInHall(e.target.checked)}
                            className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span>👁️ 隱藏在問卷大廳的路徑</span>
                              <span className="text-[9px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.2 rounded uppercase">
                                新增功能
                              </span>
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                              勾選啟用後，此子查詢入口不會在首頁「問卷大廳」的獨立查詢窗口列表中公開展示；僅持有專屬直達連結（例如：<code className="text-amber-700 font-mono">#query/{editingSurveyId}/...</code>）之人員能存取。
                            </span>
                          </div>
                        </label>
                      </div>

                      <div className="flex justify-end space-x-2 pt-1">
                        {editingSubQueryId && (
                          <button
                            type="button"
                            onClick={handleCancelEditSubQuery}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            ✕ 取消修改
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleEditorAddQuerySubsystem}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          {editingSubQueryId ? (
                            <span>💾 儲存修改子查詢系統</span>
                          ) : (
                            <span>➕ 確認在此問卷新增此子查詢通路</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ACTION BUTTONS */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditingSurveyId(null)}
                      className="px-4 py-2 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      不儲存返回列表
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSurveyEditor}
                      className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      確認保存並同步問卷與子查詢設定
                    </button>
                  </div>
                </div>
              ) : (
                /* SECTION B: CONVENTIONAL OVERVIEW LIST & CREATION FLOW */
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">🔧 問卷制定與子查詢系統管理</h2>
                      <p className="text-slate-500 text-xs mt-1">手動創建問卷，自定義啟用與到期時間，或為其指派多重安全隔離子查詢通道。</p>
                    </div>
                    {!isCreatingSurvey && (
                      <button
                        id="trigger-create-survey-mode"
                        onClick={() => {
                          if ((currentUser.role === UserRole.QUESTION_CREATOR || currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("creator_create", "出卷功能")) {
                            return;
                          }
                          setIsCreatingSurvey(true);
                        }}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>制定新問卷</span>
                      </button>
                    )}
                  </div>

                  {/* Questionnaire creation panel */}
                  {isCreatingSurvey ? (
                    <div className="p-5 border-2 border-indigo-200 bg-indigo-50/20 rounded-2xl space-y-4">
                      <h3 className="text-xs font-extrabold text-indigo-900 border-b border-indigo-100 pb-2 uppercase tracking-wide flex items-center space-x-1">
                        <span>📝 快速自定義問卷制定器</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">問卷標題</label>
                          <input
                            id="new-survey-title"
                            type="text"
                            placeholder="例如: 社區環境衛生回饋表"
                            value={newSurveyTitle}
                            onChange={(e) => setNewSurveyTitle(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">限制活動時間(起迄)</label>
                          <div className="flex space-x-1">
                            <input
                              id="new-survey-time-start"
                              type="datetime-local"
                              value={newSurveyStart}
                              onChange={(e) => setNewSurveyStart(e.target.value)}
                              className="w-1/2 bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:border-indigo-500 font-mono"
                              title="起始時間"
                            />
                            <input
                              id="new-survey-time-end"
                              type="datetime-local"
                              value={newSurveyEnd}
                              onChange={(e) => setNewSurveyEnd(e.target.value)}
                              className="w-1/2 bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:border-indigo-500 font-mono"
                              title="截止時間"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">問卷說明描述文字</label>
                        <textarea
                          id="new-survey-desc"
                          rows={2}
                          placeholder="請介紹此問卷的目的、宣導語與填載對象說明..."
                          value={newSurveyDesc}
                          onChange={(e) => setNewSurveyDesc(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:border-indigo-500"
                        />
                      </div>

                      {/* Anti-fraud password access and automatic email notifications settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-indigo-100">
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                            <input
                              id="new-survey-pw-checkbox"
                              type="checkbox"
                              checked={newSurveyPwReq}
                              onChange={(e) => setNewSurveyPwReq(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                            />
                            <span>限制必須填寫密碼才可填表</span>
                          </label>
                          
                          {newSurveyPwReq && (
                            <input
                              id="new-survey-pw-input"
                              type="text"
                              placeholder="請指定問卷填寫解鎖密碼..."
                              value={newSurveyPw}
                              onChange={(e) => setNewSurveyPw(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
                            />
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                            <input
                              id="new-survey-email-checkbox"
                              type="checkbox"
                              checked={newSurveyEmail}
                              onChange={(e) => setNewSurveyEmail(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                            />
                            <span className="flex items-center">
                              <Mail className="w-3.5 h-3.5 mr-1" />
                              <span>啟用電子郵件自動通知填寫者機制</span>
                            </span>
                          </label>
                          <p className="text-[9px] text-slate-400">啟用後，填寫者於送出時可指定其電子郵件信箱，系統將自動派送備份驗證通知信。</p>
                        </div>

                        {currentUser.role === UserRole.SUPER_ADMIN && (
                          <div className="space-y-2 md:col-span-2 pt-2 border-t border-slate-100">
                            <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                              <input
                                id="new-survey-distribute-checkbox"
                                type="checkbox"
                                checked={newSurveyDistributedToAdmins}
                                onChange={(e) => setNewSurveyDistributedToAdmins(e.target.checked)}
                                className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                              />
                              <span className="flex items-center text-teal-950 font-bold">
                                <span className="bg-teal-100 text-teal-905 text-[9px] px-1.5 py-0.5 rounded-md font-extrabold mr-1.5 shrink-0">特權下發</span>
                                <span>下發授權此問卷項目至「系統管理員」（開啟後，系統管理員具有對此表格的所有共同檢閱與編輯權限）</span>
                              </span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Add questions block */}
                      <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 font-sans">添加問卷題目</h4>
                        
                        <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-lg">
                          <div className="flex gap-2">
                            <input
                              id="temp-q-title"
                              type="text"
                              placeholder="題目敘述問題？"
                              value={tempQTitle}
                              onChange={(e) => setTempQTitle(e.target.value)}
                              className="flex-1 bg-white border border-slate-250 p-2 rounded text-xs"
                            />
                            <select
                              id="temp-q-type"
                              value={tempQType}
                              onChange={(e) => setTempQType(e.target.value as any)}
                              className="bg-white border border-slate-250 p-2 rounded text-xs font-bold"
                            >
                              <option value="SINGLE_CHOICE">單選題 (MCQ)</option>
                              <option value="MULTI_CHOICE">多選題 (Checkbox)</option>
                              <option value="SHORT_TEXT">簡答題 (Short Text)</option>
                              <option value="PARAGRAPH">詳答申論題 (Paragraph)</option>
                              <option value="RATING">滿意度星評 (Rating 1-5)</option>
                            </select>
                          </div>

                          {/* Display choices input conditionally */}
                          {(tempQType === "SINGLE_CHOICE" || tempQType === "MULTI_CHOICE") && (
                            <input
                              id="temp-q-options"
                              type="text"
                              placeholder="選項 (請用半形英文逗號 [ , ] 隔開每個選項)"
                              value={tempQOptions}
                              onChange={(e) => setTempQOptions(e.target.value)}
                              className="w-full bg-white border border-slate-250 p-2 rounded text-xs font-mono"
                            />
                          )}

                          <div className="flex justify-between items-center">
                            <label className="flex items-center space-x-2 text-[10px] text-slate-500 cursor-pointer">
                              <input
                                id="temp-q-required-checkbox"
                                type="checkbox"
                                checked={tempQRequired}
                                onChange={(e) => setTempQRequired(e.target.checked)}
                                className="w-3 h-3 text-indigo-600 rounded cursor-pointer"
                              />
                              <span>設定此題為「必填」問題</span>
                            </label>
                            <button
                              id="add-q-to-temp-list-btn"
                              type="button"
                              onClick={handleAddQuestionToTemp}
                              className="py-1 px-3 bg-indigo-600 text-white font-bold text-xs rounded duration-150 cursor-pointer"
                            >
                              + 填入此題目至清單
                            </button>
                          </div>
                        </div>

                        {newSurveyQs.length > 0 && (
                          <div className="space-y-1.5 pt-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">已分配問題清單:</span>
                            <div className="space-y-1 max-h-36 overflow-y-auto">
                              {newSurveyQs.map((q, qidx) => (
                                <div key={q.id} className="p-2 bg-slate-50 text-[11px] font-mono rounded flex justify-between items-center border border-slate-200">
                                  <span className="text-slate-700">
                                    {qidx+1}. {q.title} ({q.type === "SINGLE_CHOICE" ? "單選" : q.type === "MULTI_CHOICE" ? "多選" : q.type === "RATING" ? "評級" : "文本型"}) {q.required && " *"}
                                  </span>
                                  <button
                                    id={`remove-q-from-temp-${q.id}`}
                                    onClick={() => setNewSurveyQs(prev => prev.filter(item => item.id !== q.id))}
                                    className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                                  >
                                    移除
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions summary */}
                      <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 font-sans">
                        <button
                          id="cancel-create-survey-btn"
                          type="button"
                          onClick={() => setIsCreatingSurvey(false)}
                          className="py-1.5 px-3 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          id="save-new-survey-btn"
                          type="button"
                          onClick={handleSaveNewSurvey}
                          className="py-1.5 px-5 bg-slate-950 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                        >
                          儲存並公開此自訂問卷
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Questionnaire management list */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 font-sans">📋 目前發布中之自定義問卷與管理：</h3>
                    <div className="grid grid-cols-1 gap-5">
                      {getSortedQuestionnaires(accessibleQuestionnaires).map((q) => (
                        <div key={q.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-150 shadow-sm space-y-4 font-sans text-xs">
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div>
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">ID: {q.id}</span>
                                <span className={`w-2 h-2 rounded-full ${q.isActive ? "bg-emerald-500 animate-ping" : "bg-rose-500"}`} />
                                <span className="text-[10px] font-bold text-slate-500">{q.isActive ? "填寫中" : "停用/待啟用"}</span>
                                {q.distributedToAdmins === false && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-200 font-bold px-1.5 py-0.5 rounded-md shadow-xs">🔒 僅超級管理員可控</span>
                                )}
                                {(() => {
                                  const sortedSurveys = getSortedQuestionnaires(accessibleQuestionnaires);
                                  const surveyIdx = sortedSurveys.findIndex(item => item.id === q.id);
                                  return (
                                    <div className="flex items-center space-x-1 ml-2">
                                      <button
                                        id={`move-up-survey-${q.id}`}
                                        type="button"
                                        onClick={() => handleMoveSurveyLocal(q.id, "up")}
                                        disabled={surveyIdx === 0}
                                        className={`px-2 py-1 rounded-md border text-[9px] font-bold transition-all cursor-pointer ${
                                          surveyIdx === 0
                                            ? "bg-slate-100 text-slate-350 border-slate-200 cursor-not-allowed"
                                            : "bg-slate-800 text-white hover:bg-slate-700 border-slate-900 active:scale-95"
                                        }`}
                                        title="上移此問卷於此帳號之排序"
                                      >
                                        ▲ 上移
                                      </button>
                                      <button
                                        id={`move-down-survey-${q.id}`}
                                        type="button"
                                        onClick={() => handleMoveSurveyLocal(q.id, "down")}
                                        disabled={surveyIdx === sortedSurveys.length - 1}
                                        className={`px-2 py-1 rounded-md border text-[9px] font-bold transition-all cursor-pointer ${
                                          surveyIdx === sortedSurveys.length - 1
                                            ? "bg-slate-100 text-slate-350 border-slate-200 cursor-not-allowed"
                                            : "bg-slate-800 text-white hover:bg-slate-700 border-slate-900 active:scale-95"
                                        }`}
                                        title="下移此問卷於此帳號之排序"
                                      >
                                        ▼ 下移
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                              <h4 className="text-base font-bold text-slate-800 mt-1.5">{q.title}</h4>
                              <p className="text-[11px] text-slate-400 mt-1 max-w-xl">{q.description}</p>

                              {/* Citizen Suggestions block */}
                              {((q as any).suggestions && (q as any).suggestions.length > 0) ? (
                                <div className="mt-4 p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-extrabold text-indigo-900 flex items-center gap-1.5">
                                      💡 答題市民推薦增設的題目提案 ({((q as any).suggestions).length} 筆)
                                    </span>
                                  </div>
                                  <div className="divide-y divide-indigo-100/60 max-h-48 overflow-y-auto pr-1">
                                    {((q as any).suggestions).map((sug: any) => (
                                      <div key={sug.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                                        <div className="flex items-start justify-between gap-2 border-b border-dashed border-indigo-100/40 pb-2">
                                          <div>
                                            <p className="text-xs font-bold text-slate-800">
                                              {sug.title}
                                            </p>
                                            <p className="text-[10px] text-indigo-500 font-medium">
                                              題型: <span className="font-bold">{sug.type}</span> &bull; 提案人: <span className="font-bold underline">{sug.author}</span> ({sug.createdAt})
                                            </p>
                                            {sug.options && sug.options.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {sug.options.map((opt: string, oi: number) => (
                                                  <span key={oi} className="text-[9px] bg-white border border-slate-200 text-slate-500 px-1 py-0.5 rounded">
                                                    {opt}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center space-x-1.5 self-center shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => handleImportSuggestion(q.id, sug)}
                                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] rounded-lg shadow-xs cursor-pointer"
                                            >
                                              採納匯入
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleRejectSuggestion(q.id, sug.id)}
                                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-[9px] rounded-lg cursor-pointer"
                                            >
                                              忽視
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <div className="flex space-x-1.5">
                              {/* TRIGGER INTEGRATED CONFIGURATION & QUESTION RE-ORDERING EDITOR */}
                              {currentUser.role === UserRole.QUESTION_CREATOR && currentUser.starLevel < 2 ? (
                                <button
                                  type="button"
                                  disabled
                                  className="px-3 py-1.5 bg-slate-100 text-slate-400 font-bold text-[10px] rounded-lg cursor-not-allowed"
                                  title="出題人等級需達到 2 階才可進行修改設定！"
                                >
                                  🔒 需晉升 2階解鎖編輯
                                </button>
                              ) : (
                                <button
                                  id={`edit-survey-configs-btn-${q.id}`}
                                  onClick={() => {
                                    if ((currentUser.role === UserRole.QUESTION_CREATOR || currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("creator_edit", "編輯功能")) {
                                      return;
                                    }
                                    if (currentUser.role === UserRole.OPERATOR && (!checkFeatureAccess("operator_all_operations", "問卷整體操作權限") || !checkFeatureAccess(`operator_operate_${q.id}`, `操作問卷：${q.title}`))) {
                                      return;
                                    }
                                    setEditingSurveyId(q.id);
                                    // Copy values to editor state
                                    setEditSurveyTitle(q.title);
                                    setEditSurveyDesc(q.description || "");
                                    setEditSurveyStart(q.startTime || "");
                                    setEditSurveyEnd(q.endTime || "");
                                    setEditSurveyPwReq(q.passwordRequired || false);
                                    setEditSurveyPw(q.password || "");
                                    setEditSurveyEmail(q.emailNotificationEnabled || false);
                                    setEditSurveyQuestions([...q.questions]);
                                    setEditSurveyDistributedToAdmins(q.distributedToAdmins !== false);
                                  }}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-sm cursor-pointer transition-transform duration-75 active:scale-95"
                                >
                                  📝 整合修改與問卷欄位設定
                                </button>
                              )}

                              {currentUser.role === UserRole.QUESTION_CREATOR && currentUser.starLevel < 2 ? (
                                <button
                                  type="button"
                                  disabled
                                  className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
                                >
                                  🔒 2階解鎖啟用填表
                                </button>
                              ) : (
                                <button
                                  id={`toggle-survey-status-${q.id}`}
                                  onClick={() => {
                                    if ((currentUser.role === UserRole.QUESTION_CREATOR || currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("creator_edit", "編輯功能")) {
                                      return;
                                    }
                                    const updated = questionnaires.map(item => item.id === q.id ? { ...item, isActive: !item.isActive } : item);
                                    onUpdateQuestionnaires(updated);
                                    addLog(
                                      q.isActive ? "手動停用問卷" : "手動啟用問卷",
                                      q.title,
                                      `問卷與通道狀態切換為: ${!q.isActive ? "在線啟用" : "手動停用"}`
                                    );
                                  }}
                                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer ${
                                    q.isActive 
                                      ? "bg-amber-100 text-amber-800" 
                                      : "bg-emerald-105 text-emerald-800 bg-emerald-100"
                                  }`}
                                >
                                  {q.isActive ? "停用填表" : "重啟填表"}
                                </button>
                              )}
                              
                              {currentUser.role === UserRole.QUESTION_CREATOR && currentUser.starLevel < 3 ? (
                                <button
                                  type="button"
                                  disabled
                                  className="px-2.5 py-1.5 bg-slate-100 text-slate-400 font-bold text-[10px] rounded-lg cursor-not-allowed"
                                  title="出題人等級需達到 3 階才可刪除！"
                                >
                                  🔒 需 3階解鎖刪除
                                </button>
                              ) : (
                                <button
                                  id={`delete-survey-completely-${q.id}`}
                                  onClick={() => {
                                    if ((currentUser.role === UserRole.QUESTION_CREATOR || currentUser.role === UserRole.SYSTEM_ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && !checkFeatureAccess("creator_delete", "刪除功能")) {
                                      return;
                                    }
                                    handleDeleteSurvey(q.id, q.title);
                                  }}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg duration-75"
                                  title="刪除此問卷數據"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* DIRECT LINKS COPY DEPOT IN VISIBLE POSITION */}
                          <div className="p-4 bg-blue-50/50 border border-blue-55 rounded-xl space-y-2.5 font-sans">
                            <span className="font-bold text-blue-900 text-xs block flex items-center">
                              <Link className="w-3.5 h-3.5 mr-1 text-blue-700" />
                              <span>🔗 本問卷直達填寫網址與子查詢分流複製 (顯眼分享區)</span>
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-sans">
                              
                              <div className="flex items-center space-x-1.5 bg-white p-2 rounded-xl border border-blue-100 shadow-xs">
                                <span className="text-[9px] font-extrabold text-slate-400 select-none shrink-0">📝 填表連結:</span>
                                <input
                                  type="text"
                                  readOnly
                                  value={`${window.location.origin}${window.location.pathname}#fill/${q.id}`}
                                  className="bg-transparent text-[10px] text-slate-600 truncate w-full outline-none font-mono tracking-tight"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#fill/${q.id}`);
                                    alert("🎉 問卷直達填寫網址已複製至剪貼簿！");
                                  }}
                                  className="px-2.5 py-1 bg-blue-650 hover:bg-blue-700 text-blue-600 hover:text-white border border-blue-200 bg-white hover:bg-blue-600 font-extrabold text-[9px] rounded-lg shrink-0 whitespace-nowrap cursor-pointer transition-colors"
                                >
                                  複製填表
                                </button>
                              </div>

                              <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-xs space-y-1.5">
                                <span className="text-[9px] font-extrabold text-slate-400 select-none block">🛡️ 安全防護子查詢分流連结：</span>
                                {q.querySystems && q.querySystems.length > 0 ? (
                                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-0.5">
                                    {q.querySystems.map(sys => {
                                      const hasCustomKey = !!sys.searchQuestionId;
                                      const customKeyNode = q.questions.find(qst => qst.id === sys.searchQuestionId);
                                      const keyDesc = customKeyNode ? `[查核項: ${customKeyNode.title}]` : "[查核項: 預設代碼]";
                                      return (
                                        <div key={sys.id} className="flex items-center justify-between gap-1 border-b border-slate-50 last:border-b-0 pb-1">
                                          <div className="flex flex-col truncate max-w-[130px]">
                                            <div className="flex items-center space-x-1">
                                              <span className="text-[9px] text-slate-700 font-bold truncate">{sys.name}</span>
                                              {sys.hideInHall ? (
                                                <span className="text-[7px] bg-rose-50 text-rose-600 border border-rose-200 px-1 rounded font-bold shrink-0">隱藏</span>
                                              ) : (
                                                <span className="text-[7px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1 rounded font-bold shrink-0">公開</span>
                                              )}
                                            </div>
                                            <span className="text-[8px] text-indigo-500 font-semibold truncate leading-none">{keyDesc}</span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#query/${q.id}/${sys.id}`);
                                              alert(`🎉 【${sys.name}】安全性查詢直達連結已成功複製！`);
                                            }}
                                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[8px] rounded-md shrink-0 whitespace-nowrap cursor-pointer"
                                          >
                                            複製子系統
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-405 block italic text-slate-400 pl-1">目前無任何指派查询分流。請點擊「整合修改與問卷欄位設定」建置。</span>
                                )}
                              </div>

                            </div>
                          </div>

                        </div>
                      ))}
                      {questionnaires.length === 0 && (
                        <p className="text-xs text-slate-400 italic">目前尚未發布任何問卷規劃欄。點擊上方「制定新問卷」展開部署。</p>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 4: RBAC & Promotion Approval center (Super Admin or Webmaster only) */}
          {activeTab === "rbac" && (currentUser.role === UserRole.WEBMASTER || currentUser.role === UserRole.SUPER_ADMIN) && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">👤 角色控制與晉升批准中心 (RBAC控制模組)</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    精細化分級制度、核定操作人員星等上限與指派表格，並批准 3 星分析員/操作員的升遷案件。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrivilegeDescModal(true)}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <span>🔑</span>
                  <span>查閱完整權限分級說明書</span>
                </button>
              </div>

              {/* Promotions Approvals list */}
              <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-3.5">
                <h3 className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <ArrowUpCircle className="w-4 h-4 text-amber-600" />
                  <span>晉升審核專區 (星級升職核備)</span>
                </h3>

                <div className="space-y-2">
                  {promotions.filter(p => p.status === "PENDING").length > 0 ? (
                    promotions.filter(p => p.status === "PENDING").map((app) => (
                      <div key={app.id} className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${mutedPromotions.includes(app.id) ? "opacity-55 bg-slate-50 border-dashed" : ""}`}>
                        <div className="font-mono text-xs">
                          <p className="text-slate-500">申請時間: {app.createdAt}</p>
                          <p className="text-slate-800 font-bold mt-1">
                            申請人員: <span className="text-indigo-600">{app.username}</span>
                            {mutedPromotions.includes(app.id) && (
                              <span className="ml-2 bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-black border border-amber-200 select-none">🔕 消息免打擾中</span>
                            )}
                          </p>
                          <p className="text-slate-600 mt-1">
                            當前職級: <span className="p-1 bg-slate-100 rounded text-[10px]">{app.currentRole} ({app.currentStar}星)</span>
                            <span className="mx-1">→</span> 
                            期望晉升: <span className="p-1 bg-indigo-50 text-indigo-800 font-bold rounded text-[10px]">{app.targetRole} {app.targetStar ? `(${app.targetStar}星)` : ""}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {currentUser.role === UserRole.WEBMASTER && (
                            <button
                              id={`dnd-promo-btn-${app.id}`}
                              type="button"
                              onClick={() => handleToggleMutePromo(app.id)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1 border cursor-pointer transition-all ${
                                mutedPromotions.includes(app.id)
                                  ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                              }`}
                            >
                              {mutedPromotions.includes(app.id) ? (
                                <>
                                  <BellOff className="w-3.5 h-3.5" />
                                  <span>解除免打擾</span>
                                </>
                              ) : (
                                <>
                                  <Bell className="w-3.5 h-3.5" />
                                  <span>消息免打擾</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            id={`approve-promo-btn-${app.id}`}
                            onClick={() => handleApprovePromo(app)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>准予升職</span>
                          </button>
                          <button
                            id={`reject-promo-btn-${app.id}`}
                            onClick={() => handleRejectPromo(app)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg flex items-center space-x-1 border cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>否決駁回</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">目前無任何待核可的職級晉升案件。</p>
                  )}
                </div>
              </div>

              {/* Cheat Reports Approvals list */}
              <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-200/80 space-y-3.5">
                <h3 className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
                  <span>🚨 答題市民開掛/作弊嫌疑檢舉審查中心</span>
                </h3>

                <div className="space-y-2">
                  {cheatReports.filter(r => r.status === "PENDING" && (r.type !== "LEGEND_TEMP_BAN" || currentUser.role === UserRole.WEBMASTER)).length > 0 ? (
                    cheatReports.filter(r => r.status === "PENDING" && (r.type !== "LEGEND_TEMP_BAN" || currentUser.role === UserRole.WEBMASTER)).map((rep) => {
                      if (rep.type === "LEGEND_TEMP_BAN") {
                        // Fully golden-red aesthetic block for 1 hour forced temp bans (Webmaster only)
                        return (
                          <div key={rep.id} className="relative p-[3px] bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 rounded-xl shadow-lg transition-transform hover:scale-[1.005]">
                            <div className="bg-slate-900 p-4 rounded-[10px] flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="font-mono text-xs text-left">
                                <p className="text-yellow-400 font-black animate-pulse flex items-center gap-1">
                                  👑 🔴 【傳奇市民特權：直接金紅裁決令】 🔴 👑
                                </p>
                                <p className="text-slate-400 text-[10px] mt-1">臨時封鎖建立時間: {rep.createdAt} | 紀錄ID: {rep.id}</p>
                                <p className="text-slate-200 font-bold mt-1.5">
                                  神聖特權發動市民: <span className="text-yellow-400 font-extrabold underline">{rep.reporter}</span> (7階)
                                  <span className="mx-2 text-slate-500">➔</span>
                                  已被強制封鎖 1 小時對象: <span className="text-rose-500 font-black bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">{rep.target}</span>
                                </p>
                                <p className="text-amber-250 mt-2 bg-slate-950 p-2.5 rounded-lg text-[11px] leading-relaxed italic border border-orange-500/25">
                                  「 {rep.reason} 」
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleCheatReportAction(rep.id, "BAN")}
                                  className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-black rounded-lg flex items-center space-x-1 cursor-pointer shadow-md border border-red-500"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>裁決核准：改為永久封禁</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCheatReportAction(rep.id, "DISMISS")}
                                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs font-bold rounded-lg flex items-center space-x-1 border border-slate-700 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>特權回駁：撤銷臨時封鎖</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (rep.type === "STOP_SURVEY") {
                        // 3 buttons for STOP_SURVEY reports
                        return (
                          <div key={rep.id} className="bg-amber-50/40 p-4 rounded-xl border-2 border-orange-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                            <div className="font-mono text-xs text-left">
                              <p className="text-orange-700 font-bold flex items-center gap-1">
                                🛑 【問卷封鎖停用申請】 ➔ 5階+ 答題人提請
                              </p>
                              <p className="text-slate-500 text-[10px] mt-1">提報時間: {rep.createdAt} | 紀錄ID: {rep.id}</p>
                              <p className="text-slate-800 font-bold mt-1.5">
                                檢舉市民: <span className="text-indigo-600 font-extrabold">{rep.reporter}</span>
                                <span className="mx-2 text-slate-300">➔</span>
                                出題人對象: <span className="text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">{rep.target}</span>
                              </p>
                              <p className="text-slate-650 mt-2 bg-white p-2.5 rounded-lg text-[11px] leading-relaxed italic border border-slate-200">
                                「 {rep.reason} 」
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCheatReportAction(rep.id, "BLOCK_SURVEY_ONLY")}
                                className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold rounded-lg flex items-center justify-center space-x-1 cursor-pointer shadow-xs border border-orange-600"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>只封鎖該問卷</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCheatReportAction(rep.id, "BLOCK_CREATOR_AND_ALL_SURVEYS")}
                                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-lg flex items-center justify-center space-x-1 cursor-pointer shadow-xs border border-red-700"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>該出題人的所有問卷和帳號一併封禁</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCheatReportAction(rep.id, "DISMISS")}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 border border-slate-300 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>駁回申請</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // Default cheat/exploit report
                      return (
                        <div key={rep.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                          <div className="font-mono text-xs text-left">
                            <p className="text-slate-500">通報時間: {rep.createdAt} | 紀錄ID: {rep.id}</p>
                            <p className="text-slate-800 font-bold mt-1">
                              舉報市民: <span className="text-indigo-600 font-extrabold">{rep.reporter}</span>
                              <span className="mx-2 text-slate-300">➔</span>
                              被舉報涉嫌人: <span className="text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">{rep.target}</span>
                            </p>
                            <p className="text-slate-650 mt-2 bg-slate-50 p-2.5 rounded-lg text-[11px] leading-relaxed italic border border-slate-100">
                              「 {rep.reason} 」
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCheatReportAction(rep.id, "BAN")}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1 cursor-pointer shadow-xs"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>證實開掛：立即封禁</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCheatReportAction(rep.id, "DISMISS")}
                              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg flex items-center space-x-1 border border-slate-200 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>查無不法：駁回檢舉</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">目前無任何待審核的開掛或作弊舉報案件。平台環境十分整潔！</p>
                  )}
                </div>
              </div>

              {/* 新增全新帳號專區 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <PlusCircle className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-700">建立新系統帳號 (新增人員成員)</h3>
                </div>

                <form onSubmit={handleCreateUser} className="p-5 bg-blue-50/40 rounded-2xl border border-blue-100/60 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">帳號名稱 (Username)</label>
                    <input
                      type="text"
                      required
                      placeholder="例如: operator4"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-blue-500 font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">存取密碼 (Password)</label>
                    <input
                      type="text"
                      required
                      placeholder="請輸入密碼"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">預派角色 (Role)</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-blue-500 outline-none"
                    >
                      <option value={UserRole.OPERATOR}>操作員 (Operator)</option>
                      <option value={UserRole.ANALYST}>分析員 (Analyst)</option>
                      <option value={UserRole.SYSTEM_ADMIN}>系統管理員 (System Admin)</option>
                      <option value={UserRole.QUESTION_CREATOR}>出題人 (Question Creator)</option>
                      <option value={UserRole.RESPONDENT}>答題人 (Respondent)</option>
                      {currentUser.role === UserRole.WEBMASTER && (
                        <option value={UserRole.SUPER_ADMIN}>超級管理員 (Super Admin)</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    {(newUserRole === UserRole.OPERATOR || newUserRole === UserRole.ANALYST) ? (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">初始認證星等</label>
                        <select
                          value={newUserStar}
                          onChange={(e) => setNewUserStar(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-blue-500 outline-none font-mono"
                        >
                          <option value={1}>⭐ 1星 (可指派 1 張問卷)</option>
                          <option value={2}>⭐⭐ 2星 (可指派 2 張問卷)</option>
                          <option value={3}>⭐⭐⭐ 3星 (可指派 3 張問卷)</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block">限制說明</label>
                        <p className="text-[10px] text-slate-400 mt-1">系統管理員自帶所有表格管理權，不需設定星等。</p>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-4 flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 hover:bg-blue-700 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-colors"
                    >
                      確認新增此帳號
                    </button>
                  </div>
                </form>
              </div>

              {/* Edit User Roles in detail */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-700">帳號屬性、核定星等與表格指派調整 (RBAC控制規則)</h3>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">請選取欲調整的系統帳號</label>
                    <select
                      id="rbac-user-select"
                      value={rbacSelectedUser}
                      onChange={(e) => setRbacSelectedUser(e.target.value)}
                      className="bg-white border rounded text-xs p-1.5 focus:border-indigo-500 font-bold text-slate-700 min-w-[200px]"
                    >
                      <option value="">-- 請選取用戶 --</option>
                      {Object.keys(rbacUsers).filter(u => {
                        if (u === currentUser.username) {
                          return false; // Nobody should see their own account in the RBAC list
                        }
                        if (currentUser.role === UserRole.WEBMASTER) {
                          return true; // Webmaster can see and manage everyone else (including Super Admin)
                        }
                        // Super Admin can manage other accounts except Webmaster
                        return rbacUsers[u]?.role !== UserRole.WEBMASTER;
                      }).map((uname) => (
                        <option key={uname} value={uname}>
                          {uname} [當前: {
                            rbacUsers[uname].role === UserRole.WEBMASTER ? "系統站主" :
                            rbacUsers[uname].role === UserRole.SUPER_ADMIN ? "超級管理員" :
                            rbacUsers[uname].role === UserRole.SYSTEM_ADMIN ? "系統管理員" :
                            rbacUsers[uname].role === UserRole.OPERATOR ? "操作員" :
                            rbacUsers[uname].role === UserRole.ANALYST ? "分析員" :
                            rbacUsers[uname].role === UserRole.QUESTION_CREATOR ? "出題人" : "答題人"
                          } {rbacUsers[uname].starLevel ? (
                            (rbacUsers[uname].role === UserRole.QUESTION_CREATOR || rbacUsers[uname].role === UserRole.RESPONDENT)
                              ? `${rbacUsers[uname].starLevel}階`
                              : `${rbacUsers[uname].starLevel}星`
                          ) : ""}] {rbacUsers[uname].banned ? "(🔴 已封禁)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {rbacSelectedUser && rbacUsers[rbacSelectedUser] && (
                    <div className="bg-white p-4 border border-slate-200/80 rounded-xl space-y-4 font-mono text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-3 rounded-lg border border-slate-150 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block pb-1">目前帳號職級狀態</span>
                            <p className="text-slate-800 font-bold text-sm flex flex-wrap items-center gap-1.5">
                              <span className="font-bold">{rbacSelectedUser}</span>
                              {currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs" title="同級超級管理員密碼受系統隱私保護">
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <span>[密碼: 🔒 同級保密保護]</span>
                                </span>
                              ) : currentUser.role !== UserRole.WEBMASTER && rbacUsers[rbacSelectedUser].role === UserRole.WEBMASTER ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs">
                                  <Lock className="w-3 h-3 text-indigo-600" />
                                  <span>[密碼: 🔒 站主特權保護]</span>
                                </span>
                              ) : (
                                <span className="font-mono text-xs bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-700">
                                  [密碼: {currentUser.role === UserRole.WEBMASTER ? (visiblePasswords[rbacSelectedUser] || "●●●●●●●●") : "●●●●●●●●"}]
                                </span>
                              )}
                              {rbacUsers[rbacSelectedUser].banned && (
                                <span className="bg-rose-100 text-rose-700 border border-rose-200 text-[9px] px-1.5 py-0.5 rounded font-black animate-pulse shrink-0">🔴 已封禁停用</span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            {rbacUsers[rbacSelectedUser].role === UserRole.WEBMASTER ? (
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
                              <button
                                type="button"
                                onClick={() => handleToggleBanUser(rbacSelectedUser)}
                                className={`px-3 py-1.5 font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center space-x-1 shadow-sm ${
                                  rbacUsers[rbacSelectedUser].banned
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-amber-600 hover:bg-amber-700 text-white"
                                }`}
                              >
                                {rbacUsers[rbacSelectedUser].banned ? (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5 opacity-95" />
                                    <span>解除封禁此帳號</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert className="w-3.5 h-3.5 opacity-95" />
                                    <span>封禁此人員帳號</span>
                                  </>
                                )}
                              </button>
                            )}
                            {/* Deletion button is shielded for WEBMASTER and peer SUPER_ADMIN accounts */}
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
                            )}
                          </div>
                        </div>

                        {/* Username modification input block */}
                        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex flex-col sm:flex-row gap-2 items-end">
                          <div className="flex-1 space-y-1">
                            <label className="text-[9px] text-blue-800 font-bold block">變更此用戶之登入帳號名稱</label>
                            {rbacUsers[rbacSelectedUser].role === UserRole.WEBMASTER ? (
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
                              <input
                                type="text"
                                value={rbacRenameInput}
                                onChange={(e) => setRbacRenameInput(e.target.value)}
                                placeholder="請輸入新帳號名稱..."
                                className="bg-white border border-slate-250 rounded p-1.5 text-xs w-full font-mono outline-none focus:border-blue-500"
                              />
                            )}
                          </div>
                          {rbacUsers[rbacSelectedUser].role !== UserRole.WEBMASTER && !(currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN) && (
                            <button
                              type="button"
                              onClick={handleRenameUser}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-md transition-colors cursor-pointer shrink-0"
                            >
                              確認更改名稱
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Role level customization block */}
                      <div className="p-3 bg-indigo-50/45 border border-indigo-150 rounded-lg flex flex-col sm:flex-row gap-2 items-end">
                        <div className="flex-1 space-y-1 w-full">
                          <div className="flex justify-between items-center w-full">
                            <label className="text-[9px] text-indigo-950 font-bold block select-none">變更此帳號的角色職級 (Role Adjustment)</label>
                            <button
                              type="button"
                              onClick={() => setShowPrivilegeDescModal(true)}
                              className="text-[9px] text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              💡 檢視各階級與星等特權
                            </button>
                          </div>
                          {currentUser.role === UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN ? (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-800 flex items-center gap-2">
                              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>同級權限保護：同為超級管理員，不可調整或降級同級權限（僅系統站主擁有調派特權）。</span>
                            </div>
                          ) : (
                            <select
                              value={rbacUsers[rbacSelectedUser].role}
                              onChange={(e) => {
                                const targetRole = e.target.value as UserRole;
                                handleUpdateUserRole(rbacSelectedUser, targetRole);
                              }}
                              className="bg-white border border-slate-250 rounded p-1.5 text-xs w-full focus:border-indigo-500 font-bold text-slate-700 cursor-pointer"
                            >
                              <option value={UserRole.OPERATOR}>操作員 (Operator)</option>
                              <option value={UserRole.ANALYST}>分析員 (Analyst)</option>
                              <option value={UserRole.SYSTEM_ADMIN}>系統管理員 (System Admin)</option>
                              <option value={UserRole.QUESTION_CREATOR}>出題人 (Question Creator)</option>
                              <option value={UserRole.RESPONDENT}>答題人 (Respondent)</option>
                              {currentUser.role === UserRole.WEBMASTER && (
                                <option value={UserRole.SUPER_ADMIN}>超級管理員 (Super Admin)</option>
                              )}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Trivia Question Bank Privilege: allocated uniformly by Webmaster */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-0.5 max-w-lg">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>市民「答題學知識」題庫擴充管理特權</span>
                            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-mono font-bold">
                              系統站主統一分配
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            超級管理員與系統管理員已取消自帶題庫擴充特權，全面移交由系統站主統一審核與按需分配。
                          </p>
                        </div>
                        {currentUser.role === UserRole.WEBMASTER ? (
                          <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 transition-all shadow-2xs">
                            <input
                              type="checkbox"
                              id={`rbac-trivia-privilege-${rbacSelectedUser}`}
                              checked={!!rbacUsers[rbacSelectedUser].canManageTrivia}
                              onChange={(e) => handleToggleUserTriviaPrivilege(rbacSelectedUser, e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700">
                              {rbacUsers[rbacSelectedUser].canManageTrivia ? "✅ 已開啟特權" : "❌ 未開啟"}
                            </span>
                          </label>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                              rbacUsers[rbacSelectedUser].canManageTrivia
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              {rbacUsers[rbacSelectedUser].canManageTrivia ? "✅ 站主已核准特權" : "🔒 站主未分配"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 系統日誌修改/刪除/清空授權控制項（僅對超級管理員顯示，由系統站主授權） */}
                      {rbacUsers[rbacSelectedUser].role === UserRole.SUPER_ADMIN && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span>系統日誌管理特權（修改、刪除、清空）</span>
                              <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-mono font-bold">
                                系統站主專屬授權
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                              依日誌安全補丁：超級管理員默認僅可查看日誌。若需授權此超級管理員修改、刪除或清空等操作，請在此開啟授權。
                            </p>
                          </div>
                          {currentUser.role === UserRole.WEBMASTER ? (
                            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-amber-300 transition-all shadow-2xs">
                              <input
                                type="checkbox"
                                id={`rbac-log-privilege-${rbacSelectedUser}`}
                                checked={!!rbacUsers[rbacSelectedUser].canManageLogs}
                                onChange={(e) => handleToggleUserLogManagePrivilege(rbacSelectedUser, e.target.checked)}
                                className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-slate-700">
                                {rbacUsers[rbacSelectedUser].canManageLogs ? "✅ 已授權管理" : "🔒 默認僅查看"}
                              </span>
                            </label>
                          ) : (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                                rbacUsers[rbacSelectedUser].canManageLogs
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}>
                                {rbacUsers[rbacSelectedUser].canManageLogs ? "✅ 站主已授權管理" : "🔒 默認僅查看"}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {rbacUsers[rbacSelectedUser].role === UserRole.RESPONDENT || rbacUsers[rbacSelectedUser].role === UserRole.QUESTION_CREATOR ? (
                        <div className="p-3 bg-indigo-50/70 text-indigo-950 font-bold rounded-lg border border-indigo-150 text-[11px]">
                          ⚙️ 答題人與出題人獨立於管理員之日常星階設定。答題人等階與積分升職請至本頁上方【系統帳號全權管理控制中心】清單由站主直接選取調升；出題人享有專屬題庫擴充特權控制，無常規問卷分指星等設定。
                        </div>
                      ) : rbacUsers[rbacSelectedUser].role !== UserRole.SYSTEM_ADMIN && rbacUsers[rbacSelectedUser].role !== UserRole.SUPER_ADMIN && rbacUsers[rbacSelectedUser].role !== UserRole.WEBMASTER ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-500 block">核發星階設定</label>
                            <div className="flex space-x-2">
                              {[1, 2, 3].map((num) => (
                                <button
                                  key={num}
                                  id={`rbac-star-btn-${num}`}
                                  type="button"
                                  onClick={() => {
                                    const uList = { ...rbacUsers };
                                    uList[rbacSelectedUser].starLevel = num;
                                    setRbacUsers(uList);
                                  }}
                                  className={`px-3 py-1.5 border text-xs font-bold rounded-lg duration-150 cursor-pointer ${
                                    rbacUsers[rbacSelectedUser].starLevel === num
                                      ? "bg-slate-900 border-slate-950 text-white"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  ⭐ {num}星級
                                </button>
                              ))}
                            </div>
                            <p className="text-[9px] text-slate-400">
                              防範權限浮溢規則：1星最多分派1張表格、2星2張、3星3張。保存時多餘指定的表格會被依序切除。
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-500 block">
                              指定可管理表格 (目前選取：{(rbacUsers[rbacSelectedUser].assignedTables || []).length} / {rbacUsers[rbacSelectedUser].starLevel || 1} 張)
                            </label>
                            
                            <div className="flex flex-col space-y-1.5 border p-3 rounded-lg max-h-36 overflow-y-auto bg-slate-50">
                              {questionnaires.map((q) => {
                                const isChecked = (rbacUsers[rbacSelectedUser].assignedTables || []).includes(q.id);
                                return (
                                  <label key={q.id} className="flex items-center space-x-2 font-sans text-xs text-slate-700 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const uList = { ...rbacUsers };
                                        let currentAlloc = uList[rbacSelectedUser].assignedTables || [];
                                        if (e.target.checked) {
                                          currentAlloc = [...currentAlloc, q.id];
                                        } else {
                                          currentAlloc = currentAlloc.filter((item: string) => item !== q.id);
                                        }
                                        uList[rbacSelectedUser].assignedTables = currentAlloc;
                                        setRbacUsers(uList);
                                      }}
                                      className="w-4 h-4 text-indigo-600 border-slate-200 rounded"
                                    />
                                    <span className="font-medium">{q.title}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">({q.id})</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-2 flex justify-end">
                            <button
                              id="rbac-submit-user-update"
                              onClick={() => handleSaveUserRBAC(
                                rbacSelectedUser,
                                rbacUsers[rbacSelectedUser].starLevel,
                                rbacUsers[rbacSelectedUser].assignedTables || []
                              )}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
                            >
                              確設定儲存 RBAC 控制授權
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 bg-indigo-50 text-indigo-950 font-bold rounded-lg border border-indigo-100">
                          🛡️ 自帶全面問卷管理權。系統管理員無需也無法手動分指表格（自帶全部表格的可讀與線上修正編輯更正權利）。
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: Password & Profile Name change center */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Card 1: Name customization */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                    <span>👤</span> 修改個人姓名 / 帳號名稱
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">變更您在後台進行問卷管理、更正與日誌留存時所顯示的身分識別帳號名稱，所有身分帳號均支援此功能。</p>
                </div>

                <form onSubmit={handlePersonalUsernameChange} className="max-w-md space-y-4">
                  {personalUsernameError && (
                    <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs font-bold rounded">
                      ⚠️ {personalUsernameError}
                    </div>
                  )}

                  {personalUsernameMsg && (
                    <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded">
                      {personalUsernameMsg}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">
                      當前帳號名稱: <span className="text-indigo-600 underline font-mono select-all ml-1.5">{currentUser.username}</span>
                    </label>
                    <div
                      className="w-full bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-slate-600 font-mono text-xs flex justify-between items-center"
                    >
                      <span className="flex items-center gap-1.5 select-none">
                        🔑 <span 
                          onClick={() => setShowPrivilegeDescModal(true)}
                          className="hover:text-indigo-600 hover:underline cursor-pointer transition-all font-bold"
                          title="點選查看權限分級說明"
                        >
                          此帳戶後台權限 / 權限分級
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPrivilegeDescModal(true);
                          }}
                          className="text-[10px] text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded cursor-pointer transition-all active:scale-95"
                        >
                          [權限分級說明 💡]
                        </button>
                      </span>
                      <span 
                        onClick={() => setShowPrivilegeDescModal(true)}
                        className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-bold font-sans rounded px-2.5 py-0.5 text-[10px] cursor-pointer transition-colors"
                        title="點選查看此身分權利"
                      >
                        {currentUser.role === UserRole.WEBMASTER && "👑 系統站主"}
                        {currentUser.role === UserRole.SUPER_ADMIN && "⭐ 超級管理員"}
                        {currentUser.role === UserRole.SYSTEM_ADMIN && "系統管理員"}
                        {currentUser.role === UserRole.OPERATOR && "操作人員"}
                        {currentUser.role === UserRole.ANALYST && "分析人員"}
                        {currentUser.role === UserRole.QUESTION_CREATOR && "出題人員"}
                        {currentUser.role === UserRole.RESPONDENT && "答題人員"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">請設定新的名稱</label>
                    <input
                      id="profile-new-username-input"
                      type="text"
                      value={newPersonalUsername}
                      onChange={(e) => setNewPersonalUsername(e.target.value)}
                      placeholder="請輸入您偏好的管理姓名/新帳號"
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      id="profile-username-submit-btn"
                      type="submit"
                      className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center space-x-1.5 hover:scale-[1.01]"
                    >
                      <span>更新名稱設定</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 2: Password change center */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🔒</span> 修改個人登入後台密碼
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">為了資安考量，建議您定期更新自身後台帳密，防止機敏問卷與個資洩漏。</p>
                </div>

                <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                  {profileError && (
                    <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs font-bold rounded">
                      ⚠️ {profileError}
                    </div>
                  )}

                  {profileMsg && (
                    <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded">
                      {profileMsg}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">輸入舊安全密碼</label>
                    <input
                      id="profile-old-password"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="請輸入現有密碼"
                      className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">輸入新安全密碼</label>
                    <input
                      id="profile-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="密碼長度建議六位字符以上"
                      className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">再次確認輸入新密碼</label>
                    <input
                      id="profile-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="請重複新密碼"
                      className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      id="profile-password-submit-btn"
                      type="submit"
                      className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all"
                    >
                      更新登入通行密碼
                    </button>
                  </div>
                </form>
              </div>

              {/* Card 3: Delete Account (Danger Zone) */}
              <div className="bg-slate-50 rounded-2xl border border-red-150 p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-rose-700 flex items-center gap-1.5">
                    <span>⚠️</span> 註銷並永久刪除此帳號 (自毀專區)
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">您在此處可以主動永久刪除自己的帳號。注意：此作業不可復原，系統站主與超級管理員帳號不可自毀。</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-rose-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block animate-pulse">※ 欲永久關閉並註銷的當前登入帳號：</span>
                    <strong className="text-slate-800 text-sm font-mono">{currentUser.username}</strong>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleDeleteOwnAccount}
                      disabled={currentUser.username === "super_admin" || currentUser.role === UserRole.WEBMASTER}
                      className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1 shadow-sm ${
                        (currentUser.username === "super_admin" || currentUser.role === UserRole.WEBMASTER)
                          ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                          : "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white"
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>永久註銷並刪除帳號</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: System operation audit trail - Webmaster and Super Admin only */}
          {activeTab === "logs" && canViewLogs && (
            <LogView 
              logs={logs} 
              currentUser={currentUser}
              rbacUsers={rbacUsers}
              addLog={addLog}
              onUpdateLogs={onUpdateLogList}
              onClearLogs={() => {
                onUpdateLogList([]);
              }}
              showAdminPrivileges={canViewLogs}
            />
          )}

          {/* TAB 6.5: Trivia Questions Control Console */}
          {activeTab === "trivia_questions" && canManageTriviaQuestions && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600 animate-pulse" />
                    <span>📚 市民「答題學知識」：核心題庫管理控制台</span>
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    在此新增、刪除或檢視答題學知識（市民學習端）的闖關題目與正確解答，將即時同步更新。
                  </p>
                </div>
                <div className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 px-3 py-1 rounded-full shrink-0">
                  全域知識試題總計：<strong>{triviaQuestions.length}</strong> 題
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form to add content */}
                <div className="lg:col-span-1 bg-slate-50/60 border border-slate-100 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                    <span>➕</span> 擴充題庫：登錄新知識問題
                  </h3>
                  
                  <form onSubmit={handleAddNewTriviaQuestion} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">1. 試題題目文字描述</label>
                      <textarea
                        rows={3}
                        value={newTriviaQText}
                        onChange={(e) => setNewTriviaQText(e.target.value)}
                        placeholder="請輸入欲新增之題目文字..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-slate-700 font-sans font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-700 block">選項 A</label>
                        <input
                          type="text"
                          value={newTriviaOptA}
                          onChange={(e) => setNewTriviaOptA(e.target.value)}
                          placeholder="選項 A 內容"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:border-indigo-500 text-[11px] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-700 block">選項 B</label>
                        <input
                          type="text"
                          value={newTriviaOptB}
                          onChange={(e) => setNewTriviaOptB(e.target.value)}
                          placeholder="選項 B 內容"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:border-indigo-500 text-[11px] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-700 block">選項 C</label>
                        <input
                          type="text"
                          value={newTriviaOptC}
                          onChange={(e) => setNewTriviaOptC(e.target.value)}
                          placeholder="選項 C 內容"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:border-indigo-500 text-[11px] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-700 block">選項 D</label>
                        <input
                          type="text"
                          value={newTriviaOptD}
                          onChange={(e) => setNewTriviaOptD(e.target.value)}
                          placeholder="選項 D 內容"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:border-indigo-500 text-[11px] outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">2. 核定正確答案</label>
                      <select
                        value={newTriviaCorrectLetter}
                        onChange={(e) => setNewTriviaCorrectLetter(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg p-2 font-bold text-indigo-700 outline-none text-[11px]"
                      >
                        <option value="A">選項 A 答案</option>
                        <option value="B">選項 B 答案</option>
                        <option value="C">選項 C 答案</option>
                        <option value="D">選項 D 答案</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">3. 市民答案解析與補充說明（選填）</label>
                      <textarea
                        rows={3}
                        value={newTriviaExplanation}
                        onChange={(e) => setNewTriviaExplanation(e.target.value)}
                        placeholder="選填，提供市民答題後的詳細背景知識解析。"
                        className="w-full bg-white border border-slate-250 rounded-xl p-2.5 focus:border-indigo-500 outline-none text-slate-600 font-sans text-[11px]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-indigo-650 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>確認並登錄新題目</span>
                    </button>
                  </form>
                </div>

                {/* Question List view */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <span>📖</span> 當前已登錄知識題庫 ({triviaQuestions.length} 題)
                  </h3>

                  <div className="space-y-3 max-h-[580px] overflow-y-auto pr-2">
                    {triviaQuestions.map((t, idx) => (
                      <div key={t.id} className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-2.5 shadow-xs relative hover:border-indigo-200 transition-all">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                          <span className="text-[10px] bg-slate-200/60 border border-slate-300 p-0.5 px-2 rounded-md font-mono text-slate-500 font-bold">
                            #{t.id} (第 {idx + 1} 題)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTriviaQuestion(t.id)}
                            className="p-1 px-1.5 text-rose-605 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 border border-transparent rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10px] font-extrabold"
                            title="刪除題目"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>徹底刪除</span>
                          </button>
                        </div>

                        <p className="text-xs font-black text-slate-800 leading-relaxed">{t.question}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          {t.options.map((opt: string, oi: number) => {
                            const isCorrect = opt === t.correctAnswer;
                            return (
                              <div
                                key={oi}
                                className={`p-2 rounded-lg border ${
                                  isCorrect
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-black flex items-center justify-between shadow-xs"
                                    : "bg-white border-slate-200/60 text-slate-600"
                                }`}
                              >
                                <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                                {isCorrect && <span className="text-[8px] bg-emerald-650 text-white rounded-md px-1.5 py-0.5 font-sans">正確解答</span>}
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-2.5 bg-indigo-50/40 text-[10px] text-indigo-900 rounded-lg border border-dashed border-indigo-100 font-sans leading-relaxed">
                          <strong className="text-indigo-950">📚 背景學術解析：</strong>
                          {t.explanation || "未提供補充背景知識解釋。"}
                        </div>
                      </div>
                    ))}

                    {triviaQuestions.length === 0 && (
                      <div className="p-10 border border-dashed border-slate-205 rounded-2xl text-center space-y-1 bg-slate-50/50">
                        <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-500">當前知識題庫爲空</p>
                        <p className="text-[10px] text-slate-400">請使用左側表單新增問題。</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "deleted_users" && (currentUser.role === UserRole.WEBMASTER || currentUser.role === UserRole.SUPER_ADMIN) && (
            <DeletedUsersManagement
              currentUser={currentUser}
              onAddLog={addLog}
            />
          )}

          {/* TAB 7: System Accounts Management (Webmaster only) */}
          {activeTab === "system_accounts" && currentUser.role === UserRole.WEBMASTER && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-emerald-600" />
                    <span>🛡️ 系統帳號全權管理控制中心 (Webmaster Console)</span>
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    系統站主專屬控制面板：提供最完整的帳號清單與權限管理、調整角色分級、更改密碼，並支援即時封禁或刪除指定使用者。
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPrivilegeDescModal(true)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>🔑</span>
                    <span>權限說明書</span>
                  </button>
                  <button
                    onClick={() => setShowQuickCreateForm(!showQuickCreateForm)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{showQuickCreateForm ? "收合註冊面板" : "快速註冊新人員"}</span>
                  </button>
                </div>
              </div>

              {/* Quick Create Account Panel */}
              {showQuickCreateForm && (
                <div className="p-5 bg-emerald-50/40 border border-emerald-100 rounded-2xl space-y-4 animate-fade-in">
                  <div className="border-b border-emerald-100/60 pb-2">
                    <h3 className="text-xs font-bold text-emerald-800">建立全新系統帳號 (新增管理、操作或分析人員)</h3>
                    <p className="text-[10px] text-emerald-600/80 mt-0.5">系統站主可以新增任何職等之帳號（包含超級管理員）。</p>
                  </div>
                  <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 block">帳號名稱 (Username)</label>
                      <input
                        type="text"
                        required
                        placeholder="例如: brandon7"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-emerald-500 font-mono outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 block">初始密碼 (Password)</label>
                      <input
                        type="text"
                        required
                        placeholder="請輸入密碼"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 block">指派角色 (Role)</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-emerald-500 outline-none font-bold text-slate-700"
                      >
                        <option value={UserRole.OPERATOR}>操作員 (Operator)</option>
                        <option value={UserRole.ANALYST}>分析員 (Analyst)</option>
                        <option value={UserRole.SYSTEM_ADMIN}>系統管理員 (System Admin)</option>
                        <option value={UserRole.QUESTION_CREATOR}>出題人 (Question Creator)</option>
                        <option value={UserRole.RESPONDENT}>答題人 (Respondent)</option>
                        <option value={UserRole.SUPER_ADMIN}>超級管理員 (Super Admin)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      {(newUserRole === UserRole.OPERATOR || newUserRole === UserRole.ANALYST) ? (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">初始認證星等</label>
                          <select
                            value={newUserStar}
                            onChange={(e) => setNewUserStar(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:border-emerald-500 outline-none font-mono font-bold text-amber-600"
                          >
                            <option value={1}>⭐ 1星 (可指派 1 張問卷)</option>
                            <option value={2}>⭐⭐ 2星 (可指派 2 張問卷)</option>
                            <option value={3}>⭐⭐⭐ 3星 (可指派 3 張問卷)</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col justify-end h-full justify-center">
                          <span className="text-[10px] text-slate-400 font-bold block pb-1">表格指派說明</span>
                          <span className="text-[9px] text-slate-400/80 leading-tight">管理員階級預設授權所有問卷表格。</span>
                        </div>
                      )}
                    </div>
                    <div className="col-span-1 md:col-span-4 flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-colors cursor-pointer"
                      >
                        ⚡ 確定新增此系統帳號
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Status metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-400 block">總系統帳號</span>
                  <span className="text-xl font-black font-mono text-slate-800">{Object.keys(rbacUsers).length} <span className="text-xs font-normal text-slate-400">名</span></span>
                </div>
                <div className="bg-sky-50/55 p-3 rounded-2xl border border-sky-100 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-sky-800/80 block">超級/系統管理員</span>
                  <span className="text-xl font-black font-mono text-sky-900">
                    {Object.values(rbacUsers).filter((u: any) => u?.role === UserRole.SUPER_ADMIN || u?.role === UserRole.SYSTEM_ADMIN || u?.role === UserRole.WEBMASTER).length} <span className="text-xs font-normal text-sky-400">名</span>
                  </span>
                </div>
                <div className="bg-amber-50/55 p-3 rounded-2xl border border-amber-100 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-amber-800/80 block">操作員成員</span>
                  <span className="text-xl font-black font-mono text-amber-900">
                    {Object.values(rbacUsers).filter((u: any) => u?.role === UserRole.OPERATOR).length} <span className="text-xs font-normal text-amber-400">名</span>
                  </span>
                </div>
                <div className="bg-indigo-50/55 p-3 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-indigo-800/80 block">分析員成員</span>
                  <span className="text-xl font-black font-mono text-indigo-900">
                    {Object.values(rbacUsers).filter((u: any) => u?.role === UserRole.ANALYST).length} <span className="text-xs font-normal text-indigo-400">名</span>
                  </span>
                </div>
                <div className="bg-violet-50/55 p-3 rounded-2xl border border-violet-100 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-violet-800/80 block">出題人成員</span>
                  <span className="text-xl font-black font-mono text-violet-900">
                    {Object.values(rbacUsers).filter((u: any) => u?.role === UserRole.QUESTION_CREATOR).length} <span className="text-xs font-normal text-violet-400">名</span>
                  </span>
                </div>
                <div className="bg-emerald-50/55 p-3 rounded-2xl border border-emerald-100 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-emerald-800/80 block">答題人成員</span>
                  <span className="text-xl font-black font-mono text-emerald-950">
                    {Object.values(rbacUsers).filter((u: any) => u?.role === UserRole.RESPONDENT).length} <span className="text-xs font-normal text-emerald-600">名</span>
                  </span>
                </div>
                <div className="bg-rose-50/55 p-3 rounded-2xl border border-rose-100 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-rose-800/80 block">已被封禁停用</span>
                  <span className="text-xl font-black font-mono text-rose-900">
                    {Object.values(rbacUsers).filter((u: any) => u?.banned).length} <span className="text-xs font-normal text-rose-400">名</span>
                  </span>
                </div>
              </div>

              {/* Filtering bar */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch justify-between pt-1">
                {/* Mode tabs */}
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start">
                  {[
                    { id: "ALL", label: "👥 全部" },
                    { id: "ADMINS", label: "👑 管理者" },
                    { id: "OPERATOR", label: "⚙️ 操作員" },
                    { id: "ANALYST", label: "📈 分析員" },
                    { id: "CREATOR", label: "✏️ 出題人" },
                    { id: "RESPONDENT", label: "🎒 答題人" },
                    { id: "BANNED", label: "🔴 已封禁" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSysAccountRoleFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        sysAccountRoleFilter === tab.id
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Filter Input */}
                <div className="relative flex-1 max-w-full md:max-w-xs">
                  <input
                    type="text"
                    placeholder="🔍 搜尋帳號名稱..."
                    value={sysAccountSearch}
                    onChange={(e) => setSysAccountSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white outline-none focus:border-indigo-500 transition-all font-sans text-slate-800"
                  />
                  {sysAccountSearch && (
                    <button
                      onClick={() => setSysAccountSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* 藍綠色特權申請 */}
              {sysAccountRoleFilter === "RESPONDENT" && currentUser.role === UserRole.WEBMASTER && quotaRequests.filter(q => q.status === "PENDING").length > 0 && (
                <div id="teal-quota-panel" className="bg-teal-50 border-2 border-teal-200 p-4 rounded-xl text-teal-950 font-sans text-xs space-y-3 shadow-xs animate-fade-in">
                  <div className="flex items-center gap-2 text-teal-800 font-bold">
                    <span className="text-sm">💎</span>
                    <span>7 階傳奇答題人特權額度添加申請列表 (藍綠色特權審批面板)</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {quotaRequests.filter(q => q.status === "PENDING").map((req) => (
                      <div key={req.id} className="bg-white p-3 rounded-lg border border-teal-150 flex items-center justify-between gap-3 shadow-2xs">
                        <div>
                          <p className="text-slate-500 font-mono text-[10px]">申請人: <span className="font-extrabold text-teal-700">{req.requester}</span> | 時間: {req.createdAt}</p>
                          <p className="text-slate-800 text-[11.5px] font-bold mt-1">
                            申請追加特權：<span className="p-1 bg-teal-50 text-teal-900 rounded font-black">{req.perkName}</span>
                          </p>
                          <p className="text-[11px] text-indigo-700 font-extrabold mt-0.5">
                            欲追加數量：<span className="text-xs text-indigo-600 font-black font-mono">{req.requestedCount}</span> 次
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApproveQuotaRequest(req)}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold rounded text-[10px] cursor-pointer shadow-xs transition-colors"
                          >
                            核准大加碼
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectQuotaRequest(req)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold border border-rose-200 rounded text-[10px] cursor-pointer transition-colors"
                          >
                            駁回申請
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accounts Directory Table */}
              <div className="overflow-x-auto border border-slate-200/60 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-150">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">帳號名稱 (Username)</th>
                      <th className="py-3.5 px-4 font-bold">角色身分職階 (Role Class)</th>
                      <th className="py-3.5 px-4 font-bold">
                        <div className="flex items-center gap-2">
                          <span>密碼管理 (Password)</span>
                          {currentUser.role === UserRole.WEBMASTER && (
                            <button
                              type="button"
                              onClick={handleToggleAllPasswords}
                              className="text-[10px] font-normal bg-slate-200/50 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              {showAllPasswords ? "[全部隱藏]" : "[全部查看]"}
                            </button>
                          )}
                        </div>
                      </th>
                      <th className="py-3.5 px-4 font-bold">表單對應 & 設定限制 (Assigned Tables)</th>
                      <th className="py-3.5 px-4 font-bold text-center">狀態操控 (Status)</th>
                      <th className="py-3.5 px-4 font-bold text-right">永久管理 action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {Object.keys(rbacUsers)
                      .filter((uname) => {
                        // Search query filtering
                        if (sysAccountSearch && !uname.toLowerCase().includes(sysAccountSearch.toLowerCase().trim())) {
                          return false;
                        }
                        // Role query filtering
                        const uObject = rbacUsers[uname];
                        if (!uObject) return false;
                        if (sysAccountRoleFilter === "BANNED") {
                          return !!uObject.banned;
                        }
                        if (sysAccountRoleFilter === "ADMINS") {
                          return uObject.role === UserRole.WEBMASTER || uObject.role === UserRole.SUPER_ADMIN || uObject.role === UserRole.SYSTEM_ADMIN;
                        }
                        if (sysAccountRoleFilter === "OPERATOR") {
                          return uObject.role === UserRole.OPERATOR;
                        }
                        if (sysAccountRoleFilter === "ANALYST") {
                          return uObject.role === UserRole.ANALYST;
                        }
                        if (sysAccountRoleFilter === "CREATOR") {
                          return uObject.role === UserRole.QUESTION_CREATOR;
                        }
                        if (sysAccountRoleFilter === "RESPONDENT") {
                          return uObject.role === UserRole.RESPONDENT;
                        }
                        return true;
                      })
                      .map((uname) => {
                        const uObj = rbacUsers[uname];
                        if (!uObj) return null;
                        const isSelf = uname === currentUser.username;
                        const isWebmaster = uObj.role === UserRole.WEBMASTER;
                        const isEditingPassword = sysAccountEditingUser === uname;

                        return (
                          <tr 
                            key={uname} 
                            className={`hover:bg-slate-50/50 transition-colors ${
                              isWebmaster ? "bg-amber-50/15" : uObj.banned ? "bg-rose-50/10" : ""
                            }`}
                          >
                            {/* Username with crown if webmaster */}
                            <td className="py-3.5 px-4 font-semibold text-slate-800 font-mono">
                              <div className="flex items-center space-x-1.5">
                                {isWebmaster && <span className="text-amber-500 text-xs">👑</span>}
                                <span className={isSelf ? "text-indigo-650 font-black decoration-double underline decoration-indigo-300" : ""}>
                                  {uname}
                                </span>
                                {isSelf && (
                                  <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0">我</span>
                                )}
                              </div>
                            </td>

                            {/* Role selectors */}
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-1.5">
                                {uObj.role === UserRole.WEBMASTER && (
                                  <span className="text-amber-500 text-xs" title="最高支配權站主">👑</span>
                                )}
                                {uObj.role === UserRole.SUPER_ADMIN && (
                                  <span className="text-indigo-605 text-[10px]" title="超級管理員">⚡</span>
                                )}
                                {uObj.role === UserRole.SYSTEM_ADMIN && (
                                  <span className="text-purple-600 text-[10px]" title="系統管理員">⚙️</span>
                                )}
                                {uObj.role === UserRole.QUESTION_CREATOR && (
                                  <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" title="出題人卷標" />
                                )}
                                {uObj.role === UserRole.RESPONDENT && (
                                  <Pencil className="w-3.5 h-3.5 text-emerald-600 shrink-0 animate-pulse" title="答題人筆標" />
                                )}

                                <select
                                  value={uObj.role}
                                  disabled={isWebmaster || isSelf}
                                  onChange={(e) => handleUpdateUserRole(uname, e.target.value as UserRole)}
                                  className={`font-bold text-[11px] border rounded-lg p-1 transition-all outline-none ${
                                    uObj.role === UserRole.WEBMASTER
                                      ? "bg-amber-100 border-amber-300 text-amber-800 font-serif"
                                      : uObj.role === UserRole.SUPER_ADMIN
                                      ? "bg-indigo-100 border-indigo-300 text-indigo-800"
                                      : uObj.role === UserRole.SYSTEM_ADMIN
                                      ? "bg-purple-100 border-purple-300 text-purple-800"
                                      : uObj.role === UserRole.QUESTION_CREATOR
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                      : uObj.role === UserRole.RESPONDENT
                                      ? "bg-emerald-50 border-emerald-250 text-emerald-700"
                                      : uObj.role === UserRole.OPERATOR
                                      ? "bg-amber-5 border-amber-200 text-amber-700"
                                      : "bg-blue-5 text-blue-700 border-blue-200"
                                  }`}
                                >
                                  <option value={UserRole.OPERATOR}>操作員 (Operator)</option>
                                  <option value={UserRole.ANALYST}>分析員 (Analyst)</option>
                                  <option value={UserRole.SYSTEM_ADMIN}>系統管理員 (System Admin)</option>
                                  <option value={UserRole.QUESTION_CREATOR}>出題人 (Question Creator)</option>
                                  <option value={UserRole.RESPONDENT}>答題人 (Respondent)</option>
                                  {isWebmaster ? (
                                    <option value={UserRole.WEBMASTER}>系統站主 (Webmaster)</option>
                                  ) : (
                                    <option value={UserRole.SUPER_ADMIN}>超級管理員 (Super Admin)</option>
                                  )}
                                </select>
                              </div>
                            </td>

                            {/* Password input / display */}
                            <td className="py-3 px-4">
                              {currentUser.role === UserRole.SUPER_ADMIN && uObj.role === UserRole.SUPER_ADMIN && uname !== currentUser.username ? (
                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <span>●●●●●●●● (同級保密)</span>
                                </div>
                              ) : currentUser.role !== UserRole.WEBMASTER && uObj.role === UserRole.WEBMASTER ? (
                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  <Lock className="w-3 h-3 text-indigo-600" />
                                  <span>●●●●●●●● (站主保護)</span>
                                </div>
                              ) : (
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
                              )}
                            </td>

                            {/* Star Levels and Assigned Tables list */}
                            <td className="py-3 px-4 max-w-xs sm:max-w-md">
                              {(uObj.role === UserRole.OPERATOR || uObj.role === UserRole.ANALYST) ? (
                                <div className="space-y-1.5">
                                  {/* Star Level Select */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 font-bold select-none">認證星級:</span>
                                    <select
                                      value={uObj.starLevel || 1}
                                      onChange={(e) => handleUpdateUserStar(uname, Number(e.target.value))}
                                      className="font-mono bg-white border border-slate-150 rounded text-[10px] p-0.5 text-amber-600 font-bold"
                                    >
                                      <option value={1}>⭐ 1星 (限1表)</option>
                                      <option value={2}>⭐⭐ 2星 (限2表)</option>
                                      <option value={3}>⭐⭐⭐ 3星 (限3表)</option>
                                    </select>
                                  </div>

                                  {/* Table assigned checkboxes */}
                                  <div className="flex flex-wrap gap-1 p-1 bg-slate-50/60 rounded border border-slate-100">
                                    {questionnaires.map((q) => {
                                      const isChecked = uObj.assignedTables?.includes(q.id);
                                      return (
                                        <button
                                          key={q.id}
                                          type="button"
                                          onClick={() => handleToggleUserTable(uname, q.id)}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                            isChecked
                                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                                              : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
                                          }`}
                                          title={q.title}
                                        >
                                          {isChecked ? "✓ " : ""}{q.title.substring(0, 10)}{q.title.length > 10 ? "..." : ""}
                                        </button>
                                      );
                                    })}
                                    {questionnaires.length === 0 && (
                                      <span className="text-[10px] text-slate-400 italic">無可選分配之問卷表單</span>
                                    )}
                                  </div>
                                </div>
                              ) : uObj.role === UserRole.QUESTION_CREATOR ? (
                                <div className="space-y-2">
                                  <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 font-bold inline-block">
                                    📝 出題人本級：僅能存取與統計個人創建之問卷
                                  </div>

                                  {/* Star Level Select for Creator */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400 font-bold select-none">調升等階 (星級):</span>
                                    <select
                                      value={uObj.starLevel || 1}
                                      onChange={(e) => handleUpdateUserStar(uname, Number(e.target.value))}
                                      className="font-mono bg-white border border-slate-150 rounded text-[10px] p-0.5 text-indigo-600 font-bold outline-none cursor-pointer focus:border-indigo-500"
                                    >
                                      <option value={1}>⭐ 1 階 (限制級)</option>
                                      <option value={2}>⭐⭐ 2 階 (中等權限)</option>
                                      <option value={3}>⭐⭐⭐ 3 階 (最高解鎖)</option>
                                    </select>
                                  </div>
                                  
                                  {/* Privilege Toggle */}
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`privilege-trivia-${uname}`}
                                      checked={!!uObj.canManageTrivia}
                                      disabled={currentUser.role !== UserRole.WEBMASTER}
                                      onChange={(e) => handleToggleUserTriviaPrivilege(uname, e.target.checked)}
                                      className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 accent-indigo-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <label
                                      htmlFor={`privilege-trivia-${uname}`}
                                      className={`text-[10px] font-extrabold select-none flex items-center gap-1 ${
                                        currentUser.role === UserRole.WEBMASTER ? "text-slate-600 cursor-pointer hover:text-indigo-700" : "text-slate-400 cursor-not-allowed"
                                      }`}
                                    >
                                      <span>📚 授予「市民答題學知識」題庫擴充特權</span>
                                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-mono font-bold">站主分配</span>
                                    </label>
                                  </div>
                                </div>
                              ) : uObj.role === UserRole.RESPONDENT ? (
                                <div className="space-y-1.5 text-left">
                                  <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5 font-bold inline-block">
                                    ✍️ 答題人：不被管理員指派問卷
                                  </div>
                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                                    <span className="text-[10px] text-slate-500 font-bold select-none">調升等階:</span>
                                    <select
                                      value={calculateRespondentRank(uObj.respondentPoints || 0).tier}
                                      onChange={(e) => {
                                        const targetTier = Number(e.target.value);
                                        let minPoints = 0;
                                        if (targetTier === 1) minPoints = 0;
                                        else if (targetTier === 2) minPoints = 180; // Q = 9, 9 * 20 = 180 points
                                        else if (targetTier === 3) minPoints = 360; // Q = 18, 18 * 20 = 360 points
                                        else if (targetTier === 4) minPoints = 680; // Q = 34, 34 * 20 = 680 points
                                        else if (targetTier === 5) minPoints = 1000; // Q = 50, 50 * 20 = 1000 points
                                        else if (targetTier === 6) minPoints = 1500; // Q = 75, 75 * 20 = 1500 points
                                        else if (targetTier === 7) minPoints = 2000; // Q = 100, 100 * 20 = 2000 points
                                        handleUpdateRespondentPoints(uname, minPoints);
                                      }}
                                      className="font-mono bg-white border border-slate-150 rounded text-[10px] p-0.5 text-emerald-600 font-bold outline-none cursor-pointer focus:border-emerald-500"
                                    >
                                      <option value={1}>黑鐵 (1 階)</option>
                                      <option value={2}>青銅 (2 階)</option>
                                      <option value={3}>白銀 (3 階)</option>
                                      <option value={4}>黃金 (4 階)</option>
                                      <option value={5}>白金 (5 階)</option>
                                      <option value={6}>鑽石 (6 階)</option>
                                      <option value={7}>傳奇 (7 階)</option>
                                    </select>
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5 font-semibold">
                                      {calculateRespondentRank(uObj.respondentPoints || 0).tierName} ({calculateRespondentRank(uObj.respondentPoints || 0).subRank})
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-450 font-medium">系統總計積分：<span className="font-bold text-emerald-600 font-mono">{uObj.respondentPoints || 0}</span> 分</p>
                                </div>
                              ) : (
                                <div className="space-y-1.5 text-left">
                                  <div className="text-[11px] text-slate-500 font-bold bg-indigo-50/40 border border-indigo-100 rounded px-2 py-0.5 inline-block">
                                    🪐 全域問卷管理 (自動存取所有表單)
                                  </div>
                                  {uObj.role !== UserRole.WEBMASTER && (
                                    <div className="flex items-center space-x-2 pt-0.5">
                                      <input
                                        type="checkbox"
                                        id={`privilege-trivia-${uname}`}
                                        checked={!!uObj.canManageTrivia}
                                        disabled={currentUser.role !== UserRole.WEBMASTER}
                                        onChange={(e) => handleToggleUserTriviaPrivilege(uname, e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 accent-indigo-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                      <label
                                        htmlFor={`privilege-trivia-${uname}`}
                                        className={`text-[10px] font-extrabold select-none flex items-center gap-1 ${
                                          currentUser.role === UserRole.WEBMASTER ? "text-slate-600 cursor-pointer hover:text-indigo-700" : "text-slate-400 cursor-not-allowed"
                                        }`}
                                      >
                                        <span>📚 題庫擴充特權: {uObj.canManageTrivia ? "已開啟" : "未開啟"}</span>
                                        <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-mono font-bold">站主分配</span>
                                      </label>
                                    </div>
                                  )}

                                  {uObj.role === UserRole.SUPER_ADMIN && (
                                    <div className="flex items-center space-x-2 pt-1">
                                      <input
                                        type="checkbox"
                                        id={`privilege-log-${uname}`}
                                        checked={!!uObj.canManageLogs}
                                        disabled={currentUser.role !== UserRole.WEBMASTER}
                                        onChange={(e) => handleToggleUserLogManagePrivilege(uname, e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-amber-600 border-slate-300 focus:ring-amber-500 accent-amber-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                      <label
                                        htmlFor={`privilege-log-${uname}`}
                                        className={`text-[10px] font-extrabold select-none flex items-center gap-1 ${
                                          currentUser.role === UserRole.WEBMASTER ? "text-slate-600 cursor-pointer hover:text-amber-700" : "text-slate-400 cursor-not-allowed"
                                        }`}
                                      >
                                        <span>🛡️ 日誌管理(改/刪/清): {uObj.canManageLogs ? "已授權" : "默認僅查看"}</span>
                                        <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-mono font-bold">站主授權</span>
                                      </label>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Ban Toggle status button */}
                            <td className="py-3 px-4 text-center">
                              {isSelf || isWebmaster ? (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-55 px-2 py-1 rounded-full border border-emerald-100 select-none">
                                  豁免
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBanUser(uname)}
                                  className={`px-2 py-1 text-[10px] font-extrabold rounded-full transition-all border shadow-xs cursor-pointer ${
                                    uObj.banned
                                      ? "bg-rose-100 hover:bg-rose-200 text-rose-700 border-rose-200 animate-pulse"
                                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                  }`}
                                >
                                  {uObj.banned ? "🔴 已封禁限制" : "🟢 正常運作中"}
                                </button>
                              )}
                            </td>

                            {/* Deleting a user row action */}
                            <td className="py-3 px-4 text-right">
                              {isWebmaster || isSelf ? (
                                <span className="text-[10px] text-slate-300 select-none italic font-sans pr-1">防呆保護</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubUser(uname)}
                                  className="p-1 px-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg border border-rose-200 transition-all text-[11px] font-bold inline-flex items-center space-x-1 cursor-pointer"
                                  title="永久刪除帳號"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>刪除</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-amber-50/30 border border-amber-200/50 rounded-2xl">
                <span className="text-xs font-bold text-amber-800 block">💡 系統站主（Webmaster）操作備忘錄：</span>
                <ul className="list-disc pl-4 text-[11px] text-amber-700 space-y-1 mt-1 font-sans">
                  <li><strong>帳號密碼保護</strong>：此清單中包含所有系統下屬帳號的存取密碼。若用戶遺失密碼，請直接點選編輯圖示或於此處強制重置其密碼。</li>
                  <li><strong>角色職等變更</strong>：指派角色為操作員/分析員時，系統會重置其對應問卷。系統管理員和超級管理員會自帶全表存取權限。</li>
                  <li><strong>防禦自我銷毀保護</strong>：站主帳號及超級管理帳戶不可由此處被封禁或刪除，確保核心總管權限絕對不遺失。</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB: System Admin Questionnaire Distribution Center */}
          {activeTab === "distribute_surveys" && currentUser.role === UserRole.SYSTEM_ADMIN && (
            <SystemAdminDistributePanel
              currentUser={currentUser}
              questionnaires={questionnaires}
              rbacUsers={rbacUsers}
              onToggleUserTable={handleToggleUserTable}
              onUpdateUserStar={handleUpdateUserStar}
              onTriggerBannedAlert={(name, key) => setBannedAlert({ isOpen: true, featureName: name, featureKey: key })}
              checkFeatureAccess={checkFeatureAccess}
            />
          )}

          {/* TAB 8: Feature Ban Panel - Webmaster and Super Admin only */}
          {activeTab === "feature_bans" && (currentUser.role === UserRole.WEBMASTER || currentUser.role === UserRole.SUPER_ADMIN) && (
            isFeatureBanned(currentUser, "ban_management") ? (
              <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-8 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center mx-auto">
                  <Ban className="w-8 h-8 text-red-600" />
                </div>
                <div className="text-2xl font-black text-red-600">{"{該功能/特權已被封禁}"}</div>
                <p className="text-xs text-red-700 max-w-md mx-auto">
                  您的「封禁功能面板」管理權限已被系統站主封禁，無法對下屬角色進行封鎖管制。
                </p>
                <button
                  type="button"
                  onClick={() => setBannedAlert({ isOpen: true, featureName: "封禁功能面板", featureKey: "ban_management" })}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  查看封禁警示
                </button>
              </div>
            ) : (
              <FeatureBanPanel
                currentUser={currentUser}
                questionnaires={questionnaires}
                allUsers={rbacUsers}
                onUpdateUserBans={handleUpdateUserBans}
                onTriggerBannedAlert={(featureName, featureKey) => {
                  setBannedAlert({
                    isOpen: true,
                    featureName,
                    featureKey
                  });
                }}
                addLog={addLog}
              />
            )
          )}

        </div>
      </div>

      {/* ONLINE EDIT MODAL (操作員與管理員可修改已經在資料庫的問卷答案) */}
      {editingResponse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-response-modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl border max-w-xl w-full max-h-[85vh] overflow-y-auto" id="edit-response-modal">
            
            <div className="p-6 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-amber-500 text-slate-900 font-bold px-2 py-0.5 rounded-full select-none">特權資料覆寫</span>
                <h3 className="text-md font-bold mt-1">線上修改更正資料庫答案 ({editingResponse.id})</h3>
              </div>
              <button
                id="close-edit-response-modal"
                onClick={() => setEditingResponse(null)}
                className="text-white hover:text-slate-300 font-bold text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editingMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold">
                  {editingMsg}
                </div>
              )}

              {currentSurvey?.questions.map((q) => {
                const curentAns = editingAnswers[q.id];
                return (
                  <div key={q.id} className="p-4 bg-slate-50 border rounded-xl space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">{q.title}</label>
                    
                    {q.type === "SINGLE_CHOICE" && q.options && (
                      <select
                        id={`edit-modal-select-${q.id}`}
                        value={curentAns || ""}
                        onChange={(e) => setEditingAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="w-full bg-white border rounded text-xs p-1.5 focus:border-amber-500"
                      >
                        <option value="">--請選擇--</option>
                        {q.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {q.type === "MULTI_CHOICE" && q.options && (
                      <div className="space-y-1" id={`edit-modal-multi-${q.id}`}>
                        {q.options.map(opt => {
                          const list = (curentAns as string[]) || [];
                          const isChecked = list.includes(opt);
                          return (
                            <label key={opt} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let newList = [...list];
                                  if (e.target.checked) {
                                    newList.push(opt);
                                  } else {
                                    newList = newList.filter(item => item !== opt);
                                  }
                                  setEditingAnswers(prev => ({ ...prev, [q.id]: newList }));
                                }}
                                className="w-4 h-4 rounded text-indigo-600"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {(q.type === "SHORT_TEXT" || q.type === "PARAGRAPH") && (
                      <textarea
                        id={`edit-modal-text-${q.id}`}
                        rows={q.type === "PARAGRAPH" ? 3 : 1}
                        value={curentAns || ""}
                        onChange={(e) => setEditingAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="w-full bg-white border rounded p-2 text-xs focus:border-amber-500"
                      />
                    )}

                    {q.type === "RATING" && (
                      <div className="flex items-center space-x-1" id={`edit-modal-rating-${q.id}`}>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setEditingAnswers(prev => ({ ...prev, [q.id]: num }))}
                            className="focus:outline-none"
                          >
                            <svg
                              className={`w-5 h-5 ${
                                num <= (curentAns || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200"
                              }`}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2 rounded-b-2xl">
              <button
                id="edit-modal-cancel"
                onClick={() => setEditingResponse(null)}
                className="py-1.5 px-4 bg-white border rounded text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                關閉
              </button>
              {/* Prominent save button */}
              <button
                id="edit-modal-submit"
                onClick={handleSaveModalResponse}
                className="py-1.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 text-white font-bold text-xs rounded shadow border border-amber-300 cursor-pointer"
              >
                ⚡ 確定線上修改更正
              </button>
            </div>

          </div>
        </div>
      )}


      {sysAccountEditingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-5 flex flex-col flex-1">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-indigo-600" />
                修改 {sysAccountEditingUser} 密碼
              </h2>
              
              <div className="space-y-1.5 mb-6">
                <label className="text-xs font-bold text-slate-500">新密碼</label>
                <input
                  type="text"
                  value={sysAccountTempPassword}
                  onChange={(e) => setSysAccountTempPassword(e.target.value)}
                  placeholder="請輸入新密碼"
                  className="w-full border border-slate-300 bg-slate-50 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-indigo-500 font-mono transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateUserPassword(sysAccountEditingUser, sysAccountTempPassword);
                  }}
                />
              </div>

              <div className="flex gap-2 justify-end mt-auto pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSysAccountEditingUser(null);
                    setSysAccountTempPassword("");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateUserPassword(sysAccountEditingUser, sysAccountTempPassword)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  確認修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Banned Alert Modal */}
      <BannedAlertModal
        alertState={bannedAlert}
        onClose={() => setBannedAlert({ isOpen: false })}
      />
    </div>
  );
}
