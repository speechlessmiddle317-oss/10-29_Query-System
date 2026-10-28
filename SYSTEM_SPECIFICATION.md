# 問卷查詢與系統管理平台 (Query System) 系統規格書

**文件版本**：v1.9.4.9  
**系統代號**：QuerySystem-FullStack  
**發布日期**：2026-09-18  
**文件狀態**：正式核准 (Approved)  
**系統架構**：React 18 前端 + Express (Node.js) 後端 + Microsoft SQL Server (主權威資料庫) + Firebase Firestore (同步/災備) + JWT & Bcrypt 安全體系  

---

## 1. 系統願景與核心架構原則 (Core Architectural Principles)

「問卷查詢與系統管理平台」（Query System）是一套專為大型組織、市調機構及跨層級營運設計的高安全性、高擴展性問卷發佈、作答激勵、資料治理與多重獨立子查詢系統。

在 **v1.9.3** 確立後端主權與權威資料庫防護體系後，**v1.9.4** 進一步推動高階資訊安全隔離補丁與生命週期管理修正。**v1.9.4.4** 則正式確立了作答送出時的原子事務隔離 (Atomic Transaction) 確保系統資料一致性。
在 **v1.9.4.6** 中，徹底清除了前端快取對 RBAC 權威狀態的污染，並實裝了嚴格的動態密碼授權提取與雙軌加密機制，進一步完善高階機密防護。
在 **v1.9.4.8** 中，徹底廢止 `localStorage.sub_users` 前端虛假鏈路，確立以 SQL Server 為唯一正式帳號資料來源。新增帳號全面落實「先 POST /api/users 實體寫入 SQL Server → 伺服器成功回傳 → 重新發動 GET /api/users 抓取」之嚴格閉環；SQL Server 連線中斷時新增帳號不再偽裝成功，徹底杜絕「A 電腦新增當下看得到、重新整理後即消失」的假性持久化缺陷，並將 Firestore 完全解耦為純非同步災備副本。
在 **v1.9.4.9** 中，正式納入獨立子查詢系統大廳路徑隱藏機制（`hideInHall` 全新增功能而非修改既存屬性），支援在新增與修改子查詢時自由設定是否於公開問卷大廳呈現通道，實現特定專責更正通道之隱密分流，並維持專屬直達路徑之完整可存取性。

### 1.1 八大核心架構原則

1. **React 不直接決定權限與帳號狀態**：前端僅負責 UI 渲染與使用者互動反饋，所有權限與帳號驗證以伺服器端 SQL Server 為唯一權威標準。
2. **所有重要 API 全面經過 JWT 驗證**：進入後端之請求必須透過 HTTP Authorization Header (`Bearer <JWT>`) 攜帶合法 Token，由 `requireAuth` 中介層統一解碼與簽名檢驗。
3. **Express 後端執行 RBAC 角色授權**：依端點需求掛載 `requireRole` / `requirePermission` 中介層，阻斷所有越權操作（IDOR / Privilege Escalation）。
4. **Express 嚴格驗證所有核心業務規則**：問卷時效、狀態、密碼、防作弊、重複填答限制與作答格式等規則，一律在伺服器端嚴格檢核，不依賴前端校驗。
5. **Express → SQL Server 為全站主要且唯一正式帳號寫入路徑 (v1.9.4.8)**：
   - 帳號新增 (`POST /api/users`) 與清單讀取 (`GET /api/users`) 全面由後端 SQL Server 直連持久化處理。
   - 徹底杜絕 `localStorage.sub_users` 作為正式資料路徑，前端本地儲存僅限於 JWT Token、語系與介面偏好設定。
6. **SQL Server 寫入失敗不可偽裝成功 (v1.9.4.8)**：
   - 當 SQL Server 連線中斷或連線池不可用時，後端即刻拋出異常並回傳 HTTP 500 (`DB_WRITE_FAILED`)，嚴禁偽裝寫入成功，確保資料庫狀態與前端展示之絕對真實性。
7. **阻斷前端直接存取正式資料庫 / Firestore**：
   - 瀏覽器端不再直接讀寫 Firestore 作為正式資料源。
   - Firestore 轉型為由後端管理或異地備援之非同步災備庫（Disaster Recovery），全域資料表之 `allow write` 設為 `false`，且絕不作為 Users 讀取來源。
8. **密碼驗證全部移轉至伺服器端處理**：
   - 問卷密碼、子查詢密碼及使用者密碼，前端一概無法取得明文或 Hash。
   - 使用者密碼採 bcrypt (供登入校驗) 與 AES-256-GCM (供站主解密管理) 雙軌後端加密，前端僅能依授權請求脫敏資料。

---

## 2. 系統架構與技術堆疊 (Architecture & Tech Stack)

### 2.1 權威資料流架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                 客戶端瀏覽器 Client Browser                 │
│  React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons │
│  (僅負責 UI 互動與客戶端渲染；不直接操作正式資料庫)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / RESTful API
                               ▼ Authorization: Bearer <JWT>
┌─────────────────────────────────────────────────────────────┐
│                  Express Backend 伺服器                     │
│                                                             │
│  [1. JWT 身份解析驗證]  (requireAuth / optionalAuth)        │
│  [2. RBAC 角色權限矩陣] (requireRole / requirePermission)   │
│  [3. 業務規則七重檢驗]  (狀態/時效/停權/格式/重複填答)      │
│  [4. 密碼驗證引擎]      (bcrypt 加鹽比對，無密碼外流)        │
│  [5. 積分段位計算]      (後端原子事務運算，杜絕作弊)        │
│  [6. Audit Log 稽核]    (強制綁定 JWT 簽發身份，不可竄改)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼ mssql (T-SQL Driver / Transaction Pool)
┌─────────────────────────────────────────────────────────────┐
│              Microsoft SQL Server (Authoritative)           │
│                                                             │
│  全站主資料庫 / 唯一權威資料來源 (Source of Truth)          │
│  - dbo.Users           - dbo.Questionnaires                 │
│  - dbo.SurveyResponses - dbo.AuditLogs                      │
│  - dbo.Promotions      - dbo.SiteUpdateLogs                 │
│  - dbo.CheatReports    - dbo.QuotaRequests                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼ (後端背景異步備援 / 災難恢復)
┌─────────────────────────────────────────────────────────────┐
│                   Google Cloud Firestore                    │
│                                                             │
│  同步 / 備份 / 離線災難恢復存儲 (Disaster Recovery Only)    │
│  firestore.rules: 全面設定 allow write: if false            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 安全防護與權限控制 (Security & RBAC Enforcement)

### 3.1 關鍵 API 權限矩陣

| API 端點路徑 | HTTP 方法 | 授權中介軟體 | 最低許可角色與條件 | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | 公開 | 無 | 帳密 Bcrypt 驗證，簽發 JWT |
| `/api/auth/register` | `POST` | 公開 | 無 (強制限定角色為 `RESPONDENT`) | **v1.9.4.1 公開自主註冊**：密碼後端 Bcrypt 雜湊，預設為黑鐵 1 階 0 點 |
| `/api/auth/me` | `GET` | `requireAuth` | 任何登入帳號 | 取得當前已驗證使用者之最新資料庫資料 |
| `/api/users` | `GET` | `requireAuth` | `SUPER_ADMIN`, `WEBMASTER`, `SYSTEM_ADMIN` | **v1.9.4.8** 自 SQL Server 取得權威使用者帳號清單 (密碼嚴格過濾脫敏) |
| `/api/users` | `POST` | `requireAuth, requireRole` | `SUPER_ADMIN`, `WEBMASTER`, `SYSTEM_ADMIN` | **v1.9.4.8 新增/儲存使用者**：強制實體寫入 SQL Server 成功方回傳，連線失敗拋出 500 |
| `/api/users/:username` | `DELETE` | `requireAuth` | `WEBMASTER`, `SUPER_ADMIN`, `SYSTEM_ADMIN` | **v1.9.4.4 軟刪除帳號** (僅刪除登入身分，保留歷史作答與稽核資料) |
| `/api/deleted-users` | `GET` | `requireAuth` | `WEBMASTER`, `SUPER_ADMIN` | 檢閱已刪除帳號歷史紀錄清單 |
| `/api/deleted-users/purge` | `POST` | `requireAuth` | **僅限 `WEBMASTER` 系統站主** | **v1.9.4.4 永久清除資料** (SQL 原子事務徹底銷毀該帳號所有關聯歷史資料) |
| `/api/db/status` | `GET` | `requireAuth, requireRole` | **僅限 `WEBMASTER` 系統站主** | **v1.9.4 隔離補丁**：檢閱 SQL Server 連線狀態與連線池參數 (其餘帳號禁止) |
| `/api/db/ddl` | `GET` | `requireAuth, requireRole` | **僅限 `WEBMASTER` 系統站主** | **v1.9.4 隔離補丁**：檢閱資料庫 T-SQL 綱要定義檔案 (其餘帳號禁止) |
| `/api/questionnaires` | `GET` | `optionalAuth` | 公開 (或依角色過濾) | 取得問卷清單 (脫敏去除密碼 Hash) |
| `/api/responses` | `POST` | `optionalAuth` | 公開 / 登入市民 | **v1.9.4.4 原子事務 (Atomic Transaction)** 確保積分與日誌同步寫入無遺漏 |
| `/api/logs` | `POST` | `requireAuth` | 任何已認證使用者 | **v1.9.4.4 身份強制由 JWT 導出，禁止請求 Body 偽造身份** |

---

## 4. 問卷填答後端業務規則校驗 (Server-Side Validation Engine)

在 `POST /api/responses` 端點中，後端作為嚴格業務規則守門員。

### 4.1 伺服器端積分計算規則 (Server-Authoritative Points Engine)

為防止客戶端竄改作答積分，答題人（`RESPONDENT`）之積分計算完全由後端 `submitSurveyResponseTransaction` 事務處理：
- **題目數 < 10 題**：每有效回答 1 題獎勵 **7 點**。
- **10 題 ≤ 題目數 < 20 題**：每有效回答 1 題獎勵 **5 點**。
- **題目數 ≥ 20 題**：每有效回答 1 題獎勵 **3 點**。
- **段位自動升階演算法**：以總積分除以 20 計算商數 $Q = \lfloor \text{Points} / 20 \rfloor$：
  - $Q < 9$：1 階（黑鐵）
  - $Q < 18$：2 階（青銅）
  - $Q < 34$：3 階（白銀）
  - $Q < 50$：4 階（黃金）
  - $Q < 75$：5 階（白金）
  - $Q < 100$：6 階（鑽石）
  - $Q \ge 100$：7 階（傳奇市民）

---

## 5. 獨立隔離子查詢系統規範 (Sub-Query System & Hall Path Visibility)

獨立子查詢系統為問卷之專屬派生通道，提供精確更正、分流稽核與獨立密碼防線。

### 5.1 核心配置參數
- **`name`**：子查詢系統頻道名稱（例如：社區理監事專用更正鍵、圖書館專項查詢修改系統）。
- **`searchQuestionId`**：指定之查核定位鍵（可指派問卷內特定簡答/單選題目答案作為校對鎖鑰，或使用預設填答申報碼 `resp-xxx`）。
- **`editableQuestionIds`**：受授權允許線上即時修改更正的題目清單，未納入題目僅可閱覽不可更正。
- **`passwordRequired` & `password`**：獨立特權登入鎖鑰，經後端 Bcrypt 雜湊儲存，前端不可取得密碼明文。
- **`hideInHall`（新增功能選項）**：選擇是否在公開問卷大廳的路徑中隱藏該子查詢通道。

### 5.2 問卷大廳路徑隱藏機制 (Hide in Questionnaire Hall Path)
- **非破壞性新增功能**：該選項為全新配置項而非修改既有邏輯；歷史既有子查詢預設維持 `hideInHall: false`，大廳路徑維持公開可見。
- **大廳路由展示過濾**：
  - 前台問卷大廳（Lobby）右側「專門稽核：獨立子查詢通道」列表，自動透過 `filter(sys => !sys.hideInHall)` 排除已設定隱藏之子系統。
  - 若所有子查詢皆設為隱藏，大廳優雅呈現「目前系統管理端尚無制定任何子查詢系統」之安全提示。
- **專屬直達連結存取權**：
  - 即使子查詢設定為隱藏於大廳路徑，其專屬直達 Hash 路由（`#query/{surveyId}/{queryId}`）仍保持暢通。
  - 管理人員可於後台直接複製直達連結發送給專責稽核/填答人員，實現真正隱蔽且安全之分流通路。
- **管理端新增與修改功能支援**：
  - **新增模式**：建立新子查詢時，表單提供「👁️ 隱藏在問卷大廳的路徑」核取方塊。
  - **修改模式**：已存在之子查詢可點擊「✏️ 修改設定」重新載入表單進行完整名稱、查核鍵、問題授權、密碼及大廳隱藏狀態之更新。
  - **一鍵快速切換**：列表項目具備「切換為大廳公開 / 切換為大廳隱藏」即時按鈕，點擊後透過後端 SQL Server 同步持久化並記錄審計日誌。

---

## 9. 系統更新日誌架構 (Site Update Logs)

系統建立嚴格之功能更新日誌分級體系，儲存於 `dbo.SiteUpdateLogs`：
- **v1.9.4.9 子查詢系統大廳路徑隱藏控制（全新增功能）**：支援在新增與修改子查詢通道時，透過 `hideInHall` 自行決定是否於前台問卷大廳呈現路徑；大廳落實前端安全過濾，未公開通道僅保留專屬直達路徑（Hash Route）存取，滿足組織特定專責查核更正通道之隱密需求；管理後台提供即時狀態徽章、完整修改表單與一鍵快速切換。
- 具備 `webmasterOnly: true` 標誌之極密日誌（例如：**v1.9.4.8** 移除 localStorage.sub_users 與 SQL Server 權威持久化、**v1.9.4.6** 全域 RBAC 狀態隔離與密碼雙軌加密、**v1.9.4.4** 原子事務修復、**v1.9.4** SQL Server 僅系統站主可見與管理層帳號刪除修復），僅系統站主（`WEBMASTER`）擁有解密與瀏覽特權，對超級管理員及全站其餘帳號完全遮蔽。
- 系統更新日誌與本系統規格書嚴格維持版本同步（檔案版本：**v1.9.4.9**），落實版本管理紀律。


