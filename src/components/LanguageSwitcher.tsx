import React, { useState, useRef, useEffect } from "react";
import { AppLanguage } from "../types";
import { LANGUAGE_OPTIONS, t } from "../utils/i18n";
import { Globe, ChevronDown, Check } from "lucide-react";

interface LanguageSwitcherProps {
  currentLang: AppLanguage;
  onLanguageChange: (newLang: AppLanguage) => void;
}

export default function LanguageSwitcher({ currentLang, onLanguageChange }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === currentLang) || LANGUAGE_OPTIONS[0];

  return (
    <div
      className={`relative inline-block text-left ${currentOption.fontClass}`}
      style={{ fontFamily: currentOption.fontFamily }}
      ref={containerRef}
      id="language-switcher-container"
    >
      <button
        id="language-switcher-btn"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        style={{ fontFamily: currentOption.fontFamily }}
        className={`text-xs font-bold text-slate-700 hover:text-slate-900 py-1.5 px-2.5 rounded-lg hover:bg-slate-100/80 border border-slate-200/90 transition-all flex items-center gap-1.5 cursor-pointer select-none bg-white shadow-xs ${currentOption.fontClass}`}
        title={t("languageTooltip", currentLang)}
      >
        <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <span className="tracking-normal font-bold">
          {currentOption.nativeLabel}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          id="language-dropdown-menu"
          role="listbox"
          aria-label={t("languageDropdownHeader", currentLang)}
          style={{ fontFamily: currentOption.fontFamily }}
          className={`absolute right-0 mt-1.5 w-44 rounded-xl bg-white shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in-50 zoom-in-95 duration-100 ${currentOption.fontClass}`}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider flex items-center justify-between">
            <span>{t("languageDropdownHeader", currentLang)}</span>
            <span className="text-[9px] text-indigo-500 font-mono font-normal">[{currentOption.shortLabel}]</span>
          </div>
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = opt.code === currentLang;
            return (
              <button
                key={opt.code}
                id={`lang-option-${opt.code.toLowerCase()}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                style={{ fontFamily: opt.fontFamily }}
                onClick={() => {
                  onLanguageChange(opt.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${opt.fontClass} ${
                  isSelected
                    ? "bg-indigo-50/90 text-indigo-700 font-bold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{opt.nativeLabel}</span>
                  {opt.code !== currentLang && (
                    <span className="text-[10px] text-slate-400">
                      ({opt.names[currentLang]})
                    </span>
                  )}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

