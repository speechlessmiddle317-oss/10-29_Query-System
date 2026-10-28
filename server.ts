import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import * as mssql from "./server/mssql";

const JWT_SECRET = process.env.JWT_SECRET || "query-system-jwt-secret-session-token-2026";

export interface AuthTokenPayload {
  username: string;
  role: string;
  starLevel?: number | null;
  respondentSubRank?: number | null;
}

// Middleware to parse and verify JWT Bearer token
function parseAuthToken(req: express.Request): AuthTokenPayload | null {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : (req.query.token as string | undefined);

  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

// Optional Auth: Populates req.user if valid token provided
function optionalAuth(req: express.Request, _res: express.Response, next: express.NextFunction) {
  const user = parseAuthToken(req);
  if (user) {
    (req as any).user = user;
  }
  next();
}

// Strict Auth: Blocks requests without valid token
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = parseAuthToken(req);
  if (!user) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "請先登入系統" });
  }
  (req as any).user = user;
  next();
}

// Require one of the specified roles
function requireRole(...allowedRoles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user as AuthTokenPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "請先登入系統" });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: `權限不足：需要角色 [${allowedRoles.join(", ")}]，目前為 [${user.role}]`
      });
    }
    next();
  };
}

function isAdminRole(role?: string): boolean {
  return ["WEBMASTER", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(role || "");
}

function isSuperAdminOrAbove(role?: string): boolean {
  return ["WEBMASTER", "SUPER_ADMIN"].includes(role || "");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Populate req.user on all API routes if token is provided
  app.use("/api", optionalAuth);

  // -----------------------------------------------------------
  // 1. Health & Database Status APIs
  // -----------------------------------------------------------
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/db/status", requireAuth, requireRole("WEBMASTER"), async (_req, res) => {
    try {
      // Attempt connection if configured
      await mssql.getPool();
      const status = mssql.getStatus();
      res.json(status);
    } catch (err: any) {
      res.json({
        configured: false,
        connected: false,
        error: err?.message || String(err),
        lastChecked: new Date().toISOString(),
      });
    }
  });

  app.get("/api/db/ddl", requireAuth, requireRole("WEBMASTER"), (_req, res) => {
    try {
      const ddlPath = path.join(process.cwd(), "mssql-schema.sql");
      if (fs.existsSync(ddlPath)) {
        const content = fs.readFileSync(ddlPath, "utf-8");
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.send(content);
      } else {
        res.status(404).send("-- Schema file not found");
      }
    } catch (err: any) {
      res.status(500).send(`-- Error: ${err.message}`);
    }
  });

  // -----------------------------------------------------------
  // 2. Authentication API (SQL Server + Password Hash + JWT)
  // -----------------------------------------------------------
  /**
   * POST /api/auth/login
   * Flow:
   *  Express -> SQL Server Users -> Verify Password Hash (bcrypt) -> Issue JWT -> Return user identity
   */
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body || {};

      if (!username || !password) {
        return res.status(400).json({
          error: "MISSING_FIELDS",
          message: "請輸入帳號與密碼",
        });
      }

      // Lookup user in SQL Server (or fallback cache)
      const user = await mssql.getUserForAuth(username);
      if (!user) {
        return res.status(401).json({
          error: "INVALID_CREDENTIALS",
          message: "帳號不存在或密碼錯誤",
        });
      }

      // Verify Password Hash via bcrypt (with transparent legacy upgrade)
      const isMatch = await mssql.verifyAndUpgradePassword(user.username, password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          error: "INVALID_CREDENTIALS",
          message: "帳號或密碼錯誤",
        });
      }

      // Check Ban Status
      if (user.banned) {
        // If temporary ban has expired, auto unban
        if (user.bannedUntil && Date.now() > Number(user.bannedUntil)) {
          console.log(`⏱️ Ban expired for ${user.username}, auto-unbanning...`);
          await mssql.unbanUser(user.username);
          user.banned = false;
          delete user.bannedUntil;
          delete user.bannedReason;
          delete user.banType;
          delete user.bannedBy;
        } else {
          return res.status(403).json({
            error: "ACCOUNT_BANNED",
            message: "帳號已被停權，無法登入",
            banInfo: {
              banned: true,
              bannedReason: user.bannedReason || "未註明原因",
              bannedBy: user.bannedBy || "系統管理員",
              banType: user.banType || "PERMANENT",
              bannedUntil: user.bannedUntil,
            },
          });
        }
      }

      // Generate JWT Token
      const tokenPayload: AuthTokenPayload = {
        username: user.username,
        role: user.role,
        starLevel: user.starLevel ?? null,
        respondentSubRank: user.respondentSubRank ?? 1,
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

      // Return user identity info without password hash
      const { password: _pw, ...safeUser } = user;

      console.log(`🔑 [AUTH] User '${user.username}' logged in successfully. Role: ${user.role}, Star: ${user.starLevel}`);

      res.json({
        success: true,
        message: "登入成功",
        token,
        user: safeUser,
      });
    } catch (err: any) {
      console.error("❌ Login error:", err);
      res.status(500).json({ error: "LOGIN_FAILED", message: err.message || "登入失敗" });
    }
  });

  /**
   * GET /api/auth/me
   * Validates JWT token and returns current user identity from SQL Server
   */
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const authUser = (req as any).user as AuthTokenPayload;
      const user = await mssql.getUserForAuth(authUser.username);

      if (!user) {
        return res.status(404).json({ error: "USER_NOT_FOUND", message: "找不到使用者資料" });
      }

      // Check Ban Status
      if (user.banned) {
        if (user.bannedUntil && Date.now() > Number(user.bannedUntil)) {
          await mssql.unbanUser(user.username);
          user.banned = false;
        } else {
          return res.status(403).json({
            error: "ACCOUNT_BANNED",
            message: "帳號已被停權",
            banInfo: {
              banned: true,
              bannedReason: user.bannedReason || "未註明原因",
              bannedBy: user.bannedBy || "系統管理員",
              banType: user.banType || "PERMANENT",
              bannedUntil: user.bannedUntil,
            },
          });
        }
      }

      const { password: _pw, ...safeUser } = user;
      res.json({
        success: true,
        user: safeUser,
      });
    } catch (err: any) {
      res.status(500).json({ error: "AUTH_CHECK_FAILED", message: err.message });
    }
  });

  /**
   * POST /api/auth/logout
   */
  app.post("/api/auth/logout", (_req, res) => {
    res.json({ success: true, message: "已成功登出" });
  });

  // -----------------------------------------------------------
  // 3. Users API & Password Verification
  // -----------------------------------------------------------
  
  /**
   * GET /api/users
   * Returns authoritative user accounts map from SQL Server (passwords securely omitted)
   */
  app.get("/api/users", requireAuth, async (_req, res) => {
    try {
      const users = await mssql.getUsers();
      res.json(users);
    } catch (err: any) {
      console.error("❌ Failed to fetch users from SQL Server:", err);
      res.status(500).json({ error: "FAILED_TO_FETCH_USERS", message: err.message });
    }
  });

  /**
   * POST /api/users
   * Persists a new or updated user directly into SQL Server
   */
  app.post("/api/users", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN", "SYSTEM_ADMIN"), async (req, res) => {
    try {
      const user = req.body;
      if (!user || !user.username) {
        return res.status(400).json({ error: "MISSING_USERNAME", message: "請提供帳號名稱" });
      }
      await mssql.saveUser(user);
      res.json({ success: true, message: `帳號 ${user.username} 已成功寫入 SQL Server` });
    } catch (err: any) {
      console.error("❌ Failed to save user to SQL Server:", err);
      res.status(500).json({ error: "DB_WRITE_FAILED", message: err.message || "SQL Server 寫入失敗" });
    }
  });

  app.get("/api/users/passwords", requireAuth, async (req, res) => {
    try {
      const currentUser = (req as any).user;
      if (currentUser.role !== "WEBMASTER") {
        return res.status(403).json({ error: "FORBIDDEN", message: "無權限查看密碼" });
      }
      const users = await mssql.getUsersWithPasswords();
      
      // Log this access
      await mssql.saveAuditLog({
        id: "log-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
        action: "VIEW_PASSWORDS",
        username: currentUser.username,
        role: currentUser.role,
        targetId: "ALL_USERS",
        details: "站主查看了全站帳號密碼",
        ip: req.ip || "unknown",
        timestamp: Date.now()
      });

      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

    app.get("/api/users/:username/password", requireAuth, requireRole("WEBMASTER"), async (req, res) => {
    try {
      const currentUser = (req as any).user;
      if (currentUser.role !== "WEBMASTER") {
        return res.status(403).json({ error: "FORBIDDEN", message: "無權限查看密碼" });
      }
      const targetUsername = req.params.username;
      
      const plainPassword = await mssql.getUserPassword(targetUsername);
      if (plainPassword === null) {
        return res.status(404).json({ error: "NOT_FOUND", message: "找不到密碼" });
      }

      await mssql.saveAuditLog({
        id: "log-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
        action: "VIEW_SINGLE_PASSWORD",
        username: currentUser.username,
        role: currentUser.role,
        targetId: targetUsername,
        details: `站主查看了 ${targetUsername} 的密碼`,
        ip: req.ip || "unknown",
        timestamp: Date.now()
      });

      res.json({ success: true, username: targetUsername, password: plainPassword });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/users/admin-reset-password", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN"), async (req, res) => {
    try {
      const currentUser = (req as any).user as AuthTokenPayload;
      const { targetUsername, newPassword } = req.body || {};

      if (!targetUsername || !newPassword) {
        return res.status(400).json({ error: "MISSING_FIELDS", message: "請指定目標帳號與新密碼" });
      }

      const target = await mssql.getUserForAuth(targetUsername);
      if (!target) {
        return res.status(404).json({ error: "NOT_FOUND", message: "找不到目標使用者" });
      }

      // Peer protection checks
      if (currentUser.role === "SUPER_ADMIN" && target.role === "SUPER_ADMIN" && currentUser.username.toLowerCase() !== targetUsername.toLowerCase()) {
        return res.status(403).json({ error: "PEER_PROTECTION", message: "同級保護生效：超級管理員不可修改其他同級超級管理員之密碼！" });
      }
      if (target.role === "WEBMASTER" && currentUser.role !== "WEBMASTER") {
        return res.status(403).json({ error: "WEBMASTER_PROTECTION", message: "站主特權保護生效：非系統站主不可修改站主密碼！" });
      }

      const result = await mssql.adminResetUserPassword(targetUsername, newPassword);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: "SERVER_ERROR", message: err.message });
    }
  });

  // Unban user
  app.post("/api/users/unban", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN"), async (req, res) => {
    try {
      const { username } = req.body || {};
      if (!username) {
        return res.status(400).json({ error: "MISSING_USERNAME", message: "請指定解封帳號" });
      }
      await mssql.unbanUser(username);
      res.json({ success: true, message: `帳號 ${username} 已成功解除封禁` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/users/:username", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN", "SYSTEM_ADMIN"), async (req, res) => {
    try {
      const targetUsername = req.params.username.trim().toLowerCase();
      const currentUser = (req as any).user;

      if (!targetUsername) {
        return res.status(400).json({ error: "MISSING_USERNAME", message: "未提供欲刪除之帳號" });
      }

      // Fetch the target user to check their role
      const users = await mssql.getUsers();
      const targetUser = users[targetUsername];

      if (!targetUser) {
        return res.status(404).json({ error: "USER_NOT_FOUND", message: "找不到該帳號" });
      }

      // 1. Prevent deleting self via this endpoint (should use a separate account deletion flow if allowed)
      if (currentUser.username.toLowerCase() === targetUsername) {
        return res.status(403).json({ error: "CANNOT_DELETE_SELF", message: "無法透過管理介面刪除自己的帳號" });
      }

      // 2. Strict hierarchical protection
      // WEBMASTER can delete anyone.
      // SUPER_ADMIN cannot delete WEBMASTER or SUPER_ADMIN.
      // SYSTEM_ADMIN cannot delete WEBMASTER, SUPER_ADMIN, or SYSTEM_ADMIN.
      if (targetUser.role === "WEBMASTER") {
        return res.status(403).json({ error: "FORBIDDEN", message: "無法刪除最高權限站主帳號" });
      }
      if (currentUser.role === "SUPER_ADMIN" && targetUser.role === "SUPER_ADMIN") {
        return res.status(403).json({ error: "FORBIDDEN", message: "超級管理員無權刪除其他同級超級管理員" });
      }
      if (currentUser.role === "SYSTEM_ADMIN" && ["SUPER_ADMIN", "SYSTEM_ADMIN"].includes(targetUser.role)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "系統管理員無權刪除同級或更高級別之帳號" });
      }

      await mssql.deleteUser(targetUsername, currentUser.username);
      res.json({ success: true, message: `帳號 ${targetUsername} 身分已刪除，並建立已刪除帳號索引` });
    } catch (err: any) {
      res.status(500).json({ error: "SERVER_ERROR", message: err.message });
    }
  });

  app.get("/api/deleted-users", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN"), async (_req, res) => {
    try {
      const records = await mssql.getDeletedUsers();
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: "SERVER_ERROR", message: err.message });
    }
  });

  app.post("/api/deleted-users/purge", requireAuth, requireRole("WEBMASTER"), async (req, res) => {
    try {
      const usernames = req.body.usernames;
      if (!Array.isArray(usernames) || usernames.length === 0) {
        return res.status(400).json({ error: "INVALID_REQUEST", message: "請提供欲清除資料之帳號列表" });
      }
      
      const currentUser = (req as any).user;
      await mssql.purgeDeletedUsersData(usernames, currentUser.username);
      res.json({ success: true, message: "選取之帳號歷史資料已永久清除" });
    } catch (err: any) {
      res.status(500).json({ error: "SERVER_ERROR", message: err.message });
    }
  });

  app.post("/api/users/batch", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN"), async (req, res) => {
    try {
      await mssql.saveAllUsers(req.body);
      res.json({ success: true, count: Object.keys(req.body || {}).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -----------------------------------------------------------
  // 4. Questionnaires API & Server-side Password Verification
  // -----------------------------------------------------------
  app.get("/api/questionnaires", optionalAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      // Returns questionnaires with passwords securely stripped
      const list = await mssql.getQuestionnaires();
      
      // Basic Role-Based Filtering
      const user = (req as any).user;
      let filtered = list;
      if (!user || user.role === "RESPONDENT") {
        // Only active surveys for respondents/guests
        filtered = list.filter((q: any) => q.isActive);
      } else if (user.role === "OPERATOR") {
        // Operators only see assigned tables unless they are high rank (simulated client logic)
        if (user.starLevel && user.starLevel < 4) {
           filtered = list.filter((q: any) => user.assignedTables?.includes(q.id));
        }
      }
      
      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/questionnaires", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN", "SYSTEM_ADMIN", "QUESTION_CREATOR"), async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const currentUser = (req as any).user as AuthTokenPayload;
      if (!req.body.createdBy) {
        req.body.createdBy = currentUser.username;
      }
      await mssql.saveQuestionnaire(req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/questionnaires/batch", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN", "SYSTEM_ADMIN"), async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      await mssql.saveAllQuestionnaires(req.body);
      res.json({ success: true, count: (req.body || []).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/questionnaires/:id", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN", "SYSTEM_ADMIN", "QUESTION_CREATOR"), async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const currentUser = (req as any).user as AuthTokenPayload;
      if (currentUser.role === "QUESTION_CREATOR") {
        const raw = await mssql.getQuestionnaireRaw(req.params.id);
        if (raw && raw.createdBy && raw.createdBy.toLowerCase() !== currentUser.username.toLowerCase()) {
          return res.status(403).json({ error: "FORBIDDEN", message: "出題市民僅可刪除自己所創建之問卷！" });
        }
      }
      await mssql.deleteQuestionnaire(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Server-side verification for questionnaire password
  app.post("/api/questionnaires/:id/verify-password", async (req, res) => {
    try {
      const { password } = req.body || {};
      if (!password) {
        return res.status(400).json({ success: false, message: "請輸入問卷密碼" });
      }
      const isValid = await mssql.verifyQuestionnairePassword(req.params.id, String(password).trim());
      if (isValid) {
        return res.json({ success: true, message: "密碼驗證通過" });
      } else {
        return res.status(401).json({ success: false, message: "問卷密碼不正確，請重新輸入！" });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "伺服器驗證錯誤" });
    }
  });

  // Server-side verification for sub-query system password
  app.post("/api/questionnaires/:id/query-systems/:qsId/verify-password", async (req, res) => {
    try {
      const { password } = req.body || {};
      if (!password) {
        return res.status(400).json({ success: false, message: "請輸入查詢密碼" });
      }
      const isValid = await mssql.verifySubqueryPassword(req.params.id, req.params.qsId, String(password).trim());
      if (isValid) {
        return res.json({ success: true, message: "密碼驗證通過" });
      } else {
        return res.status(401).json({ success: false, message: "查詢密碼錯誤，請重新確認！" });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "伺服器驗證錯誤" });
    }
  });

  // -----------------------------------------------------------
  // 5. Survey Responses API
  // -----------------------------------------------------------
  app.get("/api/responses", requireAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const currentUser = (req as any).user as AuthTokenPayload;
      const list = await mssql.getResponses();

      // Filter based on role
      if (["WEBMASTER", "SUPER_ADMIN", "SYSTEM_ADMIN", "OPERATOR", "ANALYST"].includes(currentUser.role)) {
        return res.json(list);
      } else if (currentUser.role === "RESPONDENT") {
        // Only return responses submitted by this respondent
        const filtered = list.filter((r) => (r.submittedBy || "").toLowerCase() === currentUser.username.toLowerCase());
        return res.json(filtered);
      } else {
        return res.status(403).json({ error: "FORBIDDEN", message: "無權查閱作答資料" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/responses", optionalAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }

      const { surveyId, answers, submittedBy, password } = req.body || {};
      if (!surveyId) {
        return res.status(400).json({ error: "MISSING_SURVEY_ID", message: "缺少問卷識別碼！" });
      }

      // 1. 業務規則驗證：問卷是否存在
      const survey = await mssql.getQuestionnaireRaw(surveyId);
      if (!survey) {
        return res.status(404).json({ error: "SURVEY_NOT_FOUND", message: "指定之問卷不存在或已被撤除！" });
      }

      // 2. 業務規則驗證：是否處於啟用狀態
      if (!survey.isActive) {
        return res.status(400).json({ error: "SURVEY_INACTIVE", message: "該問卷目前處於未啟用或暫停狀態，暫不接受作答！" });
      }

      // 3. 業務規則驗證：是否在開放時間內
      const now = new Date();
      if (survey.startTime) {
        const start = new Date(survey.startTime);
        if (!isNaN(start.getTime()) && now < start) {
          return res.status(400).json({
            error: "SURVEY_NOT_STARTED",
            message: `問卷尚未開放填寫！（開放填答時間：${survey.startTime.replace("T", " ")}）`
          });
        }
      }
      if (survey.endTime) {
        const end = new Date(survey.endTime);
        if (!isNaN(end.getTime()) && now > end) {
          return res.status(400).json({
            error: "SURVEY_EXPIRED",
            message: `問卷填寫期限已截止！（截止時間：${survey.endTime.replace("T", " ")}）`
          });
        }
      }

      // 4. 業務規則驗證：密碼是否正確 (使用伺服器端 bcrypt 驗證)
      if (survey.passwordRequired && survey.password) {
        if (!password) {
          return res.status(401).json({ error: "PASSWORD_REQUIRED", message: "此問卷設有安全存取密碼保護，請輸入密碼以解鎖填答！" });
        }
        const isPasswordCorrect = await mssql.verifyQuestionnairePassword(surveyId, String(password).trim());
        if (!isPasswordCorrect) {
          return res.status(401).json({ error: "INVALID_SURVEY_PASSWORD", message: "問卷存取密碼驗證失敗，無法提交！" });
        }
      }

      // 5. 業務規則驗證：使用者是否被停權
      const currentUser = (req as any).user as AuthTokenPayload | undefined;
      const effectiveSubmitter = (submittedBy ? String(submittedBy).trim() : (currentUser?.username || "匿名讀者"));

      if (currentUser) {
        const authUser = await mssql.getUserForAuth(currentUser.username);
        if (authUser) {
          if (authUser.banned) {
            return res.status(403).json({ error: "USER_BANNED", message: "您的使用者帳號已被系統管理員封禁停用，無法作答！" });
          }
          if (Array.isArray(authUser.bannedFeatures) && authUser.bannedFeatures.includes("respondent_answer")) {
            return res.status(403).json({ error: "FEATURE_BANNED", message: "您的「問卷答題」功能已被限制封禁，無法作答！" });
          }
        }
      } else if (submittedBy && submittedBy !== "匿名讀者" && !submittedBy.startsWith("訪客")) {
        const checkUser = await mssql.getUserForAuth(submittedBy);
        if (checkUser) {
          if (checkUser.banned) {
            return res.status(403).json({ error: "USER_BANNED", message: "該填答帳號已被停用封禁，無法提交作答！" });
          }
          if (Array.isArray(checkUser.bannedFeatures) && checkUser.bannedFeatures.includes("respondent_answer")) {
            return res.status(403).json({ error: "FEATURE_BANNED", message: "該填答帳號的問卷答題功能已被限制！" });
          }
        }
      }

      // 6. 業務規則驗證：是否允許重複填寫
      if (survey.allowMultipleResponses === false && effectiveSubmitter !== "匿名讀者") {
        const allResps = await mssql.getResponses();
        const hasSubmitted = allResps.some(
          (r) => r.surveyId === surveyId && r.id !== req.body.id && (r.submittedBy || "").toLowerCase() === effectiveSubmitter.toLowerCase()
        );
        if (hasSubmitted) {
          return res.status(400).json({
            error: "DUPLICATE_SUBMISSION",
            message: `此問卷限制每位市民僅能提交一次。帳號【${effectiveSubmitter}】已填寫過此問卷，無法重複提交！`
          });
        }
      }

      // 7. 業務規則驗證：回答格式是否正確
      const questions = survey.questions || [];
      const userAnswers = answers || {};
      for (const q of questions) {
        const val = userAnswers[q.id];
        // 7.1 必填題檢核
        if (q.required) {
          const isBlank =
            val === undefined ||
            val === null ||
            val === "" ||
            (Array.isArray(val) && val.length === 0) ||
            (typeof val === "string" && val.trim() === "");
          if (isBlank) {
            return res.status(400).json({
              error: "REQUIRED_FIELD_MISSING",
              message: `必填題目【${q.title || q.id}】尚未填答！`,
              questionId: q.id
            });
          }
        }

        // 7.2 若有填答，依題型檢查格式
        if (val !== undefined && val !== null && val !== "") {
          if (q.type === "RATING") {
            const num = Number(val);
            const min = typeof q.minRating === "number" ? q.minRating : 1;
            const max = typeof q.maxRating === "number" ? q.maxRating : 5;
            if (isNaN(num) || num < min || num > max) {
              return res.status(400).json({
                error: "INVALID_RATING",
                message: `評分題【${q.title || q.id}】分數必須介於 ${min} 至 ${max} 之間！`,
                questionId: q.id
              });
            }
          } else if (q.type === "SINGLE_CHOICE") {
            if (Array.isArray(q.options) && q.options.length > 0) {
              if (typeof val !== "string" || !q.options.includes(val)) {
                return res.status(400).json({
                  error: "INVALID_SINGLE_CHOICE",
                  message: `單選題【${q.title || q.id}】選項「${val}」不在允許的候選清單中！`,
                  questionId: q.id
                });
              }
            }
          } else if (q.type === "MULTI_CHOICE") {
            if (!Array.isArray(val)) {
              return res.status(400).json({
                error: "INVALID_MULTI_CHOICE",
                message: `多選題【${q.title || q.id}】回答格式錯誤（需為選項陣列）！`,
                questionId: q.id
              });
            }
            if (Array.isArray(q.options) && q.options.length > 0) {
              const invalid = val.find((item: any) => !q.options.includes(item));
              if (invalid) {
                return res.status(400).json({
                  error: "INVALID_MULTI_CHOICE_OPTION",
                  message: `多選題【${q.title || q.id}】包含無效選項「${invalid}」！`,
                  questionId: q.id
                });
              }
            }
          } else if (q.type === "SHORT_TEXT") {
            if (typeof val === "string" && val.length > 1000) {
              return res.status(400).json({
                error: "TEXT_TOO_LONG",
                message: `簡答題【${q.title || q.id}】文字過長，不可超過 1000 字！`,
                questionId: q.id
              });
            }
          }
        }
      }

      // 8. 儲存至 SQL Server 主存儲與積分計算 (原子事務)
      const responseRecord = {
        id: req.body.id || `resp-${Math.floor(100 + Math.random() * 900)}-${Date.now().toString().slice(-4)}`,
        surveyId,
        answers: userAnswers,
        submittedAt: req.body.submittedAt || new Date().toISOString().replace("T", " ").substring(0, 19),
        submittedBy: effectiveSubmitter
      };

      const logRecord = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        user: effectiveSubmitter,
        role: currentUser?.role || "GUEST_RESPONDENT",
        action: "提交問卷回答",
        target: `問卷：${survey.title || surveyId}`,
        details: `填答者【${effectiveSubmitter}】通過 Express 伺服器端業務規則驗證，成功存入 SQL Server 主存儲。憑證號: ${responseRecord.id}`
      };

      const answeredCount = Object.keys(userAnswers).length;
      const isRespondent = Boolean(currentUser?.role === "RESPONDENT" || effectiveSubmitter !== "匿名讀者");

      await mssql.submitSurveyResponseTransaction(
        responseRecord,
        logRecord,
        effectiveSubmitter,
        answeredCount,
        isRespondent
      );

      res.json({
        success: true,
        id: responseRecord.id,
        message: "問卷作答已通過後端業務規則檢驗並成功存檔！"
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/responses/batch", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN", "SYSTEM_ADMIN"), async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      await mssql.saveAllResponses(req.body);
      res.json({ success: true, count: (req.body || []).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -----------------------------------------------------------
  // 6. Audit Logs API
  // -----------------------------------------------------------
  app.get("/api/logs", requireAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const currentUser = (req as any).user as AuthTokenPayload;
      const user = await mssql.getUserForAuth(currentUser.username);
      const canManage = currentUser.role === "WEBMASTER" || currentUser.role === "SYSTEM_ADMIN" || (currentUser.role === "SUPER_ADMIN" && user?.canManageLogs);
      if (!canManage) {
        return res.status(403).json({ error: "FORBIDDEN", message: "無權檢視系統審計日誌" });
      }
      const list = await mssql.getAuditLogs();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/logs", requireAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      
      const currentUser = (req as any).user;
      const logEntry = {
        ...req.body,
        user: currentUser.username,
        role: currentUser.role
      };
      
      await mssql.saveAuditLog(logEntry);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/logs/batch", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN", "SYSTEM_ADMIN"), async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      await mssql.saveAllAuditLogs(req.body);
      res.json({ success: true, count: (req.body || []).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/logs/:id", requireAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const currentUser = (req as any).user as AuthTokenPayload;
      const user = await mssql.getUserForAuth(currentUser.username);
      const canManage = currentUser.role === "WEBMASTER" || (currentUser.role === "SUPER_ADMIN" && user?.canManageLogs);
      if (!canManage) {
        return res.status(403).json({ error: "FORBIDDEN", message: "僅限系統站主或日誌授權管理員刪除日誌記錄" });
      }
      await mssql.deleteAuditLog(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/logs", requireAuth, requireRole("WEBMASTER"), async (_req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      await mssql.clearAllAuditLogs();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -----------------------------------------------------------
  // 7. Promotions API
  // -----------------------------------------------------------
  app.get("/api/promotions", requireAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const currentUser = (req as any).user as AuthTokenPayload;
      const list = await mssql.getPromotions();
      if (isAdminRole(currentUser.role)) {
        return res.json(list);
      }
      // Non-admin can only see own promotion requests
      const filtered = list.filter((p) => (p.username || "").toLowerCase() === currentUser.username.toLowerCase());
      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/promotions", requireAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const currentUser = (req as any).user as AuthTokenPayload;
      const promo = req.body;
      // If updating status (approving/rejecting), must be Super Admin or Webmaster
      if (promo.status && promo.status !== "PENDING" && !isSuperAdminOrAbove(currentUser.role)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "僅限超級管理員或站主審核晉升申請！" });
      }
      // If submitting new request, must be self or admin
      if (!isAdminRole(currentUser.role) && (promo.username || "").toLowerCase() !== currentUser.username.toLowerCase()) {
        return res.status(403).json({ error: "FORBIDDEN", message: "僅可為自己提交晉升申請" });
      }
      await mssql.savePromotion(promo);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/promotions/batch", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN"), async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      await mssql.saveAllPromotions(req.body);
      res.json({ success: true, count: (req.body || []).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -----------------------------------------------------------
  // 8. Cheat Reports API
  // -----------------------------------------------------------
  app.get("/api/cheat-reports", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN", "SYSTEM_ADMIN"), async (_req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const list = await mssql.getCheatReports();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/cheat-reports", requireAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const currentUser = (req as any).user as AuthTokenPayload;
      if (!req.body.reporter) {
        req.body.reporter = currentUser.username;
      }
      await mssql.saveCheatReport(req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/cheat-reports/batch", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN"), async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      await mssql.saveAllCheatReports(req.body);
      res.json({ success: true, count: (req.body || []).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -----------------------------------------------------------
  // 9. Quota Requests API
  // -----------------------------------------------------------
  app.get("/api/quota-requests", requireAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const currentUser = (req as any).user as AuthTokenPayload;
      const list = await mssql.getQuotaRequests();
      if (isAdminRole(currentUser.role)) {
        return res.json(list);
      }
      const filtered = list.filter((q) => (q.username || "").toLowerCase() === currentUser.username.toLowerCase());
      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/quota-requests", requireAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const currentUser = (req as any).user as AuthTokenPayload;
      const requestData = req.body;
      if (requestData.status && requestData.status !== "PENDING" && !isSuperAdminOrAbove(currentUser.role)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "僅限超級管理員或站主審核配額申請！" });
      }
      if (!isAdminRole(currentUser.role) && (requestData.username || "").toLowerCase() !== currentUser.username.toLowerCase()) {
        return res.status(403).json({ error: "FORBIDDEN", message: "僅可為自己提交配額申請" });
      }
      await mssql.saveQuotaRequest(requestData);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/quota-requests/batch", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN"), async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      await mssql.saveAllQuotaRequests(req.body);
      res.json({ success: true, count: (req.body || []).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -----------------------------------------------------------
  // 10. Trivia Questions API
  // -----------------------------------------------------------
  app.get("/api/trivia-questions", optionalAuth, async (_req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const list = await mssql.getTriviaQuestions();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/trivia-questions/batch", requireAuth, requireRole("WEBMASTER", "SUPER_ADMIN", "SYSTEM_ADMIN"), async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      await mssql.saveAllTriviaQuestions(req.body);
      res.json({ success: true, count: (req.body || []).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -----------------------------------------------------------
  // 11. Site Update Logs API
  // -----------------------------------------------------------
  app.get("/api/site-update-logs", optionalAuth, async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      const currentUser = (req as any).user as AuthTokenPayload | undefined;
      const list = await mssql.getSiteUpdateLogs();
      if (currentUser?.role === "WEBMASTER") {
        return res.json(list);
      }
      // Filter out webmaster-only logs for non-webmaster users
      const filtered = list.filter((log) => !log.webmasterOnly);
      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/site-update-logs", requireAuth, requireRole("WEBMASTER"), async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      await mssql.saveSiteUpdateLog(req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/site-update-logs/batch", requireAuth, requireRole("WEBMASTER"), async (req, res) => {
    try {
      const pool = await mssql.getPool();
      if (!pool) {
        return res.status(503).json({ error: "MSSQL_NOT_CONNECTED", message: "SQL Server is not connected." });
      }
      await mssql.saveAllSiteUpdateLogs(req.body);
      res.json({ success: true, count: (req.body || []).length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -----------------------------------------------------------
  // Vite Middleware & SPA Static Handler
  // -----------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
