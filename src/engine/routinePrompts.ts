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
  { minXp: 0, level: 1, title: 'Flight Crew' },
  { minXp: 250, level: 2, title: 'Mission Specialist' },
  { minXp: 600, level: 3, title: 'Senior Specialist' },
  { minXp: 1200, level: 4, title: 'Flight Commander' },
  { minXp: 2200, level: 5, title: 'Mission Commander' },
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
      title: 'Check Blood Pressure & Posture',
      plainInstruction: 'Rest quietly for 3 minutes, measure blood pressure, and record your posture.',
      whyItMatters: 'Detects circulation changes early before spacewalks.',
      xpReward: 40,
      priority: doneSet.has('routine-bp-posture') ? 'completed' : 'due-now',
      statusColor:
        latest.restingHrBpm > baseline.restingHrRange[1] ? 'caution' : 'nominal',
      cadenceLabel: 'Daily',
      targetSystem: 'cardio',
      actionId: 'cardio-3',
    },
    {
      id: 'routine-ared-bone',
      title:
        env.id === 'mars-base'
          ? 'Partial-Gravity Resistance Workout'
          : 'Daily Resistance Training',
      plainInstruction: 'Complete scheduled squats and resistance lifts.',
      whyItMatters: 'Preserves hip and spine bone density in low gravity.',
      xpReward: 50,
      priority:
        latest.aredCompleted || completedActionIds['bone-1'] || doneSet.has('routine-ared-bone')
          ? 'completed'
          : 'due-now',
      statusColor: latest.hipSpineBmdPct < 95 ? 'urgent' : !latest.aredCompleted ? 'caution' : 'nominal',
      cadenceLabel: 'Daily Workout',
      targetSystem: 'bone',
      actionId: 'bone-1',
    },
    {
      id: 'routine-hydration',
      title: 'Drink 500 ml (2 Glasses) of Water',
      plainInstruction: 'Drink 500 ml of water and confirm urine stays pale yellow.',
      whyItMatters: 'Prevents dehydration fatigue and lowers kidney stone risk.',
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
      cadenceLabel: `Target ${baseline.fluidTargetMl} ml/day`,
      targetSystem: 'nutrition-hydration',
      actionId: 'nutr-1',
    },
    {
      id: 'routine-pvt-focus',
      title: 'Complete Alertness & Reaction Check',
      plainInstruction: 'Respond quickly when the signal box turns blue.',
      whyItMatters: 'Measures mental sharpness before critical duties.',
      xpReward: 50,
      priority:
        doneSet.has('routine-pvt-focus') || (latestPvt && latestPvt.sol >= env.currentDay)
          ? 'completed'
          : 'routine',
      statusColor:
        latestPvt && latestPvt.meanRtMs > baseline.pvtBaselineMs + 45 ? 'caution' : 'nominal',
      cadenceLabel: 'Pre-Shift',
      targetTab: 'assessments',
    },
    {
      id: 'routine-env-cabin',
      title: isRoverOrSurface
        ? `${env.shortLabel} Air & Dust Check`
        : 'Cabin Air & Radiation Check',
      plainInstruction: 'Confirm cabin temperature, CO2 level, and live radiation badge status.',
      whyItMatters: 'Elevated CO2 reduces focus and outdated sensors hide risk.',
      xpReward: 30,
      priority: doneSet.has('routine-env-cabin') ? 'completed' : 'routine',
      statusColor:
        latest.envDataStatus === 'stale' || latest.dosimetryStatus === 'stale'
          ? 'data-quality'
          : (latest.cabinCo2MmHg ?? 2.8) > baseline.cabinCo2MaxMmHg
            ? 'caution'
            : 'nominal',
      cadenceLabel: 'Shift Start',
      targetTab: 'environment',
    },
    {
      id: 'routine-sleep-vault',
      title: 'Log Sleep & Well-Being Privately',
      plainInstruction: 'Record sleep hours and daily stress in your private on-device log.',
      whyItMatters: 'Supports achieving 8 hours of quality sleep nightly.',
      xpReward: 35,
      priority:
        doneSet.has('routine-sleep-vault') || (latestVault && latestVault.sol >= env.currentDay)
          ? 'completed'
          : 'routine',
      statusColor: latestVault && latestVault.sleepHours < 7 ? 'caution' : 'nominal',
      cadenceLabel: 'Evening',
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
      title: 'Bone Resilience',
      description: 'Maintain consistent resistance training.',
      unlocked: evaluation.streaks.aredStreakDays >= 3 || actionsDone >= 3,
      progressText: `${evaluation.streaks.aredStreakDays}-day streak`,
    },
    {
      id: 'badge-hydration',
      title: 'Hydration Discipline',
      description: 'Meet daily fluid targets consistently.',
      unlocked:
        evaluation.streaks.hydrationStreakDays >= 3 ||
        (!!latest && latest.fluidIntakeMl >= 2500 && !latest.urineDarkConcentrated),
      progressText: `${evaluation.streaks.hydrationStreakDays}-day streak`,
    },
    {
      id: 'badge-sharp-focus',
      title: 'Peak Alertness',
      description: 'Complete 3 reaction check sessions.',
      unlocked: pvtSessions.length >= 3,
      progressText: `${pvtSessions.length} of 3 checks`,
    },
    {
      id: 'badge-cabin-steward',
      title: 'Cabin Steward',
      description: 'Keep cabin sensors live and food log current.',
      unlocked:
        !!latest &&
        latest.envDataStatus !== 'stale' &&
        (latest.foodAcceptabilityScore ?? 3) >= 3 &&
        !latest.foodSafetyFlag,
      progressText: latest?.envDataStatus === 'stale' ? 'Update sensor' : 'Verified live',
    },
    {
      id: 'badge-rad-sentinel',
      title: 'Radiation Monitor',
      description: 'Keep your radiation badge synced daily.',
      unlocked: !!latest && latest.dosimetryStatus === 'measured',
      progressText: latest?.dosimetryStatus === 'measured' ? 'Updated today' : 'Sync required',
    },
    {
      id: 'badge-mindful',
      title: 'Rested & Balanced',
      description: 'Maintain regular private sleep entries.',
      unlocked: evaluation.streaks.sleepLogStreakDays >= 5,
      progressText: `${evaluation.streaks.sleepLogStreakDays} entries logged`,
    },
  ];
}
