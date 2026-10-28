import crypto from "crypto";

// Use JWT_SECRET as the base key material, fallback to a default if not set (for dev only)
const SECRET = process.env.JWT_SECRET || "default_jwt_secret_for_development_only";
const ALGORITHM = "aes-256-gcm";

// Derive a 32-byte key from the secret
const KEY = crypto.scryptSync(SECRET, "salt", 32);

export function encryptString(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  // Format: iv:authTag:encryptedText
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptString(encryptedData: string): string {
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
    console.error("Decryption failed:", error);
    return "ENCRYPTION_ERROR";
  }
}
