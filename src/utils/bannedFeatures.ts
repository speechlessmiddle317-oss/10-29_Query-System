import { UserRole, AppUser, Questionnaire } from "../types";

export interface BanFeatureItem {
  id: string;
  name: string;
  description: string;
  category: "core" | "survey" | "privilege";
  applicableRoles: UserRole[];
  surveyId?: string;
}

/**
 * Check if an actor role is authorized to ban/unban features for a target role
 * - WEBMASTER can ban: SUPER_ADMIN, SYSTEM_ADMIN, OPERATOR, ANALYST, QUESTION_CREATOR, RESPONDENT
 * - SUPER_ADMIN can ban: SYSTEM_ADMIN, OPERATOR, ANALYST, QUESTION_CREATOR, RESPONDENT
 */
export function canManageUserBans(managerRole: UserRole, targetRole: UserRole): boolean {
  if (managerRole === UserRole.WEBMASTER) {
    // Webmaster can manage anyone except other webmasters
    return targetRole !== UserRole.WEBMASTER;
  }
  if (managerRole === UserRole.SUPER_ADMIN) {
    // Super Admin can manage subordinate roles (not Webmaster, not other Super Admins)
    return (
      targetRole === UserRole.SYSTEM_ADMIN ||
      targetRole === UserRole.OPERATOR ||
      targetRole === UserRole.ANALYST ||
      targetRole === UserRole.QUESTION_CREATOR ||
      targetRole === UserRole.RESPONDENT
    );
  }
  if (managerRole === UserRole.SYSTEM_ADMIN) {
    // System Admin can manage subordinate question creators and respondents
    return targetRole === UserRole.QUESTION_CREATOR || targetRole === UserRole.RESPONDENT;
  }
  return false;
}

/**
 * Check if a specific feature or privilege is banned for the given user
 */
export function isFeatureBanned(user: AppUser | null | undefined, featureKey: string): boolean {
  if (!user) {
    return false;
  }

  // Account and feature ban status are authoritative from the authenticated user identity (SQL Server / JWT)
  const bannedList = Array.isArray(user.bannedFeatures) ? [...user.bannedFeatures] : [];
  const isFullyBanned = !!user.banned;

  // If the user is fully account-banned, everything is blocked
  if (isFullyBanned) {
    return true;
  }
  if (!bannedList || bannedList.length === 0) {
    return false;
  }
  // Check exact match
  if (bannedList.includes(featureKey)) {
    return true;
  }

  // Privilege / Perk key alias map to ensure 100% compatibility across dashboard components
  const aliasMap: Record<string, string[]> = {
    "respondent_perk_dispute": ["privilege_dispute"],
    "privilege_dispute": ["respondent_perk_dispute"],
    "respondent_perk_invite_link": ["privilege_invite_link"],
    "privilege_invite_link": ["respondent_perk_invite_link"],
    "respondent_perk_suggest": ["privilege_suggest"],
    "privilege_suggest": ["respondent_perk_suggest"],
    "respondent_perk_stop_survey": ["privilege_report_survey_stop"],
    "privilege_report_survey_stop": ["respondent_perk_stop_survey"],
    "respondent_perk_promote_friend": ["privilege_promote_friend_t3", "privilege_promote_friend_t5"],
    "privilege_promote_friend_t3": ["respondent_perk_promote_friend"],
    "privilege_promote_friend_t5": ["respondent_perk_promote_friend"],
    "respondent_perk_ban_request": ["privilege_ban_other_temporary"],
    "privilege_ban_other_temporary": ["respondent_perk_ban_request"],
    "respondent_perk_quota_apply": ["privilege_request_quota"],
    "privilege_request_quota": ["respondent_perk_quota_apply"],
    "privilege_manage_trivia": ["privilege_manage_trivia"]
  };

  const aliases = aliasMap[featureKey];
  if (aliases && aliases.some((a) => bannedList.includes(a))) {
    return true;
  }

  // Check wildcard matches:
  // e.g. If operator has "operator_all_operations", any "operator_operate_*" is banned
  if (featureKey.startsWith("operator_operate_") && bannedList.includes("operator_all_operations")) {
    return true;
  }
  // If operator has "operator_all_views", any "operator_view_*" is banned
  if (featureKey.startsWith("operator_view_") && bannedList.includes("operator_all_views")) {
    return true;
  }
  // If respondent has "respondent_answer", any "respondent_answer_*" is banned
  if (featureKey.startsWith("respondent_answer_") && bannedList.includes("respondent_answer")) {
    return true;
  }
  return false;
}

/**
 * Return all configurable ban features for a specific user according to their role and current questionnaires
 */
export function getRoleAvailableBanFeatures(
  targetUser: AppUser,
  questionnaires: Questionnaire[] = []
): BanFeatureItem[] {
  const items: BanFeatureItem[] = [];
  const role = targetUser.role;

  // 1. SUPER_ADMIN
  // 系統站主可封禁超級管理員：與系統管理員一樣(發配問卷功能、查看功能、出卷、編輯、刪除)，但仍然可被封禁系統日誌和封禁功能面板
  if (role === UserRole.SUPER_ADMIN) {
    items.push(
      {
        id: "distribute_questionnaires",
        name: "發配問卷功能",
        description: "將問卷指派發配給下屬管理員或操作員",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN]
      },
      {
        id: "view_data",
        name: "查看功能",
        description: "查看系統問卷清單、填寫回覆與回覆內容資料",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN]
      },
      {
        id: "creator_create",
        name: "出卷功能",
        description: "建立新問卷與發布全新題目內容",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.QUESTION_CREATOR]
      },
      {
        id: "creator_edit",
        name: "編輯功能",
        description: "修改已建立問卷之題目、選項、描述、參數與問卷封禁停用/重啟狀態",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.QUESTION_CREATOR]
      },
      {
        id: "creator_delete",
        name: "刪除功能",
        description: "刪除現有問卷或問卷中的個別題目",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.QUESTION_CREATOR]
      },
      {
        id: "audit_logs",
        name: "系統日誌",
        description: "檢視與稽核全系統操作紀錄及異動審計日誌",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN]
      },
      {
        id: "ban_management",
        name: "封禁功能面板",
        description: "進入封禁管理中心管制與凍結下屬帳號的功能權限",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN]
      }
    );
  }

  // 2. SYSTEM_ADMIN
  // 超級管理員可封禁系統管理員的發配問卷功能及查看功能，以及出題人的所有功能(出卷、編輯含封禁停用、刪除)
  if (role === UserRole.SYSTEM_ADMIN) {
    items.push(
      {
        id: "distribute_questionnaires",
        name: "發配問卷功能",
        description: "將問卷指派發配給下屬管理員或操作員",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN]
      },
      {
        id: "view_data",
        name: "查看功能",
        description: "查看系統問卷清單、填寫回覆與回覆內容資料",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN]
      },
      {
        id: "creator_create",
        name: "出卷功能",
        description: "建立新問卷與發布全新題目內容 (出題人功能)",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.QUESTION_CREATOR]
      },
      {
        id: "creator_edit",
        name: "編輯功能",
        description: "修改已建立問卷之題目、選項、描述、參數與問卷封禁停用/重啟狀態 (出題人功能)",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.QUESTION_CREATOR]
      },
      {
        id: "creator_delete",
        name: "刪除功能",
        description: "刪除現有問卷或問卷中的個別題目 (出題人功能)",
        category: "core",
        applicableRoles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.QUESTION_CREATOR]
      }
    );
  }

  // 3. OPERATOR
  // 操作員可被封禁的功能則是問卷的操作及查看權限。註：每個問卷可被單獨封禁
  if (role === UserRole.OPERATOR) {
    // 全域操作與查看
    items.push(
      {
        id: "operator_all_operations",
        name: "問卷整體操作權限",
        description: "一次性封鎖對所有問卷的編輯、異動、設定與匯出權限",
        category: "core",
        applicableRoles: [UserRole.OPERATOR]
      },
      {
        id: "operator_all_views",
        name: "問卷整體查看權限",
        description: "一次性封鎖對所有問卷內容、題目與回覆資料的檢視權限",
        category: "core",
        applicableRoles: [UserRole.OPERATOR]
      }
    );

    // 每個問卷單獨封禁選項
    questionnaires.forEach((survey) => {
      items.push(
        {
          id: `operator_operate_${survey.id}`,
          name: `操作問卷：${survey.title}`,
          description: `單獨封鎖對「${survey.title}」的編輯、子查詢配置與管理操作`,
          category: "survey",
          applicableRoles: [UserRole.OPERATOR],
          surveyId: survey.id
        },
        {
          id: `operator_view_${survey.id}`,
          name: `查看問卷：${survey.title}`,
          description: `單獨封鎖對「${survey.title}」的填報回覆與題目檢視權限`,
          category: "survey",
          applicableRoles: [UserRole.OPERATOR],
          surveyId: survey.id
        }
      );
    });
  }

  // 4. ANALYST
  // 分析員則是查看權限
  if (role === UserRole.ANALYST) {
    items.push({
      id: "analyst_view",
      name: "查看權限",
      description: "查看問卷統計分析、圖表趨勢及大數據統計資料",
      category: "core",
      applicableRoles: [UserRole.ANALYST]
    });
  }

  // 5. QUESTION_CREATOR
  // 出題人可被封禁的是出卷和編輯及刪除功能
  if (role === UserRole.QUESTION_CREATOR) {
    items.push(
      {
        id: "creator_create",
        name: "出卷功能",
        description: "建立新問卷與發布全新題目內容",
        category: "core",
        applicableRoles: [UserRole.QUESTION_CREATOR]
      },
      {
        id: "creator_edit",
        name: "編輯功能",
        description: "修改已建立問卷之題目、選項、描述、參數與問卷封禁停用/重啟狀態",
        category: "core",
        applicableRoles: [UserRole.QUESTION_CREATOR]
      },
      {
        id: "creator_delete",
        name: "刪除功能",
        description: "刪除現有問卷或問卷中的個別題目",
        category: "core",
        applicableRoles: [UserRole.QUESTION_CREATOR]
      }
    );
  }

  // 6. RESPONDENT
  // 答題市民則是答題及升級獲得的特權可被單獨封禁
  if (role === UserRole.RESPONDENT) {
    // 答題功能
    items.push({
      id: "respondent_answer",
      name: "答題功能",
      description: "參與答題闖關賺積分及填報全站各類問卷",
      category: "core",
      applicableRoles: [UserRole.RESPONDENT]
    });

    // 每個問卷單獨答題封禁
    questionnaires.forEach((survey) => {
      items.push({
        id: `respondent_answer_${survey.id}`,
        name: `單獨答題封禁：${survey.title}`,
        description: `單獨禁止填寫「${survey.title}」這份問卷`,
        category: "survey",
        applicableRoles: [UserRole.RESPONDENT],
        surveyId: survey.id
      });
    });

    // 升級獲得特權（可被單獨封禁）
    items.push(
      {
        id: "privilege_dispute",
        name: "特權：質疑出題人的題目",
        description: "2階青銅解鎖：針對出題題目直接提出質疑申訴",
        category: "privilege",
        applicableRoles: [UserRole.RESPONDENT]
      },
      {
        id: "privilege_invite_link",
        name: "特權：複製問卷邀請鏈結",
        description: "3階白銀解鎖：導出並複製外連問卷專屬直達邀請",
        category: "privilege",
        applicableRoles: [UserRole.RESPONDENT]
      },
      {
        id: "privilege_suggest",
        name: "特權：向出題人推薦題目",
        description: "4階黃金解鎖：主動提議及推薦新設計的問卷題目",
        category: "privilege",
        applicableRoles: [UserRole.RESPONDENT]
      },
      {
        id: "privilege_report_survey_stop",
        name: "特權：提請封鎖停用問卷",
        description: "5階白金解鎖：提報出題人惡意或釣魚問卷要求停用審查",
        category: "privilege",
        applicableRoles: [UserRole.RESPONDENT]
      },
      {
        id: "privilege_promote_friend_t3",
        name: "特權：直接晉升朋友至白銀(3階)",
        description: "6階鑽石解鎖：輸入帳號名稱拔擢朋友至3階白銀",
        category: "privilege",
        applicableRoles: [UserRole.RESPONDENT]
      },
      {
        id: "privilege_promote_friend_t5",
        name: "特權：直升朋友至白金(5階)",
        description: "7階傳奇解鎖：拔擢朋友直達5階白金特權",
        category: "privilege",
        applicableRoles: [UserRole.RESPONDENT]
      },
      {
        id: "privilege_ban_other_temporary",
        name: "特權：強制臨時封鎖涉嫌帳號1小時",
        description: "7階傳奇解鎖：神聖裁決填寫舉報封鎖涉嫌作弊帳號",
        category: "privilege",
        applicableRoles: [UserRole.RESPONDENT]
      },
      {
        id: "privilege_request_quota",
        name: "特權：申請追加特權次數額度",
        description: "7階傳奇解鎖：向系統站主提出加碼特權額度申請",
        category: "privilege",
        applicableRoles: [UserRole.RESPONDENT]
      },
      {
        id: "privilege_manage_trivia",
        name: "特權：答題學知識題庫自主擴充",
        description: "進入知識題庫自主新增擴充題庫題目的進階特權",
        category: "privilege",
        applicableRoles: [UserRole.RESPONDENT]
      }
    );
  }

  return items;
}

/**
 * Helper to get user-friendly name of a banned feature key
 */
export function getBannedFeatureDisplayName(
  featureKey: string,
  questionnaires: Questionnaire[] = []
): string {
  if (featureKey === "audit_logs") return "系統日誌";
  if (featureKey === "ban_management") return "封禁功能面板";
  if (featureKey === "distribute_questionnaires") return "發配問卷功能";
  if (featureKey === "view_data") return "查看功能";
  if (featureKey === "operator_all_operations") return "問卷整體操作權限";
  if (featureKey === "operator_all_views") return "問卷整體查看權限";
  if (featureKey.startsWith("operator_operate_")) {
    const surveyId = featureKey.replace("operator_operate_", "");
    const q = questionnaires.find((s) => s.id === surveyId);
    return q ? `操作問卷：${q.title}` : "問卷操作功能";
  }
  if (featureKey.startsWith("operator_view_")) {
    const surveyId = featureKey.replace("operator_view_", "");
    const q = questionnaires.find((s) => s.id === surveyId);
    return q ? `查看問卷：${q.title}` : "問卷查看功能";
  }
  if (featureKey === "analyst_view") return "統計分析查看權限";
  if (featureKey === "creator_create") return "出卷功能";
  if (featureKey === "creator_edit") return "編輯功能";
  if (featureKey === "creator_delete") return "刪除功能";
  if (featureKey === "respondent_answer") return "答題功能";
  if (featureKey.startsWith("respondent_answer_")) {
    const surveyId = featureKey.replace("respondent_answer_", "");
    const q = questionnaires.find((s) => s.id === surveyId);
    return q ? `答題問卷：${q.title}` : "問卷答題功能";
  }
  if (featureKey === "privilege_dispute" || featureKey === "respondent_perk_dispute") return "特權：質疑出題人題目";
  if (featureKey === "privilege_invite_link" || featureKey === "respondent_perk_invite_link") return "特權：複製問卷邀請鏈結";
  if (featureKey === "privilege_suggest" || featureKey === "respondent_perk_suggest") return "特權：向出題人推薦題目";
  if (featureKey === "privilege_report_survey_stop" || featureKey === "respondent_perk_stop_survey") return "特權：提請封鎖停用問卷";
  if (featureKey === "privilege_promote_friend_t3" || (featureKey === "respondent_perk_promote_friend")) return "特權：直接晉升朋友(3階白銀)";
  if (featureKey === "privilege_promote_friend_t5") return "特權：直接晉升朋友(5階白金)";
  if (featureKey === "privilege_ban_other_temporary" || featureKey === "respondent_perk_ban_request") return "特權：強制臨時封鎖1小時";
  if (featureKey === "privilege_request_quota" || featureKey === "respondent_perk_quota_apply") return "特權：申請追加特權次數";
  if (featureKey === "privilege_manage_trivia") return "特權：題庫自主擴充管理";

  return featureKey;
}
