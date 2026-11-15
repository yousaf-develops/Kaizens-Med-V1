import { EvaluationResult } from './ruleEngine';
import {
  AstronautBaseline,
  BehavioralVaultEntry,
  DailyTelemetryEntry,
  EnvironmentConfig,
  GamificationBadge,
  GamificationState,
  PVTSessionResult,
  RoutinePromptItem,
} from '../types/telemetry';

export interface AstronautRankInfo {
  level: number;
  title: string;
  currentXp: number;
  nextLevelXp: number;
  progressPct: number;
}

const RANKS = [
  { minXp: 0, level: 1, title: 'Flight Cadet' },
  { minXp: 250, level: 2, title: 'Mission Specialist' },
  { minXp: 600, level: 3, title: 'Readiness Officer' },
  { minXp: 1200, level: 4, title: 'Deep-Space Commander' },
  { minXp: 2200, level: 5, title: 'Kaizens Vanguard' },
];

export function computeAstronautRank(xp: number): AstronautRankInfo {
  let current = RANKS[0];
  let next = RANKS[1];
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) {
      current = RANKS[i];
      next = RANKS[i + 1] ?? { ...RANKS[i], minXp: RANKS[i].minXp + 1000 };
    }
  }
  const span = Math.max(1, next.minXp - current.minXp);
  const pct =
    current.level === RANKS[RANKS.length - 1].level
      ? 100
      : Math.min(100, Math.max(0, Math.round(((xp - current.minXp) / span) * 100)));

  return {
    level: current.level,
    title: current.title,
    currentXp: xp,
    nextLevelXp: next.minXp,
    progressPct: pct,
  };
}

export function buildMissionRoutinePrompts(
  env: EnvironmentConfig,
  baseline: AstronautBaseline,
  latest: DailyTelemetryEntry | undefined,
  vault: BehavioralVaultEntry[],
  pvtSessions: PVTSessionResult[],
  completedActionIds: Record<string, boolean>,
  gamification: GamificationState
): RoutinePromptItem[] {
  if (!latest) return [];

  const doneSet = new Set(gamification.completedPromptIds);
  const latestVault = vault[vault.length - 1];
  const latestPvt = pvtSessions[pvtSessions.length - 1];

  const isRoverOrSurface =
    env.id === 'pressurized-rover' || env.id === 'lunar-base' || env.id === 'mars-base';

  const prompts: RoutinePromptItem[] = [
    {
      id: 'routine-bp-posture',
      title: 'Blood Pressure & Heart Rate Check',
      plainInstruction:
        'Rest calmly for 3 minutes, put the cuff at heart level, and record BP with your exact posture.',
      whyItMatters:
        'Catches early cardiovascular drift before an EVA or surface gravity landing.',
      xpReward: 40,
      priority: doneSet.has('routine-bp-posture') ? 'completed' : 'due-now',
      statusColor:
        latest.restingHrBpm > baseline.restingHrRange[1] ? 'caution' : 'nominal',
      cadenceLabel: 'Every Mission Day',
      targetSystem: 'cardio',
      actionId: 'cardio-3',
    },
    {
      id: 'routine-ared-bone',
      title:
        env.id === 'mars-base'
          ? '0.38g Readaptation & Resistance Check'
          : 'ARED Bone & Muscle Loading Session',
      plainInstruction:
        'Complete weighted squats, deadlifts, and heel raises without reducing target loads.',
      whyItMatters:
        'Keeps Hip/Spine BMD >= 95% and leg strength >= 80% against space unloading.',
      xpReward: 50,
      priority:
        latest.aredCompleted || completedActionIds['bone-1'] || doneSet.has('routine-ared-bone')
          ? 'completed'
          : 'due-now',
      statusColor: latest.hipSpineBmdPct < 95 ? 'urgent' : !latest.aredCompleted ? 'caution' : 'nominal',
      cadenceLabel: 'Daily Exercise Routine',
      targetSystem: 'bone',
      actionId: 'bone-1',
    },
    {
      id: 'routine-hydration',
      title: 'Hydration Boost (+500 mL Fluid Goal)',
      plainInstruction:
        'Drink 500 mL of water and check if urine color is pale rather than dark or concentrated.',
      whyItMatters:
        'Prevents dehydration fatigue and protects kidneys from stone formation in flight.',
      xpReward: 25,
      priority:
        latest.fluidIntakeMl >= baseline.fluidTargetMl && !latest.urineDarkConcentrated
          ? 'completed'
          : doneSet.has('routine-hydration')
            ? 'completed'
            : 'due-now',
      statusColor:
        latest.urineDarkConcentrated || latest.fluidIntakeMl < baseline.fluidTargetMl * 0.85
          ? 'caution'
          : 'nominal',
      cadenceLabel: `Target ${baseline.fluidTargetMl} mL/day`,
      targetSystem: 'nutrition-hydration',
      actionId: 'nutr-1',
    },
    {
      id: 'routine-pvt-focus',
      title: 'Run 45s or 3-Min Focus Speed Test (PVT-B)',
      plainInstruction:
        'Tap the counter box as fast as you can when it lights up to measure true alertness.',
      whyItMatters:
        'Fatigue slows reflexes well before you notice you are tired — vital before EVAs.',
      xpReward: 50,
      priority:
        doneSet.has('routine-pvt-focus') || (latestPvt && latestPvt.sol >= env.currentDay)
          ? 'completed'
          : 'routine',
      statusColor:
        latestPvt && latestPvt.meanRtMs > baseline.pvtBaselineMs + 45 ? 'caution' : 'nominal',
      cadenceLabel: 'Pre-Shift / Pre-EVA',
      targetTab: 'assessments',
    },
    {
      id: 'routine-env-cabin',
      title: isRoverOrSurface
        ? `${env.shortLabel} Air, CO₂ & Dust Safety Check`
        : 'Cabin Atmosphere & Dosimeter Verification',
      plainInstruction:
        'Check cabin CO₂ (<= 3.0 mmHg), temperature, and verify your personal dosimeter reads Measured.',
      whyItMatters:
        'Silent CO₂ rise causes headaches and slow thinking; stale sensors can hide real risks.',
      xpReward: 30,
      priority: doneSet.has('routine-env-cabin') ? 'completed' : 'routine',
      statusColor:
        latest.envDataStatus === 'stale' || latest.dosimetryStatus === 'stale'
          ? 'data-quality'
          : (latest.cabinCo2MmHg ?? 2.8) > baseline.cabinCo2MaxMmHg
            ? 'caution'
            : 'nominal',
      cadenceLabel: 'Shift Start Routine',
      targetTab: 'environment',
    },
    {
      id: 'routine-sleep-vault',
      title: 'Log Sleep & Mood in Private Vault',
      plainInstruction:
        'Record hours slept, workload hours, and stress score (stays private on your device).',
      whyItMatters:
        'Protects your 8h sleep goal and flags heavy-work streaks before burnout builds.',
      xpReward: 35,
      priority:
        doneSet.has('routine-sleep-vault') || (latestVault && latestVault.sol >= env.currentDay)
          ? 'completed'
          : 'routine',
      statusColor: latestVault && latestVault.sleepHours < 7 ? 'caution' : 'nominal',
      cadenceLabel: 'Every Evening',
      targetTab: 'vault',
    },
  ];

  return prompts;
}

export function computeGamificationBadges(
  evaluation: EvaluationResult,
  latest: DailyTelemetryEntry | undefined,
  pvtSessions: PVTSessionResult[],
  gamification: GamificationState
): GamificationBadge[] {
  const actionsDone = gamification.completedPromptIds.length;
  return [
    {
      id: 'badge-iron-bones',
      title: 'Iron Frame',
      description: 'Maintain active ARED resistance training streaks.',
      unlocked: evaluation.streaks.aredStreakDays >= 3 || actionsDone >= 3,
      progressText: `${evaluation.streaks.aredStreakDays}d ARED streak`,
    },
    {
      id: 'badge-hydration',
      title: 'Clear Waters',
      description: 'Keep hydration & electrolyte targets steady.',
      unlocked:
        evaluation.streaks.hydrationStreakDays >= 3 ||
        (!!latest && latest.fluidIntakeMl >= 2500 && !latest.urineDarkConcentrated),
      progressText: `${evaluation.streaks.hydrationStreakDays}d hydration streak`,
    },
    {
      id: 'badge-sharp-focus',
      title: 'Eagle Focus',
      description: 'Complete at least 3 PVT-B reaction speed checks.',
      unlocked: pvtSessions.length >= 3,
      progressText: `${pvtSessions.length} / 3 focus tests`,
    },
    {
      id: 'badge-cabin-steward',
      title: 'Habitat Steward',
      description: 'Verify live cabin CO₂, O₂, and food safety.',
      unlocked:
        !!latest &&
        latest.envDataStatus !== 'stale' &&
        (latest.foodAcceptabilityScore ?? 3) >= 3 &&
        !latest.foodSafetyFlag,
      progressText: latest?.envDataStatus === 'stale' ? 'Verify sensors' : 'Verified live',
    },
    {
      id: 'badge-rad-sentinel',
      title: 'Dose Sentinel',
      description: 'Keep personal dosimeter continuously Measured (<24h).',
      unlocked: !!latest && latest.dosimetryStatus === 'measured',
      progressText: latest?.dosimetryStatus === 'measured' ? 'Measured live' : 'Check dosimeter',
    },
    {
      id: 'badge-mindful',
      title: 'Balanced Mind',
      description: 'Keep regular private sleep & stress vault logs.',
      unlocked: evaluation.streaks.sleepLogStreakDays >= 5,
      progressText: `${evaluation.streaks.sleepLogStreakDays} vault logs`,
    },
  ];
}
