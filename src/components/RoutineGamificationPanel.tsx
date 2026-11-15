import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Sparkles,
  Target,
} from 'lucide-react';
import { AstronautRankInfo } from '../engine/routinePrompts';
import {
  GamificationBadge,
  GamificationState,
  NavTab,
  RoutinePromptItem,
  SystemId,
} from '../types/telemetry';

interface RoutineGamificationPanelProps {
  rank: AstronautRankInfo;
  gamification: GamificationState;
  prompts: RoutinePromptItem[];
  badges: GamificationBadge[];
  onCompletePrompt: (prompt: RoutinePromptItem) => void;
  onOpenCheckIn: (presetSystem?: SystemId) => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const RoutineGamificationPanel: React.FC<RoutineGamificationPanelProps> = ({
  rank,
  gamification,
  prompts,
  badges,
  onCompletePrompt,
  onOpenCheckIn,
  onNavigateTab,
}) => {
  const [showBadges, setShowBadges] = useState(false);
  const completedCount = prompts.filter((p) => p.priority === 'completed').length;
  const dueCount = prompts.filter((p) => p.priority === 'due-now').length;
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const dotCls = (sev: RoutinePromptItem['statusColor']) => {
    if (sev === 'urgent') return 'bg-rose-400';
    if (sev === 'caution') return 'bg-amber-400';
    if (sev === 'data-quality') return 'bg-zinc-400';
    return 'bg-emerald-400';
  };

  return (
    <section className="reveal-up glass-3d rounded-3xl p-5 sm:p-6 space-y-5">
      {/* Top Rank, XP Bar & Routine Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-400">
            <span className="inline-flex items-center gap-1 font-semibold text-white">
              <Award className="h-4 w-4 text-emerald-400" />
              Level {rank.level} · {rank.title}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-zinc-300">
              {completedCount}/{prompts.length} Routine Quests Done
            </span>
            {dueCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 font-semibold">{dueCount} Due Now</span>
              </>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
            Mission Health Routine &amp; Progress
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {gamification.lastAwardLabel && (
            <span className="glass-3d-recessed rounded-full px-3 py-1 text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              {gamification.lastAwardLabel}
            </span>
          )}
          <div className="glass-3d-recessed rounded-2xl px-4 py-2 min-w-[210px] space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold tabular-nums">
              <span className="text-white">{rank.currentXp} XP</span>
              <span className="text-zinc-400">Next: {rank.nextLevelXp} XP</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${rank.progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mission Routine Prompts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {prompts.map((prompt) => {
          const isDone = prompt.priority === 'completed';
          return (
            <article
              key={prompt.id}
              className={`glass-3d-sub rounded-2xl p-4 flex flex-col justify-between gap-3 border transition-colors ${
                isDone
                  ? 'border-emerald-400/25 opacity-85'
                  : prompt.priority === 'due-now'
                    ? 'border-amber-400/35'
                    : 'border-white/12'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${dotCls(prompt.statusColor)}`} />
                    <span>{prompt.cadenceLabel}</span>
                  </div>
                  <span
                    className={`text-xs font-semibold tabular-nums shrink-0 ${
                      isDone ? 'text-emerald-400' : 'text-zinc-300'
                    }`}
                  >
                    {isDone ? '✓ Earned' : `+${prompt.xpReward} XP`}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white leading-snug">
                  {prompt.title}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {prompt.plainInstruction}
                </p>

                <p className="text-xs text-zinc-400 leading-snug">
                  <strong className="text-zinc-300">Why:</strong> {prompt.whyItMatters}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => onCompletePrompt(prompt)}
                  className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer transition-colors ${
                    isDone ? 'text-emerald-400' : 'text-white hover:text-emerald-300'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4 text-zinc-400" />
                  )}
                  <span>{isDone ? 'Completed' : 'Mark Done'}</span>
                </button>

                {(prompt.targetSystem || prompt.targetTab) && (
                  <button
                    type="button"
                    onClick={() =>
                      prompt.targetSystem
                        ? onOpenCheckIn(prompt.targetSystem)
                        : onNavigateTab(prompt.targetTab!)
                    }
                    className="btn-mono-glass px-3 py-1 rounded-full text-xs font-semibold cursor-pointer"
                  >
                    {prompt.targetSystem ? 'Measure →' : 'Open →'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Collapsible Mission Badges Strip */}
      <div className="glass-3d-recessed rounded-2xl">
        <button
          type="button"
          onClick={() => setShowBadges((prev) => !prev)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-zinc-200 hover:text-white cursor-pointer"
        >
          <span className="inline-flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            Mission Health Badges ({unlockedCount} / {badges.length} Unlocked)
          </span>
          {showBadges ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showBadges && (
          <div className="reveal-panel px-4 pb-4 pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`rounded-xl p-3 border text-xs space-y-1 ${
                  badge.unlocked
                    ? 'border-emerald-400/35 bg-emerald-500/10'
                    : 'glass-3d-sub opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white text-sm">{badge.title}</span>
                  <span className={badge.unlocked ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                    {badge.unlocked ? '● Unlocked' : 'Locked'}
                  </span>
                </div>
                <p className="text-zinc-300 leading-snug">{badge.description}</p>
                <div className="text-zinc-400 font-medium tabular-nums">{badge.progressText}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
