const fs = require('fs');

let code = fs.readFileSync('src/utils/initialUpdateLogs.ts', 'utf8');

const newLog = `  {
    id: "update-20260917-124000-v1948",
    version: "v1.9.4.8",
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    title: "更新規格書 檔案版本：v1.9.4.8",
    category: "WEBMASTER",
    categoryLabel: "👑 系統站主最高特權專區",
    author: "系統站主 (Webmaster)",
    summary: "完成全域 RBAC 狀態隔離、密碼雙軌加密、動態授權提取修復與 WEBMASTER 帳號防呆保護",
    webmasterOnly: true,
    details: [
      "【安全架構】在 SQL Server 中新增 encryptedPassword 欄位，實作 bcrypt 與 AES-256-GCM 雙軌加密儲存機制。",
      "【密碼隔離】移除 localStorage 依賴，使用 visiblePasswords 獨立狀態管理，僅在系統站主授權操作下向後端拉取真實解密密碼。",
      "【即時同步】優化 Dashboard UI，實作「單一點擊查看」、「全部查看/隱藏」功能，且修改密碼後無需重整畫面即時同步更新。",
      "【防呆豁免】針對 WEBMASTER 系統站主帳號，實作封禁豁免、刪除防呆、名稱及角色鎖定等最高特權防護，避免誤刪或越權篡改。"
    ]
  },
`;

code = code.replace(
  'export const INITIAL_SITE_UPDATE_LOGS: SiteUpdateLog[] = [',
  'export const INITIAL_SITE_UPDATE_LOGS: SiteUpdateLog[] = [\n' + newLog
);

fs.writeFileSync('src/utils/initialUpdateLogs.ts', code);
console.log("Patched logs");
