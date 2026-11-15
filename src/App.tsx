import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ClipboardList,
  Crosshair,
  HeartPulse,
  Lock,
  LogOut,
  Mic,
  RefreshCw,
  Scan,
  TrendingUp,
  Watch,
  Wind,
} from 'lucide-react';
import { AssessmentsView } from './components/AssessmentsView';
import { AstronautOnboarding } from './components/AstronautOnboarding';
import { BehavioralVaultView } from './components/BehavioralVaultView';
import { CheckInDrawer } from './components/CheckInDrawer';
import { HostileClosedView } from './components/HostileClosedView';
import { HudOverview } from './components/HudOverview';
import { MouseGlowBackground } from './components/MouseGlowBackground';
import { ResearchMatrixSection } from './components/ResearchMatrixSection';
import { SyncQueueView } from './components/SyncQueueView';
import { SystemsMatrixView } from './components/SystemsMatrixView';
import { VitalsReadinessView } from './components/VitalsReadinessView';
import { WearableSyncDrawer } from './components/WearableSyncDrawer';
import {
  DEFAULT_BASELINE,
  INITIAL_BEHAVIORAL_VAULT,
  INITIAL_PVT_SESSIONS,
  INITIAL_SPE_STATE,
  INITIAL_SYNC_QUEUE,
  INITIAL_TELEMETRY_HISTORY,
  MISSION_ENVIRONMENTS,
} from './data/nasaStandards';
import {
  computeNavTabSeverities,
  detectCriticalNavTransitions,
  severityToVisualTone,
} from './engine/navAlerts';
import { buildComprehensiveResearchCatalog } from './engine/researchCatalog';
import {
  buildMissionRoutinePrompts,
  computeAstronautRank,
  computeGamificationBadges,
} from './engine/routinePrompts';
import { evaluateTelemetry } from './engine/ruleEngine';
import { useBluetoothWearable } from './hooks/useBluetoothWearable';
import { offlineStore } from './storage/offlineStore';
import {
  AlertSeverity,
  AstronautBaseline,
  AstronautProfile,
  BehavioralVaultEntry,
  DailyTelemetryEntry,
  DeltaSyncPacket,
  GamificationState,
  MediaAssessmentItem,
  MissionEnvironment,
  NavTab,
  PVTSessionResult,
  RoutinePromptItem,
  SPEEventState,
  SystemId,
  WearableReadingPayload,
} from './types/telemetry';

export default function App() {
  const [profile, setProfile] = useState<AstronautProfile | null>(() =>
    offlineStore.loadProfile()
  );
  const [activeTab, setActiveTab] = useState<NavTab>('hud');
  const [environment, setEnvironment] = useState<MissionEnvironment>(() =>
    offlineStore.loadEnvironment()
  );
  const [baseline, setBaseline] = useState<AstronautBaseline>(() =>
    offlineStore.loadBaseline()
  );
  const [history, setHistory] = useState<DailyTelemetryEntry[]>(() =>
    offlineStore.loadTelemetryHistory()
  );
  const [vault, setVault] = useState<BehavioralVaultEntry[]>(() =>
    offlineStore.loadBehavioralVault()
  );
  const [pvtSessions, setPvtSessions] = useState<PVTSessionResult[]>(() =>
    offlineStore.loadPvtSessions()
  );
  const [speState, setSpeState] = useState<SPEEventState>(() =>
    offlineStore.loadSpeState()
  );
  const [syncQueue, setSyncQueue] = useState<DeltaSyncPacket[]>(() =>
    offlineStore.loadSyncQueue()
  );
  const [mediaItems, setMediaItems] = useState<MediaAssessmentItem[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<SystemId>('bone');
  const [isXrayMode, setIsXrayMode] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [completedActionIds, setCompletedActionIds] = useState<Record<string, boolean>>(() =>
    offlineStore.loadCompletedActions()
  );
  const [gamification, setGamification] = useState<GamificationState>(() =>
    offlineStore.loadGamification()
  );
  const [wearableSyncNotice, setWearableSyncNotice] = useState<string | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInPreset, setCheckInPreset] = useState<SystemId>('bone');
  const [wearableOpen, setWearableOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    offlineStore.loadMediaAssessments().then(setMediaItems);
    [
      '/assets/aistudio/grey_spaceship_background_287c8ce6.jpg',
      '/assets/aistudio/Avatar_male_178eaa5e.png',
      '/assets/aistudio/avatar_female_27b5e242.png',
      '/assets/aistudio/X_Ray_male_4ea8b0b9.png',
      '/assets/aistudio/X_Ray_female_f078ce5d.webp',
    ].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const envConfig = MISSION_ENVIRONMENTS[environment];

  const evaluation = useMemo(
    () =>
      evaluateTelemetry(
        history,
        baseline,
        envConfig,
        vault,
        pvtSessions,
        speState
      ),
    [history, baseline, envConfig, vault, pvtSessions, speState]
  );

  const researchRows = useMemo(
    () =>
      buildComprehensiveResearchCatalog(
        history,
        baseline,
        envConfig,
        vault,
        pvtSessions,
        speState,
        evaluation
      ),
    [history, baseline, envConfig, vault, pvtSessions, speState, evaluation]
  );

  const latestTelemetry = history[history.length - 1];

  const rank = useMemo(
    () => computeAstronautRank(gamification.xp),
    [gamification.xp]
  );

  const routinePrompts = useMemo(
    () =>
      buildMissionRoutinePrompts(
        envConfig,
        baseline,
        latestTelemetry,
        vault,
        pvtSessions,
        completedActionIds,
        gamification
      ),
    [envConfig, baseline, latestTelemetry, vault, pvtSessions, completedActionIds, gamification]
  );

  const badges = useMemo(
    () => computeGamificationBadges(evaluation, latestTelemetry, pvtSessions, gamification),
    [evaluation, latestTelemetry, pvtSessions, gamification]
  );

  const navSeverities = useMemo(
    () => computeNavTabSeverities(evaluation),
    [evaluation]
  );
  const prevNavSeveritiesRef = useRef<Record<NavTab, AlertSeverity>>(navSeverities);
  const [bouncingTabs, setBouncingTabs] = useState<Partial<Record<NavTab, 'yellow' | 'red'>>>({});
  const [bounceNonce, setBounceNonce] = useState(0);

  useEffect(() => {
    const triggered = detectCriticalNavTransitions(
      prevNavSeveritiesRef.current,
      navSeverities
    );
    prevNavSeveritiesRef.current = navSeverities;

    if (Object.keys(triggered).length > 0) {
      setBouncingTabs((prev) => ({ ...prev, ...triggered }));
      setBounceNonce((n) => n + 1);
      const timer = window.setTimeout(() => {
        setBouncingTabs((prev) => {
          const next = { ...prev };
          (Object.keys(triggered) as NavTab[]).forEach((t) => {
            delete next[t];
          });
          return next;
        });
      }, 2200);
      return () => window.clearTimeout(timer);
    }
  }, [navSeverities]);

  const handleChangeEnvironment = (nextEnv: MissionEnvironment) => {
    setEnvironment(nextEnv);
    offlineStore.saveEnvironment(nextEnv);
  };

  const handleOpenCheckIn = (preset?: SystemId) => {
    if (preset) setCheckInPreset(preset);
    setCheckInOpen(true);
  };

  const awardXp = useCallback((points: number, label: string, promptId?: string) => {
    setGamification((prev) => {
      if (promptId && prev.completedPromptIds.includes(promptId)) return prev;
      const next: GamificationState = {
        xp: prev.xp + points,
        completedPromptIds: promptId
          ? [...prev.completedPromptIds, promptId]
          : prev.completedPromptIds,
        lastAwardLabel: `+${points} Points · ${label}`,
      };
      offlineStore.saveGamification(next);
      return next;
    });
  }, []);

  const handleSubmitTelemetry = (
    entry: DailyTelemetryEntry,
    domainSummary: string,
    appendAsNewSol = false
  ) => {
    const nextHistory = appendAsNewSol
      ? [...history, entry]
      : [...history.slice(0, -1), entry];
    setHistory(nextHistory);
    offlineStore.saveTelemetryHistory(nextHistory);
    awardXp(40, 'Daily Check Done');

    const pkt = offlineStore.createDeltaPacket(
      entry.sol,
      'Health Log',
      domainSummary,
      false
    );
    const nextQueue = [...syncQueue, pkt];
    setSyncQueue(nextQueue);
    offlineStore.saveSyncQueue(nextQueue);
  };

  const handleSavePvtSession = (session: PVTSessionResult) => {
    const nextSessions = [...pvtSessions, session];
    setPvtSessions(nextSessions);
    offlineStore.savePvtSessions(nextSessions);
    awardXp(50, 'Reaction Check Done');

    const pkt = offlineStore.createDeltaPacket(
      session.sol,
      'Alertness Check',
      `Reaction speed: ${(session.meanRtMs / 1000).toFixed(2)}s average, ${session.lapsesCount} slow responses.`,
      false
    );
    const nextQueue = [...syncQueue, pkt];
    setSyncQueue(nextQueue);
    offlineStore.saveSyncQueue(nextQueue);
  };

  const handleSaveMediaItem = async (item: MediaAssessmentItem) => {
    await offlineStore.saveMediaAssessment(item);
    setMediaItems((prev) => [...prev, item]);
    awardXp(30, 'Image Saved');
  };

  const handleAddVaultEntry = (entry: BehavioralVaultEntry) => {
    const nextVault = [...vault, entry];
    setVault(nextVault);
    offlineStore.saveBehavioralVault(nextVault);
    awardXp(35, 'Private Log Saved');

    if (entry.sharedWithFlightSurgeon) {
      const pkt = offlineStore.createDeltaPacket(
        entry.sol,
        'Sleep & Well-Being',
        `Shared Day ${entry.sol} sleep (${entry.sleepHours}h) and well-being summary.`,
        true
      );
      const nextQueue = [...syncQueue, pkt];
      setSyncQueue(nextQueue);
      offlineStore.saveSyncQueue(nextQueue);
    }
  };

  const handleToggleShareEntry = (id: string) => {
    const nextVault = vault.map((v) =>
      v.id === id ? { ...v, sharedWithFlightSurgeon: !v.sharedWithFlightSurgeon } : v
    );
    setVault(nextVault);
    offlineStore.saveBehavioralVault(nextVault);
  };

  const handleUpdateSpeState = (next: SPEEventState) => {
    setSpeState(next);
    offlineStore.saveSpeState(next);
    if (next.activeWarning) {
      const pkt = offlineStore.createDeltaPacket(
        envConfig.currentDay,
        'Solar Storm Warning',
        next.shelterOccupied
          ? `Sheltered inside ${next.assignedShelter}.`
          : `Solar storm warning active.`,
        false
      );
      const nextQueue = [...syncQueue, pkt];
      setSyncQueue(nextQueue);
      offlineStore.saveSyncQueue(nextQueue);
    }
  };

  const handleToggleDosimetryStale = () => {
    const latest = history[history.length - 1];
    if (!latest) return;
    const isStale = latest.dosimetryStatus === 'stale';
    const updated: DailyTelemetryEntry = {
      ...latest,
      dosimetryStatus: isStale ? 'measured' : 'stale',
      dosimetryLastUpdatedHoursAgo: isStale ? 1 : 31,
    };
    const nextHistory = [...history.slice(0, -1), updated];
    setHistory(nextHistory);
    offlineStore.saveTelemetryHistory(nextHistory);
  };

  const handlePatchLatestTelemetry = (
    patch: Partial<DailyTelemetryEntry>,
    syncSummary?: string
  ) => {
    const latest = history[history.length - 1];
    if (!latest) return;
    const updated: DailyTelemetryEntry = {
      ...latest,
      ...patch,
    };
    const nextHistory = [...history.slice(0, -1), updated];
    setHistory(nextHistory);
    offlineStore.saveTelemetryHistory(nextHistory);

    if (syncSummary) {
      const pkt = offlineStore.createDeltaPacket(
        updated.sol,
        'Health Update',
        syncSummary,
        false
      );
      const nextQueue = [...syncQueue, pkt];
      setSyncQueue(nextQueue);
      offlineStore.saveSyncQueue(nextQueue);
    }
  };

  const handleAdvanceOneSol = () => {
    const latest = history[history.length - 1];
    if (!latest) return;
    const nextSol = latest.sol + 1;
    const doseStep = envConfig.radiationAmbientRateMsvDay;
    const appended: DailyTelemetryEntry = {
      ...latest,
      id: `sol-${nextSol}-${Date.now().toString(36)}`,
      sol: nextSol,
      dateISO: new Date().toISOString().slice(0, 10),
      hipSpineBmdPct: Number(Math.max(91.5, latest.hipSpineBmdPct + (latest.aredCompleted ? 0.08 : -0.15)).toFixed(1)),
      femoralNeckBmdPct: Number(Math.max(88.5, latest.femoralNeckBmdPct + (latest.aredCompleted ? 0.06 : -0.12)).toFixed(1)),
      vo2PeakMlKgMin: Number(Math.min(48, Math.max(30, latest.vo2PeakMlKgMin + (latest.aerobicCompleted ? 0.15 : -0.25))).toFixed(1)),
      strengthPctBaseline: Number(Math.min(100, Math.max(74, latest.strengthPctBaseline + (latest.aredCompleted ? 0.2 : -0.35))).toFixed(1)),
      fluidIntakeMl: Math.min(3400, latest.fluidIntakeMl + 100),
      dailyDoseMsv: doseStep,
      cumulativeMissionDoseMsv: Number((latest.cumulativeMissionDoseMsv + doseStep).toFixed(2)),
    };
    const nextHistory = [...history, appended];
    setHistory(nextHistory);
    offlineStore.saveTelemetryHistory(nextHistory);
    awardXp(20, `Day ${nextSol} Saved`);
  };

  const handleTransmitQueued = () => {
    const now = new Date().toISOString();
    const nextQueue = syncQueue.map((p) =>
      p.status === 'queued'
        ? { ...p, status: 'acknowledged' as const, acknowledgedAtISO: now }
        : p
    );
    setSyncQueue(nextQueue);
    offlineStore.saveSyncQueue(nextQueue);
  };

  const handleSaveBaseline = (nextBaseline: AstronautBaseline) => {
    setBaseline(nextBaseline);
    offlineStore.saveBaseline(nextBaseline);
  };

  const handleCompleteOnboarding = (nextProfile: AstronautProfile) => {
    offlineStore.saveProfile(nextProfile);
    setProfile(nextProfile);
    const fullName = [nextProfile.firstName, nextProfile.lastName]
      .filter(Boolean)
      .join(' ');
    const updatedBaseline: AstronautBaseline = {
      ...baseline,
      callsign: fullName,
      gender: nextProfile.gender,
    };
    setBaseline(updatedBaseline);
    offlineStore.saveBaseline(updatedBaseline);
    setIsXrayMode(false);
    setIsZoomed(false);
    setActiveTab('hud');
  };

  const handleLogout = () => {
    offlineStore.clearProfile();
    setProfile(null);
    setIsXrayMode(false);
    setIsZoomed(false);
  };

  const applyWearableReading = useCallback(
    (reading: WearableReadingPayload, silentLiveStream = false) => {
      let latestUpdated: DailyTelemetryEntry | null = null;
      setHistory((prevHistory) => {
        const currentLatest = prevHistory[prevHistory.length - 1];
        if (!currentLatest) return prevHistory;

        const updatedEntry: DailyTelemetryEntry = {
          ...currentLatest,
          sol: envConfig.currentDay,
          dateISO: new Date().toISOString().slice(0, 10),
          restingHrBpm: reading.restingHrBpm ?? currentLatest.restingHrBpm,
          submaxHrBpm: reading.submaxHrBpm ?? currentLatest.submaxHrBpm,
          hrvMs: reading.hrvMs ?? currentLatest.hrvMs,
          bpSystolic: reading.bpSystolic ?? currentLatest.bpSystolic,
          bpDiastolic: reading.bpDiastolic ?? currentLatest.bpDiastolic,
          spo2Pct: reading.spo2Pct ?? currentLatest.spo2Pct,
          bodyTempC: reading.bodyTempC ?? currentLatest.bodyTempC,
          bloodGlucoseMgDl: reading.bloodGlucoseMgDl ?? currentLatest.bloodGlucoseMgDl,
          vo2PeakMlKgMin: reading.vo2PeakMlKgMin ?? currentLatest.vo2PeakMlKgMin,
          fluidIntakeMl: reading.fluidIntakeMl ?? currentLatest.fluidIntakeMl,
          dailyDoseMsv: reading.dailyDoseMsv ?? currentLatest.dailyDoseMsv,
          wearableSource: reading.deviceName,
          wearableLastSyncISO: reading.capturedAtISO,
        };
        latestUpdated = updatedEntry;
        const nextHistory = [...prevHistory.slice(0, -1), updatedEntry];
        offlineStore.saveTelemetryHistory(nextHistory);
        return nextHistory;
      });

      if (reading.sleepHours !== undefined) {
        setVault((prevVault) => {
          if (prevVault.length === 0) return prevVault;
          const latestVault = prevVault[prevVault.length - 1];
          const nextVault = [
            ...prevVault.slice(0, -1),
            { ...latestVault, sleepHours: reading.sleepHours! },
          ];
          offlineStore.saveBehavioralVault(nextVault);
          return nextVault;
        });
      }

      if (!silentLiveStream && latestUpdated) {
        const entry = latestUpdated as DailyTelemetryEntry;
        const pkt = offlineStore.createDeltaPacket(
          envConfig.currentDay,
          `Wearable (${reading.deviceName})`,
          `Synced HR ${entry.restingHrBpm} bpm, O2 ${entry.spo2Pct ?? 98}%, Temp ${(entry.bodyTempC ?? 36.8).toFixed(1)} °C, Glucose ${entry.bloodGlucoseMgDl ?? 96} mg/dL.`,
          false
        );
        setSyncQueue((prevQueue) => {
          const nextQueue = [...prevQueue, pkt];
          offlineStore.saveSyncQueue(nextQueue);
          return nextQueue;
        });
        setWearableSyncNotice(
          `${reading.deviceName} updated your health readings.`
        );
      }
    },
    [envConfig.currentDay]
  );

  const ble = useBluetoothWearable({
    onLiveReading: (reading) => applyWearableReading(reading, true),
  });

  const handleApplyWearableReading = (reading: WearableReadingPayload) => {
    applyWearableReading(reading, false);
    awardXp(35, 'Wearable Synced');
  };

  const handleToggleActionDone = (actionId: string) => {
    const isNowDone = !completedActionIds[actionId];
    setCompletedActionIds((prev) => {
      const next = { ...prev, [actionId]: !prev[actionId] };
      offlineStore.saveCompletedActions(next);
      return next;
    });
    if (isNowDone) {
      awardXp(25, 'Checklist Item Completed');
    }
  };

  const handleCompleteRoutinePrompt = (prompt: RoutinePromptItem) => {
    if (prompt.actionId) {
      setCompletedActionIds((prev) => {
        const next = { ...prev, [prompt.actionId!]: true };
        offlineStore.saveCompletedActions(next);
        return next;
      });
    }
    if (prompt.id === 'routine-ared-bone') {
      handlePatchLatestTelemetry({ aredCompleted: true }, 'Completed daily resistance training');
    } else if (prompt.id === 'routine-hydration' && latestEntry) {
      handlePatchLatestTelemetry(
        {
          fluidIntakeMl: Math.max(baseline.fluidTargetMl, latestEntry.fluidIntakeMl + 500),
          urineDarkConcentrated: false,
        },
        'Logged 500 ml extra water intake'
      );
    }
    awardXp(prompt.xpReward, prompt.title, prompt.id);
  };

  const handleSelectNavTab = (tab: NavTab) => {
    setActiveTab(tab);
    setBouncingTabs((prev) => {
      if (!prev[tab]) return prev;
      const next = { ...prev };
      delete next[tab];
      return next;
    });
  };

  const handleSelectSystemInHud = (id: SystemId) => {
    setSelectedSystem(id);
    setIsXrayMode(true);
    setIsZoomed(true);
    handleSelectNavTab('hud');
  };

  const handleResetWorkspace = async () => {
    await offlineStore.resetAllToBaseline();
    setProfile(null);
    setBaseline(DEFAULT_BASELINE);
    setHistory(INITIAL_TELEMETRY_HISTORY);
    setVault(INITIAL_BEHAVIORAL_VAULT);
    setPvtSessions(INITIAL_PVT_SESSIONS);
    setSpeState(INITIAL_SPE_STATE);
    setSyncQueue(INITIAL_SYNC_QUEUE);
    setCompletedActionIds({});
    setGamification({ xp: 310, completedPromptIds: [], lastAwardLabel: null });
    setWearableSyncNotice(null);
    setIsXrayMode(false);
    setIsZoomed(false);
    const media = await offlineStore.loadMediaAssessments();
    setMediaItems(media);
  };

  const queuedCount = syncQueue.filter((p) => p.status === 'queued').length;
  const latestEntry = history[history.length - 1];
  const systemStatuses = Object.values(evaluation.systemSeverities);
  const normalSysCount = systemStatuses.filter((s) => s === 'nominal').length;
  const watchSysCount = systemStatuses.filter((s) => s === 'caution' || s === 'data-quality').length;
  const alertSysCount = systemStatuses.filter((s) => s === 'urgent').length;

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'hud', label: 'Body Scan', icon: Scan },
    { id: 'vitals', label: 'Daily Health', icon: HeartPulse },
    { id: 'environment', label: 'Cabin & Suits', icon: Wind },
    { id: 'research', label: '5 Risks', icon: ClipboardList },
    { id: 'systems', label: 'Trends', icon: TrendingUp },
    { id: 'assessments', label: 'Checks', icon: Crosshair },
    { id: 'vault', label: 'Private Log', icon: Lock },
    { id: 'sync', label: queuedCount > 0 ? `Earth Sync (${queuedCount})` : 'Earth Sync', icon: RefreshCw },
  ];

  const activeNavLabel = navItems.find((item) => item.id === activeTab)?.label ?? 'Body Scan';

  const renderNavIndicator = (tab: NavTab) => {
    const tone = severityToVisualTone(navSeverities[tab]);
    if (tone === 'stable') return null;
    const isBouncing = !!bouncingTabs[tab];
    const dotBg = tone === 'red' ? 'bg-[#FF3B30]' : 'bg-amber-500';
    const pulseBg = tone === 'red' ? 'bg-[#FF3B30]/60' : 'bg-amber-500/60';
    return (
      <span
        className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center"
        aria-label={tone === 'red' ? 'Not Normal alert' : 'Watch alert'}
      >
        {(tone === 'red' || isBouncing) && (
          <span
            aria-hidden="true"
            className={`nav-dot-pulse absolute inset-0 rounded-full ${pulseBg}`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotBg}`} />
      </span>
    );
  };

  if (!profile) {
    return (
      <div className="relative min-h-screen w-full bg-black">
        <AstronautOnboarding onComplete={handleCompleteOnboarding} />
        <MouseGlowBackground />
      </div>
    );
  }

  const isAvatarLanding = activeTab === 'hud' && !isXrayMode;

  return (
    <div className="relative min-h-screen lg:h-screen lg:overflow-hidden bg-black text-white flex flex-col">
      {/* Global Smooth #024755 Cursor Glow */}
      <MouseGlowBackground />

      {/* FLOATING APPLE-STYLE SEMI-TRANSLUCENT OVAL TOP BANNER */}
      <header className="relative z-20 shrink-0 px-3 sm:px-6 pt-3 sm:pt-4">
        <div className="glass-apple-pill max-w-[1440px] mx-auto rounded-3xl lg:rounded-full px-3 sm:px-4 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Brand + Crew Callsign */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleSelectNavTab('hud')}
              className="flex items-center gap-2.5 pl-1 pr-2 py-0.5 cursor-pointer text-left shrink-0"
            >
              <div className="h-8 w-8 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-[0_4px_14px_rgba(255,255,255,0.22)] shrink-0">
                <Activity className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
                Kaizens <span className="text-zinc-300 font-medium">Med</span>
              </div>
              <span className="hidden sm:inline text-xs font-medium text-zinc-300 border-l border-white/15 pl-2.5 truncate max-w-[140px]">
                {baseline.callsign}
              </span>
            </button>

            {/* Mobile quick actions */}
            <div className="flex lg:hidden items-center gap-1.5">
              {!isAvatarLanding && (
                <button
                  type="button"
                  onClick={() => handleOpenCheckIn(selectedSystem)}
                  className="btn-mono-glass px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Mic className="h-3.5 w-3.5" /> Check In
                </button>
              )}
              <button
                type="button"
                onClick={() => setWearableOpen(true)}
                className="btn-mono-primary px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Watch
              </button>
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                aria-label="Log out"
                className="btn-mono-glass h-8 w-8 rounded-full flex items-center justify-center cursor-pointer shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Center Oval Pill Navigation */}
          <nav
            className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5"
            aria-label="App Modules"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              const isBouncing = !!bouncingTabs[item.id];
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNavTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                      : 'text-zinc-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span
                    key={isBouncing ? `${item.id}-bounce-${bounceNonce}` : item.id}
                    className={`inline-flex items-center gap-1.5 ${
                      isBouncing ? 'nav-attention-bounce' : ''
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-zinc-950' : 'text-zinc-300'}`} />
                    <span>{item.label}</span>
                  </span>
                  {renderNavIndicator(item.id)}
                </button>
              );
            })}
          </nav>

          {/* Desktop Right Quick Controls */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-semibold px-2 whitespace-nowrap ${
                isOnline ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isOnline ? '● Online' : '▲ Offline'}
            </span>
            {!isAvatarLanding && (
              <button
                type="button"
                onClick={() => handleOpenCheckIn(selectedSystem)}
                className="btn-mono-glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <Mic className="h-3.5 w-3.5" />
                Check In
              </button>
            )}
            <button
              type="button"
              onClick={() => setWearableOpen(true)}
              className="btn-mono-primary px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Watch className="h-3.5 w-3.5" />
              Watch
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Log Out"
              aria-label="Log Out"
              className="btn-mono-glass h-8 w-8 rounded-full flex items-center justify-center cursor-pointer shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN APP WORKSPACE STAGE */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col max-w-[1440px] w-full mx-auto">
        {!isAvatarLanding && (
          <div className="shrink-0 px-4 sm:px-6 pt-3 pb-1 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-lg sm:text-xl font-display font-bold text-white whitespace-nowrap">
                {activeNavLabel}
              </h1>
              <span aria-hidden="true" className="hidden sm:inline text-zinc-500">·</span>
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold tabular-nums">
                <span className="text-emerald-400">● {normalSysCount} Normal</span>
                <span className="text-amber-400">▲ {watchSysCount} Watch</span>
                <span className="text-rose-400">✖ {alertSysCount} Not Normal</span>
                <span className="hidden md:inline text-zinc-300 border-l border-white/15 pl-3">
                  Level {rank.level} · {rank.currentXp} pts
                </span>
              </div>
            </div>

            <div className="glass-3d-recessed flex flex-wrap items-center gap-1 rounded-2xl sm:rounded-full p-1">
              {(Object.keys(MISSION_ENVIRONMENTS) as MissionEnvironment[]).map((envKey) => (
                <button
                  key={envKey}
                  type="button"
                  onClick={() => handleChangeEnvironment(envKey)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    environment === envKey
                      ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {MISSION_ENVIRONMENTS[envKey].shortLabel}
                </button>
              ))}
            </div>
          </div>
        )}

        <main className="flex-1 min-h-0 p-3 sm:p-5 lg:overflow-hidden">
          {activeTab === 'hud' && (
            <div key="hud" className="reveal-up h-full min-h-0">
              <HudOverview
                env={envConfig}
                baseline={baseline}
                gender={profile.gender}
                history={history}
                vault={vault}
                evaluation={evaluation}
                selectedSystem={selectedSystem}
                onSelectSystem={setSelectedSystem}
                isXrayMode={isXrayMode}
                onSetXrayMode={setIsXrayMode}
                isZoomed={isZoomed}
                onSetZoomed={setIsZoomed}
                completedActionIds={completedActionIds}
                onToggleActionDone={handleToggleActionDone}
                wearableSyncNotice={wearableSyncNotice}
                onDismissWearableNotice={() => setWearableSyncNotice(null)}
                speState={speState}
                onOpenCheckIn={handleOpenCheckIn}
                onNavigateTab={handleSelectNavTab}
              />
            </div>
          )}

          {activeTab === 'vitals' && (
            <div key="vitals" className="reveal-up h-full overflow-y-auto pr-1">
              <VitalsReadinessView
                env={envConfig}
                baseline={baseline}
                history={history}
                vault={vault}
                evaluation={evaluation}
                rank={rank}
                gamification={gamification}
                prompts={routinePrompts}
                badges={badges}
                onCompletePrompt={handleCompleteRoutinePrompt}
                onOpenCheckIn={handleOpenCheckIn}
                onSelectSystemInHud={handleSelectSystemInHud}
                onOpenWearableSync={() => setWearableOpen(true)}
                onNavigateTab={handleSelectNavTab}
              />
            </div>
          )}

          {activeTab === 'environment' && (
            <div key="environment" className="reveal-up h-full overflow-y-auto pr-1">
              <HostileClosedView
                env={envConfig}
                baseline={baseline}
                latest={latestEntry}
                evaluation={evaluation}
                onPatchTelemetry={handlePatchLatestTelemetry}
                onNavigateTab={handleSelectNavTab}
              />
            </div>
          )}

          {activeTab === 'research' && (
            <div key="research" className="reveal-up h-full overflow-y-auto pr-1">
              <ResearchMatrixSection
                rows={researchRows}
                onInspectOrgan={handleSelectSystemInHud}
                onOpenCheckIn={handleOpenCheckIn}
                onNavigateTab={handleSelectNavTab}
              />
            </div>
          )}

          {activeTab === 'systems' && (
            <div key="systems" className="reveal-up h-full overflow-y-auto pr-1">
              <SystemsMatrixView
                env={envConfig}
                baseline={baseline}
                history={history}
                evaluation={evaluation}
                speState={speState}
                onUpdateSpeState={handleUpdateSpeState}
                onToggleDosimetryStale={handleToggleDosimetryStale}
                onPatchTelemetry={handlePatchLatestTelemetry}
                onAdvanceSol={handleAdvanceOneSol}
                onOpenCheckIn={handleOpenCheckIn}
                onSelectSystemInHud={handleSelectSystemInHud}
                onNavigateTab={handleSelectNavTab}
              />
            </div>
          )}

          {activeTab === 'assessments' && (
            <div key="assessments" className="reveal-up h-full overflow-y-auto pr-1">
              <AssessmentsView
                env={envConfig}
                baseline={baseline}
                hoursAwakeNow={evaluation.hoursAwakeNow}
                pvtSessions={pvtSessions}
                onSavePvtSession={handleSavePvtSession}
                mediaItems={mediaItems}
                onSaveMediaItem={handleSaveMediaItem}
              />
            </div>
          )}

          {activeTab === 'vault' && (
            <div key="vault" className="reveal-up h-full overflow-y-auto pr-1">
              <BehavioralVaultView
                env={envConfig}
                baseline={baseline}
                vault={vault}
                evaluation={evaluation}
                onAddVaultEntry={handleAddVaultEntry}
                onToggleShareEntry={handleToggleShareEntry}
              />
            </div>
          )}

          {activeTab === 'sync' && (
            <div key="sync" className="reveal-up h-full overflow-y-auto pr-1">
              <SyncQueueView
                env={envConfig}
                syncQueue={syncQueue}
                evaluation={evaluation}
                history={history}
                vault={vault}
                isOnline={isOnline}
                onTransmitQueued={handleTransmitQueued}
                onResetWorkspace={handleResetWorkspace}
                onPatchTelemetry={handlePatchLatestTelemetry}
              />
            </div>
          )}
        </main>
      </div>

      {latestEntry && (
        <CheckInDrawer
          key={`${checkInPreset}-${checkInOpen ? 'open' : 'closed'}`}
          isOpen={checkInOpen}
          onClose={() => setCheckInOpen(false)}
          env={envConfig}
          latest={latestEntry}
          initialSystem={checkInPreset}
          onSubmitEntry={handleSubmitTelemetry}
        />
      )}

      {latestEntry && (
        <WearableSyncDrawer
          key={`wearable-${wearableOpen ? 'open' : 'closed'}`}
          isOpen={wearableOpen}
          onClose={() => setWearableOpen(false)}
          env={envConfig}
          baseline={baseline}
          latest={latestEntry}
          latestSleepHours={vault[vault.length - 1]?.sleepHours}
          ble={ble}
          onApplyWearableReading={handleApplyWearableReading}
          onSaveBaseline={handleSaveBaseline}
        />
      )}
    </div>
  );
}
