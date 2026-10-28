import { getPool } from "./server/mssql.js";
async function run() {
  const p = await getPool();
  if (!p) {
    console.error("No pool");
    process.exit(1);
  }
  try {
    const res = await p.request().query("SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users'");
    console.log(res.recordset);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
