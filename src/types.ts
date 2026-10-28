export type AppLanguage = "zh-TW" | "zh-CN" | "en";

export enum UserRole {
  WEBMASTER = "WEBMASTER",
  SUPER_ADMIN = "SUPER_ADMIN",
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  OPERATOR = "OPERATOR",
  ANALYST = "ANALYST",
  QUESTION_CREATOR = "QUESTION_CREATOR",
  RESPONDENT = "RESPONDENT"
}

export type StarLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | number; // Support up to 7 stars for Respondent tiers & Creator ranks

export interface AppUser {
  username: string;
  role: UserRole;
  starLevel?: StarLevel; // Use for 出題人 rank (1,2,3) or 答題人 tier (1..7)
  respondentSubRank?: number; // 1-indexed sub rank within tier (e.g. 1..3 or 1..4 or 1..5)
  respondentPoints?: number; // Points acquired, 7 points = 1 question
  assignedTables?: string[]; // Allowed questionnaire IDs
  passwordChangeApplied?: boolean;
  distributedToAdmins?: boolean;
  banned?: boolean;
  bannedFeatures?: string[]; // Specified features/privileges banned by Webmaster or Super Admin
  
  // Custom respondent claims/actions tracking (counter resets or direct uses)
  promotedFriendsThisMonthCount_T3?: number; // diamonds/legendary monthly limit tracker (up to 3阶)
  promotedFriendsThisWeekCount_T5?: number; // legendary weekly limit tracker (up to 5阶)
  bannedOtherAppliedThisMonthCount?: number; // legendary apply to ban count tracker
  canManageTrivia?: boolean; // Privilege to add questions to trivia knowledge bank
  canManageLogs?: boolean; // Privilege to modify, delete, and clear audit logs (requires Webmaster authorization for Super Admins)
  password?: string;
  extraT3Quota?: number;
  extraT5Quota?: number;
  extraBanQuota?: number;
}

export type QuestionType = "SINGLE_CHOICE" | "MULTI_CHOICE" | "SHORT_TEXT" | "PARAGRAPH" | "RATING";

export interface Question {
  id: string;
  title: string;
  type: QuestionType;
  options?: string[]; // for single/multi choice
  required: boolean;
  minRating?: number; // default 1
  maxRating?: number; // default 5
}

export interface QuerySystemConfig {
  id: string;
  name: string;
  passwordRequired: boolean;
  password?: string;
  editableQuestionIds: string[]; // which questions can be modified in this query system
  searchQuestionId?: string; // Selected question ID to search by, empty means default response reference code
  hideInHall?: boolean; // 新增功能：是否在問卷大廳的路徑隱藏此子查詢入口 (預設 false，啟用後僅能透過專屬直達連結存取)
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  isActive: boolean;
  startTime?: string; // YYYY-MM-DDTHH:mm
  endTime?: string; // YYYY-MM-DDTHH:mm
  passwordRequired: boolean;
  password?: string;
  querySystems: QuerySystemConfig[];
  emailNotificationEnabled: boolean;
  distributedToAdmins?: boolean;
  createdBy?: string; // Tracks which user created this questionnaire (especially for QUESTION_CREATOR)
  disputes?: { id: string; username: string; reason: string; timestamp: string }[]; // Challenges by Respondents
  stopApplied?: { id: string; username: string; reason: string; timestamp: string; status: "PENDING" | "APPROVED" | "REJECTED" }[]; // Stop applications from tier 5+ Respondents
  suggestions?: { id: string; username: string; title: string; type: string; options: string[]; timestamp: string }[]; // Citizen question suggestions
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: Record<string, any>; // questionId -> value
  submittedAt: string;
  submittedBy?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  target: string;
  details: string;
  prevHash?: string; // SHA-256 Hash of the preceding audit log block
  hash?: string;     // SHA-256 Hash of this audit log block
}

export interface PromotionApplication {
  id: string;
  username: string;
  currentRole: UserRole;
  currentStar?: StarLevel;
  targetRole: UserRole;
  targetStar?: StarLevel;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export interface SiteUpdateLog {
  id: string;
  version: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  title: string;
  category: "SECURITY" | "NETWORK" | "DATABASE" | "WEBMASTER" | "MONITORING" | "PRIVILEGE" | "FEATURE" | "ARCHITECTURE";
  categoryLabel: string;
  author: string;
  summary: string;
  details: string[];
  isCustom?: boolean;
  webmasterOnly?: boolean; // When true, only system webmaster can view this update log
}
