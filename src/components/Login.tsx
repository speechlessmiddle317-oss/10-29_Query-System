import React, { useState } from "react";
import { Eye, EyeOff, Lock, User, CheckCircle2, Loader2 } from "lucide-react";
import { AppUser, UserRole, StarLevel } from "../types";
import { loginWithSqlServer, registerWithApi } from "../utils/sqlServerApi";

interface LoginProps {
  onLoginSuccess: (user: AppUser) => void;
  addLog: (user: string, role: string, action: string, target: string, details: string) => void;
}

export default function Login({ onLoginSuccess, addLog }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState<React.ReactNode>("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Register state
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanUsername = regUsername.trim().toLowerCase();
    const cleanPassword = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    if (!cleanUsername) {
      setError("請填寫您想要註冊的帳號名稱。");
      return;
    }
    if (cleanUsername.length < 3) {
      setError("帳號名稱長度必須至少為 3 個字元。");
      return;
    }
    if (!cleanPassword) {
      setError("請填寫登入安全密碼。");
      return;
    }
    if (cleanPassword !== cleanConfirm) {
      setError("「密碼」與「確認密碼」不相同，請重新核對。");
      return;
    }

    setIsLoading(true);

    try {
      // Register new citizen respondent strictly via POST /api/auth/register
      const regRes = await registerWithApi(cleanUsername, cleanPassword);
      if (!regRes.success) {
        setError(regRes.message || "註冊失敗，請重試。");
        setIsLoading(false);
        return;
      }

      // Perform server-side login to acquire session JWT
      const loginRes = await loginWithSqlServer(cleanUsername, cleanPassword);

      if (!loginRes.success) {
        setError(loginRes.message || "註冊成功，但自動登入時遇到問題，請切換至登入頁手動輸入帳密。");
        setIsLoading(false);
        return;
      }

      addLog(
        cleanUsername,
        "一般填答市民",
        "市民自主註冊帳號",
        cleanUsername,
        `新答題人 [${cleanUsername}] 通過登入端完成自主註冊加入平台 (SQL Server 後端密碼加密存儲)，起始狀態為黑鐵 (1階/0點)。`
      );

      setSuccessMsg("🎉 註冊成功！系統已驗證身份並為您自動登入...");

      const appUser: AppUser = {
        username: cleanUsername,
        role: UserRole.RESPONDENT,
        starLevel: 1,
        assignedTables: [],
        respondentPoints: 0,
        respondentSubRank: 1,
        bannedFeatures: [],
        banned: false,
      };

      if (keepLoggedIn) {
        localStorage.setItem("sub_logged_user", JSON.stringify(appUser));
      } else {
        localStorage.removeItem("sub_logged_user");
      }

      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(appUser);
      }, 800);
    } catch (err: any) {
      setError(err?.message || "註冊失敗，請檢查網路或稍後再試。");
      setIsLoading(false);
    }
  };

  const getRoleChinese = (role: UserRole, star?: StarLevel): string => {
    switch (role) {
      case UserRole.WEBMASTER:
        return "系統站主";
      case UserRole.SUPER_ADMIN:
        return "超級管理員";
      case UserRole.SYSTEM_ADMIN:
        return "系統管理員";
      case UserRole.OPERATOR:
        return `操作員 (${star}星級)`;
      case UserRole.ANALYST:
        return `分析員 (${star}星級)`;
      case UserRole.QUESTION_CREATOR:
        return `出題人 (${star || 1}階)`;
      case UserRole.RESPONDENT:
        return `答題人 (${star || 1}階)`;
      default:
        return "使用者";
    }
  };

  const renderBanError = (banInfo: any): React.ReactNode => {
    if (!banInfo) return "❌ 您的帳號已被封禁停用，目前無法登入系統！";
    if (banInfo.banType === "TEMP_LEGEND" || (banInfo.bannedUntil && Date.now() <= banInfo.bannedUntil && banInfo.bannedBy === UserRole.RESPONDENT)) {
      return (
        <span>
          ❌ 您的帳號已被<span className="font-extrabold text-[#FF3E00]" style={{ color: '#FF3E00' }}>答題人動用最高特權</span>封禁停用1小時，目前無法登入系統！如要解封，請聯絡上級管理人員或靜靜等待解封。
        </span>
      );
    }
    if (banInfo.banType === "PERM_LEGEND") {
      return (
        <span>
          ❌ 您的帳號已被<span className="font-extrabold text-[#FF3E00]" style={{ color: '#FF3E00' }}>答題人動用最高特權</span>申請封禁永久停用(<span className="font-extrabold text-[#D4AF37]" style={{ color: '#D4AF37' }}>系統站主已同意</span>)，目前無法登入系統！如要解封，請聯絡系統站主進行解除。
        </span>
      );
    }
    if (banInfo.banType === "REPORT") {
      return "❌ 您的帳號因有開掛/作弊或問卷檢舉嫌疑而被封禁停用，目前無法登入系統！如沒有嫌疑，請聯絡上級管理人員進行申訴。";
    }
    if (banInfo.bannedBy === UserRole.WEBMASTER) {
      return (
        <span>
          ❌ 您的帳號已被<span className="font-extrabold text-[#D4AF37]" style={{ color: '#D4AF37' }}>系統站主</span>封禁停用，目前無法登入系統！如有疑問請聯絡上級管理人員。
        </span>
      );
    }
    if (banInfo.bannedBy === UserRole.SUPER_ADMIN) {
      return (
        <span>
          ❌ 您的帳號已被<span className="font-extrabold text-blue-600" style={{ color: '#2563EB' }}>超級管理員</span>封禁停用，目前無法登入系統！如有疑問請聯絡上級管理人員。
        </span>
      );
    }
    if (banInfo.bannedReason) {
      return `❌ 您的帳號已被封禁停用（原因：${banInfo.bannedReason}），目前無法登入系統！`;
    }
    return "❌ 您的帳號已被封禁停用，目前無法登入系統！如需申訴請聯絡管理員。";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError("請填寫帳號與密碼");
      return;
    }

    setIsLoading(true);

    try {
      // 🚀 Step 1: POST /api/auth/login -> Express -> SQL Server Users -> Verify Hash -> Issue JWT
      const result = await loginWithSqlServer(cleanUsername, cleanPassword);

      if (!result.success) {
        if (result.error === "ACCOUNT_BANNED") {
          setError(renderBanError(result.banInfo));
        } else {
          setError(result.message || "帳號或密碼錯誤，請重新確認");
        }
        setIsLoading(false);
        return;
      }

      // Step 2: Extract verified user identity
      const userRecord = result.user;
      const appUser: AppUser = {
        username: userRecord.username,
        role: userRecord.role,
        starLevel: userRecord.starLevel,
        assignedTables: userRecord.assignedTables || [],
        respondentPoints: userRecord.respondentPoints || 0,
        respondentSubRank: userRecord.respondentSubRank || 1,
        canManageTrivia: !!userRecord.canManageTrivia,
        canManageLogs: userRecord.role === UserRole.WEBMASTER ? true : !!userRecord.canManageLogs,
        bannedFeatures: Array.isArray(userRecord.bannedFeatures) ? userRecord.bannedFeatures : [],
        banned: false,
      };

      if (keepLoggedIn) {
        localStorage.setItem("sub_logged_user", JSON.stringify(appUser));
      } else {
        localStorage.removeItem("sub_logged_user");
      }

      setSuccessMsg("登入成功！已驗證 SQL Server 身份與 JWT 憑證，正為您載入...");
      addLog(
        appUser.username,
        getRoleChinese(appUser.role, appUser.starLevel),
        "用戶登入",
        "後端身份驗證",
        `成功完成 SQL Server 密碼驗證並簽發 JWT (身份: ${appUser.username}, 角色: ${appUser.role}, 星級/等階: ${appUser.starLevel ?? "無"})，保持登入: ${keepLoggedIn ? "是" : "否"}`
      );

      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(appUser);
      }, 600);
    } catch (err: any) {
      setError(err?.message || "登入請求失敗，請檢查網路連線。");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-8 font-sans" id="login-container">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
        {/* HEADER SECTION */}
        <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center">
          <div className="inline-flex p-3 bg-white/10 rounded-xl mb-4">
            <Lock className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isRegisterMode ? "與市民一起作答學習" : "問卷後台管理系統"}
          </h2>
          <p className="text-slate-300 text-xs mt-2">
            {isRegisterMode 
              ? "自主註冊全新的答題人帳戶，進入闖關答題區並累積個人積分與等階特權" 
              : "請登入以存取系統報表、查詢子系統與參數設定"}
          </p>
        </div>

        {/* ERROR / SUCCESS FEEDBACK */}
        <div className="px-8 pt-6">
          {error && (
            <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-lg text-rose-700 text-xs flex items-start space-x-2 animate-pulse">
              {typeof error === "string" && !error.startsWith("❌") ? (
                <>
                  <span className="font-bold shrink-0">❌ 錯誤：</span>
                  <span>{error}</span>
                </>
              ) : (
                <span>{error}</span>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg text-emerald-700 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 animate-bounce" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* REGISTER/LOGIN FORM */}
        {isRegisterMode ? (
          <form onSubmit={handleRegisterSubmit} className="p-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 tracking-wider uppercase block">
                註冊新帳號
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="請輸入您的新帳名 (英文/數字)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 transition-all outline-none text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 tracking-wider uppercase block">
                安全密碼
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="請設定登入安全密碼"
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 transition-all outline-none text-xs"
                />
                <button
                  id="toggle-reg-password"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 tracking-wider uppercase block">
                確認安全密碼
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-405">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="請再次輸入並確認密碼"
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 transition-all outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-start space-x-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="w-4 h-4 rounded mt-0.5 border-slate-300 text-slate-900 focus:ring-slate-900 focus:ring-offset-0 transition-all cursor-pointer"
                />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                    註冊完成後保持登入
                  </span>
                </div>
              </label>
            </div>

            <div className="space-y-3 pt-2">
              <button
                id="register-submit-button"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer text-center text-xs flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>註冊並加密存入 SQL Server 中...</span>
                  </>
                ) : (
                  <span>📝 立即註冊並進入答題大廳</span>
                )}
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setError("");
                  setIsRegisterMode(false);
                }}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-605 font-bold rounded-xl transition-all duration-150 cursor-pointer text-center text-xs"
              >
                🔙 已有帳號？返回登入
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
                登入帳號
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-404">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  disabled={isLoading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="例如: super_admin"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 tracking-wider uppercase block">
                安全密碼
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-404">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入密碼"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 transition-all outline-none"
                />
                <button
                  id="toggle-password-visibility"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  title={showPassword ? "隱藏密碼" : "顯示密碼"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-start space-x-2.5 cursor-pointer select-none group">
                <input
                  id="keep-logged-in-checkbox"
                  type="checkbox"
                  disabled={isLoading}
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="w-4 h-4 rounded mt-0.5 border-slate-300 text-slate-900 focus:ring-slate-900 focus:ring-offset-0 transition-all cursor-pointer"
                />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                    保持登入
                  </span>
                  <span className="text-xs text-rose-500 font-semibold mt-0.5">
                    (公用電腦 勿勾)
                  </span>
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <button
                id="login-submit-button"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer text-center flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>安全性驗證與登入處理中...</span>
                  </>
                ) : (
                  <span>驗證並登入</span>
                )}
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setError("");
                  setIsRegisterMode(true);
                  setRegUsername("");
                  setRegPassword("");
                  setRegConfirmPassword("");
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all duration-150 cursor-pointer text-center text-xs border border-slate-205"
              >
                🆕 沒有帳號？點此免費註冊市民帳戶
              </button>
            </div>
          </form>
        )}

        {/* BOTTOM FOOTER */}
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-500 leading-normal">
            {isRegisterMode 
              ? "自主註冊者之等級積分完全受站主、超級管理權限控制。請勿註冊不雅字眼帳名。" 
              : "請輸入由系統站主或管理員配置的帳號密碼，或使用市民註冊功能建立答題市民。"}
          </p>
        </div>
      </div>
    </div>
  );
}
