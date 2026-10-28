const fs = require('fs');

// 1. Update initialUpdateLogs.ts
let code = fs.readFileSync('src/utils/initialUpdateLogs.ts', 'utf8');

const oldLog = `{
    id: "update-20260916-032800-v1946",
    version: "v1.9.4.6",
    timestamp: "2026-09-16 03:28:48",
    title: "系統日誌更新且設定系統站主專屬能見度",
    category: "WEBMASTER",
    categoryLabel: "站主專屬特權",
    author: "系統站主 (Webmaster)",
    summary: "對系統日誌進行更新，並限定僅系統站主可見 版本編號：v1.9.4.6，同時對規格書進行更新。",
    webmasterOnly: true,
    details: [
      "【系統日誌更新】添加了版本 v1.9.4.6 的系統更新日誌，並設定為僅系統站主可見 (webmasterOnly: true)，強化高層管理與機密追蹤。",
      "【規格書更新】將系統規格書 (SYSTEM_SPECIFICATION.md) 同步升級至版本 v1.9.4.6，以反映最新管理策略與安全原則。"
    ]
  }`;

const newLog = `{
    id: "update-20260916-032800-v1946",
    version: "v1.9.4.6",
    timestamp: "2026-09-16 03:28:48",
    title: "全域 RBAC 狀態隔離、密碼雙軌加密與動態授權提取修復",
    category: "SECURITY",
    categoryLabel: "安全架構與授權",
    author: "系統站主 (Webmaster)",
    summary: "徹底清除 localStorage 對系統帳號狀態的污染，實裝密碼雙軌加密機制，並引入嚴格的動態密碼授權提取與 API 越權防護。",
    webmasterOnly: true,
    details: [
      "【狀態隔離與防污染】徹底移除 Dashboard 內 localStorage 對 rbacUsers 的讀寫依賴，全域強制以 SQL Server 作為唯一權威資料來源，防堵舊快取覆蓋真實權限。",
      "【密碼隱蔽與動態提取】將所有帳號密碼從基礎清單中剝離，預設為「••••••••」。實作專屬動態端點，僅允許系統站主主動點擊查看時拉取並進行 AES 解密，落實「最小權限存取」原則。",
      "【雙軌密碼寫入機制】更新密碼儲存架構，全面實施 bcrypt (供正規登入驗證) 與 AES-256-GCM (供系統站主救援查詢) 雙軌同步寫入，兼顧系統登入安全與最高管理特權。",
      "【越權崩潰防護 (Bug Fix)】修復因非站主權限觸發密碼提取時，API 回傳 403 錯誤物件導致前端 pUsers.forEach is not a function 的致命崩潰問題，增加嚴謹的型別檢查與錯誤攔截。"
    ]
  }`;

code = code.replace(oldLog, newLog);
fs.writeFileSync('src/utils/initialUpdateLogs.ts', code);

// 2. Update SYSTEM_SPECIFICATION.md
let spec = fs.readFileSync('SYSTEM_SPECIFICATION.md', 'utf8');
spec = spec.replace(
  '在 **v1.9.4.6** 中，全面更新系統日誌且僅系統站主可見，進一步完善高階機密更新追蹤。',
  '在 **v1.9.4.6** 中，徹底清除了前端快取對 RBAC 權威狀態的污染，並實裝了嚴格的動態密碼授權提取與雙軌加密機制，進一步完善高階機密防護。'
);
fs.writeFileSync('SYSTEM_SPECIFICATION.md', spec);

