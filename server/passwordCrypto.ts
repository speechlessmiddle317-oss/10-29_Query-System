import crypto from "crypto";

// 取得環境變數中的金鑰，若無則使用開發用預設金鑰（僅限開發環境使用）
const SECRET = process.env.PASSWORD_ENCRYPTION_KEY || "default_password_encryption_key_for_dev_only";
const ALGORITHM = "aes-256-gcm";

// 產生 32 bytes 的金鑰供 AES-256 使用
const KEY = crypto.scryptSync(SECRET, "salt", 32);

/**
 * 伺服器端專用的密碼加密工具 (AES-256-GCM)
 * 加密結果僅由系統站主呼叫專屬 API 時方可解密
 */
export function encryptPassword(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  // 組合格式: iv:authTag:encryptedText
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * 伺服器端專用的密碼解密工具 (AES-256-GCM)
 * 僅限站主 API 中調用
 */
export function decryptPassword(encryptedData: string): string {
  if (!encryptedData) return encryptedData;
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 3) return encryptedData;
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Password decryption failed:", error);
    return "ENCRYPTION_ERROR";
  }
}
