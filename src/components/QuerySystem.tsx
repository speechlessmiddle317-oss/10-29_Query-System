import React, { useState } from "react";
import { Questionnaire, SurveyResponse, QuerySystemConfig } from "../types";
import { Search, Lock, Edit3, Check, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { verifySubqueryPasswordApi } from "../utils/sqlServerApi";

interface QuerySystemProps {
  survey: Questionnaire;
  queryConfig: QuerySystemConfig;
  allResponses: SurveyResponse[];
  onUpdateResponse: (updated: SurveyResponse) => void;
  onBackList?: () => void;
  isDirectLink?: boolean;
}

export default function QuerySystem({
  survey,
  queryConfig,
  allResponses,
  onUpdateResponse,
  onBackList,
  isDirectLink = false
}: QuerySystemProps) {
  const [querySystemPassword, setQuerySystemPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(!queryConfig.passwordRequired);
  const [passwordError, setPasswordError] = useState("");

  const [searchId, setSearchId] = useState("");
  const [queriedResponses, setQueriedResponses] = useState<SurveyResponse[]>([]);
  const [selectedResponseIndex, setSelectedResponseIndex] = useState<number>(0);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, any>>({});
  const [searchError, setSearchError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Password Unlock for this Sub-Query system (Server-side bcrypt verification)
  const handleUnlockQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    const cleanPw = querySystemPassword.trim();
    if (!cleanPw) {
      setPasswordError("請輸入查詢密碼！");
      return;
    }
    const result = await verifySubqueryPasswordApi(survey.id, queryConfig.id, cleanPw);
    if (result.success) {
      setIsUnlocked(true);
    } else {
      setPasswordError(result.message || "查詢密碼錯誤，請重新確認！");
    }
  };

  // Perform query "查詢"
  const handleQuerySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setQueriedResponses([]);
    setSelectedResponseIndex(0);
    setSuccessMsg("");

    const searchKey = searchId.trim().toLowerCase();
    if (!searchKey) {
      setSearchError("請輸入查詢內容！");
      return;
    }

    // Filter responses for this specific questionnaire ONLY (strict isolation!)
    const surveyResponses = allResponses.filter(r => r.surveyId === survey.id);
    
    // Match based on searchQuestionId if specified, otherwise fallback to response ID
    const matchedList = surveyResponses.filter(r => {
      if (queryConfig.searchQuestionId) {
        const answerVal = r.answers[queryConfig.searchQuestionId];
        if (answerVal !== undefined && answerVal !== null) {
          if (Array.isArray(answerVal)) {
            return answerVal.some(val => String(val).trim().toLowerCase() === searchKey);
          }
          return String(answerVal).trim().toLowerCase() === searchKey;
        }
        return false;
      }
      return r.id.toLowerCase() === searchKey;
    });

    if (matchedList.length > 0) {
      setQueriedResponses(matchedList);
      setSelectedResponseIndex(0);
      setEditedAnswers({ ...matchedList[0].answers });
    } else {
      if (queryConfig.searchQuestionId) {
        const qTitle = survey.questions.find(q => q.id === queryConfig.searchQuestionId)?.title || "指定查詢欄位";
        setSearchError(`找不到符合該「${qTitle}」之答案的問卷，請確認輸入是否正確！`);
      } else {
        setSearchError("找不到該填寫編號，或此編號不屬於本查詢群組！");
      }
    }
  };

  // Handle value change for editable questions in query
  const handleEditChange = (questionId: string, value: any) => {
    setEditedAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Save the edited answers (線上修改更正)
  const handleSaveChanges = async () => {
    const queriedResponse = queriedResponses[selectedResponseIndex];
    if (!queriedResponse) return;
    setIsSaving(true);
    setSuccessMsg("");

    try {
      const updatedResponse: SurveyResponse = {
        ...queriedResponse,
        answers: {
          ...queriedResponse.answers,
          ...editedAnswers
        }
      };

      // Wait brief simulated duration for professional feel
      await new Promise(resolve => setTimeout(resolve, 800));

      onUpdateResponse(updatedResponse);
      
      const newList = [...queriedResponses];
      newList[selectedResponseIndex] = updatedResponse;
      setQueriedResponses(newList);
      
      setSuccessMsg(`🎉 成功線上更正「檔案 ${selectedResponseIndex + 1} (${queriedResponse.id})」之回答！資料已安全同步。`);
    } catch {
      setSearchError("更新失敗，請稍後再試。");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12" id="query-auth-wrapper">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center">
          <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-2xl mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">{queryConfig.name}</h2>
          <p className="text-slate-500 text-xs mt-1.5 mb-6">
            本子查詢系統隸屬於：<span className="font-semibold text-slate-700">{survey.title}</span><br />
            為保障敏感資料之讀寫安全，請輸入查詢端密碼以解鎖登入。
          </p>

          <form onSubmit={handleUnlockQuery} className="space-y-4">
            <div>
              <input
                id="query-password-input"
                type="password"
                placeholder="請輸入查詢子系統密碼..."
                value={querySystemPassword}
                onChange={(e) => setQuerySystemPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm font-mono"
              />
              {passwordError && (
                <p className="text-xs text-rose-500 font-bold mt-2">{passwordError}</p>
              )}
            </div>
            <button
              id="query-password-submit"
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
            >
              認證並進入查詢子系統
            </button>
          </form>

          {!isDirectLink && onBackList && (
            <button
              id="query-password-cancel"
              onClick={onBackList}
              className="mt-6 text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
            >
              ← 返回問卷大廳
            </button>
          )}
        </div>
      </div>
    );
  }

  const queriedResponse = queriedResponses.length > 0 ? queriedResponses[selectedResponseIndex] : null;

  return (
    <div className="w-full max-w-3xl mx-auto my-6" id="query-content-container">
      {/* Query Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden mb-6">
        <div className="p-6 bg-gradient-to-r from-amber-600 to-amber-700 text-white relative">
          <div className="absolute top-4 right-4 bg-white/10 text-white font-mono text-xs font-bold px-3 py-1 rounded-full">
            獨立查詢系統 (子通道)
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-50">{queryConfig.name}</h1>
          <p className="text-slate-200 text-xs mt-1.5 leading-relaxed">
            所屬問卷：<strong className="text-white text-sm">{survey.title}</strong>
          </p>
        </div>

        {/* Query Input Area */}
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <form onSubmit={handleQuerySearch} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="query-search-id-input"
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder={
                  queryConfig.searchQuestionId 
                    ? `請輸入欲查詢的「${survey.questions.find(q => q.id === queryConfig.searchQuestionId)?.title || "指定欄位內容"}」之答案...`
                    : "請輸入欲查詢的填寫編號 (如: resp-001 / resp-002)..."
                }
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm outline-none transition-all font-mono"
              />
            </div>
            {/* The query button must be named "查詢" */}
            <button
              id="query-search-submit"
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>查詢</span>
            </button>
          </form>

          {searchError && (
            <p className="text-xs text-rose-500 font-bold mt-2 bg-rose-50 p-2 rounded-lg border border-rose-100 inline-block">
              ⚠️ {searchError}
            </p>
          )}

          {/* Quick instructions with valid codes */}
          <div className="mt-3 text-[11px] text-slate-400 flex flex-wrap items-center gap-1">
            {queryConfig.searchQuestionId ? (
              <>
                <span className="font-bold text-slate-500 text-[10px] bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">自訂查詢欄位已啟用</span>
                <span>💡 請在搜尋框中直接輸入對應「<strong className="text-slate-600 font-semibold">{survey.questions.find(q => q.id === queryConfig.searchQuestionId)?.title}</strong>」的填寫答案進行查核。</span>
              </>
            ) : (
              <>
                <span>💡 提示填寫編號範例:</span>
                <span className="font-mono bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded">resp-001</span>
                <span>、</span>
                <span className="font-mono bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded">resp-002</span>
              </>
            )}
          </div>
        </div>

        {/* Query Results Display */}
        {queriedResponse ? (
          <div className="bg-amber-50/20">
            {/* Folder Drawer Tabs (檔案上方的分頁標籤) */}
            <div className="flex border-b border-amber-200/80 bg-slate-100 flex-wrap select-none" id="query-folder-tabs">
              {queriedResponses.map((res, index) => {
                const isActive = index === selectedResponseIndex;
                return (
                  <button
                    key={res.id + '-' + index}
                    id={`query-tab-btn-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedResponseIndex(index);
                      setEditedAnswers({ ...res.answers });
                      setSuccessMsg("");
                    }}
                    className={`relative px-4 py-3 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border-r border-slate-200 ${
                      isActive
                        ? "bg-amber-50 text-amber-900 border-t-2 border-t-amber-600 font-extrabold shadow-sm"
                        : "bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <span className="shrink-0 text-amber-600 text-sm">📂</span>
                    <span className="tracking-wide">
                      檔案-{index + 1} ({res.id})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-6 space-y-6 bg-white min-h-[300px]" id="query-active-folder-content">
              {/* Folder Interior Frame info */}
              <div className="p-3.5 bg-amber-50 border border-amber-200/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-950 shadow-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">📁</span>
                  <span>
                    當前查閱：第 <strong className="text-amber-800 text-sm">{selectedResponseIndex + 1} / {queriedResponses.length}</strong> 份配對檔案 (答卷 ID: <strong className="font-mono text-amber-800 font-bold bg-amber-100/60 px-1 py-0.2 rounded">{queriedResponse.id}</strong>)
                  </span>
                </div>
                {queriedResponses.length > 1 && (
                  <button 
                    type="button"
                    id="next-folder-btn"
                    className="text-[10px] bg-amber-600 hover:bg-amber-700 active:bg-amber-800 transition-all font-bold text-white px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 shadow-xs" 
                    onClick={() => {
                      const nextIdx = (selectedResponseIndex + 1) % queriedResponses.length;
                      setSelectedResponseIndex(nextIdx);
                      setEditedAnswers({ ...queriedResponses[nextIdx].answers });
                      setSuccessMsg("");
                    }}
                  >
                    <span>切換下一檔 ➔</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs text-slate-400">填寫編號</span>
                  <h3 className="text-sm font-bold font-mono text-slate-700">{queriedResponse.id}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">提交時間</span>
                  <p className="text-xs font-mono text-slate-600">{queriedResponse.submittedAt}</p>
                </div>
              </div>

              {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold leading-relaxed flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">問卷回復內容與權限操作欄位</h4>
                {survey.questions.map((q) => {
                  const isEditable = queryConfig.editableQuestionIds.includes(q.id);
                  const currentValue = editedAnswers[q.id];

                  return (
                    <div 
                      key={q.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        isEditable 
                          ? "bg-amber-50/40 border-amber-200 shadow-sm" 
                          : "bg-slate-50/60 border-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">{q.title}</span>
                        {isEditable ? (
                          <span className="text-[10px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded-full select-none flex items-center space-x-0.5">
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>允許線上更正項目</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-full select-none">
                            唯讀項目
                          </span>
                        )}
                      </div>

                      <div className="pt-1">
                        {isEditable ? (
                          // Render inputs for editing
                          <div>
                            {q.type === "SINGLE_CHOICE" && (
                              <select
                                id={`query-edit-select-${q.id}`}
                                value={currentValue !== undefined && currentValue !== null ? String(currentValue) : ""}
                                onChange={(e) => handleEditChange(q.id, e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:border-amber-500"
                              >
                                <option value="">--請選擇--</option>
                                {q.options?.map((opt, oIdx) => (
                                  <option key={oIdx} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}

                            {q.type === "MULTI_CHOICE" && (
                              <div className="space-y-1.5" id={`query-edit-multi-${q.id}`}>
                                {q.options?.map((opt, oIdx) => {
                                  const list = (currentValue as string[]) || [];
                                  const isChecked = list.includes(opt);
                                  return (
                                    <label key={oIdx} className="flex items-center space-x-2 text-xs cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          let newList = [...list];
                                          if (e.target.checked) {
                                            newList.push(opt);
                                          } else {
                                            newList = newList.filter(item => item !== opt);
                                          }
                                          handleEditChange(q.id, newList);
                                        }}
                                        className="w-3.5 h-3.5 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
                                      />
                                      <span className="text-slate-700">{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {(q.type === "SHORT_TEXT" || q.type === "PARAGRAPH") && (
                              <textarea
                                id={`query-edit-textarea-${q.id}`}
                                rows={q.type === "PARAGRAPH" ? 3 : 1}
                                value={currentValue !== undefined && currentValue !== null ? String(currentValue) : ""}
                                onChange={(e) => handleEditChange(q.id, e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:border-amber-500 font-sans"
                                placeholder="請輸入進行更正..."
                              />
                            )}

                            {q.type === "RATING" && (
                              <div className="flex items-center space-x-1.5" id={`query-edit-rating-${q.id}`}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => handleEditChange(q.id, star)}
                                    className="focus:outline-none cursor-pointer"
                                  >
                                    <svg
                                      className={`w-6 h-6 ${
                                        star <= (currentValue || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200"
                                      }`}
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                  </button>
                                ))}
                                <span className="text-xs text-slate-500 font-bold ml-2">({currentValue || 0}星)</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Render standard read-only styling
                          <div className="bg-slate-100/50 p-2.5 rounded-lg border border-slate-50 text-xs font-mono text-slate-700 leading-relaxed">
                            {currentValue === undefined || currentValue === null || (Array.isArray(currentValue) && currentValue.length === 0)
                              ? "（未填寫）"
                              : Array.isArray(currentValue)
                              ? currentValue.join(", ")
                              : String(currentValue)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Prominent Online correction button (線上修改更正) */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  id="query-online-correction-submit"
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center space-x-2 border-2 border-amber-300 ring-4 ring-amber-100 hover:scale-[1.02]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在儲存更正數據...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
                      <span className="tracking-wide">⚡ 儲存此檔案更正</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 h-96 flex flex-col justify-center items-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mb-2" />
            <h3 className="text-sm font-semibold text-slate-600">目前尚無選中的查詢數據</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
              請在此子查詢系統上方輸入您填寫後的「填寫問卷編號」（例如：<code className="text-amber-600 font-mono">resp-001</code>），並點擊「查詢」搜尋填答內容並進行線上即時答案更正。
            </p>
          </div>
        )}
      </div>

      {!isDirectLink && onBackList && (
        <button
          id="query-subsystem-back"
          onClick={onBackList}
          className="text-xs text-slate-400 hover:text-slate-600 font-semibold tracking-wide flex items-center space-x-1 mx-auto cursor-pointer"
        >
          <span>← 結束此獨立查詢系統，回到問卷大廳</span>
        </button>
      )}
    </div>
  );
}
