import { getPool } from "./server/mssql.js"; // Actually mssql might be .ts so we should use tsx
async function run() {
  const p = await getPool();
  if (!p) throw new Error("No pool");
  try {
    await p.request().query("ALTER TABLE dbo.Users ADD encryptedPassword NVARCHAR(1024) NULL;");
    console.log("Column added");
  } catch(e) {
    console.error(e.message);
  }
  process.exit(0);
}
run();
