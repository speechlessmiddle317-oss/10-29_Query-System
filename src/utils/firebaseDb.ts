import { db, auth } from "../lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";
import { Questionnaire, SurveyResponse, AuditLog, AppUser, PromotionApplication } from "../types";
import {
  fetchUsersFromApi,
  saveUserToApi,
  saveAllUsersToApi,
  fetchQuestionnairesFromApi,
  saveQuestionnaireToApi,
  saveAllQuestionnairesToApi,
  deleteQuestionnaireFromApi,
  fetchResponsesFromApi,
  saveResponseToApi,
  saveAllResponsesToApi,
  fetchAuditLogsFromApi,
  saveAuditLogToApi,
  deleteAuditLogFromApi,
  clearAllAuditLogsFromApi,
  saveAllAuditLogsToApi,
  fetchPromotionsFromApi,
  savePromotionToApi,
  saveAllPromotionsToApi,
  fetchCheatReportsFromApi,
  saveAllCheatReportsToApi,
  fetchQuotaRequestsFromApi,
  saveAllQuotaRequestsToApi,
  fetchTriviaQuestionsFromApi,
  saveAllTriviaQuestionsToApi,
  fetchSiteUpdateLogsFromApi,
  saveSiteUpdateLogToApi,
  saveAllSiteUpdateLogsToApi,
  checkSqlServerStatus
} from "./sqlServerApi";
export { checkSqlServerStatus };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Track write quota exhaustion & offline connectivity
let writeQuotaExhaustedInMemory = false;
let firestoreOfflineInMemory = false;

export function getIsFirestoreOffline(): boolean {
  return firestoreOfflineInMemory;
}

export function setIsFirestoreOffline(offline: boolean): void {
  firestoreOfflineInMemory = offline;
}

export function isWriteQuotaExhausted(): boolean {
  if (writeQuotaExhaustedInMemory) return true;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("firestore_write_quota_exhausted");
      if (stored) {
        const timestamp = parseInt(stored, 10);
        // Quota resets daily, but keep cache valid for at least 30 minutes
        if (Date.now() - timestamp < 30 * 60 * 1000) {
          writeQuotaExhaustedInMemory = true;
          return true;
        } else {
          sessionStorage.removeItem("firestore_write_quota_exhausted");
        }
      }
    } catch {
      // ignore
    }
  }
  return false;
}

export function setWriteQuotaExhausted(exhausted: boolean): void {
  writeQuotaExhaustedInMemory = exhausted;
  if (typeof window !== "undefined") {
    try {
      if (exhausted) {
        sessionStorage.setItem("firestore_write_quota_exhausted", String(Date.now()));
        console.warn("⚠️ [Firebase] Daily free write quota reached. System is operating safely in local persistence mode without interruptions.");
      } else {
        sessionStorage.removeItem("firestore_write_quota_exhausted");
      }
    } catch {
      // ignore
    }
  }
}

export function isQuotaExhaustedError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as any)?.code;
  return (
    code === "resource-exhausted" ||
    msg.includes("resource-exhausted") ||
    msg.includes("Quota limit exceeded") ||
    msg.includes("Free daily write units")
  );
}

export function isNetworkOrUnavailableError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as any)?.code;
  return (
    code === "unavailable" ||
    code === "failed-precondition" ||
    code === "deadline-exceeded" ||
    msg.includes("unavailable") ||
    msg.includes("code=unavailable") ||
    msg.includes("Could not reach Cloud Firestore backend") ||
    msg.includes("client is offline") ||
    msg.includes("Failed to get document because the client is offline") ||
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("network-request-failed") ||
    msg.includes("The operation could not be completed")
  );
}

// Helper to safely retrieve local cache during offline/unreachable states
export function getLocalCachedList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getLocalCachedMap(key: string): Record<string, any> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Reset offline flag when browser comes back online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    firestoreOfflineInMemory = false;
    console.info("[Firebase] Network restored: Firestore connection will auto-resume.");
  });
}

// Global flag to prevent writing back to Firestore during hydration
let isSyncingFromFirestore = false;
export function setIsSyncingFromFirestore(val: boolean) {
  isSyncingFromFirestore = val;
}
export function getIsSyncingFromFirestore(): boolean {
  return isSyncingFromFirestore;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isQuotaExhaustedError(error)) {
    setWriteQuotaExhausted(true);
  }
  if (isNetworkOrUnavailableError(error)) {
    setIsFirestoreOffline(true);
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to check if database has seeded data
export async function isCollectionEmpty(collectionName: string): Promise<boolean> {
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) {
    return false;
  }
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.empty;
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      setWriteQuotaExhausted(true);
      return false;
    }
    if (isNetworkOrUnavailableError(error)) {
      setIsFirestoreOffline(true);
      return false;
    }
    handleFirestoreError(error, OperationType.GET, collectionName);
  }
}

// === USERS COLLECTION ===
export async function saveUserToFirestore(username: string, userData: any): Promise<void> {
  if (!username) return;
  // Persist to SQL Server API
  saveUserToApi({ ...userData, username }).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  const lowercaseUsername = username.toLowerCase();
  const path = `users/${lowercaseUsername}`;
  try {
    await setDoc(doc(db, "users", lowercaseUsername), {
      ...userData,
      username: username // preserve capitalization if any
    }, { merge: true });
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllUsersToFirestore(usersMap: Record<string, any>): Promise<void> {
  // Persist to SQL Server API
  saveAllUsersToApi(usersMap).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  try {
    const batch = writeBatch(db);
    Object.entries(usersMap).forEach(([rawUsername, userData]) => {
      const lowercaseUsername = rawUsername.toLowerCase();
      const userRef = doc(db, "users", lowercaseUsername);
      batch.set(userRef, {
        ...userData,
        username: rawUsername
      }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, "users");
  }
}

export async function deleteUserFromFirestore(username: string): Promise<boolean> {
  if (!username) return false;

  if (!db || getIsFirestoreOffline() || isWriteQuotaExhausted()) {
    return true;
  }
  try {
    await deleteDoc(doc(db, "users", username.toLowerCase()));
    return true;
  } catch (e) {
    console.warn("Disaster recovery deletion notice:", e);
    return false;
  }
}

export async function fetchUsersFromFirestore(): Promise<Record<string, any>> {
  // Authoritative user records are strictly retrieved from SQL Server via GET /api/users.
  // Firestore is maintained solely as an asynchronous disaster recovery replica,
  // and neither Firestore nor localStorage is ever used as a read source for formal user accounts.
  try {
    const apiUsers = await fetchUsersFromApi();
    if (apiUsers && Object.keys(apiUsers).length > 0) {
      return apiUsers;
    }
  } catch (err) {
    console.warn("fetchUsersFromApi error:", err);
  }
  return {};
}

// === QUESTIONNAIRES ===
export async function saveQuestionnaireToFirestore(q: Questionnaire): Promise<void> {
  if (!q.id) return;
  saveQuestionnaireToApi(q).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  const path = `questionnaires/${q.id}`;
  try {
    await setDoc(doc(db, "questionnaires", q.id), q);
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllQuestionnairesToFirestore(qs: Questionnaire[]): Promise<void> {
  saveAllQuestionnairesToApi(qs).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  try {
    const batch = writeBatch(db);
    qs.forEach((q) => {
      if (!q.id) return;
      const ref = doc(db, "questionnaires", q.id);
      batch.set(ref, q);
    });
    await batch.commit();
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, "questionnaires");
  }
}

export async function fetchQuestionnairesFromFirestore(): Promise<Questionnaire[]> {
  try {
    const apiQs = await fetchQuestionnairesFromApi();
    if (apiQs && apiQs.length > 0) {
      return apiQs;
    }
  } catch {
    // fallback
  }

  const list: Questionnaire[] = [];
  if (getIsFirestoreOffline()) {
    return getLocalCachedList<Questionnaire>("sub_surveys");
  }
  try {
    const snapshot = await getDocs(collection(db, "questionnaires"));
    snapshot.forEach((document) => {
      list.push(document.data() as Questionnaire);
    });
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      console.warn("[Firebase] Quota reached while fetching questionnaires. Using local cache.");
      return getLocalCachedList<Questionnaire>("sub_surveys");
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      console.info("[Firebase] Firestore offline while fetching questionnaires. Using local cache.");
      return getLocalCachedList<Questionnaire>("sub_surveys");
    }
    handleFirestoreError(err, OperationType.GET, "questionnaires");
  }
  return list;
}

export async function deleteQuestionnaireFromFirestore(id: string): Promise<void> {
  deleteQuestionnaireFromApi(id).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  const path = `questionnaires/${id}`;
  try {
    await deleteDoc(doc(db, "questionnaires", id));
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// === RESPONSES ===
export async function saveResponseToFirestore(r: SurveyResponse): Promise<void> {
  if (!r.id) return;
  saveResponseToApi(r).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  const path = `responses/${r.id}`;
  try {
    await setDoc(doc(db, "responses", r.id), r);
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllResponsesToFirestore(rs: SurveyResponse[]): Promise<void> {
  saveAllResponsesToApi(rs).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  try {
    const batch = writeBatch(db);
    rs.forEach((r) => {
      if (!r.id) return;
      const ref = doc(db, "responses", r.id);
      batch.set(ref, r);
    });
    await batch.commit();
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, "responses");
  }
}

export async function fetchResponsesFromFirestore(): Promise<SurveyResponse[]> {
  try {
    const apiResponses = await fetchResponsesFromApi();
    if (apiResponses && apiResponses.length > 0) {
      return apiResponses;
    }
  } catch {
    // fallback
  }

  const list: SurveyResponse[] = [];
  if (getIsFirestoreOffline()) {
    return getLocalCachedList<SurveyResponse>("sub_responses");
  }
  try {
    const snapshot = await getDocs(collection(db, "responses"));
    snapshot.forEach((document) => {
      list.push(document.data() as SurveyResponse);
    });
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      console.warn("[Firebase] Quota reached while fetching responses. Using local cache.");
      return getLocalCachedList<SurveyResponse>("sub_responses");
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      console.info("[Firebase] Firestore offline while fetching responses. Using local cache.");
      return getLocalCachedList<SurveyResponse>("sub_responses");
    }
    handleFirestoreError(err, OperationType.GET, "responses");
  }
  return list;
}

// === AUDIT LOGS ===
export async function saveAuditLogToFirestore(log: AuditLog): Promise<void> {
  if (!log.id) return;
  saveAuditLogToApi(log).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  const path = `audit_logs/${log.id}`;
  try {
    await setDoc(doc(db, "audit_logs", log.id), log);
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteAuditLogFromFirestore(logId: string): Promise<void> {
  if (!logId) return;
  deleteAuditLogFromApi(logId).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  const path = `audit_logs/${logId}`;
  try {
    await deleteDoc(doc(db, "audit_logs", logId));
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function clearAllAuditLogsFromFirestore(): Promise<void> {
  clearAllAuditLogsFromApi().catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  try {
    const snapshot = await getDocs(collection(db, "audit_logs"));
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, "audit_logs");
  }
}

export async function saveAllAuditLogsToFirestore(logs: AuditLog[]): Promise<void> {
  saveAllAuditLogsToApi(logs).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  try {
    const batch = writeBatch(db);
    logs.forEach((log) => {
      if (!log.id) return;
      const ref = doc(db, "audit_logs", log.id);
      batch.set(ref, log);
    });
    await batch.commit();
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, "audit_logs");
  }
}

export async function fetchAuditLogsFromFirestore(): Promise<AuditLog[]> {
  try {
    const apiLogs = await fetchAuditLogsFromApi();
    if (apiLogs && apiLogs.length > 0) {
      return apiLogs;
    }
  } catch {
    // fallback
  }

  const list: AuditLog[] = [];
  if (getIsFirestoreOffline()) {
    return getLocalCachedList<AuditLog>("sub_logs");
  }
  try {
    const snapshot = await getDocs(collection(db, "audit_logs"));
    snapshot.forEach((document) => {
      list.push(document.data() as AuditLog);
    });
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      console.warn("[Firebase] Quota reached while fetching audit logs. Using local cache.");
      return getLocalCachedList<AuditLog>("sub_logs");
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      console.info("[Firebase] Firestore offline while fetching audit logs. Using local cache.");
      return getLocalCachedList<AuditLog>("sub_logs");
    }
    handleFirestoreError(err, OperationType.GET, "audit_logs");
  }
  return list;
}

// === PROMOTIONS ===
export async function savePromotionToFirestore(promo: PromotionApplication): Promise<void> {
  if (!promo.id) return;
  savePromotionToApi(promo).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  const path = `promotions/${promo.id}`;
  try {
    await setDoc(doc(db, "promotions", promo.id), promo);
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllPromotionsToFirestore(promos: PromotionApplication[]): Promise<void> {
  saveAllPromotionsToApi(promos).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  try {
    const batch = writeBatch(db);
    promos.forEach((p) => {
      if (!p.id) return;
      const ref = doc(db, "promotions", p.id);
      batch.set(ref, p);
    });
    await batch.commit();
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, "promotions");
  }
}

export async function fetchPromotionsFromFirestore(): Promise<PromotionApplication[]> {
  try {
    const apiPromos = await fetchPromotionsFromApi();
    if (apiPromos && apiPromos.length > 0) {
      return apiPromos;
    }
  } catch {
    // fallback
  }

  const list: PromotionApplication[] = [];
  if (getIsFirestoreOffline()) {
    return getLocalCachedList<PromotionApplication>("sub_promotions");
  }
  try {
    const snapshot = await getDocs(collection(db, "promotions"));
    snapshot.forEach((document) => {
      list.push(document.data() as PromotionApplication);
    });
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      console.warn("[Firebase] Quota reached while fetching promotions. Using local cache.");
      return getLocalCachedList<PromotionApplication>("sub_promotions");
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      console.info("[Firebase] Firestore offline while fetching promotions. Using local cache.");
      return getLocalCachedList<PromotionApplication>("sub_promotions");
    }
    handleFirestoreError(err, OperationType.GET, "promotions");
  }
  return list;
}

// === CHEAT REPORTS ===
export async function saveCheatReportToFirestore(report: any): Promise<void> {
  if (!report.id) return;
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  const path = `cheat_reports/${report.id}`;
  try {
    await setDoc(doc(db, "cheat_reports", report.id), report);
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllCheatReportsToFirestore(reports: any[]): Promise<void> {
  saveAllCheatReportsToApi(reports).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  try {
    const batch = writeBatch(db);
    reports.forEach((rep) => {
      if (!rep.id) return;
      const ref = doc(db, "cheat_reports", rep.id);
      batch.set(ref, rep);
    });
    await batch.commit();
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, "cheat_reports");
  }
}

export async function fetchCheatReportsFromFirestore(): Promise<any[]> {
  try {
    const apiReports = await fetchCheatReportsFromApi();
    if (apiReports && apiReports.length > 0) {
      return apiReports;
    }
  } catch {
    // fallback
  }

  const list: any[] = [];
  if (getIsFirestoreOffline()) {
    return getLocalCachedList<any>("global_cheat_reports");
  }
  try {
    const snapshot = await getDocs(collection(db, "cheat_reports"));
    snapshot.forEach((document) => {
      list.push(document.data());
    });
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      console.warn("[Firebase] Quota reached while fetching cheat reports. Using local cache.");
      return getLocalCachedList<any>("global_cheat_reports");
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      console.info("[Firebase] Firestore offline while fetching cheat reports. Using local cache.");
      return getLocalCachedList<any>("global_cheat_reports");
    }
    handleFirestoreError(err, OperationType.GET, "cheat_reports");
  }
  return list;
}

// === QUOTA REQUESTS ===
export async function saveQuotaRequestToFirestore(req: any): Promise<void> {
  if (!req.id) return;
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  const path = `quota_requests/${req.id}`;
  try {
    await setDoc(doc(db, "quota_requests", req.id), req);
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAllQuotaRequestsToFirestore(requests: any[]): Promise<void> {
  saveAllQuotaRequestsToApi(requests).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  try {
    const batch = writeBatch(db);
    requests.forEach((req) => {
      if (!req.id) return;
      const ref = doc(db, "quota_requests", req.id);
      batch.set(ref, req);
    });
    await batch.commit();
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, "quota_requests");
  }
}

export async function fetchQuotaRequestsFromFirestore(): Promise<any[]> {
  try {
    const apiReqs = await fetchQuotaRequestsFromApi();
    if (apiReqs && apiReqs.length > 0) {
      return apiReqs;
    }
  } catch {
    // fallback
  }

  const list: any[] = [];
  if (getIsFirestoreOffline()) {
    return getLocalCachedList<any>("global_quota_requests");
  }
  try {
    const snapshot = await getDocs(collection(db, "quota_requests"));
    snapshot.forEach((document) => {
      list.push(document.data());
    });
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      console.warn("[Firebase] Quota reached while fetching quota requests. Using local cache.");
      return getLocalCachedList<any>("global_quota_requests");
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      console.info("[Firebase] Firestore offline while fetching quota requests. Using local cache.");
      return getLocalCachedList<any>("global_quota_requests");
    }
    handleFirestoreError(err, OperationType.GET, "quota_requests");
  }
  return list;
}

// === TRIVIA QUESTIONS ===
export async function saveAllTriviaQuestionsToFirestore(questions: any[]): Promise<void> {
  saveAllTriviaQuestionsToApi(questions).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  try {
    const batch = writeBatch(db);
    questions.forEach((q, i) => {
      const qId = q.id || `trivia-${i}`;
      const ref = doc(db, "trivia_questions", String(qId));
      batch.set(ref, { ...q, id: qId });
    });
    await batch.commit();
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, "trivia_questions");
  }
}

export async function fetchTriviaQuestionsFromFirestore(): Promise<any[]> {
  try {
    const apiTrivia = await fetchTriviaQuestionsFromApi();
    if (apiTrivia && apiTrivia.length > 0) {
      return apiTrivia;
    }
  } catch {
    // fallback
  }

  const list: any[] = [];
  if (getIsFirestoreOffline()) {
    return getLocalCachedList<any>("sub_trivia_questions");
  }
  try {
    const snapshot = await getDocs(collection(db, "trivia_questions"));
    snapshot.forEach((document) => {
      list.push(document.data());
    });
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      console.warn("[Firebase] Quota reached while fetching trivia questions. Using local cache.");
      return getLocalCachedList<any>("sub_trivia_questions");
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      console.info("[Firebase] Firestore offline while fetching trivia questions. Using local cache.");
      return getLocalCachedList<any>("sub_trivia_questions");
    }
    handleFirestoreError(err, OperationType.GET, "trivia_questions");
  }
  return list;
}

// === SITE UPDATE LOGS (網站功能更新日誌) ===
export async function saveAllSiteUpdateLogsToFirestore(logs: any[]): Promise<void> {
  saveAllSiteUpdateLogsToApi(logs).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  try {
    const batch = writeBatch(db);
    logs.forEach((item) => {
      const ref = doc(db, "site_update_logs", String(item.id));
      batch.set(ref, item);
    });
    await batch.commit();
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, "site_update_logs");
  }
}

export async function saveSiteUpdateLogToFirestore(item: any): Promise<void> {
  saveSiteUpdateLogToApi(item).catch(() => {});
  if (isWriteQuotaExhausted() || getIsFirestoreOffline()) return;
  try {
    const ref = doc(db, "site_update_logs", String(item.id));
    await setDoc(ref, item);
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      return;
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      return;
    }
    handleFirestoreError(err, OperationType.CREATE, `site_update_logs/${item.id}`);
  }
}

export async function fetchSiteUpdateLogsFromFirestore(): Promise<any[]> {
  try {
    const apiLogs = await fetchSiteUpdateLogsFromApi();
    if (apiLogs && apiLogs.length > 0) {
      return apiLogs;
    }
  } catch {
    // fallback
  }

  const list: any[] = [];
  if (getIsFirestoreOffline()) {
    return getLocalCachedList<any>("sub_site_update_logs");
  }
  try {
    const snapshot = await getDocs(collection(db, "site_update_logs"));
    snapshot.forEach((document) => {
      list.push(document.data());
    });
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      setWriteQuotaExhausted(true);
      console.warn("[Firebase] Quota reached while fetching site update logs. Using local cache.");
      return getLocalCachedList<any>("sub_site_update_logs");
    }
    if (isNetworkOrUnavailableError(err)) {
      setIsFirestoreOffline(true);
      console.info("[Firebase] Firestore offline while fetching site update logs. Using local cache.");
      return getLocalCachedList<any>("sub_site_update_logs");
    }
    handleFirestoreError(err, OperationType.GET, "site_update_logs");
  }
  return list;
}
