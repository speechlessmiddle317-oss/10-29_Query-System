/**
 * Client-side API connector for Microsoft SQL Server backend (/api/*)
 */

export interface SqlServerStatus {
  configured: boolean;
  connected: boolean;
  server?: string;
  database?: string;
  error: string | null;
  lastChecked: string;
}

let cachedStatus: SqlServerStatus = {
  configured: false,
  connected: false,
  error: null,
  lastChecked: new Date().toISOString(),
};

// -------------------------------------------------------------
// JWT Token & Authentication Helpers
// -------------------------------------------------------------
const AUTH_TOKEN_STORAGE_KEY = "sub_auth_jwt_token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch (err) {
    console.warn("Failed to set auth token in localStorage:", err);
  }
}

/**
 * Standard fetch wrapper that automatically appends Authorization Bearer header
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
  message?: string;
  banInfo?: {
    banned: boolean;
    bannedReason?: string;
    bannedBy?: string;
    banType?: string;
    bannedUntil?: number;
  };
}

/**
 * Perform server-side login against SQL Server + bcrypt hash + JWT
 * POST /api/auth/login
 */
export async function loginWithSqlServer(username: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || "LOGIN_FAILED",
        message: data.message || "登入失敗",
        banInfo: data.banInfo,
      };
    }

    if (data.token) {
      setAuthToken(data.token);
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
      message: data.message,
    };
  } catch (err: any) {
    return {
      success: false,
      error: "NETWORK_ERROR",
      message: err?.message || "無法連線至後端伺服器",
    };
  }
}

/**
 * Public Citizen Registration via POST /api/auth/register
 */
export async function registerWithApi(username: string, password: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "REGISTER_FAILED",
        message: data.message || "註冊失敗，請重試",
      };
    }
    return {
      success: true,
      message: data.message || "註冊成功！",
    };
  } catch (err: any) {
    return {
      success: false,
      error: "NETWORK_ERROR",
      message: err?.message || "無法連線至伺服器註冊",
    };
  }
}

/**
 * Query currently authenticated user from server using JWT
 * GET /api/auth/me
 */
export async function fetchMeFromServer(): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { success: false, error: "NO_TOKEN" };
    }

    const res = await authFetch("/api/auth/me");
    if (!res.ok) {
      if (res.status === 401) {
        setAuthToken(null);
      }
      const data = await res.json();
      return { success: false, error: data.error || "UNAUTHORIZED" };
    }

    const data = await res.json();
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Logout from server and clear JWT token
 */
export async function logoutFromServer(): Promise<void> {
  try {
    await authFetch("/api/auth/logout", { method: "POST" });
  } catch (err) {
    console.warn("Logout API notification error:", err);
  } finally {
    setAuthToken(null);
  }
}

export async function checkSqlServerStatus(): Promise<SqlServerStatus> {
  try {
    const res = await authFetch("/api/db/status", { cache: "no-store" });
    if (res.ok) {
      cachedStatus = await res.json();
      return cachedStatus;
    }
    if (res.status === 403 || res.status === 401) {
      cachedStatus = {
        configured: false,
        connected: false,
        error: "權限不足：僅系統站主 (Webmaster) 可檢閱 SQL Server 資料庫配置與狀態",
        lastChecked: new Date().toISOString(),
      };
      return cachedStatus;
    }
  } catch (err: any) {
    cachedStatus = {
      configured: false,
      connected: false,
      error: err?.message || "Failed to reach backend API",
      lastChecked: new Date().toISOString(),
    };
  }
  return cachedStatus;
}

export async function fetchDdlSchemaFromApi(): Promise<string> {
  try {
    const res = await authFetch("/api/db/ddl");
    if (res.ok) {
      return await res.text();
    }
    if (res.status === 403 || res.status === 401) {
      return "-- 權限不足：僅系統站主 (Webmaster) 可檢閱資料庫 T-SQL 綱要腳本";
    }
    return "-- 資料庫 DDL 載入失敗";
  } catch (err: any) {
    return `-- 讀取失敗: ${err?.message || "無法連線"}`;
  }
}

export function getCachedSqlServerStatus(): SqlServerStatus {
  return cachedStatus;
}

// -------------------------------------------------------------
// Users
// -------------------------------------------------------------
export async function fetchDeletedUsersFromApi(): Promise<any[] | null> {
  try {
    const res = await authFetch("/api/deleted-users");
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("無權限存取已刪除帳號紀錄");
      }
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.error("fetchDeletedUsersFromApi error:", err);
    return null;
  }
}

export async function purgeDeletedUsersFromApi(usernames: string[]): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await authFetch("/api/deleted-users/purge", {
      method: "POST",
      body: JSON.stringify({ usernames }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { success: false, error: errBody.message || "清除失敗" };
    }
    const result = await res.json();
    return result;
  } catch (err: any) {
    console.error("purgeDeletedUsersFromApi error:", err);
    return { success: false, error: err.message };
  }
}

export async function fetchUsersFromApi(): Promise<Record<string, any> | null> {
  try {
    const res = await authFetch("/api/users");
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function saveUserToApi(user: any): Promise<boolean> {
  try {
    const res = await authFetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteUserFromApi(username: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await authFetch(`/api/users/${encodeURIComponent(username)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    return {
      success: res.ok && data.success !== false,
      message: data.message || data.error || (res.ok ? "帳號已成功刪除" : "刪除失敗"),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "無法連線伺服器執行刪除作業",
    };
  }
}

export async function saveAllUsersToApi(usersMap: Record<string, any>): Promise<boolean> {
  try {
    const res = await authFetch("/api/users/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usersMap),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Questionnaires
// -------------------------------------------------------------
export async function fetchQuestionnairesFromApi(): Promise<any[] | null> {
  try {
    const res = await authFetch("/api/questionnaires");
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function saveQuestionnaireToApi(q: any): Promise<boolean> {
  try {
    const res = await authFetch("/api/questionnaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveAllQuestionnairesToApi(qs: any[]): Promise<boolean> {
  try {
    const res = await authFetch("/api/questionnaires/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(qs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteQuestionnaireFromApi(id: string): Promise<boolean> {
  try {
    const res = await authFetch(`/api/questionnaires/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Responses
// -------------------------------------------------------------
export async function fetchResponsesFromApi(): Promise<any[] | null> {
  try {
    const res = await authFetch("/api/responses");
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function saveResponseToApi(r: any): Promise<{ success: boolean; message?: string; id?: string; error?: string }> {
  try {
    const res = await authFetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message || "提交成功", id: data.id };
    }
    return {
      success: false,
      message: data.message || data.error || `提交失敗 (HTTP ${res.status})`,
      error: data.error,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "伺服器通訊異常，請稍後重試" };
  }
}

export async function saveAllResponsesToApi(rs: any[]): Promise<boolean> {
  try {
    const res = await authFetch("/api/responses/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Audit Logs
// -------------------------------------------------------------
export async function fetchAuditLogsFromApi(): Promise<any[] | null> {
  try {
    const res = await authFetch("/api/logs");
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function saveAuditLogToApi(log: any): Promise<boolean> {
  try {
    const res = await authFetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveAllAuditLogsToApi(logs: any[]): Promise<boolean> {
  try {
    const res = await authFetch("/api/logs/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteAuditLogFromApi(id: string, reason?: string): Promise<{ success: boolean; message?: string; deletionLog?: any }> {
  try {
    const res = await authFetch(`/api/logs/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || "管理員例行受控清理作業" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, message: data.message, deletionLog: data.deletionLog };
    }
    return { success: false, message: data.message || "受控刪除日誌失敗" };
  } catch (err: any) {
    return { success: false, message: err?.message || "通訊失敗" };
  }
}

export async function clearAllAuditLogsFromApi(webmasterPassword?: string): Promise<{ success: boolean; message?: string; genesisBlock?: any }> {
  try {
    const res = await authFetch("/api/logs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webmasterPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, message: data.message, genesisBlock: data.genesisBlock };
    }
    return { success: false, message: data.message || "清空日誌失敗" };
  } catch (err: any) {
    return { success: false, message: err?.message || "通訊失敗" };
  }
}

export async function verifyAuditLogIntegrityFromApi(): Promise<{
  success: boolean;
  valid: boolean;
  count: number;
  genesisHash?: string;
  headHash?: string;
  message: string;
  error?: string;
  brokenIndex?: number;
  brokenLogId?: string;
}> {
  try {
    const res = await authFetch("/api/logs/verify-integrity");
    const data = await res.json();
    if (res.ok) {
      return { success: true, ...data };
    }
    return { success: false, valid: false, count: 0, message: data.message || "驗證失敗" };
  } catch (err: any) {
    return { success: false, valid: false, count: 0, message: err?.message || "無法連線進行 Hash Chain 校驗" };
  }
}

// -------------------------------------------------------------
// Promotions
// -------------------------------------------------------------
export async function fetchPromotionsFromApi(): Promise<any[] | null> {
  try {
    const res = await authFetch("/api/promotions");
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function savePromotionToApi(promo: any): Promise<boolean> {
  try {
    const res = await authFetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promo),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveAllPromotionsToApi(promos: any[]): Promise<boolean> {
  try {
    const res = await authFetch("/api/promotions/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promos),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Cheat Reports, Quotas, Trivia & Site Updates
// -------------------------------------------------------------
export async function fetchCheatReportsFromApi(): Promise<any[] | null> {
  try {
    const res = await authFetch("/api/cheat-reports");
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function saveAllCheatReportsToApi(reports: any[]): Promise<boolean> {
  try {
    const res = await authFetch("/api/cheat-reports/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reports),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchQuotaRequestsFromApi(): Promise<any[] | null> {
  try {
    const res = await authFetch("/api/quota-requests");
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function saveQuotaRequestToApi(request: any): Promise<boolean> {
  try {
    const res = await authFetch("/api/quota-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveAllQuotaRequestsToApi(requests: any[]): Promise<boolean> {
  try {
    const res = await authFetch("/api/quota-requests/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requests),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchTriviaQuestionsFromApi(): Promise<any[] | null> {
  try {
    const res = await authFetch("/api/trivia-questions");
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function saveAllTriviaQuestionsToApi(questions: any[]): Promise<boolean> {
  try {
    const res = await authFetch("/api/trivia-questions/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(questions),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSiteUpdateLogsFromApi(): Promise<any[] | null> {
  try {
    const res = await authFetch("/api/site-update-logs");
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function saveSiteUpdateLogToApi(log: any): Promise<boolean> {
  return saveAllSiteUpdateLogsToApi([log]);
}

export async function saveAllSiteUpdateLogsToApi(logs: any[]): Promise<boolean> {
  try {
    const res = await authFetch("/api/site-update-logs/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Centralized Server-Side Password Verification & Management
// -------------------------------------------------------------

export async function changeUserPasswordApi(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await authFetch("/api/users/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json();
    return {
      success: res.ok && data.success,
      message: data.message || (res.ok ? "密碼更新成功" : "密碼更新失敗"),
    };
  } catch (err: any) {
    return { success: false, message: err.message || "網路或伺服器連線異常" };
  }
}

export async function adminResetUserPasswordApi(
  targetUsername: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await authFetch("/api/users/admin-reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUsername, newPassword }),
    });
    const data = await res.json();
    return {
      success: res.ok && data.success,
      message: data.message || (res.ok ? "重設密碼成功" : "重設密碼失敗"),
    };
  } catch (err: any) {
    return { success: false, message: err.message || "網路或伺服器連線異常" };
  }
}

export async function verifyQuestionnairePasswordApi(
  surveyId: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`/api/questionnaires/${encodeURIComponent(surveyId)}/verify-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    return {
      success: res.ok && data.success,
      message: data.message || (res.ok ? "驗證通過" : "問卷密碼不正確，請重新輸入！"),
    };
  } catch (err: any) {
    return { success: false, message: err.message || "連線異常，請稍後再試" };
  }
}

export async function verifySubqueryPasswordApi(
  surveyId: string,
  qsId: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(
      `/api/questionnaires/${encodeURIComponent(surveyId)}/query-systems/${encodeURIComponent(qsId)}/verify-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      }
    );
    const data = await res.json();
    return {
      success: res.ok && data.success,
      message: data.message || (res.ok ? "驗證通過" : "查詢密碼錯誤，請重新確認！"),
    };
  } catch (err: any) {
    return { success: false, message: err.message || "連線異常，請稍後再試" };
  }
}

export async function unbanUserApi(username: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await authFetch("/api/users/unban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    return {
      success: res.ok && data.success,
      message: data.message || (res.ok ? "解封成功" : "解封失敗"),
    };
  } catch (err: any) {
    return { success: false, message: err.message || "網路連線異常" };
  }
}

export async function promoteFriendApi(
  friendUsername: string,
  promoType: "T3" | "T5"
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await authFetch("/api/privileges/promote-friend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendUsername, promoType }),
    });
    const data = await res.json();
    return {
      success: res.ok && data.success,
      message: data.message || (res.ok ? "晉升成功" : "晉升失敗"),
    };
  } catch (err: any) {
    return { success: false, message: err.message || "網路連線異常" };
  }
}

export async function temporaryBanUserApi(
  targetUsername: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await authFetch("/api/privileges/temporary-ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUsername, reason }),
    });
    const data = await res.json();
    return {
      success: res.ok && data.success,
      message: data.message || (res.ok ? "臨時處分成功" : "臨時處分失敗"),
    };
  } catch (err: any) {
    return { success: false, message: err.message || "網路連線異常" };
  }
}



export async function fetchUsersWithPasswordsFromApi(): Promise<any[]> {
  const res = await authFetch("/api/users/passwords");
  return await res.json();
}

export async function adminUpdateUserPasswordApi(targetUsername: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/users/admin-reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ targetUsername, newPassword })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getUserPasswordApi(
  username: string
): Promise<{
  success: boolean;
  password?: string;
  message?: string;
}> {
  const res = await authFetch(
      `/api/users/${encodeURIComponent(username)}/password`,
      {
          method: "GET",
      }
  );

  return await res.json();
}

