import {
  VaultState,
  DialogueTurn,
  LiveSubtitleSegment,
  MenuScanSession,
  CustomPhraseCard,
  ShoppingCalcItem,
  createInitialVaultState,
} from '../types/travel';
import {
  deriveVaultIdentity,
  encryptVaultPayload,
  decryptVaultPayload,
  normalizePasscode,
  getPasscodeFallbackVariants,
} from './cryptoVault';

const LOCAL_STATE_KEY = 'bobotalk_state_v1';
const LAST_NONEMPTY_STATE_KEY = 'bobotalk_last_nonempty_v1';
const LOCAL_PASSCODE_KEY = 'bobotalk_saved_passcode_v1';

const TEXTDB_UPDATE_URL = 'https://api.textdb.online/update/';
const TEXTDB_READ_URL = 'https://textdb.online';
const TEXTDB_DEV_API_URL = 'https://textdb.dev/api/data';
const NTFY_BASE_URL = 'https://ntfy.sh';

const IDB_NAME = 'BoboTravelTalkDB';
const IDB_KV_STORE = 'kv';
const IDB_PHOTO_STORE = 'photos';
const IDB_STATE_KEY = 'vault_state_v1';
const IDB_PASS_KEY = 'saved_passcode_v1';
const IDB_SNAPSHOTS_KEY = 'history_snapshots_v1';
const IDB_TIMEOUT_MS = 8000;

const CLOUD_CHUNK_PREFIX = 'BTCHUNK1:';
const CLOUD_CHUNK_MAX_CHARS = 40000;
const LOCALSTORAGE_MAX_INLINE_CHARS = 85000;

export interface LocalHistorySnapshot {
  id: string;
  savedAt: number;
  dialogueCount: number;
  phraseCount: number;
  menuCount: number;
  stateJson: string;
}

export async function requestPersistentStorage(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      await Promise.race([
        navigator.storage.persist(),
        new Promise<void>((resolve) => setTimeout(resolve, 1200)),
      ]);
    }
  } catch {
    // Ignore unsupported environments
  }
}

function withIdbTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, IDB_TIMEOUT_MS);
    promise
      .then((val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

let cachedDbPromise: Promise<IDBDatabase | null> | null = null;

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (cachedDbPromise) return cachedDbPromise;
  const rawPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_KV_STORE)) db.createObjectStore(IDB_KV_STORE);
        if (!db.objectStoreNames.contains(IDB_PHOTO_STORE)) db.createObjectStore(IDB_PHOTO_STORE);
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          cachedDbPromise = null;
        };
        db.onclose = () => {
          cachedDbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        cachedDbPromise = null;
        resolve(null);
      };
      req.onblocked = () => {
        cachedDbPromise = null;
        resolve(null);
      };
    } catch {
      cachedDbPromise = null;
      resolve(null);
    }
  });
  cachedDbPromise = withIdbTimeout(rawPromise, null).then((db) => {
    if (!db) cachedDbPromise = null;
    return db;
  });
  return cachedDbPromise;
}

async function idbPut(storeName: string, key: string, value: string): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  const op = new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      cachedDbPromise = null;
      resolve();
    }
  });
  await withIdbTimeout(op, undefined);
}

async function idbGet(storeName: string, key: string): Promise<string | null> {
  const db = await openIdb();
  if (!db) return null;
  const op = new Promise<string | null>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      cachedDbPromise = null;
      resolve(null);
    }
  });
  return withIdbTimeout(op, null);
}

export async function saveLocalMenuPhoto(menuId: string, dataUrl: string): Promise<void> {
  await idbPut(IDB_PHOTO_STORE, `menu:${menuId}`, dataUrl);
}

export async function getLocalMenuPhoto(menuId: string): Promise<string | null> {
  return idbGet(IDB_PHOTO_STORE, `menu:${menuId}`);
}

export function parseVaultJson(raw: string | null | undefined): VaultState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<VaultState>;
    if (!parsed || typeof parsed !== 'object') return null;
    const base = createInitialVaultState();
    return {
      ...base,
      ...parsed,
      version: 1,
      profile: {
        ...base.profile,
        ...(parsed.profile || {}),
        customRatesToTwd: {
          ...base.profile.customRatesToTwd,
          ...(parsed.profile?.customRatesToTwd || {}),
        },
      },
      dialogues: Array.isArray(parsed.dialogues) ? parsed.dialogues : [],
      liveSubtitles: Array.isArray(parsed.liveSubtitles) ? parsed.liveSubtitles : [],
      menuSessions: Array.isArray(parsed.menuSessions) ? parsed.menuSessions : [],
      customPhrases: Array.isArray(parsed.customPhrases) ? parsed.customPhrases : [],
      shoppingItems: Array.isArray(parsed.shoppingItems) ? parsed.shoppingItems : [],
      deletedIds: parsed.deletedIds && typeof parsed.deletedIds === 'object' ? parsed.deletedIds : {},
    };
  } catch {
    return null;
  }
}

export function hasUserRecords(state: VaultState): boolean {
  return (
    state.dialogues.length > 0 ||
    state.liveSubtitles.length > 0 ||
    state.menuSessions.length > 0 ||
    state.customPhrases.length > 0 ||
    state.shoppingItems.length > 0 ||
    Boolean(state.profile.geminiApiKey)
  );
}

function stripPhotosForLocalStorage(state: VaultState): VaultState {
  return {
    ...state,
    menuSessions: state.menuSessions.map(({ photoThumb: _omit, ...rest }) => rest),
  };
}

function tryWriteLocalStorageWithSlimFallback(key: string, fullRaw: string, state: VaultState): void {
  const toWrite =
    fullRaw.length <= LOCALSTORAGE_MAX_INLINE_CHARS
      ? fullRaw
      : JSON.stringify(stripPhotosForLocalStorage(state));
  try {
    localStorage.setItem(key, toWrite);
  } catch {
    try {
      localStorage.setItem(key, JSON.stringify(stripPhotosForLocalStorage(state)));
    } catch {
      // Shared github.io origin quota full; IndexedDB retains full state safely
    }
  }
}

export function loadLocalVaultSync(): VaultState {
  let primary: VaultState | null = null;
  let backup: VaultState | null = null;
  try {
    primary = parseVaultJson(localStorage.getItem(LOCAL_STATE_KEY));
  } catch {
    primary = null;
  }
  try {
    backup = parseVaultJson(localStorage.getItem(LAST_NONEMPTY_STATE_KEY));
  } catch {
    backup = null;
  }
  if (primary && backup) return mergeVaultStates(primary, backup);
  return primary || backup || createInitialVaultState();
}

export function loadRememberedPasscodeSync(): string {
  try {
    return normalizePasscode(localStorage.getItem(LOCAL_PASSCODE_KEY) || '');
  } catch {
    return '';
  }
}

async function appendRollingHistorySnapshot(state: VaultState, fullRaw: string): Promise<void> {
  if (!hasUserRecords(state)) return;
  try {
    const existingRaw = await idbGet(IDB_KV_STORE, IDB_SNAPSHOTS_KEY);
    const list: LocalHistorySnapshot[] = existingRaw ? JSON.parse(existingRaw) : [];
    const safeList = Array.isArray(list) ? list : [];
    const now = Date.now();
    const latest = safeList[0];
    const dialogueCount = state.dialogues.length;
    const phraseCount = state.customPhrases.length;
    const menuCount = state.menuSessions.length;
    if (
      latest &&
      now - latest.savedAt < 90_000 &&
      latest.dialogueCount === dialogueCount &&
      latest.phraseCount === phraseCount &&
      latest.menuCount === menuCount
    ) {
      const updatedTop: LocalHistorySnapshot = { ...latest, savedAt: now, stateJson: fullRaw };
      await idbPut(
        IDB_KV_STORE,
        IDB_SNAPSHOTS_KEY,
        JSON.stringify([updatedTop, ...safeList.slice(1, 8)])
      );
      return;
    }
    const snap: LocalHistorySnapshot = {
      id: `snap-${now}`,
      savedAt: now,
      dialogueCount,
      phraseCount,
      menuCount,
      stateJson: fullRaw,
    };
    await idbPut(IDB_KV_STORE, IDB_SNAPSHOTS_KEY, JSON.stringify([snap, ...safeList].slice(0, 8)));
  } catch {
    // Ignore snapshot errors
  }
}

export async function listLocalHistorySnapshots(): Promise<LocalHistorySnapshot[]> {
  try {
    const raw = await idbGet(IDB_KV_STORE, IDB_SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveLocalVaultState(state: VaultState): Promise<void> {
  if (state.isUneditedDefault && !hasUserRecords(state)) {
    const existing = loadLocalVaultSync();
    if (!existing.isUneditedDefault || hasUserRecords(existing)) return;
  }
  const fullRaw = JSON.stringify(state);
  tryWriteLocalStorageWithSlimFallback(LOCAL_STATE_KEY, fullRaw, state);
  if (hasUserRecords(state)) {
    tryWriteLocalStorageWithSlimFallback(LAST_NONEMPTY_STATE_KEY, fullRaw, state);
  }

  const photoWrites: Array<Promise<void>> = [];
  for (const m of state.menuSessions.slice(0, 20)) {
    if (m.photoThumb?.startsWith('data:image/')) {
      photoWrites.push(idbPut(IDB_PHOTO_STORE, `thumb:menu:${m.id}`, m.photoThumb));
    }
  }
  await Promise.all([idbPut(IDB_KV_STORE, IDB_STATE_KEY, fullRaw), ...photoWrites]);
  if (hasUserRecords(state)) {
    await appendRollingHistorySnapshot(state, fullRaw);
  }
}

async function hydrateThumbsFromIdb(state: VaultState): Promise<VaultState> {
  const menuSessions = await Promise.all(
    state.menuSessions.map(async (m) => {
      if (m.photoThumb) return m;
      const t = await idbGet(IDB_PHOTO_STORE, `thumb:menu:${m.id}`);
      return t ? { ...m, photoThumb: t } : m;
    })
  );
  return { ...state, menuSessions };
}

export async function loadLocalVaultState(): Promise<VaultState> {
  let merged = loadLocalVaultSync();
  const idbRaw = await idbGet(IDB_KV_STORE, IDB_STATE_KEY);
  const idbState = parseVaultJson(idbRaw);
  if (idbState) merged = mergeVaultStates(merged, idbState);

  if (!hasUserRecords(merged) && merged.isUneditedDefault) {
    const snaps = await listLocalHistorySnapshots();
    if (snaps.length > 0) {
      const snapState = parseVaultJson(snaps[0].stateJson);
      if (snapState && hasUserRecords(snapState)) merged = mergeVaultStates(merged, snapState);
    }
  }

  merged = await hydrateThumbsFromIdb(merged);

  if (!merged.isUneditedDefault) {
    const fullRaw = JSON.stringify(merged);
    tryWriteLocalStorageWithSlimFallback(LOCAL_STATE_KEY, fullRaw, merged);
    if (hasUserRecords(merged)) {
      tryWriteLocalStorageWithSlimFallback(LAST_NONEMPTY_STATE_KEY, fullRaw, merged);
    }
    await idbPut(IDB_KV_STORE, IDB_STATE_KEY, fullRaw);
  }
  return merged;
}

export async function saveRememberedPasscode(passcode: string): Promise<void> {
  const clean = normalizePasscode(passcode);
  try {
    if (clean) localStorage.setItem(LOCAL_PASSCODE_KEY, clean);
    else localStorage.removeItem(LOCAL_PASSCODE_KEY);
  } catch {
    // Ignore quota errors
  }
  await idbPut(IDB_KV_STORE, IDB_PASS_KEY, clean);
}

export async function loadRememberedPasscode(): Promise<string> {
  let saved = loadRememberedPasscodeSync();
  if (!saved) {
    saved = (await idbGet(IDB_KV_STORE, IDB_PASS_KEY)) || '';
    if (saved) {
      try {
        localStorage.setItem(LOCAL_PASSCODE_KEY, saved);
      } catch {
        // Ignore
      }
    }
  }
  return normalizePasscode(saved);
}

function mergeById<T extends { id: string; updatedAt: number; createdAt: number }>(
  remote: T[],
  local: T[],
  deletedIds: Record<string, number>,
  keepPhoto?: (prev: T | undefined, next: T) => T
): T[] {
  const map = new Map<string, T>();
  for (const item of [...remote, ...local]) {
    if (!item || !item.id) continue;
    const itemTs = item.updatedAt || item.createdAt || 0;
    const delTs = deletedIds[item.id];
    if (delTs && delTs >= itemTs) continue;
    const prev = map.get(item.id);
    if (!prev || itemTs >= (prev.updatedAt || prev.createdAt || 0)) {
      map.set(item.id, keepPhoto ? keepPhoto(prev, item) : item);
    } else if (keepPhoto) {
      map.set(item.id, keepPhoto(item, prev));
    }
  }
  return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * 防空白覆蓋與墓碑合併演算法 (Anti-Overwrite Merge & Tombstones)
 */
export function mergeVaultStates(local: VaultState, remote: VaultState): VaultState {
  if (local.isUneditedDefault && !remote.isUneditedDefault) {
    return { ...remote, isUneditedDefault: false };
  }
  if (remote.isUneditedDefault && !local.isUneditedDefault) {
    return { ...local, isUneditedDefault: false };
  }

  const deletedIds: Record<string, number> = { ...(remote.deletedIds || {}) };
  for (const [id, ts] of Object.entries(local.deletedIds || {})) {
    if (!deletedIds[id] || ts > deletedIds[id]) deletedIds[id] = ts;
  }

  const dialogues = mergeById<DialogueTurn>(remote.dialogues || [], local.dialogues || [], deletedIds);
  const liveSubtitles = mergeById<LiveSubtitleSegment>(
    remote.liveSubtitles || [],
    local.liveSubtitles || [],
    deletedIds
  );
  const menuSessions = mergeById<MenuScanSession>(
    remote.menuSessions || [],
    local.menuSessions || [],
    deletedIds,
    (prev, next) => ({
      ...prev,
      ...next,
      photoThumb: next.photoThumb || prev?.photoThumb,
      hasLocalHiResPhoto: Boolean(
        next.hasLocalHiResPhoto || prev?.hasLocalHiResPhoto || next.photoThumb || prev?.photoThumb
      ),
    })
  );
  const customPhrases = mergeById<CustomPhraseCard>(
    remote.customPhrases || [],
    local.customPhrases || [],
    deletedIds
  );
  const shoppingItems = mergeById<ShoppingCalcItem>(
    remote.shoppingItems || [],
    local.shoppingItems || [],
    deletedIds
  );

  const localSettingsNewer = (local.settingsUpdatedAt || 0) >= (remote.settingsUpdatedAt || 0);
  const profile = localSettingsNewer
    ? {
        ...remote.profile,
        ...local.profile,
        geminiApiKey: local.profile.geminiApiKey || remote.profile.geminiApiKey || '',
        customRatesToTwd: {
          ...(remote.profile?.customRatesToTwd || {}),
          ...(local.profile?.customRatesToTwd || {}),
        },
      }
    : {
        ...local.profile,
        ...remote.profile,
        geminiApiKey: remote.profile.geminiApiKey || local.profile.geminiApiKey || '',
        customRatesToTwd: {
          ...(local.profile?.customRatesToTwd || {}),
          ...(remote.profile?.customRatesToTwd || {}),
        },
      };

  const maxUpdatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
  const maxSettingsAt = Math.max(local.settingsUpdatedAt || 0, remote.settingsUpdatedAt || 0);
  const hasAnyEdit =
    !local.isUneditedDefault ||
    !remote.isUneditedDefault ||
    maxUpdatedAt > 0 ||
    dialogues.length > 0 ||
    liveSubtitles.length > 0 ||
    menuSessions.length > 0 ||
    customPhrases.length > 0 ||
    shoppingItems.length > 0;

  return {
    version: 1,
    updatedAt: maxUpdatedAt,
    settingsUpdatedAt: maxSettingsAt,
    isUneditedDefault: !hasAnyEdit,
    profile,
    dialogues,
    liveSubtitles,
    menuSessions,
    customPhrases,
    shoppingItems,
    deletedIds,
  };
}

export function compactStateForCloud(state: VaultState): VaultState {
  const menuSessions = state.menuSessions.map((m, idx) => {
    const flagged = { ...m, hasLocalHiResPhoto: Boolean(m.hasLocalHiResPhoto || m.photoThumb) };
    if (idx < 5) return flagged;
    const { photoThumb: _omit, ...rest } = flagged;
    return rest;
  });
  return { ...state, menuSessions };
}

export function buildTextDbFormBody(key: string, value: string): string {
  return new URLSearchParams({ key, value }).toString();
}

async function writeTextDbOnlineSingle(key: string, value: string): Promise<boolean> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8500) : null;
  try {
    const body = buildTextDbFormBody(key, value);
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: ctrl?.signal,
    };
    if (body.length < 55000) init.keepalive = true;
    const res = await fetch(TEXTDB_UPDATE_URL, init);
    if (!res.ok) return false;
    const txt = (await res.text()).trim();
    if (!txt) return true;
    try {
      const parsed = JSON.parse(txt) as { status?: number };
      if (parsed && typeof parsed === 'object' && 'status' in parsed) {
        return Number(parsed.status) === 1;
      }
    } catch {
      // Non-JSON 200 OK fallback
    }
    return true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function writeTextDbDevSingle(key: string, value: string): Promise<boolean> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8500) : null;
  try {
    const bodyStr = JSON.stringify({ payload: value });
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      signal: ctrl?.signal,
    };
    if (bodyStr.length < 55000) init.keepalive = true;
    const res = await fetch(`${TEXTDB_DEV_API_URL}/${encodeURIComponent(key)}`, init);
    return res.ok;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function writeChunkedToProvider(
  baseKey: string,
  fullValue: string,
  writeSingle: (k: string, v: string) => Promise<boolean>
): Promise<boolean> {
  if (fullValue.length <= CLOUD_CHUNK_MAX_CHARS) return writeSingle(baseKey, fullValue);
  const chunks: string[] = [];
  for (let i = 0; i < fullValue.length; i += CLOUD_CHUNK_MAX_CHARS) {
    chunks.push(fullValue.slice(i, i + CLOUD_CHUNK_MAX_CHARS));
  }
  for (let idx = 1; idx < chunks.length; idx++) {
    const ok = await writeSingle(`${baseKey}_p${idx}`, chunks[idx]);
    if (!ok) return false;
  }
  return writeSingle(baseKey, `${CLOUD_CHUNK_PREFIX}${chunks.length}:${chunks[0]}`);
}

export async function writePermanentCloud(key: string, value: string): Promise<boolean> {
  const [okOnline, okDev] = await Promise.all([
    writeChunkedToProvider(key, value, writeTextDbOnlineSingle),
    writeChunkedToProvider(key, value, writeTextDbDevSingle),
  ]);
  return okOnline || okDev;
}

async function readTextDbOnlineSingle(key: string): Promise<string | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 7000) : null;
  try {
    const res = await fetch(`${TEXTDB_READ_URL}/${encodeURIComponent(key)}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: ctrl?.signal,
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text || null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readTextDbDevSingle(key: string): Promise<string | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 7000) : null;
  try {
    const res = await fetch(`${TEXTDB_DEV_API_URL}/${encodeURIComponent(key)}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: ctrl?.signal,
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (!text) return null;
    let parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    if (parsed && typeof parsed === 'object' && 'payload' in parsed) {
      const p = (parsed as { payload?: unknown }).payload;
      return typeof p === 'string' && p.trim() ? p.trim() : null;
    }
    return null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readChunkedFromProvider(
  baseKey: string,
  readSingle: (k: string) => Promise<string | null>
): Promise<string | null> {
  const head = await readSingle(baseKey);
  if (!head) return null;
  if (!head.startsWith(CLOUD_CHUNK_PREFIX)) return head;
  const rest = head.slice(CLOUD_CHUNK_PREFIX.length);
  const colonIdx = rest.indexOf(':');
  if (colonIdx <= 0) return null;
  const totalChunks = Number.parseInt(rest.slice(0, colonIdx), 10);
  const chunk0 = rest.slice(colonIdx + 1);
  if (!Number.isFinite(totalChunks) || totalChunks < 2 || totalChunks > 60) return null;
  const tails = await Promise.all(
    Array.from({ length: totalChunks - 1 }, (_, i) => readSingle(`${baseKey}_p${i + 1}`))
  );
  if (tails.some((part) => !part)) return null;
  return chunk0 + tails.join('');
}

function isValidCipherEnvelope(x: string | null | undefined): x is string {
  return Boolean(x && (x.startsWith('BC2:') || x.startsWith('BC1:')));
}

async function readAllPermanentCloudCandidates(key: string): Promise<string[]> {
  const [onlineRaw, devRaw] = await Promise.all([
    readChunkedFromProvider(key, readTextDbOnlineSingle),
    readChunkedFromProvider(key, readTextDbDevSingle),
  ]);
  return Array.from(new Set([onlineRaw, devRaw].filter(isValidCipherEnvelope)));
}

export async function pushVaultToCloud(state: VaultState, passcode: string): Promise<boolean> {
  const clean = normalizePasscode(passcode);
  if (!clean) return false;
  if (state.isUneditedDefault && !hasUserRecords(state)) return false;

  try {
    const id = await deriveVaultIdentity(clean);
    const compacted = compactStateForCloud(state);
    const cipher = await encryptVaultPayload(JSON.stringify(compacted), clean);
    const ok = await writePermanentCloud(id.vaultKey, cipher);
    if (ok) {
      // Optional best-effort SSE ping to notify other open windows (< 1s)
      fetch(`${NTFY_BASE_URL}/${id.sseTopic}`, {
        method: 'POST',
        body: JSON.stringify({ updatedAt: state.updatedAt || Date.now() }),
      }).catch(() => {});
    }
    return ok;
  } catch {
    return false;
  }
}

export async function pullVaultFromCloud(
  passcode: string
): Promise<{ state: VaultState | null; matchedPasscode: string }> {
  const variants = getPasscodeFallbackVariants(passcode);
  if (variants.length === 0) return { state: null, matchedPasscode: '' };

  for (const candidatePass of variants) {
    try {
      const id = await deriveVaultIdentity(candidatePass);
      const envelopes = await readAllPermanentCloudCandidates(id.vaultKey);
      let best: VaultState | null = null;
      for (const env of envelopes) {
        try {
          const plain = await decryptVaultPayload(env, candidatePass);
          const parsed = parseVaultJson(plain);
          if (parsed) {
            best = best ? mergeVaultStates(best, parsed) : parsed;
          }
        } catch {
          // ignore invalid candidate
        }
      }
      if (best) {
        return { state: best, matchedPasscode: candidatePass };
      }
    } catch {
      // try next variant
    }
  }
  return { state: null, matchedPasscode: normalizePasscode(passcode) };
}

export async function syncVaultWithCloud(
  localState: VaultState,
  passcode: string
): Promise<{
  merged: VaultState;
  synced: boolean;
  matchedPasscode: string;
}> {
  const clean = normalizePasscode(passcode);
  if (!clean) {
    return { merged: localState, synced: false, matchedPasscode: '' };
  }
  const { state: remoteState, matchedPasscode } = await pullVaultFromCloud(clean);
  const effectivePass = matchedPasscode || clean;
  const merged = remoteState ? mergeVaultStates(localState, remoteState) : localState;
  await saveLocalVaultState(merged);

  if (merged.isUneditedDefault && !hasUserRecords(merged)) {
    return { merged, synced: Boolean(remoteState), matchedPasscode: effectivePass };
  }

  const pushed = await pushVaultToCloud(merged, effectivePass);
  return {
    merged,
    synced: pushed || Boolean(remoteState),
    matchedPasscode: effectivePass,
  };
}

export function subscribeToVaultSse(
  sseTopic: string,
  onRemotePing: () => void
): () => void {
  if (!sseTopic || typeof EventSource === 'undefined') return () => {};
  try {
    const es = new EventSource(`${NTFY_BASE_URL}/${sseTopic}/sse`);
    es.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data);
        if (parsed && parsed.event === 'message') {
          onRemotePing();
        }
      } catch {
        // ignore
      }
    };
    return () => es.close();
  } catch {
    return () => {};
  }
}

export function exportVaultBackupJson(state: VaultState): void {
  const payload = {
    app: 'BoboTravelTalk',
    version: 1,
    exportedAt: new Date().toISOString(),
    vault: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `BoboTalk_出國翻譯口袋備份_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importVaultBackupJson(rawText: string, current: VaultState): VaultState {
  const parsed = JSON.parse(rawText);
  const candidateObj = parsed && parsed.vault ? parsed.vault : parsed;
  const imported = parseVaultJson(JSON.stringify(candidateObj));
  if (!imported) {
    throw new Error('備份檔格式不正確');
  }
  return mergeVaultStates(current, { ...imported, isUneditedDefault: false });
}
