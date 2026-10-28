import {
  saveAllQuestionnairesToFirestore,
  saveAllResponsesToFirestore,
  saveAllAuditLogsToFirestore,
  saveAllPromotionsToFirestore,
  saveAllCheatReportsToFirestore,
  saveAllQuotaRequestsToFirestore,
  saveAllTriviaQuestionsToFirestore,
  getIsSyncingFromFirestore,
  isWriteQuotaExhausted,
  getIsFirestoreOffline
} from "../utils/firebaseDb";

if (typeof window !== "undefined") {
  const originalSetItem = localStorage.setItem;
  const syncTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  localStorage.setItem = function (key: string, value: string) {
    // Write locally first for zero-latency UI
    originalSetItem.apply(this, [key, value]);
    
    // Do not sync back while hydrating data from Firestore
    if (getIsSyncingFromFirestore()) {
      return;
    }

    // Do not attempt if quota is already exhausted or offline
    if (isWriteQuotaExhausted() || getIsFirestoreOffline()) {
      return;
    }

    // Debounce writes by key so rapid updates are batched together
    if (syncTimers[key]) {
      clearTimeout(syncTimers[key]);
    }

    syncTimers[key] = setTimeout(() => {
      delete syncTimers[key];
      if (getIsSyncingFromFirestore() || isWriteQuotaExhausted() || getIsFirestoreOffline()) return;

      try {
        const parsed = JSON.parse(value);
        if (key === "sub_surveys") {
          saveAllQuestionnairesToFirestore(parsed);
        } else if (key === "sub_responses") {
          saveAllResponsesToFirestore(parsed);
        } else if (key === "sub_logs") {
          saveAllAuditLogsToFirestore(parsed);
        } else if (key === "sub_promotions") {
          saveAllPromotionsToFirestore(parsed);
        } else if (key === "global_cheat_reports") {
          saveAllCheatReportsToFirestore(parsed);
        } else if (key === "global_quota_requests") {
          saveAllQuotaRequestsToFirestore(parsed);
        } else if (key === "sub_trivia_questions") {
          saveAllTriviaQuestionsToFirestore(parsed);
        }
      } catch {
        // Skip non-JSON or other simple preferences keys
      }
    }, 1200);
  };
}

