const fs = require('fs');

let apiCode = fs.readFileSync('src/utils/sqlServerApi.ts', 'utf8');

// Replace fetchSingleUserPasswordApi with getUserPasswordApi
const startIndex = apiCode.indexOf('export async function fetchSingleUserPasswordApi');
if (startIndex !== -1) {
  const endIndex = apiCode.indexOf('}', startIndex) + 1; // Find the first } ? No, there are inner braces.
  // We can just use string replace using a regex that matches the whole function.
  const regex = /export async function fetchSingleUserPasswordApi[\s\S]*?return null;\n\}/;
  apiCode = apiCode.replace(regex, `export async function getUserPasswordApi(
  username: string
): Promise<{
  success: boolean;
  password?: string;
  message?: string;
}> {
  const res = await authFetch(
      \`/api/users/\${encodeURIComponent(username)}/password\`,
      {
          method: "GET",
      }
  );

  return await res.json();
}`);
  
  fs.writeFileSync('src/utils/sqlServerApi.ts', apiCode);
  console.log("Updated sqlServerApi.ts");
} else {
  console.log("Could not find fetchSingleUserPasswordApi in sqlServerApi.ts");
}
