import React, { useEffect } from "react";
import { ShieldAlert, X, Ban } from "lucide-react";

export interface BannedAlertState {
  isOpen: boolean;
  featureName?: string;
  featureKey?: string;
  reason?: string;
}

interface BannedAlertModalProps {
  alertState: BannedAlertState;
  onClose: () => void;
}

export default function BannedAlertModal({ alertState, onClose }: BannedAlertModalProps) {
  useEffect(() => {
    if (!alertState.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [alertState.isOpen, onClose]);

  if (!alertState.isOpen) return null;

  return (
    <div
      id="banned-alert-overlay"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* 屏幕中間彈出的紅色框 */}
      <div
        id="banned-alert-box"
        className="relative w-full max-w-md bg-white rounded-2xl border-4 border-red-600 shadow-[0_20px_50px_rgba(220,38,38,0.25)] p-6 md:p-8 text-center animate-in zoom-in-95 duration-150 ring-4 ring-red-100"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="banned-alert-title"
      >
        {/* Close icon button */}
        <button
          id="banned-alert-close-btn"
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
          title="關閉"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center mb-4 shadow-inner">
          <Ban className="w-9 h-9 text-red-600 animate-pulse" />
        </div>

        {/* 框內紅色文字 {該功能/特權已被封禁} */}
        <div
          id="banned-alert-title"
          className="text-2xl md:text-3xl font-black text-red-600 tracking-tight mb-3 drop-shadow-xs"
        >
          {"{該功能/特權已被封禁}"}
        </div>

        {/* Detailed feature name if provided */}
        {alertState.featureName && (
          <div className="inline-block px-3.5 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700 mb-3">
            受限項目：{alertState.featureName}
          </div>
        )}

        <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
          您的帳號目前已被上級管理員（系統站主 / 超級管理員）針對此特定功能或特權執行限制管制，暫時無法檢視或使用該項目。如需恢復請聯絡管理團隊。
        </p>

        <div className="flex justify-center">
          <button
            id="banned-alert-confirm-btn"
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm shadow-md shadow-red-200 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>我知道了 / 關閉提示</span>
          </button>
        </div>
      </div>
    </div>
  );
}
