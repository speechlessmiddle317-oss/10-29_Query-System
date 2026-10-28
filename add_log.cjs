const fs = require('fs');
let code = fs.readFileSync('src/utils/initialUpdateLogs.ts', 'utf8');

const newLog = `  {
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
  },
`;

code = code.replace(
  'export const INITIAL_SITE_UPDATE_LOGS: SiteUpdateLog[] = [',
  'export const INITIAL_SITE_UPDATE_LOGS: SiteUpdateLog[] = [\n' + newLog
);

fs.writeFileSync('src/utils/initialUpdateLogs.ts', code);
