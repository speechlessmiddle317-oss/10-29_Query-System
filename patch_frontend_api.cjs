const fs = require('fs');
let code = fs.readFileSync('src/utils/sqlServerApi.ts', 'utf8');

const oldApi = `export async function adminUpdateUserPasswordApi(username: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(\`/api/users/\${encodeURIComponent(username)}/password\`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${localStorage.getItem("token")}\`
      },
      body: JSON.stringify({ newPassword })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}`;

const newApi = `export async function adminUpdateUserPasswordApi(targetUsername: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(\`/api/users/admin-reset-password\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${localStorage.getItem("token")}\`
      },
      body: JSON.stringify({ targetUsername, newPassword })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchSingleUserPasswordApi(username: string): Promise<string | null> {
  try {
    const res = await authFetch(\`/api/users/\${encodeURIComponent(username)}/password\`);
    if (res.ok) {
      const data = await res.json();
      return data.password || null;
    }
  } catch (err) {
    console.error(err);
  }
  return null;
}
`;

code = code.replace(oldApi, newApi);
fs.writeFileSync('src/utils/sqlServerApi.ts', code);
