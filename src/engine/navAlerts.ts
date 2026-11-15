import { EvaluationResult } from './ruleEngine';
import { AlertSeverity, NavTab } from '../types/telemetry';

export type NavVisualTone = 'stable' | 'yellow' | 'red';

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  nominal: 0,
  caution: 1,
  'data-quality': 1,
  urgent: 2,
};

function maxAlertSeverity(a: AlertSeverity, b: AlertSeverity): AlertSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

export function severityToVisualTone(sev: AlertSeverity): NavVisualTone {
  if (sev === 'urgent') return 'red';
  if (sev === 'caution' || sev === 'data-quality') return 'yellow';
  return 'stable';
}

/**
 * Maps live evaluation states across NASA's 5 Core Hazards to each top-level nav item.
 */
export function computeNavTabSeverities(
  evaluation: EvaluationResult
): Record<NavTab, AlertSeverity> {
  const physicalOverall = evaluation.readinessSummary.overallOperationalState;

  let allHazardsOverall: AlertSeverity = physicalOverall;
  (Object.values(evaluation.hazardSeverities) as AlertSeverity[]).forEach((sev) => {
    allHazardsOverall = maxAlertSeverity(allHazardsOverall, sev);
  });

  let assessmentSeverity: AlertSeverity = 'nominal';
  for (const alert of evaluation.alerts) {
    if (
      alert.id === 'beh-pvt-vigilance' ||
      alert.id === 'sans-oct-overdue' ||
      alert.id === 'muscle-ultrasound-drift'
    ) {
      assessmentSeverity = maxAlertSeverity(assessmentSeverity, alert.severity);
    }
  }

  let syncSeverity = evaluation.hazardSeverities['distance-from-earth'];
  if (evaluation.systemSeverities.radiation === 'data-quality') {
    syncSeverity = maxAlertSeverity(syncSeverity, 'data-quality');
  }
  if (evaluation.alerts.some((a) => a.id === 'rad-spe-active')) {
    syncSeverity = 'urgent';
  }

  return {
    hud: physicalOverall,
    vitals: maxAlertSeverity(physicalOverall, evaluation.hazardSeverities['gravity-fields']),
    environment: evaluation.hazardSeverities['hostile-closed'],
    research: allHazardsOverall,
    systems: allHazardsOverall,
    assessments: assessmentSeverity,
    vault: evaluation.hazardSeverities['isolation-confinement'],
    sync: syncSeverity,
  };
}

/**
 * Returns navigation tabs whose status just escalated (stable -> watch/alert or watch -> alert).
 */
export function detectCriticalNavTransitions(
  prev: Record<NavTab, AlertSeverity>,
  next: Record<NavTab, AlertSeverity>
): Partial<Record<NavTab, 'yellow' | 'red'>> {
  const triggered: Partial<Record<NavTab, 'yellow' | 'red'>> = {};
  (Object.keys(next) as NavTab[]).forEach((tab) => {
    const prevRank = SEVERITY_RANK[prev[tab]];
    const nextRank = SEVERITY_RANK[next[tab]];
    if (nextRank > prevRank && nextRank > 0) {
      triggered[tab] = nextRank >= 2 ? 'red' : 'yellow';
    }
  });
  return triggered;
}
