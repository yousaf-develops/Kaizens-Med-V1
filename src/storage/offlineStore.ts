import {
  DEFAULT_BASELINE,
  INITIAL_BEHAVIORAL_VAULT,
  INITIAL_MEDIA_ITEMS,
  INITIAL_PVT_SESSIONS,
  INITIAL_SPE_STATE,
  INITIAL_SYNC_QUEUE,
  INITIAL_TELEMETRY_HISTORY,
} from '../data/nasaStandards';
import {
  AstronautBaseline,
  AstronautProfile,
  BehavioralVaultEntry,
  DailyTelemetryEntry,
  DeltaSyncPacket,
  GamificationState,
  MediaAssessmentItem,
  MissionEnvironment,
  PVTSessionResult,
  SPEEventState,
} from '../types/telemetry';

const KEYS = {
  PROFILE: 'kaizens_med_profile_v1',
  ENV: 'astra_med_env_v1',
  BASELINE: 'astra_med_baseline_v1',
  TELEMETRY: 'kaizens_med_telemetry_v3',
  PVT: 'astra_med_pvt_v1',
  SPE: 'astra_med_spe_v1',
  SYNC_QUEUE: 'astra_med_sync_queue_v1',
  // Strictly isolated local vault key
  BEHAVIORAL_VAULT: 'astra_med_private_vault_v1',
  MEDIA_FALLBACK: 'astra_med_media_fallback_v1',
  DAILY_ACTIONS: 'astra_med_daily_actions_v1',
  GAMIFICATION: 'kaizens_med_gamification_v1',
};

const DB_NAME = 'astra_med_offline_db';
const MEDIA_STORE = 'media_assessments';

function openMediaDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota guard
  }
}

export const offlineStore = {
  loadProfile(): AstronautProfile | null {
    return readJson<AstronautProfile | null>(KEYS.PROFILE, null);
  },
  saveProfile(profile: AstronautProfile): void {
    writeJson(KEYS.PROFILE, profile);
  },
  clearProfile(): void {
    try {
      localStorage.removeItem(KEYS.PROFILE);
    } catch {
      // Ignore storage errors
    }
  },

  loadEnvironment(): MissionEnvironment {
    return readJson<MissionEnvironment>(KEYS.ENV, 'mars-transit');
  },
  saveEnvironment(env: MissionEnvironment): void {
    writeJson(KEYS.ENV, env);
  },

  loadBaseline(): AstronautBaseline {
    const stored = readJson<Partial<AstronautBaseline>>(KEYS.BASELINE, {});
    return { ...DEFAULT_BASELINE, ...stored };
  },
  saveBaseline(baseline: AstronautBaseline): void {
    writeJson(KEYS.BASELINE, baseline);
  },

  loadTelemetryHistory(): DailyTelemetryEntry[] {
    return readJson<DailyTelemetryEntry[]>(KEYS.TELEMETRY, INITIAL_TELEMETRY_HISTORY);
  },
  saveTelemetryHistory(entries: DailyTelemetryEntry[]): void {
    writeJson(KEYS.TELEMETRY, entries);
  },

  loadBehavioralVault(): BehavioralVaultEntry[] {
    return readJson<BehavioralVaultEntry[]>(KEYS.BEHAVIORAL_VAULT, INITIAL_BEHAVIORAL_VAULT);
  },
  saveBehavioralVault(entries: BehavioralVaultEntry[]): void {
    writeJson(KEYS.BEHAVIORAL_VAULT, entries);
  },

  loadPvtSessions(): PVTSessionResult[] {
    return readJson<PVTSessionResult[]>(KEYS.PVT, INITIAL_PVT_SESSIONS);
  },
  savePvtSessions(sessions: PVTSessionResult[]): void {
    writeJson(KEYS.PVT, sessions);
  },

  loadSpeState(): SPEEventState {
    return readJson<SPEEventState>(KEYS.SPE, INITIAL_SPE_STATE);
  },
  saveSpeState(state: SPEEventState): void {
    writeJson(KEYS.SPE, state);
  },

  loadSyncQueue(): DeltaSyncPacket[] {
    return readJson<DeltaSyncPacket[]>(KEYS.SYNC_QUEUE, INITIAL_SYNC_QUEUE);
  },
  saveSyncQueue(queue: DeltaSyncPacket[]): void {
    writeJson(KEYS.SYNC_QUEUE, queue);
  },

  loadCompletedActions(): Record<string, boolean> {
    return readJson<Record<string, boolean>>(KEYS.DAILY_ACTIONS, {});
  },
  saveCompletedActions(actions: Record<string, boolean>): void {
    writeJson(KEYS.DAILY_ACTIONS, actions);
  },

  loadGamification(): GamificationState {
    return readJson<GamificationState>(KEYS.GAMIFICATION, {
      xp: 310,
      completedPromptIds: [],
      lastAwardLabel: null,
    });
  },
  saveGamification(state: GamificationState): void {
    writeJson(KEYS.GAMIFICATION, state);
  },

  async loadMediaAssessments(): Promise<MediaAssessmentItem[]> {
    const db = await openMediaDb();
    if (!db) {
      return readJson<MediaAssessmentItem[]>(KEYS.MEDIA_FALLBACK, INITIAL_MEDIA_ITEMS);
    }
    return new Promise((resolve) => {
      const tx = db.transaction(MEDIA_STORE, 'readonly');
      const store = tx.objectStore(MEDIA_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as MediaAssessmentItem[];
        if (!items || items.length === 0) {
          // Seed initial ultrasound scans on first run
          const seedTx = db.transaction(MEDIA_STORE, 'readwrite');
          const seedStore = seedTx.objectStore(MEDIA_STORE);
          INITIAL_MEDIA_ITEMS.forEach((item) => seedStore.put(item));
          resolve(INITIAL_MEDIA_ITEMS);
        } else {
          resolve(items.sort((a, b) => a.sol - b.sol));
        }
      };
      req.onerror = () => resolve(INITIAL_MEDIA_ITEMS);
    });
  },

  async saveMediaAssessment(item: MediaAssessmentItem): Promise<void> {
    const db = await openMediaDb();
    if (!db) {
      const existing = readJson<MediaAssessmentItem[]>(KEYS.MEDIA_FALLBACK, INITIAL_MEDIA_ITEMS);
      writeJson(KEYS.MEDIA_FALLBACK, [...existing, item]);
      return;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(MEDIA_STORE, 'readwrite');
      tx.objectStore(MEDIA_STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  },

  createDeltaPacket(
    sol: number,
    domain: string,
    summary: string,
    includesBehavioralData: boolean
  ): DeltaSyncPacket {
    const payloadString = JSON.stringify({ sol, domain, summary, t: Date.now() });
    const suffix = Math.random().toString(36).slice(2, 6);
    return {
      id: `pkt-${Date.now().toString(36)}-${suffix}`,
      createdAtISO: new Date().toISOString(),
      sol,
      domain,
      summary,
      payloadBytes: new Blob([payloadString]).size + 128,
      includesBehavioralData,
      status: 'queued',
    };
  },

  async resetAllToBaseline(): Promise<void> {
    localStorage.removeItem(KEYS.PROFILE);
    localStorage.removeItem(KEYS.BASELINE);
    localStorage.removeItem(KEYS.TELEMETRY);
    localStorage.removeItem(KEYS.BEHAVIORAL_VAULT);
    localStorage.removeItem(KEYS.PVT);
    localStorage.removeItem(KEYS.SPE);
    localStorage.removeItem(KEYS.SYNC_QUEUE);
    localStorage.removeItem(KEYS.MEDIA_FALLBACK);
    localStorage.removeItem(KEYS.DAILY_ACTIONS);
    localStorage.removeItem(KEYS.GAMIFICATION);
    const db = await openMediaDb();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(MEDIA_STORE, 'readwrite');
        const store = tx.objectStore(MEDIA_STORE);
        store.clear();
        INITIAL_MEDIA_ITEMS.forEach((item) => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  },
};
