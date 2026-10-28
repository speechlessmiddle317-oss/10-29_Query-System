import { Questionnaire, SurveyResponse, AuditLog, AppUser, UserRole, PromotionApplication } from "../types";

export const INITIAL_USERS: Record<string, { username: string; password?: string; role?: UserRole; starLevel?: any; assignedTables?: string[]; banned?: boolean; respondentPoints?: number; respondentSubRank?: number; canManageTrivia?: boolean; canManageLogs?: boolean }> = {
  "webmaster": {
    username: "webmaster",
    password: "123",
    role: UserRole.WEBMASTER,
    assignedTables: [],
    canManageTrivia: true,
    canManageLogs: true
  },
  "super_admin": {
    username: "super_admin",
    password: "123",
    role: UserRole.SUPER_ADMIN,
    assignedTables: [],
    canManageTrivia: false,
    canManageLogs: false // 超級管理員默認僅可查看日志，修改刪除清空需由系統站主授權
  },
  "sys_admin": {
    username: "sys_admin",
    password: "123",
    role: UserRole.SYSTEM_ADMIN,
    assignedTables: []
  },
  "operator": {
    username: "operator",
    password: "123",
    role: UserRole.OPERATOR,
    starLevel: 3,
    assignedTables: ["survey-1", "survey-2", "survey-3"]
  },
  "operator3": {
    username: "operator3",
    password: "123",
    role: UserRole.OPERATOR,
    starLevel: 3,
    assignedTables: ["survey-1", "survey-2", "survey-3"]
  },
  "operator2": {
    username: "operator2",
    password: "123",
    role: UserRole.OPERATOR,
    starLevel: 2,
    assignedTables: ["survey-1", "survey-2"]
  },
  "operator1": {
    username: "operator1",
    password: "123",
    role: UserRole.OPERATOR,
    starLevel: 1,
    assignedTables: ["survey-1"]
  },
  "analyst": {
    username: "analyst",
    password: "123",
    role: UserRole.ANALYST,
    starLevel: 3,
    assignedTables: ["survey-1", "survey-2", "survey-3"]
  },
  "analyst3": {
    username: "analyst3",
    password: "123",
    role: UserRole.ANALYST,
    starLevel: 3,
    assignedTables: ["survey-1", "survey-2", "survey-3"]
  },
  "analyst1": {
    username: "analyst1",
    password: "123",
    role: UserRole.ANALYST,
    starLevel: 1,
    assignedTables: ["survey-1"]
  },
  "creator": {
    username: "creator",
    password: "123",
    role: UserRole.QUESTION_CREATOR,
    starLevel: 1,
    assignedTables: []
  },
  "creator_t1": {
    username: "creator_t1",
    password: "123",
    role: UserRole.QUESTION_CREATOR,
    starLevel: 1,
    assignedTables: []
  },
  "creator_t2": {
    username: "creator_t2",
    password: "123",
    role: UserRole.QUESTION_CREATOR,
    starLevel: 2,
    assignedTables: []
  },
  "creator_t3": {
    username: "creator_t3",
    password: "123",
    role: UserRole.QUESTION_CREATOR,
    starLevel: 3,
    assignedTables: []
  },
  "respondent": {
    username: "respondent",
    password: "123",
    role: UserRole.RESPONDENT,
    respondentPoints: 0,
    respondentSubRank: 1
  },
  "respondent_elite": {
    username: "respondent_elite",
    password: "123",
    role: UserRole.RESPONDENT,
    respondentPoints: 240, // 240 points / 20 = 12 answered questions => tier 2 Bronze Rank 3
    respondentSubRank: 3
  }
};

export const INITIAL_QUESTIONNAIRES: Questionnaire[] = [
  {
    id: "survey-1",
    title: "115學年度學生學習滿意度調查",
    description: "本問卷旨在收集學生對本學期課程、硬體設備與教學品質的滿意度回饋，以便我們持續改進。",
    isActive: true,
    startTime: "2026-06-01T00:00",
    endTime: "2026-06-30T23:59",
    passwordRequired: true,
    password: "student123",
    emailNotificationEnabled: true,
    questions: [
      {
        id: "q1_1",
        title: "您對於目前本學期各科教師的教學態度是否滿意？",
        type: "SINGLE_CHOICE",
        required: true,
        options: ["非常滿意", "滿意", "普通", "不滿意", "非常不不滿意"]
      },
      {
        id: "q1_2",
        title: "您常去或常使用的校園設施有哪些？(多選)",
        type: "MULTI_CHOICE",
        required: true,
        options: ["圖書館", "體育館", "電腦教室", "學生餐廳", "自修室"]
      },
      {
        id: "q1_3",
        title: "請給予本校的軟硬體綜合滿意度評分 (1星低分至5星高分)",
        type: "RATING",
        required: true,
        minRating: 1,
        maxRating: 5
      },
      {
        id: "q1_4",
        title: "您認為目前學校最需要改進的硬體或軟體項目是甚麼？",
        type: "SHORT_TEXT",
        required: false
      },
      {
        id: "q1_5",
        title: "如果您有其他具體改進意見，請在此處詳細說明：",
        type: "PARAGRAPH",
        required: false
      }
    ],
    querySystems: [
      {
        id: "query-1-a",
        name: "圖書館設備專項查詢修改系統",
        passwordRequired: true,
        password: "libquery",
        editableQuestionIds: ["q1_4", "q1_5"]
      },
      {
        id: "query-1-b",
        name: "教師教學與課程反饋查詢系統",
        passwordRequired: false,
        editableQuestionIds: ["q1_5"]
      }
    ]
  },
  {
    id: "survey-2",
    title: "校園餐飲品質與膳食衛生滿意度",
    description: "本問卷用於深入瞭解全校師生對於學生餐廳餐飲品質、多樣性、價格與衛生的精確滿意度。",
    isActive: true,
    startTime: "2026-05-15T09:00",
    endTime: "2026-07-15T18:00",
    passwordRequired: false,
    emailNotificationEnabled: false,
    questions: [
      {
        id: "q2_1",
        title: "您最常光顧的學餐攤位是哪一家？",
        type: "SINGLE_CHOICE",
        required: true,
        options: ["麵食鋪", "自助餐", "速食店", "飲品吧", "便利商店"]
      },
      {
        id: "q2_2",
        title: "請問您對學餐的整體價格合理度覺得如何？",
        type: "RATING",
        required: true,
        minRating: 1,
        maxRating: 5
      },
      {
        id: "q2_3",
        title: "您覺得哪些具體食物的口味或衛生有待加強？",
        type: "SHORT_TEXT",
        required: false
      }
    ],
    querySystems: [
      {
        id: "query-2-a",
        name: "膳食管理委員會學餐內部修正查詢系統",
        passwordRequired: true,
        password: "food123",
        editableQuestionIds: ["q2_3"]
      }
    ]
  },
  {
    id: "survey-3",
    title: "115年社團活動暨課外活動參與意願問卷",
    description: "本問卷為瞭解學生對於社團活動與課外項目的參與熱度，以供分配次年度經費使用。",
    isActive: false,
    startTime: "2026-03-01T08:00",
    endTime: "2026-04-01T17:00",
    passwordRequired: false,
    emailNotificationEnabled: true,
    questions: [
      {
        id: "q3_1",
        title: "您目前有參加任何學校社團嗎？",
        type: "SINGLE_CHOICE",
        required: true,
        options: ["有，我是社團幹部", "有，我是普通隊員", "沒有，但我有興趣參與", "沒有，且完全不感興趣"]
      },
      {
        id: "q3_2",
        title: "您最希望學校在下個學期多籌辦甚麼類型的社團活動呢？",
        type: "SHORT_TEXT",
        required: true
      }
    ],
    querySystems: []
  }
];

export const INITIAL_RESPONSES: SurveyResponse[] = [
  {
    id: "resp-001",
    surveyId: "survey-1",
    submittedAt: "2026-06-10 14:32:15",
    answers: {
      "q1_1": "非常滿意",
      "q1_2": ["圖書館", "自修室"],
      "q1_3": 5,
      "q1_4": "希望能升級圖書館的空調系統與插座數量",
      "q1_5": "有些教授的錄影音效品質不太佳，希望可以改善麥克風設備。"
    }
  },
  {
    id: "resp-002",
    surveyId: "survey-1",
    submittedAt: "2026-06-11 09:12:00",
    answers: {
      "q1_1": "滿意",
      "q1_2": ["圖書館", "電腦教室", "學生餐廳"],
      "q1_3": 4,
      "q1_4": "電腦教室的鍵盤比較老舊，有很多按鍵失靈",
      "q1_5": "無"
    }
  },
  {
    id: "resp-003",
    surveyId: "survey-1",
    submittedAt: "2026-06-12 16:50:42",
    answers: {
      "q1_1": "普通",
      "q1_2": ["圖書館", "學生餐廳"],
      "q1_3": 3,
      "q1_4": "學餐尖峰時段太擠了",
      "q1_5": "有些線上教學資源常登入失敗。"
    }
  },
  {
    id: "resp-004",
    surveyId: "survey-2",
    submittedAt: "2026-06-05 12:15:33",
    answers: {
      "q2_1": "自助餐",
      "q2_2": 4,
      "q2_3": "自助餐肉類稍油"
    }
  },
  {
    id: "resp-005",
    surveyId: "survey-2",
    submittedAt: "2026-06-06 13:00:10",
    answers: {
      "q2_1": "麵食鋪",
      "q2_2": 2,
      "q2_3": "牛肉湯麵沒甚麼味道，且湯常常是溫的"
    }
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    timestamp: "2026-06-15 10:15:44",
    user: "super_admin",
    role: "超級管理員",
    action: "系統初始化",
    target: "系統全域環境",
    details: "系統首次載入完成，初始化3個預設問卷與初始帳號角色權限。"
  },
  {
    id: "log-2",
    timestamp: "2026-06-15 10:20:12",
    user: "super_admin",
    role: "超級管理員",
    action: "新增查詢系統",
    target: "115學年度學生學習滿意度調查",
    details: "為問卷'115學年度學生學習滿意度調查'指派了兩個獨立密碼的子查詢系統。"
  }
];

export const INITIAL_PROMOTIONS: PromotionApplication[] = [
  {
    id: "promo-1",
    username: "analyst3",
    currentRole: UserRole.ANALYST,
    currentStar: 3,
    targetRole: UserRole.OPERATOR,
    targetStar: 1,
    status: "PENDING",
    createdAt: "2026-06-14 18:30:00"
  },
  {
    id: "promo-2",
    username: "operator3",
    currentRole: UserRole.OPERATOR,
    currentStar: 3,
    targetRole: UserRole.SYSTEM_ADMIN,
    status: "PENDING",
    createdAt: "2026-06-15 08:30:00"
  }
];
