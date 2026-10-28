import sql from "mssql";
import bcrypt from "bcryptjs";
import { encryptPassword, decryptPassword } from "./passwordCrypto";

export interface MssqlStatus {
  configured: boolean;
  connected: boolean;
  server?: string;
  database?: string;
  error: string | null;
  lastChecked: string;
}

let pool: sql.ConnectionPool | null = null;
let lastError: string | null = null;
let isConnecting = false;
let tablesInitialized = false;

// Pre-hashed default password for initial seed ("123")
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("123", 10);
const DEFAULT_ENCRYPTED_PASSWORD = encryptPassword("123");

// In-memory fallback users store (used when SQL Server is offline or before pool connects)
export const fallbackUsers: Record<string, any> = {
  webmaster: {
    username: "webmaster",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "WEBMASTER",
    starLevel: 1,
    assignedTables: [],
    canManageTrivia: true,
    canManageLogs: true,
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  super_admin: {
    username: "super_admin",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "SUPER_ADMIN",
    starLevel: 1,
    assignedTables: [],
    canManageTrivia: false,
    canManageLogs: false,
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  sys_admin: {
    username: "sys_admin",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "SYSTEM_ADMIN",
    starLevel: 1,
    assignedTables: [],
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  operator3: {
    username: "operator3",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "OPERATOR",
    starLevel: 3,
    assignedTables: ["survey-1", "survey-2", "survey-3"],
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  operator2: {
    username: "operator2",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "OPERATOR",
    starLevel: 2,
    assignedTables: ["survey-1", "survey-2"],
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  operator1: {
    username: "operator1",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "OPERATOR",
    starLevel: 1,
    assignedTables: ["survey-1"],
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  analyst3: {
    username: "analyst3",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "ANALYST",
    starLevel: 3,
    assignedTables: ["survey-1", "survey-2", "survey-3"],
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  analyst1: {
    username: "analyst1",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "ANALYST",
    starLevel: 1,
    assignedTables: ["survey-1"],
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  creator_t1: {
    username: "creator_t1",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "QUESTION_CREATOR",
    starLevel: 1,
    assignedTables: [],
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  creator_t2: {
    username: "creator_t2",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "QUESTION_CREATOR",
    starLevel: 2,
    assignedTables: [],
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  creator_t3: {
    username: "creator_t3",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "QUESTION_CREATOR",
    starLevel: 3,
    assignedTables: [],
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  creator_t4: {
    username: "creator_t4",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "QUESTION_CREATOR",
    starLevel: 4,
    assignedTables: [],
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  creator_t5: {
    username: "creator_t5",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "QUESTION_CREATOR",
    starLevel: 5,
    assignedTables: [],
    banned: false,
    bannedFeatures: [],
    respondentPoints: 0,
    respondentSubRank: 1
  },
  respondent: {
    username: "respondent",
    password: DEFAULT_PASSWORD_HASH,
    encryptedPassword: DEFAULT_ENCRYPTED_PASSWORD,
    role: "RESPONDENT",
    starLevel: 1,
    respondentSubRank: 1,
    respondentPoints: 0,
    assignedTables: [],
    banned: false,
    bannedFeatures: []
  }
};

export function getMssqlConfig(): sql.config | null {
  const connectionString = process.env.MSSQL_CONNECTION_STRING;
  if (connectionString) {
    return connectionString as any;
  }

  const server = process.env.MSSQL_SERVER || process.env.MSSQL_HOST;
  const user = process.env.MSSQL_USER;
  const password = process.env.MSSQL_PASSWORD;
  const database = process.env.MSSQL_DATABASE || "QuerySystemDb";

  if (!server || !user || !password) {
    return null;
  }

  const port = process.env.MSSQL_PORT ? parseInt(process.env.MSSQL_PORT, 10) : 1433;
  const encrypt = process.env.MSSQL_ENCRYPT === "true" || process.env.MSSQL_ENCRYPT === "1";
  const trustServerCertificate = process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== "false";

  return {
    server,
    port,
    user,
    password,
    database,
    options: {
      encrypt,
      trustServerCertificate,
      connectTimeout: 15000,
      requestTimeout: 30000,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

export function getStatus(): MssqlStatus {
  const config = getMssqlConfig();
  const server = process.env.MSSQL_SERVER || process.env.MSSQL_HOST || (process.env.MSSQL_CONNECTION_STRING ? "Custom Connection String" : undefined);
  const database = process.env.MSSQL_DATABASE || "QuerySystemDb";

  return {
    configured: !!config,
    connected: pool?.connected ?? false,
    server,
    database,
    error: lastError,
    lastChecked: new Date().toISOString(),
  };
}

export async function getPool(): Promise<sql.ConnectionPool | null> {
  if (pool && pool.connected) {
    return pool;
  }

  const config = getMssqlConfig();
  if (!config) {
    return null;
  }

  if (isConnecting) {
    // Wait briefly if connection is in progress
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (pool && pool.connected) return pool;
  }

  isConnecting = true;
  try {
    if (pool) {
      try {
        await pool.close();
      } catch {
        // ignore
      }
    }

    pool = await new sql.ConnectionPool(config).connect();
    lastError = null;
    console.log("✅ [MSSQL] Successfully connected to Microsoft SQL Server");

    if (!tablesInitialized) {
      await initTables(pool);
      tablesInitialized = true;
    }

    return pool;
  } catch (err: any) {
    lastError = err?.message || String(err);
    console.warn("⚠️ [MSSQL] Connection error:", lastError);
    return null;
  } finally {
    isConnecting = false;
  }
}

export async function initTables(p: sql.ConnectionPool): Promise<void> {
  try {
    const request = p.request();
    
    
    // Migration: add passwordHash and encryptedPassword if they don't exist
    try {
      await p.request().batch(`
        IF COL_LENGTH('dbo.Users', 'passwordHash') IS NULL
        BEGIN
            ALTER TABLE dbo.Users ADD passwordHash NVARCHAR(255) NULL;
        END
        IF COL_LENGTH('dbo.Users', 'encryptedPassword') IS NULL
        BEGIN
            ALTER TABLE dbo.Users ADD encryptedPassword NVARCHAR(1024) NULL;
        END
        ELSE
        BEGIN
            ALTER TABLE dbo.Users ALTER COLUMN encryptedPassword NVARCHAR(1024) NULL;
        END
        
        -- Migrate legacy passwords
        IF COL_LENGTH('dbo.Users', 'password') IS NOT NULL
        BEGIN
            -- we can't easily auto-hash in T-SQL, but we can just map it for now
            EXEC('UPDATE dbo.Users SET passwordHash = password WHERE passwordHash IS NULL AND password IS NOT NULL');
            -- don't drop the column just yet to prevent issues
        END
      `);
      console.log("✅ [MSSQL] User table migrated with passwordHash/encryptedPassword.");
    } catch(err) {
      console.error("Migration error:", err);
    }

    // Create Users table
    await request.batch(`
      IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.Users (
          username NVARCHAR(100) NOT NULL PRIMARY KEY,
          passwordHash NVARCHAR(255) NULL,
          encryptedPassword NVARCHAR(1024) NULL,
          role NVARCHAR(50) NOT NULL DEFAULT 'RESPONDENT',
          starLevel INT NULL DEFAULT 1,
          respondentSubRank INT NULL DEFAULT 1,
          respondentPoints INT NULL DEFAULT 0,
          assignedTables NVARCHAR(MAX) NULL,
          passwordChangeApplied BIT NULL DEFAULT 0,
          distributedToAdmins BIT NULL DEFAULT 0,
          banned BIT NOT NULL DEFAULT 0,
          bannedFeatures NVARCHAR(MAX) NULL,
          promotedFriendsThisMonthCount_T3 INT NULL DEFAULT 0,
          promotedFriendsThisWeekCount_T5 INT NULL DEFAULT 0,
          bannedOtherAppliedThisMonthCount INT NULL DEFAULT 0,
          canManageTrivia BIT NULL DEFAULT 0,
          canManageLogs BIT NULL DEFAULT 0,
          extraT3Quota INT NULL DEFAULT 0,
          extraT5Quota INT NULL DEFAULT 0,
          extraBanQuota INT NULL DEFAULT 0,
          bannedReason NVARCHAR(500) NULL,
          bannedBy NVARCHAR(100) NULL,
          banType NVARCHAR(100) NULL,
          bannedUntil BIGINT NULL,
          createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END
    `);

    // Create Questionnaires table
    await request.batch(`
      IF OBJECT_ID(N'dbo.Questionnaires', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.Questionnaires (
          id NVARCHAR(100) NOT NULL PRIMARY KEY,
          title NVARCHAR(255) NOT NULL,
          description NVARCHAR(MAX) NULL,
          questions NVARCHAR(MAX) NOT NULL,
          isActive BIT NOT NULL DEFAULT 1,
          startTime NVARCHAR(50) NULL,
          endTime NVARCHAR(50) NULL,
          passwordRequired BIT NOT NULL DEFAULT 0,
          password NVARCHAR(255) NULL,
          querySystems NVARCHAR(MAX) NULL,
          emailNotificationEnabled BIT NOT NULL DEFAULT 0,
          distributedToAdmins BIT NULL DEFAULT 0,
          createdBy NVARCHAR(100) NULL,
          disputes NVARCHAR(MAX) NULL,
          stopApplied NVARCHAR(MAX) NULL,
          suggestions NVARCHAR(MAX) NULL,
          createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END
    `);

    // Create SurveyResponses table
    await request.batch(`
      IF OBJECT_ID(N'dbo.SurveyResponses', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.SurveyResponses (
          id NVARCHAR(100) NOT NULL PRIMARY KEY,
          surveyId NVARCHAR(100) NOT NULL,
          answers NVARCHAR(MAX) NOT NULL,
          submittedAt NVARCHAR(50) NOT NULL,
          submittedBy NVARCHAR(100) NULL,
          createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END
    `);

    // Create AuditLogs table
    await request.batch(`
      IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.AuditLogs (
          id NVARCHAR(100) NOT NULL PRIMARY KEY,
          timestamp NVARCHAR(50) NOT NULL,
          [user] NVARCHAR(100) NOT NULL,
          role NVARCHAR(50) NOT NULL,
          action NVARCHAR(100) NOT NULL,
          target NVARCHAR(255) NOT NULL,
          details NVARCHAR(MAX) NULL,
          createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END
    `);

    // Create Promotions table
    await request.batch(`
      IF OBJECT_ID(N'dbo.Promotions', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.Promotions (
          id NVARCHAR(100) NOT NULL PRIMARY KEY,
          username NVARCHAR(100) NOT NULL,
          currentRole NVARCHAR(50) NOT NULL,
          currentStar INT NULL,
          targetRole NVARCHAR(50) NOT NULL,
          targetStar INT NULL,
          status NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
          createdAt NVARCHAR(50) NOT NULL
        );
      END
    `);

    // Create CheatReports table
    await request.batch(`
      IF OBJECT_ID(N'dbo.CheatReports', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.CheatReports (
          id NVARCHAR(100) NOT NULL PRIMARY KEY,
          reportedUser NVARCHAR(100) NULL,
          reporter NVARCHAR(100) NULL,
          reason NVARCHAR(MAX) NULL,
          status NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
          payload NVARCHAR(MAX) NULL,
          createdAt NVARCHAR(50) NOT NULL
        );
      END
    `);

    // Create QuotaRequests table
    await request.batch(`
      IF OBJECT_ID(N'dbo.QuotaRequests', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.QuotaRequests (
          id NVARCHAR(100) NOT NULL PRIMARY KEY,
          username NVARCHAR(100) NULL,
          quotaType NVARCHAR(100) NULL,
          amount INT NULL DEFAULT 0,
          status NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
          payload NVARCHAR(MAX) NULL,
          createdAt NVARCHAR(50) NOT NULL
        );
      END
    `);

    // Create TriviaQuestions table
    await request.batch(`
      IF OBJECT_ID(N'dbo.TriviaQuestions', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.TriviaQuestions (
          id NVARCHAR(100) NOT NULL PRIMARY KEY,
          title NVARCHAR(MAX) NULL,
          payload NVARCHAR(MAX) NULL,
          createdAt NVARCHAR(50) NOT NULL
        );
      END
    `);

    // Create SiteUpdateLogs table
    await request.batch(`
      IF OBJECT_ID(N'dbo.SiteUpdateLogs', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.SiteUpdateLogs (
          id NVARCHAR(100) NOT NULL PRIMARY KEY,
          version NVARCHAR(50) NOT NULL,
          timestamp NVARCHAR(50) NOT NULL,
          title NVARCHAR(255) NOT NULL,
          category NVARCHAR(50) NOT NULL,
          categoryLabel NVARCHAR(100) NOT NULL,
          author NVARCHAR(100) NOT NULL,
          summary NVARCHAR(MAX) NULL,
          details NVARCHAR(MAX) NULL,
          webmasterOnly BIT NOT NULL DEFAULT 0
        );
      END
    `);

    // Create DeletedUsers table
    await request.batch(`
      IF OBJECT_ID(N'dbo.DeletedUsers', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.DeletedUsers (
          id NVARCHAR(100) NOT NULL PRIMARY KEY,
          username NVARCHAR(100) NOT NULL,
          deletedAt NVARCHAR(50) NOT NULL,
          deletedBy NVARCHAR(100) NOT NULL,
          responseCount INT NOT NULL DEFAULT 0,
          auditLogCount INT NOT NULL DEFAULT 0,
          cheatReportCount INT NOT NULL DEFAULT 0,
          quotaRequestCount INT NOT NULL DEFAULT 0,
          promotionCount INT NOT NULL DEFAULT 0,
          status NVARCHAR(50) NOT NULL DEFAULT 'DELETED',
          purgedAt NVARCHAR(50) NULL,
          purgedBy NVARCHAR(100) NULL
        );
        CREATE NONCLUSTERED INDEX IX_DeletedUsers_Username ON dbo.DeletedUsers(username);
      END
    `);

    // Ensure Users ban columns exist for existing databases
    await request.batch(`
      IF COL_LENGTH(N'dbo.Users', N'bannedReason') IS NULL
        ALTER TABLE dbo.Users ADD bannedReason NVARCHAR(500) NULL;
      IF COL_LENGTH(N'dbo.Users', N'bannedBy') IS NULL
        ALTER TABLE dbo.Users ADD bannedBy NVARCHAR(100) NULL;
      IF COL_LENGTH(N'dbo.Users', N'banType') IS NULL
        ALTER TABLE dbo.Users ADD banType NVARCHAR(100) NULL;
      IF COL_LENGTH(N'dbo.Users', N'bannedUntil') IS NULL
        ALTER TABLE dbo.Users ADD bannedUntil BIGINT NULL;
    `);

    // Seed default users if Users table is empty
    const countRes = await request.query("SELECT COUNT(*) AS total FROM dbo.Users");
    const totalUsers = countRes.recordset[0]?.total || 0;
    if (totalUsers === 0) {
      console.log("🌱 [MSSQL] Users table is empty, seeding default initial accounts with bcrypt hashes...");
      for (const u of Object.values(fallbackUsers)) {
        await saveUserToPool(p, u);
      }
      console.log("✅ [MSSQL] Default users seeded successfully into SQL Server.");
    }

    // Ensure v1.9.3 site update log is seeded into SQL Server SiteUpdateLogs
    try {
      const v193 = {
        id: "update-20260914-140000-v193",
        version: "v1.9.3",
        timestamp: "2026-09-14 14:00:00",
        title: "全面確立 SQL Server 權威架構與 Express 端端業務安全防護 (JWT + RBAC + 七重規則校驗)",
        category: "SECURITY",
        categoryLabel: "權威架構 & 業務校驗",
        author: "系統站主 (Webmaster)",
        summary: "落實 Express + SQL Server 權威架構：React 不直接決定權限與正式資料；所有重要 API 全面經過 JWT + RBAC 驗證；Express 集中檢驗問卷狀態、開放時效、密碼、停權與作答格式；密碼全面採用 bcrypt 於後端驗證，前端徹底脫敏。",
        webmasterOnly: 1,
        details: JSON.stringify([
          "【架構權威重定 (React → Express → SQL Server)】正式確立 SQL Server 作為全站唯一最高權威資料庫。React 前端僅負責 UI 渲染與使用者互動，所有正式資料 (Users, Questionnaires, Responses, AuditLogs, SiteUpdateLogs) 一律由 Express API 統一控制，localStorage 僅作 Token 與暫存草稿之用，完全杜絕前端直接操作未經鑑權之遠端資料。",
          "【JWT 憑證傳輸與 RBAC 嚴格授權】全面推行 Authorization: Bearer <JWT> 傳輸規範。由 Express 後端中介軟體依據標準規範對 WEBMASTER、SUPER_ADMIN、SYS_ADMIN、OPERATOR、ANALYST、QUESTION_CREATOR、RESPONDENT 角色實施端點層級 RBAC 訪問控制，徹底防範越權存取與客戶端偽造身份。",
          "【Express 核心業務規則七重驗證】POST /api/responses 全面納入伺服器端業務規則校驗：(1) 問卷是否存在、(2) 問卷是否處於啟用狀態、(3) 是否在開放時間視窗內、(4) 問卷保護密碼正確性、(5) 填答者是否被停權或被封禁答題特權、(6) 是否允許重複填寫（限制單次填寫檢核）、(7) 題項回答格式合規性（必填校驗、評分題邊界檢核、單/複選有效選項校驗）。",
          "【密碼全面移轉後端驗證】前端徹底杜絕接觸問卷密碼與使用者密碼 Hash。登入、密碼修改、管理者重設密碼及問卷/子查詢密碼解鎖皆由 Express 透過 bcrypt 進行伺服器端驗證與雜湊，前端 API 回傳資料全面去除 password 欄位以保障最高安全性。",
          "【版本規格書同步發佈 (v1.9.3)】全域系統規格書同步更新至版本 1.9.3，正式確立後端主權與 SQL Server 權威架構圖及安全規範。"
        ])
      };
      const logReq = p.request();
      logReq.input("id", sql.NVarChar(100), v193.id);
      logReq.input("version", sql.NVarChar(50), v193.version);
      logReq.input("timestamp", sql.NVarChar(50), v193.timestamp);
      logReq.input("title", sql.NVarChar(255), v193.title);
      logReq.input("category", sql.NVarChar(50), v193.category);
      logReq.input("categoryLabel", sql.NVarChar(100), v193.categoryLabel);
      logReq.input("author", sql.NVarChar(100), v193.author);
      logReq.input("summary", sql.NVarChar(sql.MAX), v193.summary);
      logReq.input("details", sql.NVarChar(sql.MAX), v193.details);
      logReq.input("webmasterOnly", sql.Bit, v193.webmasterOnly);
      await logReq.query(`
        MERGE dbo.SiteUpdateLogs AS target
        USING (SELECT @id AS id) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET
            version = @version,
            timestamp = @timestamp,
            title = @title,
            category = @category,
            categoryLabel = @categoryLabel,
            author = @author,
            summary = @summary,
            details = @details,
            webmasterOnly = @webmasterOnly
        WHEN NOT MATCHED THEN
          INSERT (id, version, timestamp, title, category, categoryLabel, author, summary, details, webmasterOnly)
          VALUES (@id, @version, @timestamp, @title, @category, @categoryLabel, @author, @summary, @details, @webmasterOnly);
      `);
    } catch (logErr) {
      console.warn("⚠️ [MSSQL] Site update log v1.9.3 seed warning:", logErr);
    }

    // Ensure v1.9.4 site update log is seeded into SQL Server SiteUpdateLogs
    try {
      const v194 = {
        id: "update-20260915-053000-v194",
        version: "v1.9.4",
        timestamp: "2026-09-15 05:30:00",
        title: "SQL Server 連線狀態隱蔽與管理層帳號刪除權限修復",
        category: "SECURITY",
        categoryLabel: "資訊隔離 & 權限修復",
        author: "系統站主 (Webmaster)",
        summary: "收緊 SQL Server 狀態與 DDL 綱要檢閱權限至僅站主可見，避免架構外洩；落實 DELETE /api/users/:username 端點與多階層 RBAC 刪除防護，修復管理層無法刪除帳號之問題。",
        webmasterOnly: 1,
        details: JSON.stringify([
          "【高階資訊安全隔離補丁】/api/db/status 與 /api/db/ddl 路由已掛載 requireAuth 與 requireRole('WEBMASTER') 中介層，確保 SQL Server 連線狀態與資料庫實體結構僅有系統站主能檢閱，防止內部網路結構或連線字串意外曝露。",
          "【永久刪除帳號 API 實作與階層防護】實作 DELETE /api/users/:username 介面，並嚴格限制：(1) 禁止透過管理介面刪除自己；(2) 禁止刪除 WEBMASTER；(3) SUPER_ADMIN 不能刪除其他 SUPER_ADMIN；(4) SYSTEM_ADMIN 僅能刪除一般下屬與市民帳號。所有刪除請求連動至 mssql.deleteUser 執行 T-SQL 永久清除。",
          "【版本規格書同步發佈 (v1.9.4)】全域系統規格書同步更新至版本 1.9.4，正式記錄隔離補丁與帳號刪除修復細節。"
        ])
      };
      const logReq2 = p.request();
      logReq2.input("id", sql.NVarChar(100), v194.id);
      logReq2.input("version", sql.NVarChar(50), v194.version);
      logReq2.input("timestamp", sql.NVarChar(50), v194.timestamp);
      logReq2.input("title", sql.NVarChar(255), v194.title);
      logReq2.input("category", sql.NVarChar(50), v194.category);
      logReq2.input("categoryLabel", sql.NVarChar(100), v194.categoryLabel);
      logReq2.input("author", sql.NVarChar(100), v194.author);
      logReq2.input("summary", sql.NVarChar(sql.MAX), v194.summary);
      logReq2.input("details", sql.NVarChar(sql.MAX), v194.details);
      logReq2.input("webmasterOnly", sql.Bit, v194.webmasterOnly);
      await logReq2.query(`
        MERGE dbo.SiteUpdateLogs AS target
        USING (SELECT @id AS id) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET
            version = @version,
            timestamp = @timestamp,
            title = @title,
            category = @category,
            categoryLabel = @categoryLabel,
            author = @author,
            summary = @summary,
            details = @details,
            webmasterOnly = @webmasterOnly
        WHEN NOT MATCHED THEN
          INSERT (id, version, timestamp, title, category, categoryLabel, author, summary, details, webmasterOnly)
          VALUES (@id, @version, @timestamp, @title, @category, @categoryLabel, @author, @summary, @details, @webmasterOnly);
      `);
    } catch (logErr) {
      console.warn("⚠️ [MSSQL] Site update log v1.9.4 seed warning:", logErr);
    }

    // Ensure v1.9.4.3 site update log is seeded into SQL Server SiteUpdateLogs
    try {
      const v1943 = {
        id: "update-20260915-055500-v1943",
        version: "v1.9.4.3",
        timestamp: "2026-09-15 05:55:00",
        title: "SQL Server 積分原子事務修復與日誌端點 JWT 身份強制",
        category: "SECURITY",
        categoryLabel: "事務隔離 & 權限修復",
        author: "系統站主 (Webmaster)",
        summary: "修復作答送出時未採用原子事務 (Atomic Transaction) 導致的積分更新可能漏失問題，並收緊 /api/logs 身份驗證確保操作者為 JWT 發證對象。",
        webmasterOnly: 1,
        details: JSON.stringify([
          "【後端原子事務運算 (Atomic Transaction)】重構 POST /api/responses 內部資料存儲機制，將 SurveyResponses 寫入、AuditLogs 寫入、Users 積分及階級 (starLevel) 更新整合成單一 SQL Transaction 事務，任何步驟失敗即觸發 ROLLBACK 避免部分寫入造成的資料異常。",
          "【日誌防偽造補丁】收緊 /api/logs 路由，從 optionalAuth 升級為 requireAuth，且 Audit Log 內的操作者帳號 (user) 與角色 (role) 強制由伺服器端解析之 JWT (req.user) 寫入，完全阻斷由 Request Body 偽造操作者身分的漏洞。",
          "【規格書更新】全域規格書同步升級至 v1.9.4.3。"
        ])
      };
      const logReq3 = p.request();
      logReq3.input("id", sql.NVarChar(100), v1943.id);
      logReq3.input("version", sql.NVarChar(50), v1943.version);
      logReq3.input("timestamp", sql.NVarChar(50), v1943.timestamp);
      logReq3.input("title", sql.NVarChar(255), v1943.title);
      logReq3.input("category", sql.NVarChar(50), v1943.category);
      logReq3.input("categoryLabel", sql.NVarChar(100), v1943.categoryLabel);
      logReq3.input("author", sql.NVarChar(100), v1943.author);
      logReq3.input("summary", sql.NVarChar(sql.MAX), v1943.summary);
      logReq3.input("details", sql.NVarChar(sql.MAX), v1943.details);
      logReq3.input("webmasterOnly", sql.Bit, v1943.webmasterOnly);
      await logReq3.query(`
        MERGE dbo.SiteUpdateLogs AS target
        USING (SELECT @id AS id) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET
            version = @version,
            timestamp = @timestamp,
            title = @title,
            category = @category,
            categoryLabel = @categoryLabel,
            author = @author,
            summary = @summary,
            details = @details,
            webmasterOnly = @webmasterOnly
        WHEN NOT MATCHED THEN
          INSERT (id, version, timestamp, title, category, categoryLabel, author, summary, details, webmasterOnly)
          VALUES (@id, @version, @timestamp, @title, @category, @categoryLabel, @author, @summary, @details, @webmasterOnly);
      `);
    } catch (logErr) {
      console.warn("⚠️ [MSSQL] Site update log v1.9.4.3 seed warning:", logErr);
    }

    // Ensure v1.9.4.4 site update log is seeded into SQL Server SiteUpdateLogs
    try {
      const v1944 = {
        id: "update-20260915-062000-v1944",
        version: "v1.9.4.4",
        timestamp: "2026-09-15 06:20:00",
        title: "使用者帳號軟刪除與永久清除管理系統 (Soft-delete & Purge)",
        category: "FEATURE",
        categoryLabel: "資料生命週期管理",
        author: "系統站主 (Webmaster)",
        summary: "重構刪除使用者流程，支援身分軟刪除並保留歷史紀錄；新增「已刪除帳號管理」功能供系統站主永久清除資料。",
        webmasterOnly: 1,
        details: JSON.stringify([
          "【軟刪除身分】刪除使用者時（`DELETE /api/users/:username`），僅自 `Users` 移除身分登入權限，建立至 `DeletedUsers` 索引，原始之作答 (SurveyResponses) 與稽核 (AuditLogs) 歷史資料完整保留，防止誤刪與破壞歷史。",
          "【管理介面擴充】於系統管理後台新增「已刪除帳號管理」頁籤（僅 WEBMASTER 與 SUPER_ADMIN 可見），供管理層檢閱已遭刪除使用者之歷史資料數量與統計。",
          "【原子級永久清除 (Purge)】賦予系統站主（WEBMASTER）專屬之永久清除特權。在管理介面中核取目標帳號並輸入防呆確認碼後，以 SQL Transaction 形式原級一次性銷毀該帳號的所有關聯歷史資料，並將 DeletedUsers 索引狀態變更為 PURGED。",
          "【權限分離設計】「刪除帳號身分」與「永久清除資料」分離。站主與超級管理員皆可刪除帳號身分，但僅有最高系統站主具備觸發永久清除資料 (Purge) 之伺服器端授權。"
        ])
      };
      const logReq4 = p.request();
      logReq4.input("id", sql.NVarChar(100), v1944.id);
      logReq4.input("version", sql.NVarChar(50), v1944.version);
      logReq4.input("timestamp", sql.NVarChar(50), v1944.timestamp);
      logReq4.input("title", sql.NVarChar(255), v1944.title);
      logReq4.input("category", sql.NVarChar(50), v1944.category);
      logReq4.input("categoryLabel", sql.NVarChar(100), v1944.categoryLabel);
      logReq4.input("author", sql.NVarChar(100), v1944.author);
      logReq4.input("summary", sql.NVarChar(sql.MAX), v1944.summary);
      logReq4.input("details", sql.NVarChar(sql.MAX), v1944.details);
      logReq4.input("webmasterOnly", sql.Bit, v1944.webmasterOnly);
      await logReq4.query(`
        MERGE dbo.SiteUpdateLogs AS target
        USING (SELECT @id AS id) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET
            version = @version,
            timestamp = @timestamp,
            title = @title,
            category = @category,
            categoryLabel = @categoryLabel,
            author = @author,
            summary = @summary,
            details = @details,
            webmasterOnly = @webmasterOnly
        WHEN NOT MATCHED THEN
          INSERT (id, version, timestamp, title, category, categoryLabel, author, summary, details, webmasterOnly)
          VALUES (@id, @version, @timestamp, @title, @category, @categoryLabel, @author, @summary, @details, @webmasterOnly);
      `);
    } catch (logErr) {
      console.warn("⚠️ [MSSQL] Site update log v1.9.4.4 seed warning:", logErr);
    }

    // Ensure v1.9.4.8 site update log is seeded into SQL Server SiteUpdateLogs
    try {
      const v1948 = {
        id: "update-20260917-124000-v1948",
        version: "v1.9.4.8",
        timestamp: "2026-09-17 12:40:00",
        title: "更新規格書 檔案版本：v1.9.4.8",
        category: "WEBMASTER",
        categoryLabel: "👑 系統站主最高特權專區",
        author: "系統站主 (Webmaster)",
        summary: "徹底移除 localStorage.sub_users 資料鏈路，確立 SQL Server 為唯一正式帳號資料來源，建立正規 POST/GET /api/users 閉環",
        webmasterOnly: 1,
        details: JSON.stringify([
          "【帳號資料來源正規化】Dashboard.tsx 帳號清單全面改由 GET /api/users 自後端 SQL Server 取得，徹底停用 localStorage.sub_users 與前端本地偽儲存。",
          "【新增帳號閉環持久化】新增帳號改採「先 POST /api/users 真正寫入 SQL Server → 伺服器成功回傳 → 重新發動 GET /api/users 抓取權威資料鏈路」，徹底杜絕 A 電腦新增當下看到但刷新後消失的假性成功現象。",
          "【後端資料庫嚴格驗證】server/mssql.ts 與 server.ts 於 SQL Server 連線中斷或寫入異常時，即時回傳錯誤，不再偽裝寫入成功，確保資料一致性。",
          "【災備機制徹底解耦】Firestore 僅保留作為非同步災備副本，不再作為 Users 讀取來源；bannedFeatures.ts 與 localStorageSync.ts 全面剔除 sub_users 同步與狀態判定依賴。",
          "【規格書版本同步升級 (v1.9.4.8)】全域系統規格書 (SYSTEM_SPECIFICATION.md) 檔案版本同步更新至 v1.9.4.8，確立八大核心架構原則與 API 權限矩陣。"
        ])
      };

      const logReq5 = p.request();
      logReq5.input("id", sql.NVarChar(100), v1948.id);
      logReq5.input("version", sql.NVarChar(50), v1948.version);
      logReq5.input("timestamp", sql.NVarChar(50), v1948.timestamp);
      logReq5.input("title", sql.NVarChar(255), v1948.title);
      logReq5.input("category", sql.NVarChar(50), v1948.category);
      logReq5.input("categoryLabel", sql.NVarChar(100), v1948.categoryLabel);
      logReq5.input("author", sql.NVarChar(100), v1948.author);
      logReq5.input("summary", sql.NVarChar(sql.MAX), v1948.summary);
      logReq5.input("details", sql.NVarChar(sql.MAX), v1948.details);
      logReq5.input("webmasterOnly", sql.Bit, v1948.webmasterOnly);
      await logReq5.query(`
        MERGE dbo.SiteUpdateLogs AS target
        USING (SELECT @id AS id) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET
            version = @version,
            timestamp = @timestamp,
            title = @title,
            category = @category,
            categoryLabel = @categoryLabel,
            author = @author,
            summary = @summary,
            details = @details,
            webmasterOnly = @webmasterOnly
        WHEN NOT MATCHED THEN
          INSERT (id, version, timestamp, title, category, categoryLabel, author, summary, details, webmasterOnly)
          VALUES (@id, @version, @timestamp, @title, @category, @categoryLabel, @author, @summary, @details, @webmasterOnly);
      `);
    } catch (logErr) {
      console.warn("⚠️ [MSSQL] Site update log v1.9.4.8 seed warning:", logErr);
    }

    console.log("✅ [MSSQL] Database tables verified & initialized");
  } catch (err) {
    console.error("⚠️ [MSSQL] Table initialization error:", err);
  }
}

// -------------------------------------------------------------
// Data Operations: Users
// -------------------------------------------------------------
export async function getUsers(): Promise<Record<string, any>> {
  const p = await getPool();
  if (!p) {
    const safeFallback: Record<string, any> = {};
    for (const [k, v] of Object.entries(fallbackUsers)) {
      const { password: _p, ...safe } = v;
      safeFallback[k] = safe;
    }
    return safeFallback;
  }

  const result = await p.request().query("SELECT * FROM dbo.Users");
  const usersMap: Record<string, any> = {};
  for (const row of result.recordset) {
    // SECURITY: NEVER return password or password hash to client!
    usersMap[row.username.toLowerCase()] = {
      username: row.username,
      role: row.role,
      starLevel: row.starLevel,
      respondentSubRank: row.respondentSubRank,
      respondentPoints: row.respondentPoints,
      assignedTables: row.assignedTables ? JSON.parse(row.assignedTables) : [],
      passwordChangeApplied: Boolean(row.passwordChangeApplied),
      distributedToAdmins: Boolean(row.distributedToAdmins),
      banned: Boolean(row.banned),
      bannedReason: row.bannedReason || undefined,
      bannedBy: row.bannedBy || undefined,
      banType: row.banType || undefined,
      bannedUntil: row.bannedUntil ? Number(row.bannedUntil) : undefined,
      bannedFeatures: row.bannedFeatures ? JSON.parse(row.bannedFeatures) : [],
      promotedFriendsThisMonthCount_T3: row.promotedFriendsThisMonthCount_T3 || 0,
      promotedFriendsThisWeekCount_T5: row.promotedFriendsThisWeekCount_T5 || 0,
      bannedOtherAppliedThisMonthCount: row.bannedOtherAppliedThisMonthCount || 0,
      canManageTrivia: Boolean(row.canManageTrivia),
      canManageLogs: Boolean(row.canManageLogs),
      extraT3Quota: row.extraT3Quota || 0,
      extraT5Quota: row.extraT5Quota || 0,
      extraBanQuota: row.extraBanQuota || 0,
    };
  }
  return usersMap;
}

export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, 10);
}

export async function getUserForAuth(username: string): Promise<any | null> {
  const cleanUsername = username.trim().toLowerCase();
  const p = await getPool();
  if (p) {
    const req = p.request();
    req.input("username", sql.NVarChar(100), cleanUsername);
    const res = await req.query("SELECT TOP 1 * FROM dbo.Users WHERE LOWER(username) = LOWER(@username)");
    if (res.recordset.length === 0) {
      return fallbackUsers[cleanUsername] || null;
    }
    const row = res.recordset[0];
    return {
      username: row.username,
      password: row.passwordHash || row.password,
      encryptedPassword: row.encryptedPassword,
      role: row.role,
      starLevel: row.starLevel,
      respondentSubRank: row.respondentSubRank,
      respondentPoints: row.respondentPoints,
      assignedTables: row.assignedTables ? JSON.parse(row.assignedTables) : [],
      passwordChangeApplied: Boolean(row.passwordChangeApplied),
      distributedToAdmins: Boolean(row.distributedToAdmins),
      banned: Boolean(row.banned),
      bannedReason: row.bannedReason || undefined,
      bannedBy: row.bannedBy || undefined,
      banType: row.banType || undefined,
      bannedUntil: row.bannedUntil ? Number(row.bannedUntil) : undefined,
      bannedFeatures: row.bannedFeatures ? JSON.parse(row.bannedFeatures) : [],
      canManageTrivia: Boolean(row.canManageTrivia),
      canManageLogs: Boolean(row.canManageLogs)
    };
  } else {
    return fallbackUsers[cleanUsername] || null;
  }
}

export async function verifyAndUpgradePassword(
  username: string,
  plain: string,
  storedPassword: string | null
): Promise<boolean> {
  if (!storedPassword) return false;
  // Check if bcrypt hash format: starts with $2a$, $2b$, or $2y$
  const isBcrypt = /^\$2[aby]\$/.test(storedPassword);
  if (isBcrypt) {
    return await bcrypt.compare(plain, storedPassword);
  }
  // Plain text match (for legacy transition):
  if (plain === storedPassword) {
    // Auto-upgrade to bcrypt hash in DB
    try {
      const newHash = await bcrypt.hash(plain, 10);
      const p = await getPool();
      if (p) {
        const req = p.request();
        req.input("username", sql.NVarChar(100), username);
        req.input("password", sql.NVarChar(255), newHash);
        req.input("encryptedPassword", sql.NVarChar(1024), encryptPassword(plain));
        await req.query("UPDATE dbo.Users SET passwordHash = @password, encryptedPassword = @encryptedPassword WHERE LOWER(username) = LOWER(@username)");
      }
      if (fallbackUsers[username.toLowerCase()]) {
        fallbackUsers[username.toLowerCase()].password = newHash;
      }
    } catch (upgradeErr) {
      console.warn("⚠️ Failed to auto-upgrade legacy password to bcrypt:", upgradeErr);
    }
    return true;
  }
  return false;
}

export async function changeUserPassword(
  username: string,
  oldPass: string,
  newPass: string
): Promise<{ success: boolean; message: string }> {
  const cleanUsername = username.trim().toLowerCase();
  const user = await getUserForAuth(cleanUsername);
  if (!user) {
    return { success: false, message: "使用者不存在" };
  }

  const isOldValid = await verifyAndUpgradePassword(cleanUsername, oldPass, user.password);
  if (!isOldValid) {
    return { success: false, message: "舊密碼驗證有誤，請重試！" };
  }

  const newHash = await bcrypt.hash(newPass, 10);
  const p = await getPool();
  if (p) {
    const req = p.request();
    req.input("username", sql.NVarChar(100), cleanUsername);
    req.input("password", sql.NVarChar(255), newHash);
    req.input("encryptedPassword", sql.NVarChar(1024), encryptPassword(newPass));
    await req.query(`
      UPDATE dbo.Users 
      SET passwordHash = @password, encryptedPassword = @encryptedPassword, passwordChangeApplied = 1, updatedAt = SYSUTCDATETIME()
      WHERE LOWER(username) = LOWER(@username)
    `);
  }
  if (fallbackUsers[cleanUsername]) {
    fallbackUsers[cleanUsername].password = newHash;
    fallbackUsers[cleanUsername].passwordChangeApplied = true;
  }
  return { success: true, message: "個人密碼修改成功" };
}

export async function adminResetUserPassword(
  targetUsername: string,
  newPass: string
): Promise<{ success: boolean; message: string }> {
  const cleanUsername = targetUsername.trim().toLowerCase();
  const newHash = await bcrypt.hash(newPass, 10);
  const p = await getPool();
  if (p) {
    const req = p.request();
    req.input("username", sql.NVarChar(100), cleanUsername);
    req.input("password", sql.NVarChar(255), newHash);
    req.input("encryptedPassword", sql.NVarChar(1024), encryptPassword(newPass));
    await req.query(`
      UPDATE dbo.Users 
      SET passwordHash = @password, encryptedPassword = @encryptedPassword, passwordChangeApplied = 1, updatedAt = SYSUTCDATETIME()
      WHERE LOWER(username) = LOWER(@username)
    `);
  }
  if (fallbackUsers[cleanUsername]) {
    fallbackUsers[cleanUsername].password = newHash;
  }
  return { success: true, message: `帳號 ${targetUsername} 的密碼已成功重新設定！` };
}

export async function deleteUser(username: string, deletedBy: string = "unknown"): Promise<boolean> {
  const cleanUsername = username.trim().toLowerCase();
  const p = await getPool();
  if (p) {
    const transaction = new sql.Transaction(p);
    try {
      await transaction.begin();

      // 1. Count associated data
      const countReq = new sql.Request(transaction);
      countReq.input("username", sql.NVarChar(100), cleanUsername);
      const countRes = await countReq.query(`
        SELECT 
          (SELECT COUNT(*) FROM dbo.SurveyResponses WHERE LOWER(submittedBy) = @username) AS respCount,
          (SELECT COUNT(*) FROM dbo.AuditLogs WHERE LOWER([user]) = @username) AS logCount,
          (SELECT COUNT(*) FROM dbo.CheatReports WHERE LOWER(reportedBy) = @username OR LOWER(reportedUser) = @username) AS cheatCount,
          (SELECT COUNT(*) FROM dbo.QuotaRequests WHERE LOWER(username) = @username) AS quotaCount,
          (SELECT COUNT(*) FROM dbo.Promotions WHERE LOWER(username) = @username) AS promotionCount
      `);
      const counts = countRes.recordset[0];

      // 2. Insert into DeletedUsers
      const insertReq = new sql.Request(transaction);
      const newId = `del-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      insertReq.input("id", sql.NVarChar(100), newId);
      insertReq.input("username", sql.NVarChar(100), cleanUsername);
      insertReq.input("deletedAt", sql.NVarChar(50), new Date().toISOString());
      insertReq.input("deletedBy", sql.NVarChar(100), deletedBy);
      insertReq.input("respCount", sql.Int, counts.respCount);
      insertReq.input("logCount", sql.Int, counts.logCount);
      insertReq.input("cheatCount", sql.Int, counts.cheatCount);
      insertReq.input("quotaCount", sql.Int, counts.quotaCount);
      insertReq.input("promotionCount", sql.Int, counts.promotionCount);

      await insertReq.query(`
        INSERT INTO dbo.DeletedUsers (id, username, deletedAt, deletedBy, responseCount, auditLogCount, cheatReportCount, quotaRequestCount, promotionCount)
        VALUES (@id, @username, @deletedAt, @deletedBy, @respCount, @logCount, @cheatCount, @quotaCount, @promotionCount)
      `);

      // 3. Delete from Users
      const delReq = new sql.Request(transaction);
      delReq.input("username", sql.NVarChar(100), cleanUsername);
      await delReq.query(`DELETE FROM dbo.Users WHERE LOWER(username) = LOWER(@username)`);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
  if (fallbackUsers[cleanUsername]) {
    delete fallbackUsers[cleanUsername];
  }
  return true;
}

export async function getDeletedUsers(): Promise<any[]> {
  const p = await getPool();
  if (p) {
    const res = await p.request().query("SELECT * FROM dbo.DeletedUsers ORDER BY deletedAt DESC");
    return res.recordset;
  }
  return [];
}

export async function purgeDeletedUsersData(usernames: string[], purgedBy: string): Promise<void> {
  if (!usernames || usernames.length === 0) return;
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const transaction = new sql.Transaction(p);
  try {
    await transaction.begin();

    for (const username of usernames) {
      const cleanUsername = username.trim().toLowerCase();
      const req = new sql.Request(transaction);
      req.input("username", sql.NVarChar(100), cleanUsername);
      req.input("purgedBy", sql.NVarChar(100), purgedBy);
      req.input("purgedAt", sql.NVarChar(50), new Date().toISOString());

      // 1. Delete associated data
      await req.query(`DELETE FROM dbo.SurveyResponses WHERE LOWER(submittedBy) = @username`);
      await req.query(`DELETE FROM dbo.AuditLogs WHERE LOWER([user]) = @username`);
      await req.query(`DELETE FROM dbo.CheatReports WHERE LOWER(reportedBy) = @username OR LOWER(reportedUser) = @username`);
      await req.query(`DELETE FROM dbo.QuotaRequests WHERE LOWER(username) = @username`);
      await req.query(`DELETE FROM dbo.Promotions WHERE LOWER(username) = @username`);

      // 2. Update status in DeletedUsers
      await req.query(`
        UPDATE dbo.DeletedUsers 
        SET status = 'PURGED', purgedAt = @purgedAt, purgedBy = @purgedBy 
        WHERE LOWER(username) = @username
      `);
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function unbanUser(username: string): Promise<void> {
  const cleanUsername = username.trim().toLowerCase();
  const p = await getPool();
  if (p) {
    const req = p.request();
    req.input("username", sql.NVarChar(100), cleanUsername);
    await req.query(`
      UPDATE dbo.Users
      SET banned = 0, bannedUntil = NULL, banType = NULL, bannedBy = NULL, bannedReason = NULL, updatedAt = SYSUTCDATETIME()
      WHERE LOWER(username) = LOWER(@username)
    `);
  }
  if (fallbackUsers[cleanUsername]) {
    fallbackUsers[cleanUsername].banned = false;
    delete fallbackUsers[cleanUsername].bannedUntil;
    delete fallbackUsers[cleanUsername].bannedBy;
    delete fallbackUsers[cleanUsername].banType;
    delete fallbackUsers[cleanUsername].bannedReason;
  }
}

export async function saveUser(user: any): Promise<void> {
  const p = await getPool();
  if (!p) {
    throw new Error("SQL Server 未連線或無法連線，無法寫入帳號！");
  }

  // Ensure password is encrypted with bcrypt if not already a hash
  let finalPassword = user.password;
  let finalEncrypted = user.encryptedPassword;
  
  if (finalPassword && !/^\$2[aby]\$/.test(finalPassword)) {
    // If it's plain text, generate both
    finalEncrypted = encryptPassword(finalPassword);
    finalPassword = bcrypt.hashSync(finalPassword, 10);
  }

  const cleanUser = {
    ...user,
    password: finalPassword,
    encryptedPassword: finalEncrypted
  };

  // Must truly write into SQL Server before reporting success
  await saveUserToPool(p, cleanUser);

  const lowerKey = user.username.toLowerCase();
  fallbackUsers[lowerKey] = {
    ...(fallbackUsers[lowerKey] || {}),
    ...cleanUser
  };
}

async function saveUserToPool(p: sql.ConnectionPool, user: any): Promise<void> {
  const req = p.request();
  req.input("username", sql.NVarChar(100), user.username);
  req.input("passwordHash", sql.NVarChar(255), user.password || null);
  req.input("encryptedPassword", sql.NVarChar(1024), user.encryptedPassword || null);
  req.input("role", sql.NVarChar(50), user.role || "RESPONDENT");
  req.input("starLevel", sql.Int, user.starLevel ?? null);
  req.input("respondentSubRank", sql.Int, user.respondentSubRank ?? 1);
  req.input("respondentPoints", sql.Int, user.respondentPoints ?? 0);
  req.input("assignedTables", sql.NVarChar(sql.MAX), JSON.stringify(user.assignedTables || []));
  req.input("passwordChangeApplied", sql.Bit, user.passwordChangeApplied ? 1 : 0);
  req.input("distributedToAdmins", sql.Bit, user.distributedToAdmins ? 1 : 0);
  req.input("banned", sql.Bit, user.banned ? 1 : 0);
  req.input("bannedFeatures", sql.NVarChar(sql.MAX), JSON.stringify(user.bannedFeatures || []));
  req.input("promotedFriendsThisMonthCount_T3", sql.Int, user.promotedFriendsThisMonthCount_T3 || 0);
  req.input("promotedFriendsThisWeekCount_T5", sql.Int, user.promotedFriendsThisWeekCount_T5 || 0);
  req.input("bannedOtherAppliedThisMonthCount", sql.Int, user.bannedOtherAppliedThisMonthCount || 0);
  req.input("canManageTrivia", sql.Bit, user.canManageTrivia ? 1 : 0);
  req.input("canManageLogs", sql.Bit, user.canManageLogs ? 1 : 0);
  req.input("extraT3Quota", sql.Int, user.extraT3Quota || 0);
  req.input("extraT5Quota", sql.Int, user.extraT5Quota || 0);
  req.input("extraBanQuota", sql.Int, user.extraBanQuota || 0);
  req.input("bannedReason", sql.NVarChar(500), user.bannedReason || null);
  req.input("bannedBy", sql.NVarChar(100), user.bannedBy || null);
  req.input("banType", sql.NVarChar(100), user.banType || null);
  req.input("bannedUntil", sql.BigInt, user.bannedUntil ? user.bannedUntil : null);

  await req.query(`
    MERGE dbo.Users AS target
    USING (SELECT @username AS username) AS source
    ON target.username = source.username
    WHEN MATCHED THEN
      UPDATE SET
        passwordHash = ISNULL(@passwordHash, target.passwordHash),
        encryptedPassword = ISNULL(@encryptedPassword, target.encryptedPassword),
        role = @role,
        starLevel = @starLevel,
        respondentSubRank = @respondentSubRank,
        respondentPoints = @respondentPoints,
        assignedTables = @assignedTables,
        passwordChangeApplied = @passwordChangeApplied,
        distributedToAdmins = @distributedToAdmins,
        banned = @banned,
        bannedFeatures = @bannedFeatures,
        promotedFriendsThisMonthCount_T3 = @promotedFriendsThisMonthCount_T3,
        promotedFriendsThisWeekCount_T5 = @promotedFriendsThisWeekCount_T5,
        bannedOtherAppliedThisMonthCount = @bannedOtherAppliedThisMonthCount,
        canManageTrivia = @canManageTrivia,
        canManageLogs = @canManageLogs,
        extraT3Quota = @extraT3Quota,
        extraT5Quota = @extraT5Quota,
        extraBanQuota = @extraBanQuota,
        bannedReason = @bannedReason,
        bannedBy = @bannedBy,
        banType = @banType,
        bannedUntil = @bannedUntil,
        updatedAt = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
      INSERT (
        username, passwordHash, encryptedPassword, role, starLevel, respondentSubRank, respondentPoints,
        assignedTables, passwordChangeApplied, distributedToAdmins, banned, bannedFeatures,
        promotedFriendsThisMonthCount_T3, promotedFriendsThisWeekCount_T5, bannedOtherAppliedThisMonthCount,
        canManageTrivia, canManageLogs, extraT3Quota, extraT5Quota, extraBanQuota,
        bannedReason, bannedBy, banType, bannedUntil
      )
      VALUES (
        @username, @passwordHash, @encryptedPassword, @role, @starLevel, @respondentSubRank, @respondentPoints,
        @assignedTables, @passwordChangeApplied, @distributedToAdmins, @banned, @bannedFeatures,
        @promotedFriendsThisMonthCount_T3, @promotedFriendsThisWeekCount_T5, @bannedOtherAppliedThisMonthCount,
        @canManageTrivia, @canManageLogs, @extraT3Quota, @extraT5Quota, @extraBanQuota,
        @bannedReason, @bannedBy, @banType, @bannedUntil
      );
  `);
}

export async function saveAllUsers(usersMap: Record<string, any>): Promise<void> {
  for (const key of Object.keys(usersMap)) {
    await saveUser(usersMap[key]);
  }
}

export async function updateUserPoints(username: string, points: number): Promise<void> {
  const p = await getPool();
  if (!p) return;
  try {
    const req = p.request();
    req.input("username", sql.NVarChar(100), username);
    req.input("points", sql.Int, points);
    await req.query("UPDATE dbo.Users SET respondentPoints = @points WHERE LOWER(username) = LOWER(@username)");
  } catch (err) {
    console.warn("Failed to update user points in MSSQL:", err);
  }
}

// -------------------------------------------------------------
// Data Operations: Questionnaires
// -------------------------------------------------------------
export async function getQuestionnaires(): Promise<any[]> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const result = await p.request().query("SELECT * FROM dbo.Questionnaires ORDER BY createdAt DESC");
  return result.recordset.map((row) => {
    const rawQuerySystems = row.querySystems ? JSON.parse(row.querySystems) : [];
    // SECURITY: NEVER return sub-query passwords to client!
    const safeQuerySystems = rawQuerySystems.map((qs: any) => {
      const { password: _p, ...safeQs } = qs;
      return {
        ...safeQs,
        passwordRequired: Boolean(qs.passwordRequired)
      };
    });

    return {
      id: row.id,
      title: row.title,
      description: row.description || "",
      questions: row.questions ? JSON.parse(row.questions) : [],
      isActive: Boolean(row.isActive),
      startTime: row.startTime || undefined,
      endTime: row.endTime || undefined,
      passwordRequired: Boolean(row.passwordRequired),
      // SECURITY: NEVER return questionnaire password or hash to client!
      querySystems: safeQuerySystems,
      emailNotificationEnabled: Boolean(row.emailNotificationEnabled),
      distributedToAdmins: Boolean(row.distributedToAdmins),
      createdBy: row.createdBy || undefined,
      disputes: row.disputes ? JSON.parse(row.disputes) : [],
      stopApplied: row.stopApplied ? JSON.parse(row.stopApplied) : [],
      suggestions: row.suggestions ? JSON.parse(row.suggestions) : [],
    };
  });
}

export async function getQuestionnaireRaw(id: string): Promise<any | null> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const req = p.request();
  req.input("id", sql.NVarChar(100), id);
  const result = await req.query("SELECT TOP 1 * FROM dbo.Questionnaires WHERE id = @id");
  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];
  return {
    ...row,
    questions: row.questions ? JSON.parse(row.questions) : [],
    querySystems: row.querySystems ? JSON.parse(row.querySystems) : [],
    disputes: row.disputes ? JSON.parse(row.disputes) : [],
    stopApplied: row.stopApplied ? JSON.parse(row.stopApplied) : [],
    suggestions: row.suggestions ? JSON.parse(row.suggestions) : [],
  };
}

export async function verifyQuestionnairePassword(id: string, plainPassword: string): Promise<boolean> {
  const q = await getQuestionnaireRaw(id);
  if (!q) return false;
  if (!q.passwordRequired) return true;
  if (!q.password) return true;

  const isBcrypt = /^\$2[aby]\$/.test(q.password);
  if (isBcrypt) {
    return await bcrypt.compare(plainPassword, q.password);
  }

  // Legacy transition comparison & auto-upgrade
  if (plainPassword === q.password) {
    try {
      const newHash = await bcrypt.hash(plainPassword, 10);
      const p = await getPool();
      if (p) {
        const req = p.request();
        req.input("id", sql.NVarChar(100), id);
        req.input("password", sql.NVarChar(255), newHash);
        await req.query("UPDATE dbo.Questionnaires SET password = @password WHERE id = @id");
      }
    } catch {
      // ignore
    }
    return true;
  }
  return false;
}

export async function verifySubqueryPassword(surveyId: string, qsId: string, plainPassword: string): Promise<boolean> {
  const q = await getQuestionnaireRaw(surveyId);
  if (!q) return false;
  const qsList = q.querySystems || [];
  const qs = qsList.find((s: any) => s.id === qsId);
  if (!qs) return false;
  if (!qs.passwordRequired) return true;
  if (!qs.password) return true;

  const isBcrypt = /^\$2[aby]\$/.test(qs.password);
  if (isBcrypt) {
    return await bcrypt.compare(plainPassword, qs.password);
  }

  if (plainPassword === qs.password) {
    try {
      const newHash = await bcrypt.hash(plainPassword, 10);
      qs.password = newHash;
      const p = await getPool();
      if (p) {
        const req = p.request();
        req.input("id", sql.NVarChar(100), surveyId);
        req.input("querySystems", sql.NVarChar(sql.MAX), JSON.stringify(qsList));
        await req.query("UPDATE dbo.Questionnaires SET querySystems = @querySystems WHERE id = @id");
      }
    } catch {
      // ignore
    }
    return true;
  }
  return false;
}

export async function saveQuestionnaire(q: any): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  // If questionnaire already exists, preserve password if not provided
  let existingRaw: any = null;
  try {
    existingRaw = await getQuestionnaireRaw(q.id);
  } catch {
    // ignore
  }

  let finalPassword = q.password;
  if (finalPassword && !/^\$2[aby]\$/.test(finalPassword)) {
    finalPassword = bcrypt.hashSync(finalPassword, 10);
  } else if (!finalPassword && existingRaw && existingRaw.password) {
    // Preserve existing password if user didn't change it
    finalPassword = existingRaw.password;
  }

  // Handle query systems passwords
  const existingQsMap = new Map((existingRaw?.querySystems || []).map((s: any) => [s.id, s.password]));
  const processedQuerySystems = (q.querySystems || []).map((qs: any) => {
    let subPass = qs.password;
    if (subPass && !/^\$2[aby]\$/.test(subPass)) {
      subPass = bcrypt.hashSync(subPass, 10);
    } else if (!subPass && existingQsMap.has(qs.id)) {
      subPass = existingQsMap.get(qs.id);
    }
    return {
      ...qs,
      password: subPass || null
    };
  });

  const req = p.request();
  req.input("id", sql.NVarChar(100), q.id);
  req.input("title", sql.NVarChar(255), q.title || "");
  req.input("description", sql.NVarChar(sql.MAX), q.description || "");
  req.input("questions", sql.NVarChar(sql.MAX), JSON.stringify(q.questions || []));
  req.input("isActive", sql.Bit, q.isActive !== false ? 1 : 0);
  req.input("startTime", sql.NVarChar(50), q.startTime || null);
  req.input("endTime", sql.NVarChar(50), q.endTime || null);
  req.input("passwordRequired", sql.Bit, q.passwordRequired ? 1 : 0);
  req.input("password", sql.NVarChar(255), finalPassword || null);
  req.input("querySystems", sql.NVarChar(sql.MAX), JSON.stringify(processedQuerySystems));
  req.input("emailNotificationEnabled", sql.Bit, q.emailNotificationEnabled ? 1 : 0);
  req.input("distributedToAdmins", sql.Bit, q.distributedToAdmins ? 1 : 0);
  req.input("createdBy", sql.NVarChar(100), q.createdBy || null);
  req.input("disputes", sql.NVarChar(sql.MAX), JSON.stringify(q.disputes || []));
  req.input("stopApplied", sql.NVarChar(sql.MAX), JSON.stringify(q.stopApplied || []));
  req.input("suggestions", sql.NVarChar(sql.MAX), JSON.stringify(q.suggestions || []));

  await req.query(`
    MERGE dbo.Questionnaires AS target
    USING (SELECT @id AS id) AS source
    ON target.id = source.id
    WHEN MATCHED THEN
      UPDATE SET
        title = @title,
        description = @description,
        questions = @questions,
        isActive = @isActive,
        startTime = @startTime,
        endTime = @endTime,
        passwordRequired = @passwordRequired,
        password = @password,
        querySystems = @querySystems,
        emailNotificationEnabled = @emailNotificationEnabled,
        distributedToAdmins = @distributedToAdmins,
        createdBy = @createdBy,
        disputes = @disputes,
        stopApplied = @stopApplied,
        suggestions = @suggestions,
        updatedAt = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
      INSERT (
        id, title, description, questions, isActive, startTime, endTime,
        passwordRequired, password, querySystems, emailNotificationEnabled,
        distributedToAdmins, createdBy, disputes, stopApplied, suggestions
      )
      VALUES (
        @id, @title, @description, @questions, @isActive, @startTime, @endTime,
        @passwordRequired, @password, @querySystems, @emailNotificationEnabled,
        @distributedToAdmins, @createdBy, @disputes, @stopApplied, @suggestions
      );
  `);
}

export async function deleteQuestionnaire(id: string): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const req = p.request();
  req.input("id", sql.NVarChar(100), id);
  await req.query("DELETE FROM dbo.Questionnaires WHERE id = @id");
}

export async function saveAllQuestionnaires(qs: any[]): Promise<void> {
  for (const q of qs) {
    await saveQuestionnaire(q);
  }
}

// -------------------------------------------------------------
// Data Operations: SurveyResponses
// -------------------------------------------------------------
export async function getResponses(): Promise<any[]> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const result = await p.request().query("SELECT * FROM dbo.SurveyResponses ORDER BY createdAt DESC");
  return result.recordset.map((row) => ({
    id: row.id,
    surveyId: row.surveyId,
    answers: row.answers ? JSON.parse(row.answers) : {},
    submittedAt: row.submittedAt,
    submittedBy: row.submittedBy || undefined,
  }));
}

export async function saveResponse(r: any): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const req = p.request();
  req.input("id", sql.NVarChar(100), r.id);
  req.input("surveyId", sql.NVarChar(100), r.surveyId);
  req.input("answers", sql.NVarChar(sql.MAX), JSON.stringify(r.answers || {}));
  req.input("submittedAt", sql.NVarChar(50), r.submittedAt || new Date().toISOString());
  req.input("submittedBy", sql.NVarChar(100), r.submittedBy || null);

  await req.query(`
    MERGE dbo.SurveyResponses AS target
    USING (SELECT @id AS id) AS source
    ON target.id = source.id
    WHEN MATCHED THEN
      UPDATE SET
        surveyId = @surveyId,
        answers = @answers,
        submittedAt = @submittedAt,
        submittedBy = @submittedBy
    WHEN NOT MATCHED THEN
      INSERT (id, surveyId, answers, submittedAt, submittedBy)
      VALUES (@id, @surveyId, @answers, @submittedAt, @submittedBy);
  `);
}

export async function saveAllResponses(rs: any[]): Promise<void> {
  for (const r of rs) {
    await saveResponse(r);
  }
}

export async function submitSurveyResponseTransaction(
  responseRecord: any,
  logRecord: any,
  effectiveSubmitter: string,
  answeredCount: number,
  isRespondent: boolean
): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const transaction = new sql.Transaction(p);
  try {
    await transaction.begin();

    // 1. Insert SurveyResponses
    const reqRes = new sql.Request(transaction);
    reqRes.input("id", sql.NVarChar(100), responseRecord.id);
    reqRes.input("surveyId", sql.NVarChar(100), responseRecord.surveyId);
    reqRes.input("answers", sql.NVarChar(sql.MAX), JSON.stringify(responseRecord.answers || {}));
    reqRes.input("submittedAt", sql.NVarChar(50), responseRecord.submittedAt || new Date().toISOString());
    reqRes.input("submittedBy", sql.NVarChar(100), responseRecord.submittedBy || null);

    await reqRes.query(`
      INSERT INTO dbo.SurveyResponses (id, surveyId, answers, submittedAt, submittedBy)
      VALUES (@id, @surveyId, @answers, @submittedAt, @submittedBy)
    `);

    // 2. Insert AuditLog
    const reqLog = new sql.Request(transaction);
    reqLog.input("id", sql.NVarChar(100), logRecord.id);
    reqLog.input("timestamp", sql.NVarChar(50), logRecord.timestamp || new Date().toISOString());
    reqLog.input("user", sql.NVarChar(100), logRecord.user || "unknown");
    reqLog.input("role", sql.NVarChar(50), logRecord.role || "UNKNOWN");
    reqLog.input("action", sql.NVarChar(100), logRecord.action || "");
    reqLog.input("target", sql.NVarChar(255), logRecord.target || "");
    reqLog.input("details", sql.NVarChar(sql.MAX), logRecord.details || "");

    await reqLog.query(`
      INSERT INTO dbo.AuditLogs (id, timestamp, [user], role, action, target, details)
      VALUES (@id, @timestamp, @user, @role, @action, @target, @details)
    `);

    // 3. Points calculation and User update
    if (isRespondent && effectiveSubmitter && effectiveSubmitter !== "匿名讀者") {
      const reqUser = new sql.Request(transaction);
      reqUser.input("username", sql.NVarChar(100), effectiveSubmitter);
      const userRes = await reqUser.query(`SELECT role, respondentPoints FROM dbo.Users WHERE LOWER(username) = LOWER(@username)`);
      if (userRes.recordset.length > 0 && userRes.recordset[0].role === "RESPONDENT") {
        let currentPoints = userRes.recordset[0].respondentPoints || 0;
        
        let multiplier = 7;
        if (answeredCount >= 20) multiplier = 3;
        else if (answeredCount >= 10) multiplier = 5;
        
        const earned = answeredCount * multiplier;
        currentPoints += earned;

        const Q = Math.floor(currentPoints / 20);
        let starLevel = 1;
        if (Q < 9) starLevel = 1;         // 黑鐵
        else if (Q < 18) starLevel = 2;   // 青銅
        else if (Q < 34) starLevel = 3;   // 白銀
        else if (Q < 50) starLevel = 4;   // 黃金
        else if (Q < 75) starLevel = 5;   // 白金
        else if (Q < 100) starLevel = 6;  // 鑽石
        else starLevel = 7;               // 傳奇

        const reqUpdateUser = new sql.Request(transaction);
        reqUpdateUser.input("username", sql.NVarChar(100), effectiveSubmitter);
        reqUpdateUser.input("points", sql.Int, currentPoints);
        reqUpdateUser.input("starLevel", sql.Int, starLevel);
        
        await reqUpdateUser.query(`
          UPDATE dbo.Users 
          SET respondentPoints = @points, starLevel = @starLevel 
          WHERE LOWER(username) = LOWER(@username)
        `);
      }
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// -------------------------------------------------------------
// Data Operations: AuditLogs
// -------------------------------------------------------------
export async function getAuditLogs(): Promise<any[]> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const result = await p.request().query("SELECT * FROM dbo.AuditLogs ORDER BY timestamp DESC");
  return result.recordset.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    user: row.user,
    role: row.role,
    action: row.action,
    target: row.target,
    details: row.details || "",
  }));
}

export async function saveAuditLog(log: any): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const req = p.request();
  req.input("id", sql.NVarChar(100), log.id);
  req.input("timestamp", sql.NVarChar(50), log.timestamp || new Date().toISOString());
  req.input("user", sql.NVarChar(100), log.user || "unknown");
  req.input("role", sql.NVarChar(50), log.role || "UNKNOWN");
  req.input("action", sql.NVarChar(100), log.action || "");
  req.input("target", sql.NVarChar(255), log.target || "");
  req.input("details", sql.NVarChar(sql.MAX), log.details || "");

  await req.query(`
    MERGE dbo.AuditLogs AS target
    USING (SELECT @id AS id) AS source
    ON target.id = source.id
    WHEN MATCHED THEN
      UPDATE SET
        timestamp = @timestamp,
        [user] = @user,
        role = @role,
        action = @action,
        target = @target,
        details = @details
    WHEN NOT MATCHED THEN
      INSERT (id, timestamp, [user], role, action, target, details)
      VALUES (@id, @timestamp, @user, @role, @action, @target, @details);
  `);
}

export async function deleteAuditLog(id: string): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const req = p.request();
  req.input("id", sql.NVarChar(100), id);
  await req.query("DELETE FROM dbo.AuditLogs WHERE id = @id");
}

export async function clearAllAuditLogs(): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  await p.request().query("DELETE FROM dbo.AuditLogs");
}

export async function saveAllAuditLogs(logs: any[]): Promise<void> {
  for (const log of logs) {
    await saveAuditLog(log);
  }
}

// -------------------------------------------------------------
// Data Operations: Promotions
// -------------------------------------------------------------
export async function getPromotions(): Promise<any[]> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const result = await p.request().query("SELECT * FROM dbo.Promotions ORDER BY createdAt DESC");
  return result.recordset.map((row) => ({
    id: row.id,
    username: row.username,
    currentRole: row.currentRole,
    currentStar: row.currentStar,
    targetRole: row.targetRole,
    targetStar: row.targetStar,
    status: row.status,
    createdAt: row.createdAt,
  }));
}

export async function savePromotion(promo: any): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const req = p.request();
  req.input("id", sql.NVarChar(100), promo.id);
  req.input("username", sql.NVarChar(100), promo.username);
  req.input("currentRole", sql.NVarChar(50), promo.currentRole);
  req.input("currentStar", sql.Int, promo.currentStar ?? null);
  req.input("targetRole", sql.NVarChar(50), promo.targetRole);
  req.input("targetStar", sql.Int, promo.targetStar ?? null);
  req.input("status", sql.NVarChar(50), promo.status || "PENDING");
  req.input("createdAt", sql.NVarChar(50), promo.createdAt || new Date().toISOString());

  await req.query(`
    MERGE dbo.Promotions AS target
    USING (SELECT @id AS id) AS source
    ON target.id = source.id
    WHEN MATCHED THEN
      UPDATE SET
        username = @username,
        currentRole = @currentRole,
        currentStar = @currentStar,
        targetRole = @targetRole,
        targetStar = @targetStar,
        status = @status,
        createdAt = @createdAt
    WHEN NOT MATCHED THEN
      INSERT (id, username, currentRole, currentStar, targetRole, targetStar, status, createdAt)
      VALUES (@id, @username, @currentRole, @currentStar, @targetRole, @targetStar, @status, @createdAt);
  `);
}

export async function saveAllPromotions(promos: any[]): Promise<void> {
  for (const promo of promos) {
    await savePromotion(promo);
  }
}

// -------------------------------------------------------------
// Data Operations: CheatReports
// -------------------------------------------------------------
export async function getCheatReports(): Promise<any[]> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const result = await p.request().query("SELECT * FROM dbo.CheatReports ORDER BY createdAt DESC");
  return result.recordset.map((row) => (row.payload ? JSON.parse(row.payload) : { id: row.id, ...row }));
}

export async function saveCheatReport(report: any): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const req = p.request();
  req.input("id", sql.NVarChar(100), report.id);
  req.input("reportedUser", sql.NVarChar(100), report.reportedUser || null);
  req.input("reporter", sql.NVarChar(100), report.reporter || null);
  req.input("reason", sql.NVarChar(sql.MAX), report.reason || null);
  req.input("status", sql.NVarChar(50), report.status || "PENDING");
  req.input("payload", sql.NVarChar(sql.MAX), JSON.stringify(report));
  req.input("createdAt", sql.NVarChar(50), report.createdAt || new Date().toISOString());

  await req.query(`
    MERGE dbo.CheatReports AS target
    USING (SELECT @id AS id) AS source
    ON target.id = source.id
    WHEN MATCHED THEN
      UPDATE SET
        reportedUser = @reportedUser,
        reporter = @reporter,
        reason = @reason,
        status = @status,
        payload = @payload
    WHEN NOT MATCHED THEN
      INSERT (id, reportedUser, reporter, reason, status, payload, createdAt)
      VALUES (@id, @reportedUser, @reporter, @reason, @status, @payload, @createdAt);
  `);
}

export async function saveAllCheatReports(reports: any[]): Promise<void> {
  for (const report of reports) {
    await saveCheatReport(report);
  }
}

// -------------------------------------------------------------
// Data Operations: QuotaRequests
// -------------------------------------------------------------
export async function getQuotaRequests(): Promise<any[]> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const result = await p.request().query("SELECT * FROM dbo.QuotaRequests ORDER BY createdAt DESC");
  return result.recordset.map((row) => (row.payload ? JSON.parse(row.payload) : { id: row.id, ...row }));
}

export async function saveQuotaRequest(reqData: any): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const req = p.request();
  req.input("id", sql.NVarChar(100), reqData.id);
  req.input("username", sql.NVarChar(100), reqData.username || null);
  req.input("quotaType", sql.NVarChar(100), reqData.quotaType || null);
  req.input("amount", sql.Int, reqData.amount || 0);
  req.input("status", sql.NVarChar(50), reqData.status || "PENDING");
  req.input("payload", sql.NVarChar(sql.MAX), JSON.stringify(reqData));
  req.input("createdAt", sql.NVarChar(50), reqData.createdAt || new Date().toISOString());

  await req.query(`
    MERGE dbo.QuotaRequests AS target
    USING (SELECT @id AS id) AS source
    ON target.id = source.id
    WHEN MATCHED THEN
      UPDATE SET
        username = @username,
        quotaType = @quotaType,
        amount = @amount,
        status = @status,
        payload = @payload
    WHEN NOT MATCHED THEN
      INSERT (id, username, quotaType, amount, status, payload, createdAt)
      VALUES (@id, @username, @quotaType, @amount, @status, @payload, @createdAt);
  `);
}

export async function saveAllQuotaRequests(reqs: any[]): Promise<void> {
  for (const r of reqs) {
    await saveQuotaRequest(r);
  }
}

// -------------------------------------------------------------
// Data Operations: TriviaQuestions
// -------------------------------------------------------------
export async function getTriviaQuestions(): Promise<any[]> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const result = await p.request().query("SELECT * FROM dbo.TriviaQuestions ORDER BY createdAt DESC");
  return result.recordset.map((row) => (row.payload ? JSON.parse(row.payload) : { id: row.id, ...row }));
}

export async function saveAllTriviaQuestions(questions: any[]): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  for (const q of questions) {
    const req = p.request();
    req.input("id", sql.NVarChar(100), q.id);
    req.input("title", sql.NVarChar(sql.MAX), q.title || "");
    req.input("payload", sql.NVarChar(sql.MAX), JSON.stringify(q));
    req.input("createdAt", sql.NVarChar(50), q.createdAt || new Date().toISOString());

    await req.query(`
      MERGE dbo.TriviaQuestions AS target
      USING (SELECT @id AS id) AS source
      ON target.id = source.id
      WHEN MATCHED THEN
        UPDATE SET title = @title, payload = @payload
      WHEN NOT MATCHED THEN
        INSERT (id, title, payload, createdAt)
        VALUES (@id, @title, @payload, @createdAt);
    `);
  }
}

// -------------------------------------------------------------
// Data Operations: SiteUpdateLogs
// -------------------------------------------------------------
export async function getSiteUpdateLogs(): Promise<any[]> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const result = await p.request().query("SELECT * FROM dbo.SiteUpdateLogs ORDER BY timestamp DESC");
  return result.recordset.map((row) => ({
    id: row.id,
    version: row.version,
    timestamp: row.timestamp,
    title: row.title,
    category: row.category,
    categoryLabel: row.categoryLabel,
    author: row.author,
    summary: row.summary || "",
    details: row.details ? JSON.parse(row.details) : [],
    webmasterOnly: Boolean(row.webmasterOnly),
  }));
}

export async function saveSiteUpdateLog(item: any): Promise<void> {
  const p = await getPool();
  if (!p) throw new Error("MSSQL not connected");

  const req = p.request();
  req.input("id", sql.NVarChar(100), item.id);
  req.input("version", sql.NVarChar(50), item.version || "v1.0.0");
  req.input("timestamp", sql.NVarChar(50), item.timestamp || new Date().toISOString());
  req.input("title", sql.NVarChar(255), item.title || "");
  req.input("category", sql.NVarChar(50), item.category || "FEATURE");
  req.input("categoryLabel", sql.NVarChar(100), item.categoryLabel || "功能更新");
  req.input("author", sql.NVarChar(100), item.author || "System");
  req.input("summary", sql.NVarChar(sql.MAX), item.summary || "");
  req.input("details", sql.NVarChar(sql.MAX), JSON.stringify(item.details || []));
  req.input("webmasterOnly", sql.Bit, item.webmasterOnly ? 1 : 0);

  await req.query(`
    MERGE dbo.SiteUpdateLogs AS target
    USING (SELECT @id AS id) AS source
    ON target.id = source.id
    WHEN MATCHED THEN
      UPDATE SET
        version = @version,
        timestamp = @timestamp,
        title = @title,
        category = @category,
        categoryLabel = @categoryLabel,
        author = @author,
        summary = @summary,
        details = @details,
        webmasterOnly = @webmasterOnly
    WHEN NOT MATCHED THEN
      INSERT (id, version, timestamp, title, category, categoryLabel, author, summary, details, webmasterOnly)
      VALUES (@id, @version, @timestamp, @title, @category, @categoryLabel, @author, @summary, @details, @webmasterOnly);
  `);
}

export async function saveAllSiteUpdateLogs(logs: any[]): Promise<void> {
  for (const item of logs) {
    await saveSiteUpdateLog(item);
  }
}


export async function getUsersWithPasswords(): Promise<any[]> {
  const p = await getPool();
  if (p) {
    const res = await p.request().query("SELECT * FROM dbo.Users ORDER BY username ASC");
    return res.recordset.map(row => {
      const { passwordHash: _p, ...safe } = row;
      let rawPass = "";
      if (row.encryptedPassword) {
        rawPass = decryptPassword(row.encryptedPassword);
      }
      return {
        ...safe,
        passwordChangeApplied: Boolean(row.passwordChangeApplied),
        distributedToAdmins: Boolean(row.distributedToAdmins),
        banned: Boolean(row.banned),
        canManageTrivia: Boolean(row.canManageTrivia),
        canManageLogs: Boolean(row.canManageLogs),
        assignedTables: row.assignedTables ? JSON.parse(row.assignedTables) : [],
        bannedFeatures: row.bannedFeatures ? JSON.parse(row.bannedFeatures) : [],
        rawPassword: rawPass
      };
    });
  }
  return [];
}


export async function getUserPassword(username: string): Promise<string | null> {
  const cleanUsername = username.trim().toLowerCase();
  const p = await getPool();
  if (p) {
    const res = await p.request()
      .input("username", cleanUsername)
      .query("SELECT encryptedPassword FROM dbo.Users WHERE LOWER(username) = LOWER(@username)");
    if (res.recordset.length > 0) {
      const encrypted = res.recordset[0].encryptedPassword;
      if (encrypted) {
        return decryptPassword(encrypted);
      }
    }
  }
  if (fallbackUsers[cleanUsername]) {
    const encrypted = fallbackUsers[cleanUsername].encryptedPassword;
    if (encrypted) return decryptPassword(encrypted);
  }
  return null;
}
