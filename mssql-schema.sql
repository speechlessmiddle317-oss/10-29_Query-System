-- ==========================================================
-- Query System (問卷查詢與系統管理平台)
-- Microsoft SQL Server (T-SQL) Database Schema & DDL Script
-- Compatible with SQL Server 2016+, Azure SQL Database, AWS RDS SQL Server
-- ==========================================================

-- 1. Create Database if needed
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'QuerySystemDb')
BEGIN
    CREATE DATABASE [QuerySystemDb];
END
GO

USE [QuerySystemDb];
GO

-- 2. Users Table (使用者與角色分級)
IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Users] (
        [username] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [passwordHash] NVARCHAR(255) NULL,
        [encryptedPassword] NVARCHAR(255) NULL,
        [role] NVARCHAR(50) NOT NULL DEFAULT 'RESPONDENT',
        [starLevel] INT NULL DEFAULT 1,
        [respondentSubRank] INT NULL DEFAULT 1,
        [respondentPoints] INT NULL DEFAULT 0,
        [assignedTables] NVARCHAR(MAX) NULL, -- JSON Array of Questionnaire IDs
        [passwordChangeApplied] BIT NULL DEFAULT 0,
        [distributedToAdmins] BIT NULL DEFAULT 0,
        [banned] BIT NOT NULL DEFAULT 0,
        [bannedFeatures] NVARCHAR(MAX) NULL, -- JSON Array of banned feature keys
        [promotedFriendsThisMonthCount_T3] INT NULL DEFAULT 0,
        [promotedFriendsThisWeekCount_T5] INT NULL DEFAULT 0,
        [bannedOtherAppliedThisMonthCount] INT NULL DEFAULT 0,
        [canManageTrivia] BIT NULL DEFAULT 0,
        [canManageLogs] BIT NULL DEFAULT 0,
        [extraT3Quota] INT NULL DEFAULT 0,
        [extraT5Quota] INT NULL DEFAULT 0,
        [extraBanQuota] INT NULL DEFAULT 0,
        [bannedReason] NVARCHAR(500) NULL,
        [bannedBy] NVARCHAR(100) NULL,
        [banType] NVARCHAR(100) NULL,
        [bannedUntil] BIGINT NULL,
        [createdAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX [IX_Users_Role] ON [dbo].[Users] ([role]);
    CREATE NONCLUSTERED INDEX [IX_Users_Banned] ON [dbo].[Users] ([banned]);
END
GO

-- 3. Questionnaires Table (問卷結構與設定)
IF OBJECT_ID(N'[dbo].[Questionnaires]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Questionnaires] (
        [id] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [title] NVARCHAR(255) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [questions] NVARCHAR(MAX) NOT NULL, -- JSON Array of Question objects
        [isActive] BIT NOT NULL DEFAULT 1,
        [startTime] NVARCHAR(50) NULL,
        [endTime] NVARCHAR(50) NULL,
        [passwordRequired] BIT NOT NULL DEFAULT 0,
        [password] NVARCHAR(255) NULL,
        [querySystems] NVARCHAR(MAX) NULL, -- JSON Array of QuerySystemConfig
        [emailNotificationEnabled] BIT NOT NULL DEFAULT 0,
        [distributedToAdmins] BIT NULL DEFAULT 0,
        [createdBy] NVARCHAR(100) NULL,
        [disputes] NVARCHAR(MAX) NULL, -- JSON Array
        [stopApplied] NVARCHAR(MAX) NULL, -- JSON Array
        [suggestions] NVARCHAR(MAX) NULL, -- JSON Array
        [createdAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX [IX_Questionnaires_IsActive] ON [dbo].[Questionnaires] ([isActive]);
    CREATE NONCLUSTERED INDEX [IX_Questionnaires_CreatedBy] ON [dbo].[Questionnaires] ([createdBy]);
END
GO

-- 4. Survey Responses Table (問卷填寫回覆紀錄)
IF OBJECT_ID(N'[dbo].[SurveyResponses]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SurveyResponses] (
        [id] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [surveyId] NVARCHAR(100) NOT NULL,
        [answers] NVARCHAR(MAX) NOT NULL, -- JSON object: questionId -> answer
        [submittedAt] NVARCHAR(50) NOT NULL,
        [submittedBy] NVARCHAR(100) NULL,
        [createdAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX [IX_Responses_SurveyId] ON [dbo].[SurveyResponses] ([surveyId]);
    CREATE NONCLUSTERED INDEX [IX_Responses_SubmittedBy] ON [dbo].[SurveyResponses] ([submittedBy]);
END
GO

-- 5. Audit Logs Table (操作稽核日誌 - 具備 SHA-256 Hash Chain 密碼學防篡改鏈)
IF OBJECT_ID(N'[dbo].[AuditLogs]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AuditLogs] (
        [id] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [timestamp] NVARCHAR(50) NOT NULL,
        [user] NVARCHAR(100) NOT NULL,
        [role] NVARCHAR(50) NOT NULL,
        [action] NVARCHAR(100) NOT NULL,
        [target] NVARCHAR(255) NOT NULL,
        [details] NVARCHAR(MAX) NULL,
        [prevHash] NVARCHAR(64) NULL, -- 前一節點 SHA-256 雜湊 (Genesis 創始節點為 64 個 0)
        [hash] NVARCHAR(64) NULL,     -- 本節點 SHA-256 雜湊 (防篡改密碼學憑證)
        [createdAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX [IX_AuditLogs_User] ON [dbo].[AuditLogs] ([user]);
    CREATE NONCLUSTERED INDEX [IX_AuditLogs_Timestamp] ON [dbo].[AuditLogs] ([timestamp] DESC);
    CREATE NONCLUSTERED INDEX [IX_AuditLogs_Hash] ON [dbo].[AuditLogs] ([hash]);
END
GO

-- 6. Promotions Table (角色與階級晉升審核)
IF OBJECT_ID(N'[dbo].[Promotions]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Promotions] (
        [id] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [username] NVARCHAR(100) NOT NULL,
        [currentRole] NVARCHAR(50) NOT NULL,
        [currentStar] INT NULL,
        [targetRole] NVARCHAR(50) NOT NULL,
        [targetStar] INT NULL,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
        [createdAt] NVARCHAR(50) NOT NULL
    );

    CREATE NONCLUSTERED INDEX [IX_Promotions_Status] ON [dbo].[Promotions] ([status]);
    CREATE NONCLUSTERED INDEX [IX_Promotions_Username] ON [dbo].[Promotions] ([username]);
END
GO

-- 7. Cheat Reports Table (違規檢舉紀錄)
IF OBJECT_ID(N'[dbo].[CheatReports]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CheatReports] (
        [id] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [reportedUser] NVARCHAR(100) NULL,
        [reporter] NVARCHAR(100) NULL,
        [reason] NVARCHAR(MAX) NULL,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
        [payload] NVARCHAR(MAX) NULL, -- Full JSON
        [createdAt] NVARCHAR(50) NOT NULL
    );
END
GO

-- 8. Quota Requests Table (額度申請紀錄)
IF OBJECT_ID(N'[dbo].[QuotaRequests]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[QuotaRequests] (
        [id] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [username] NVARCHAR(100) NULL,
        [quotaType] NVARCHAR(100) NULL,
        [amount] INT NULL DEFAULT 0,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
        [payload] NVARCHAR(MAX) NULL, -- Full JSON
        [createdAt] NVARCHAR(50) NOT NULL
    );
END
GO

-- 9. Trivia Questions Table (題庫資料)
IF OBJECT_ID(N'[dbo].[TriviaQuestions]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TriviaQuestions] (
        [id] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [title] NVARCHAR(MAX) NULL,
        [payload] NVARCHAR(MAX) NULL, -- Full JSON
        [createdAt] NVARCHAR(50) NOT NULL
    );
END
GO

-- 10. Site Update Logs Table (版本更新紀錄)
IF OBJECT_ID(N'[dbo].[SiteUpdateLogs]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SiteUpdateLogs] (
        [id] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [version] NVARCHAR(50) NOT NULL,
        [timestamp] NVARCHAR(50) NOT NULL,
        [title] NVARCHAR(255) NOT NULL,
        [category] NVARCHAR(50) NOT NULL,
        [categoryLabel] NVARCHAR(100) NOT NULL,
        [author] NVARCHAR(100) NOT NULL,
        [summary] NVARCHAR(MAX) NULL,
        [details] NVARCHAR(MAX) NULL, -- JSON Array
        [webmasterOnly] BIT NOT NULL DEFAULT 0
    );
END
GO

-- ==========================================================
-- Optional: Seed Default Administrator Accounts
-- ==========================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [username] = 'webmaster')
BEGIN
    INSERT INTO [dbo].[Users] ([username], [passwordHash], [encryptedPassword], [role], [canManageTrivia], [canManageLogs], [assignedTables])
    VALUES ('webmaster', '123', '123', 'WEBMASTER', 1, 1, '[]');
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [username] = 'super_admin')
BEGIN
    INSERT INTO [dbo].[Users] ([username], [passwordHash], [encryptedPassword], [role], [canManageTrivia], [canManageLogs], [assignedTables])
    VALUES ('super_admin', '123', '123', 'SUPER_ADMIN', 0, 0, '[]');
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [username] = 'sys_admin')
BEGIN
    INSERT INTO [dbo].[Users] ([username], [passwordHash], [encryptedPassword], [role], [assignedTables])
    VALUES ('sys_admin', '123', '123', 'SYSTEM_ADMIN', '[]');
END
GO
