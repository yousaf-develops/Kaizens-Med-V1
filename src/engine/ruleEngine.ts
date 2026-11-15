import {
  AlertSeverity,
  AstronautBaseline,
  BehavioralVaultEntry,
  DailyTelemetryEntry,
  EnvironmentConfig,
  EvaluatedAlert,
  HazardCategoryId,
  PVTSessionResult,
  SPEEventState,
  StreakSummary,
  SystemId,
} from '../types/telemetry';

export interface EvaluationResult {
  alerts: EvaluatedAlert[];
  systemSeverities: Record<SystemId, AlertSeverity>;
  hazardSeverities: Record<HazardCategoryId, AlertSeverity>;
  behavioralSeverity: AlertSeverity;
  readinessSummary: {
    bonePct: number;
    cardioPct: number;
    musclePct: number;
    overallOperationalState: AlertSeverity;
  };
  streaks: StreakSummary;
  hoursAwakeNow: number;
  inSleepInertiaWindow: boolean;
}

const severityRank: Record<AlertSeverity, number> = {
  nominal: 0,
  caution: 1,
  'data-quality': 2,
  urgent: 3,
};

function maxSeverity(a: AlertSeverity, b: AlertSeverity): AlertSeverity {
  return severityRank[a] >= severityRank[b] ? a : b;
}

export function evaluateTelemetry(
  history: DailyTelemetryEntry[],
  baseline: AstronautBaseline,
  env: EnvironmentConfig,
  vault: BehavioralVaultEntry[],
  pvtSessions: PVTSessionResult[],
  speState: SPEEventState
): EvaluationResult {
  const alerts: EvaluatedAlert[] = [];
  const latest = history[history.length - 1];
  const last7 = history.slice(-7);
  const last3 = history.slice(-3);

  const systemSeverities: Record<SystemId, AlertSeverity> = {
    'vision-sans': 'nominal',
    cardio: 'nominal',
    'nutrition-hydration': 'nominal',
    bone: 'nominal',
    muscle: 'nominal',
    radiation: 'nominal',
  };

  const hazardSeverities: Record<HazardCategoryId, AlertSeverity> = {
    'space-radiation': 'nominal',
    'isolation-confinement': 'nominal',
    'distance-from-earth': 'nominal',
    'gravity-fields': 'nominal',
    'hostile-closed': 'nominal',
  };

  const pushAlert = (alert: EvaluatedAlert) => {
    alerts.push(alert);
    hazardSeverities[alert.hazardId] = maxSeverity(
      hazardSeverities[alert.hazardId],
      alert.severity
    );
    if (
      alert.systemId !== 'behavioral' &&
      alert.systemId !== 'distance' &&
      alert.systemId !== 'hostile-closed'
    ) {
      systemSeverities[alert.systemId] = maxSeverity(
        systemSeverities[alert.systemId],
        alert.severity
      );
    }
  };

  if (!latest) {
    return {
      alerts: [],
      systemSeverities,
      hazardSeverities,
      behavioralSeverity: 'nominal',
      readinessSummary: {
        bonePct: 100,
        cardioPct: 100,
        musclePct: 100,
        overallOperationalState: 'nominal',
      },
      streaks: {
        aredStreakDays: 0,
        hydrationStreakDays: 0,
        sleepLogStreakDays: 0,
        pvtCheckInCount: pvtSessions.length,
      },
      hoursAwakeNow: 0,
      inSleepInertiaWindow: false,
    };
  }

  // =========================================================================
  // HAZARD 4: GRAVITY FIELDS (4.1 Bone, 4.2 Cardio, 4.3 Muscle, 4.4 SANS, 4.5 Nutrition)
  // =========================================================================

  // 4.1 Bone Health & Post-Landing Readaptation
  if (latest.hipSpineBmdPct < 95 || latest.femoralNeckBmdPct < 90) {
    pushAlert({
      id: 'bone-bmd-threshold',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'bone',
      systemLabel: '4.1 Bone Health',
      title: 'Bone Density Below Safe Baseline',
      severity: 'urgent',
      classification: 'NASA-backed threshold',
      standardRef: 'NASA-STD-3001 V1 4027',
      whatItMayShow: 'Bone loss exceeds mission standard (95% hip/spine, 90% femoral neck) and raises fracture risk.',
      recommendedAction: 'Do prescribed heavy ARED loading and flag scan for ASCR/medical review.',
      metricSummary: `Hip/Spine ${latest.hipSpineBmdPct.toFixed(1)}% (min 95%) · Thigh ${latest.femoralNeckBmdPct.toFixed(1)}% (min 90%)`,
    });
  }

  const missedAredIn7 = last7.filter((d) => !d.aredCompleted).length;
  if (missedAredIn7 >= 2) {
    pushAlert({
      id: 'bone-ared-shortfall',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'bone',
      systemLabel: '4.1 Bone Health',
      title: 'Missed Resistance Workouts This Week',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Lower mechanical loading may be insufficient to help preserve bone and muscle mass.',
      recommendedAction: 'Resume prescribed ARED session and log reason for missed workouts.',
      metricSummary: `${missedAredIn7} missed ARED sessions in past 7 sols`,
    });
  }

  if (latest.boneTurnoverAbnormal) {
    pushAlert({
      id: 'bone-turnover-marker',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'bone',
      systemLabel: '4.1 Bone Health',
      title: 'Bone-Turnover Lab Outside Range',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Bone mineral turnover may be changing; supports but does not replace DXA.',
      recommendedAction: 'Repeat approved lab check on schedule and compare with prior values.',
      metricSummary: 'Bone-turnover marker flagged for review',
    });
  }

  if (latest.bonePainSymptom) {
    pushAlert({
      id: 'bone-injury-symptom',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'bone',
      systemLabel: '4.1 Bone Health',
      title: 'Localized Bone Pain or Impact Injury',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Possible bone strain or impact injury requiring clinical assessment.',
      recommendedAction: 'Modify activity under approved protocol, document event, and contact medical team.',
      metricSummary: 'Self-reported localized bone pain',
    });
  }

  if (latest.postLandingUrgentCollapse) {
    pushAlert({
      id: 'bone-post-landing-collapse',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'bone',
      systemLabel: '4.1 Post-Landing',
      title: 'Post-Landing Collapse / Unable to Stay Upright',
      severity: 'urgent',
      classification: 'Urgent clinical-review trigger',
      whatItMayShow: 'Acute gravity-readaptation intolerance requiring immediate medical support.',
      recommendedAction: 'Lie down safely immediately, hydrate if cleared, and initiate crew emergency medical protocol.',
      metricSummary: 'Post-landing upright collapse flagged',
    });
  } else if (latest.postLandingSymptoms) {
    pushAlert({
      id: 'bone-post-landing-symptoms',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'bone',
      systemLabel: '4.1 Post-Landing',
      title: 'Post-Landing Readaptation Dizziness or Balance Loss',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Body is still readjusting to gravity; high-load tasks must wait until recovery criteria are met.',
      recommendedAction: 'Rest, follow approved hydration/readaptation steps, and notify ASCR/medical team.',
      metricSummary: `Phase: ${latest.postLandingPhase ?? 'Post-Landing Readapting'}`,
    });
  }

  // 4.2 Cardiovascular & Aerobic Fitness
  const vo2PctOfBaseline = (latest.vo2PeakMlKgMin / baseline.vo2PeakMlKgMin) * 100;
  const evaFloor = env?.evaVo2Floor ?? 32.9;
  if (vo2PctOfBaseline < 80 || latest.vo2PeakMlKgMin < evaFloor) {
    pushAlert({
      id: 'cardio-vo2-floor',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'cardio',
      systemLabel: '4.2 Cardiovascular',
      title: 'Aerobic Capacity Below NASA-STD-3001 Floor',
      severity: 'urgent',
      classification: 'NASA-backed threshold',
      standardRef: 'NASA-STD-3001 V1 4001 / 4002 / 4003',
      whatItMayShow: 'VO2 peak is below 80% pre-mission or EVA floor needed for demanding EVA/egress tasks.',
      recommendedAction: 'Display readiness trend only; ASCR/medical team determines EVA or task clearance.',
      metricSummary: `VO2 Peak ${latest.vo2PeakMlKgMin.toFixed(1)} ml/kg/min (${vo2PctOfBaseline.toFixed(0)}% base; EVA floor ${evaFloor})`,
    });
  }

  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const hrDeltaNow = latest.submaxHrBpm - baseline.submaxHrBpm;
  const hrDeltaPrev = prev ? prev.submaxHrBpm - baseline.submaxHrBpm : 0;
  if (hrDeltaNow >= 8 && hrDeltaPrev >= 8) {
    pushAlert({
      id: 'cardio-submax-hr-drift',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'cardio',
      systemLabel: '4.2 Cardiovascular',
      title: 'Consecutive Elevated Submaximal Exercise HR',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Heart is working harder for identical workload (possible dehydration, fatigue, or deconditioning).',
      recommendedAction: 'Confirm sensor fit, review hydration and sleep, and repeat under approved protocol.',
      metricSummary: `Submax HR ${latest.submaxHrBpm} bpm (+${hrDeltaNow} bpm vs ${baseline.submaxHrBpm} base)`,
    });
  }

  const bpUrgentThreshold =
    latest.bpSystolic >= 140 || latest.bpDiastolic >= 90 || latest.bpSystolic < 88;
  const bpOutOfRange =
    latest.bpSystolic < baseline.systolicRange[0] ||
    latest.bpSystolic > baseline.systolicRange[1] ||
    latest.bpDiastolic < baseline.diastolicRange[0] ||
    latest.bpDiastolic > baseline.diastolicRange[1];

  if (latest.chestOrPresyncope || latest.orthostaticSymptoms) {
    pushAlert({
      id: 'cardio-urgent-orthostatic',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'cardio',
      systemLabel: '4.2 Cardiovascular',
      title: 'Presyncope, Chest Discomfort, or Orthostatic Intolerance',
      severity: 'urgent',
      classification: 'Urgent clinical-review trigger',
      whatItMayShow: 'Possible orthostatic intolerance or acute cardiovascular event requiring immediate medical assistance.',
      recommendedAction: 'Stop upright/LBNP activity immediately, sit or lie down safely, and follow emergency protocol.',
      metricSummary: `BP ${latest.bpSystolic}/${latest.bpDiastolic} mmHg (${latest.bpPosture}) · Symptomatic`,
    });
  } else if (bpUrgentThreshold) {
    pushAlert({
      id: 'cardio-bp-range',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'cardio',
      systemLabel: '4.2 Cardiovascular',
      title: 'Blood Pressure Significantly Outside Approved Range',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Blood pressure regulation is markedly outside approved individual limits.',
      recommendedAction: 'Rest calmly 5 min with cuff at heart height, log posture, and escalate to Flight Surgeon.',
      metricSummary: `BP ${latest.bpSystolic}/${latest.bpDiastolic} mmHg (${latest.bpPosture})`,
    });
  } else if (bpOutOfRange) {
    pushAlert({
      id: 'cardio-bp-range',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'cardio',
      systemLabel: '4.2 Cardiovascular',
      title: 'Blood Pressure Outside Approved Individual Range',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Blood-pressure regulation may be outside expected resting/exercise range.',
      recommendedAction: 'Document posture and timing; repeat only under approved procedure.',
      metricSummary: `BP ${latest.bpSystolic}/${latest.bpDiastolic} mmHg (${latest.bpPosture})`,
    });
  }

  // Bio-Monitor / Wearable Vital Checks vs Personal Baseline
  if (
    latest.restingHrBpm > baseline.restingHrRange[1] + 10 ||
    latest.restingHrBpm < baseline.restingHrRange[0] - 8
  ) {
    pushAlert({
      id: 'wearable-resting-hr-urgent',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'cardio',
      systemLabel: 'Bio-Monitor · Heart',
      title: 'Resting Heart Rate Significantly Off Baseline',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Resting heart rate is well outside pre-flight baseline (possible dehydration, fever, or stress).',
      recommendedAction: 'Rest calmly, hydrate 500 mL, and re-measure before strenuous tasks.',
      metricSummary: `Resting HR ${latest.restingHrBpm} bpm (Normal ${baseline.restingHrRange[0]}–${baseline.restingHrRange[1]})`,
    });
  } else if (
    latest.restingHrBpm > baseline.restingHrRange[1] ||
    latest.restingHrBpm < baseline.restingHrRange[0]
  ) {
    pushAlert({
      id: 'wearable-resting-hr-watch',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'cardio',
      systemLabel: 'Bio-Monitor · Heart',
      title: 'Resting Heart Rate Elevated vs Personal Baseline',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Heart rate is drifting higher than personal resting baseline.',
      recommendedAction: 'Increase fluids and check sleep recovery tonight.',
      metricSummary: `Resting HR ${latest.restingHrBpm} bpm (Normal ${baseline.restingHrRange[0]}–${baseline.restingHrRange[1]})`,
    });
  }

  if (latest.spo2Pct !== undefined && latest.spo2Pct < baseline.spo2MinPct) {
    const isUrgentSpo2 = latest.spo2Pct < 92;
    pushAlert({
      id: 'wearable-spo2',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'cardio',
      systemLabel: 'Bio-Monitor · SpO2',
      title: isUrgentSpo2 ? 'Low Blood Oxygen (SpO2 < 92%)' : 'Borderline Blood Oxygen (SpO2)',
      severity: isUrgentSpo2 ? 'urgent' : 'caution',
      classification: isUrgentSpo2 ? 'Urgent clinical-review trigger' : 'Proposed operational trigger',
      whatItMayShow: 'Oxygen saturation is below normal; inspect sensor fit and Hazard 5 cabin O2/CO2 loop.',
      recommendedAction: 'Re-seat wearable pulse-ox sensor, verify cabin O2/CO2, and escalate if persistent.',
      metricSummary: `SpO2 ${latest.spo2Pct}% (Normal >= ${baseline.spo2MinPct}%)`,
    });
  }

  if (latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs) {
    const isUrgentHrv = latest.hrvMs < baseline.hrvMinMs * 0.65;
    pushAlert({
      id: 'wearable-hrv',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'cardio',
      systemLabel: 'Bio-Monitor · HRV',
      title: isUrgentHrv ? 'Low HRV Autonomic Recovery' : 'HRV Recovery Slightly Below Baseline',
      severity: isUrgentHrv ? 'urgent' : 'caution',
      classification: isUrgentHrv ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whatItMayShow: 'Lower heart-rate variability reflects autonomic strain, poor sleep, or dehydration.',
      recommendedAction: 'Prioritize hydration, sleep recovery, and lighter workload today.',
      metricSummary: `HRV ${latest.hrvMs} ms (Baseline >= ${baseline.hrvMinMs} ms)`,
    });
  }

  if (
    latest.bodyTempC !== undefined &&
    (latest.bodyTempC > baseline.bodyTempCRange[1] || latest.bodyTempC < baseline.bodyTempCRange[0])
  ) {
    const isUrgentTemp = latest.bodyTempC >= 38.0 || latest.bodyTempC <= 35.2;
    pushAlert({
      id: 'wearable-temp',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'nutrition-hydration',
      systemLabel: 'Bio-Monitor · Temp',
      title: latest.bodyTempC >= 38.0 ? 'Fever / Elevated Body Temperature' : 'Body Temperature Outside Baseline',
      severity: isUrgentTemp ? 'urgent' : 'caution',
      classification: isUrgentTemp ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whatItMayShow: 'Core/skin temperature is outside normal individual baseline range.',
      recommendedAction: 'Verify thermometer reading, hydrate, rest, and log any immune symptoms.',
      metricSummary: `Temp ${latest.bodyTempC.toFixed(1)}°C (Normal ${baseline.bodyTempCRange[0]}–${baseline.bodyTempCRange[1]}°C)`,
    });
  }

  if (
    latest.bloodGlucoseMgDl !== undefined &&
    (latest.bloodGlucoseMgDl < baseline.bloodGlucoseMgDlRange[0] ||
      latest.bloodGlucoseMgDl > baseline.bloodGlucoseMgDlRange[1])
  ) {
    const isUrgentGlucose = latest.bloodGlucoseMgDl < 65 || latest.bloodGlucoseMgDl > 180;
    pushAlert({
      id: 'wearable-glucose',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'nutrition-hydration',
      systemLabel: '4.5 Metabolic',
      title: latest.bloodGlucoseMgDl < 70 ? 'Low Blood Sugar (Hypoglycemia)' : 'Elevated Blood Sugar',
      severity: isUrgentGlucose ? 'urgent' : 'caution',
      classification: isUrgentGlucose ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whatItMayShow: 'Blood glucose is outside your normal metabolic range.',
      recommendedAction:
        latest.bloodGlucoseMgDl < 70
          ? 'Consume quick carbohydrate + protein ration immediately and re-check in 15 min.'
          : 'Hydrate with plain water and avoid high-sugar rations until re-checked.',
      metricSummary: `Glucose ${latest.bloodGlucoseMgDl} mg/dL (Normal ${baseline.bloodGlucoseMgDlRange[0]}–${baseline.bloodGlucoseMgDlRange[1]})`,
    });
  }

  // 4.3 Muscle Health
  if (latest.strengthPctBaseline < 80) {
    pushAlert({
      id: 'muscle-strength-v14024',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'muscle',
      systemLabel: '4.3 Muscle Health',
      title: 'Muscle Strength Below 80% Baseline',
      severity: 'urgent',
      classification: 'NASA-backed threshold',
      standardRef: 'NASA-STD-3001 V1 4024',
      whatItMayShow: 'Strength may be too low for demanding EVA lifting and post-landing mobility.',
      recommendedAction: 'Review workouts, check protein intake, and route to ASCR/medical team.',
      metricSummary: `Strength ${latest.strengthPctBaseline.toFixed(1)}% of baseline (minimum >= 80%)`,
    });
  }

  if (latest.muscleCsaPctBaseline < 87) {
    pushAlert({
      id: 'muscle-ultrasound-drift',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'muscle',
      systemLabel: '4.3 Muscle Health',
      title: 'Ultrasound Muscle Cross-Sectional Size Drift',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Possible early muscle atrophy despite ongoing resistance countermeasure plan.',
      recommendedAction: 'Compare longitudinal ultrasound scans in Scans and verify protein + ARED load.',
      metricSummary: `Ultrasound CSA ${latest.muscleCsaPctBaseline.toFixed(1)}% of baseline`,
    });
  }

  if (latest.limitingMusclePain) {
    pushAlert({
      id: 'muscle-clinical-pain',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'muscle',
      systemLabel: '4.3 Muscle Health',
      title: 'Activity-Limiting Muscle Pain or Strain',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Possible muscle strain, overuse injury, or condition requiring clinical review.',
      recommendedAction: 'Modify ARED activity only under approved protocol and escalate if persistent.',
      metricSummary: 'Self-reported persistent activity-limiting muscle symptoms',
    });
  }

  // 4.4 Vision / SANS
  if (latest.visionSymptoms.length > 0) {
    pushAlert({
      id: 'sans-symptoms',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'vision-sans',
      systemLabel: '4.4 Vision / SANS',
      title: 'New or Worsening Visual / SANS Symptoms',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Possible refractive shift, optic-disc edema, or SANS-related neuro-ocular change.',
      recommendedAction: 'Confirm symptom details and route to mission medical team for ophthalmic review.',
      metricSummary: `Reported: ${latest.visionSymptoms.join(', ')}`,
    });
  }

  if (latest.octExamOverdue) {
    pushAlert({
      id: 'sans-oct-overdue',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'vision-sans',
      systemLabel: '4.4 Vision / SANS',
      title: 'Scheduled OCT / Fundoscopy Exam Overdue',
      severity: 'caution',
      classification: 'Protocol/compliance trigger',
      whatItMayShow: 'Scheduled retinal and optic-nerve imaging is overdue for baseline comparison.',
      recommendedAction: 'Complete OCT / fundoscopy protocol at next medical slot and log scan.',
      metricSummary: 'Scheduled eye/SANS protocol overdue',
    });
  }

  if (
    latest.iopMmHg < baseline.iopMmHgRange[0] ||
    latest.iopMmHg > baseline.iopMmHgRange[1] ||
    Math.abs(latest.acuityDeltaLines) >= 2
  ) {
    pushAlert({
      id: 'sans-iop-acuity',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'vision-sans',
      systemLabel: '4.4 Vision / SANS',
      title: 'IOP or Visual Acuity Shift Relative to Baseline',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Eye pressure or refraction may have shifted relative to pre-mission baseline.',
      recommendedAction: 'Repeat tonometry under approved protocol and review with prior values.',
      metricSummary: `IOP ${latest.iopMmHg} mmHg · Acuity Δ ${latest.acuityDeltaLines > 0 ? '+' : ''}${latest.acuityDeltaLines} lines`,
    });
  }

  // 4.5 Nutrition & Hydration (including V2 6109 context & nutrition symptoms)
  if (latest.renalColicSymptoms) {
    pushAlert({
      id: 'nutrition-renal-colic',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'nutrition-hydration',
      systemLabel: '4.5 Nutrition & Hydration',
      title: 'Possible Renal Colic / Urinary Complication',
      severity: 'urgent',
      classification: 'Urgent clinical-review trigger',
      whatItMayShow: 'Possible kidney stone or acute urinary tract complication requiring urgent medical assessment.',
      recommendedAction: 'Stop/modify activity under approved protocol, document pain onset & fluid intake, and escalate urgently.',
      metricSummary: 'Flank/abdominal pain, dysuria, or hematuria flagged',
    });
  }

  const lowFluidDays = last3.filter(
    (d) => d.fluidIntakeMl < baseline.fluidTargetMl * 0.88 || d.urineDarkConcentrated
  ).length;
  if (lowFluidDays >= 2) {
    pushAlert({
      id: 'nutrition-hydration-drift',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'nutrition-hydration',
      systemLabel: '4.5 Nutrition & Hydration',
      title: 'Low Hydration & Concentrated Urine Trend',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      standardRef: 'NASA-STD-3001 V2 6109 Context',
      whatItMayShow: 'Low urine volume increases urine supersaturation and kidney-stone risk in microgravity.',
      recommendedAction: 'Drink 500 mL water now and target personal baseline (habitat supplies ~2.5 L/d V2 6109).',
      metricSummary: `Fluid ${latest.fluidIntakeMl} mL (goal ${baseline.fluidTargetMl} mL) · Urine ${latest.urineOutputMl} mL`,
    });
  }

  const lowEnergyDays = last3.filter((d) => d.caloriesKcal < baseline.calorieTargetKcal * 0.94).length;
  const highSodiumDays = last3.filter((d) => d.sodiumMg > baseline.sodiumLimitMg).length;
  if (lowEnergyDays >= 2 || highSodiumDays >= 2) {
    pushAlert({
      id: 'nutrition-intake-balance',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'nutrition-hydration',
      systemLabel: '4.5 Nutrition & Hydration',
      title: 'Multi-Day Caloric Shortfall or Elevated Sodium Trend',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Energy deficit accelerates body-mass/bone loss; excess sodium worsens bone resorption and SANS risk.',
      recommendedAction: 'Audit food acceptability/menu fatigue (Hazard 5.3) and swap high-sodium rations.',
      metricSummary: `${latest.caloriesKcal} kcal (target ${baseline.calorieTargetKcal}) · Sodium ${latest.sodiumMg} mg`,
    });
  }

  if (latest.nutritionSymptomsFlag) {
    pushAlert({
      id: 'nutrition-eating-symptoms',
      hazardId: 'gravity-fields',
      hazardLabel: 'Hazard 4 · Gravity Fields',
      systemId: 'nutrition-hydration',
      systemLabel: '4.5 Nutrition & Hydration',
      title: 'Persistent Symptoms Affecting Eating or Hydration',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Illness, food intolerance, or dehydration may be impairing nutrition and fluid retention.',
      recommendedAction: 'Document symptoms, review fluid balance, and escalate to medical team if persistent.',
      metricSummary: 'Self-reported nausea, anorexia, or swallowing difficulty',
    });
  }

  // =========================================================================
  // HAZARD 1: SPACE RADIATION (Pages 2–3)
  // =========================================================================
  if (latest.dosimetryStatus === 'stale' || latest.dosimetryLastUpdatedHoursAgo > 24) {
    pushAlert({
      id: 'rad-data-quality',
      hazardId: 'space-radiation',
      hazardLabel: 'Hazard 1 · Space Radiation',
      systemId: 'radiation',
      systemLabel: '1. Space Radiation',
      title: 'Dosimetry Stale or Unavailable — Do Not Assume Nominal',
      severity: 'data-quality',
      classification: 'Data-quality trigger',
      whatItMayShow: 'Personal dosimeter telemetry has not updated within 24h; symptom absence cannot substitute for dosimetry.',
      recommendedAction: 'Verify personal dosimeter link and resync cabin ambient radiation telemetry.',
      metricSummary: `Last verified reading ${latest.dosimetryLastUpdatedHoursAgo}h ago`,
    });
  }

  if (speState.activeWarning) {
    pushAlert({
      id: 'rad-spe-active',
      hazardId: 'space-radiation',
      hazardLabel: 'Hazard 1 · Space Radiation',
      systemId: 'radiation',
      systemLabel: '1. Space Radiation',
      title: `Active Solar Particle Event Warning (${speState.eventId})`,
      severity: 'urgent',
      classification: 'Official-warning relay',
      whatItMayShow: 'Elevated solar proton flux may cause acute effects; app never issues an independent all-clear.',
      recommendedAction: speState.shelterOccupied
        ? `Remain inside ${speState.assignedShelter} until official mission exit instructions.`
        : `Acknowledge warning and move immediately to ${speState.assignedShelter}.`,
      metricSummary: speState.shelterOccupied ? 'Shelter occupancy logged' : 'Awaiting shelter entry log',
    });
  }

  if (latest.neurologicalRedFlag) {
    pushAlert({
      id: 'rad-neuro-emergency',
      hazardId: 'space-radiation',
      hazardLabel: 'Hazard 1 · Space Radiation',
      systemId: 'radiation',
      systemLabel: '1. Space Radiation',
      title: 'Neurological / Major Functional Change Flagged',
      severity: 'urgent',
      classification: 'Urgent clinical-review trigger',
      whatItMayShow: 'New confusion, coordination difficulty, or collapse requires immediate emergency medical response.',
      recommendedAction: 'Do not treat as routine fatigue; initiate emergency crew medical protocol immediately.',
      metricSummary: 'Urgent CNS symptom report logged',
    });
  } else if (
    latest.radiationProdromalSymptoms.length > 0 ||
    latest.skinChangeFlag ||
    latest.giFluidLossFlag ||
    (latest.bfoLabStatus && latest.bfoLabStatus !== 'Nominal')
  ) {
    pushAlert({
      id: 'rad-prodromal-log',
      hazardId: 'space-radiation',
      hazardLabel: 'Hazard 1 · Space Radiation',
      systemId: 'radiation',
      systemLabel: '1. Space Radiation',
      title: 'Event-Linked Radiation Symptom / BFO Review Logged',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Logged for clinician follow-up; symptoms cannot confirm ARS or estimate absorbed dose.',
      recommendedAction: 'Preserve complete timeline (including latent phase), link hydration, and upload timestamped skin photos.',
      metricSummary:
        latest.radiationProdromalSymptoms.length > 0
          ? latest.radiationProdromalSymptoms.join(', ')
          : `BFO: ${latest.bfoLabStatus ?? 'Nominal'} · Skin/GI flagged`,
    });
  }

  // =========================================================================
  // HAZARD 2: ISOLATION & CONFINEMENT (Pages 4–9)
  // =========================================================================
  let behavioralSeverity: AlertSeverity = 'nominal';
  const latestVault = vault[vault.length - 1];
  const prevVault = vault.length >= 2 ? vault[vault.length - 2] : null;
  const last3Vault = vault.slice(-3);

  let hoursAwakeNow = 6.5;
  let inSleepInertiaWindow = false;
  if (latestVault?.wakeTimeISO) {
    const diffH = (Date.now() - new Date(latestVault.wakeTimeISO).getTime()) / (3600 * 1000);
    if (!Number.isNaN(diffH) && diffH >= 0 && diffH <= 48) {
      hoursAwakeNow = Number(diffH.toFixed(1));
      inSleepInertiaWindow = hoursAwakeNow <= 3.0;
    }
  }

  if (
    latestVault &&
    prevVault &&
    latestVault.sleepHours < baseline.sleepTargetHours &&
    prevVault.sleepHours < baseline.sleepTargetHours
  ) {
    behavioralSeverity = maxSeverity(behavioralSeverity, 'caution');
    pushAlert({
      id: 'beh-sleep-consecutive',
      hazardId: 'isolation-confinement',
      hazardLabel: 'Hazard 2 · Isolation & Confinement',
      systemId: 'behavioral',
      systemLabel: '2.1 Sleep Duration',
      title: 'Sleep Below 8-Hour Evidence Reference',
      severity: 'caution',
      classification: 'Evidence-based reference point',
      whatItMayShow: 'Chronic sleep loss may accumulate and impair alertness, mood, and HPA stress regulation.',
      recommendedAction: 'Adjust light-exposure schedule, check cabin noise/CO2, and protect private rest window.',
      metricSummary: `Last 2 sols: ${prevVault.sleepHours.toFixed(1)}h & ${latestVault.sleepHours.toFixed(1)}h (ref ${baseline.sleepTargetHours}h)`,
    });
  }

  if (hoursAwakeNow >= 16) {
    behavioralSeverity = maxSeverity(behavioralSeverity, 'urgent');
    pushAlert({
      id: 'beh-acute-wakefulness',
      hazardId: 'isolation-confinement',
      hazardLabel: 'Hazard 2 · Isolation & Confinement',
      systemId: 'behavioral',
      systemLabel: '2.1 Acute Sleep Loss',
      title: 'Continuous Wakefulness >= 16 Hours',
      severity: 'urgent',
      classification: 'Evidence-based reference point',
      whatItMayShow: 'Acute sleep deprivation impairs vigilance and decision-making before high-risk tasks.',
      recommendedAction: 'Defer non-emergency safety-critical tasks and initiate approved rest opportunity.',
      metricSummary: `${hoursAwakeNow.toFixed(1)}h continuous wakefulness`,
    });
  }

  const workloadOverDays = last3Vault.filter((v) => v.workloadHours > 6.5).length;
  const criticalOverload = last3Vault.filter((v) => v.workloadHours >= 10).length >= 3;
  if (criticalOverload || workloadOverDays >= 3) {
    behavioralSeverity = maxSeverity(behavioralSeverity, criticalOverload ? 'urgent' : 'caution');
    pushAlert({
      id: 'beh-workload-overload',
      hazardId: 'isolation-confinement',
      hazardLabel: 'Hazard 2 · Isolation & Confinement',
      systemId: 'behavioral',
      systemLabel: '2.1 Workload',
      title: criticalOverload ? 'Critical Workload Overload (>10h/day)' : 'Sustained Workload Above 6.5h/day Reference',
      severity: criticalOverload ? 'urgent' : 'caution',
      classification: 'Evidence-based reference point',
      whatItMayShow: 'Schedule creep reduces sleep recovery and increases stress and crew-ground tension.',
      recommendedAction: 'Exercise crew schedule autonomy to defer low-priority tasks and protect sleep.',
      metricSummary: `Recent workload: ${last3Vault.map((v) => `${v.workloadHours}h`).join(' / ')}`,
    });
  }

  const latestPvt = pvtSessions[pvtSessions.length - 1];
  if (latestPvt && (latestPvt.meanRtMs > baseline.pvtBaselineMs + 45 || latestPvt.lapsesCount >= 2)) {
    behavioralSeverity = maxSeverity(behavioralSeverity, 'caution');
    pushAlert({
      id: 'beh-pvt-vigilance',
      hazardId: 'isolation-confinement',
      hazardLabel: 'Hazard 2 · Isolation & Confinement',
      systemId: 'behavioral',
      systemLabel: '2.1 Fatigue & Alertness',
      title: 'PVT-B Psychomotor Vigilance Drift vs Personal Baseline',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Reaction time or lapses (>355 ms) indicate reduced sustained attention.',
      recommendedAction: 'Cross-check sleep debt and cabin CO2; run private check-in before high-risk tasks.',
      metricSummary: `Mean RT ${latestPvt.meanRtMs} ms (base ${baseline.pvtBaselineMs} ms) · ${latestPvt.lapsesCount} lapses`,
    });
  }

  // =========================================================================
  // HAZARD 3: DISTANCE FROM EARTH (Pages 10–11)
  // =========================================================================
  const vaultCommTensionCount = last3Vault.filter((v) => v.commDelayTension).length;
  if (latest.commBreakdownFlag || vaultCommTensionCount >= 2) {
    pushAlert({
      id: 'dist-crew-ground-comm',
      hazardId: 'distance-from-earth',
      hazardLabel: 'Hazard 3 · Distance from Earth',
      systemId: 'distance',
      systemLabel: '3.1 Crew-Ground Comms',
      title: 'Crew-Ground Communication Delay / Breakdown Flagged',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Out-of-sequence or delayed communications may impair coordination, trust, and situational awareness.',
      recommendedAction: 'Use structured async summary templates and confirm shared understanding.',
      metricSummary: latest.commBreakdownFlag
        ? `Async breakdown logged (${env.oneWayLatencyLabel})`
        : `${vaultCommTensionCount} comm tension logs in 3 sols`,
    });
  }

  if (latest.seuChecksumOk === false) {
    pushAlert({
      id: 'dist-seu-integrity',
      hazardId: 'distance-from-earth',
      hazardLabel: 'Hazard 3 · Distance from Earth',
      systemId: 'distance',
      systemLabel: '3.2 Hardware / SEU',
      title: 'Single Event Upset (SEU) Telemetry Checksum Warning',
      severity: 'data-quality',
      classification: 'Data-quality trigger',
      whatItMayShow: 'Cosmic radiation hardware upset may corrupt edge telemetry integrity until re-verified.',
      recommendedAction: 'Re-verify local checksum and inspect store-and-forward queue packets.',
      metricSummary: 'SEU parity verification mismatch',
    });
  }

  // =========================================================================
  // HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS (Pages 19–20)
  // =========================================================================
  const cabinTemp = latest.cabinTempC ?? 22.3;
  const cabinPressure = latest.cabinPressureKpa ?? 101.3;
  const cabinCo2 = latest.cabinCo2MmHg ?? 2.8;
  const cabinO2 = latest.cabinO2Pct ?? 20.9;
  const cabinNoise = latest.cabinNoiseDba ?? 61;

  if (latest.envDataStatus === 'stale') {
    pushAlert({
      id: 'env-data-availability',
      hazardId: 'hostile-closed',
      hazardLabel: 'Hazard 5 · Hostile / Closed Environments',
      systemId: 'hostile-closed',
      systemLabel: '5.1 Data Availability',
      title: 'Cabin Environmental Telemetry Stale or Unverified',
      severity: 'data-quality',
      classification: 'Data-quality trigger',
      whatItMayShow: 'Environmental status cannot be confirmed when readings are missing or outdated.',
      recommendedAction: 'Inspect environmental monitoring bus and avoid treating absent readings as Normal.',
      metricSummary: 'Cabin MQTT/SpaceWire sensor status stale',
    });
  }

  const co2Out = cabinCo2 >= 3.2;
  const tempOut = cabinTemp < baseline.cabinTempCRange[0] || cabinTemp > baseline.cabinTempCRange[1];
  const pressOut =
    cabinPressure < baseline.cabinPressureKpaRange[0] ||
    cabinPressure > baseline.cabinPressureKpaRange[1];
  const o2Out = cabinO2 < baseline.cabinO2PctRange[0] || cabinO2 > baseline.cabinO2PctRange[1];

  if (co2Out || tempOut || pressOut || o2Out || cabinNoise >= 68) {
    const isUrgentEnv = cabinCo2 >= 4.0 || pressOut || o2Out;
    pushAlert({
      id: 'env-cabin-conditions',
      hazardId: 'hostile-closed',
      hazardLabel: 'Hazard 5 · Hostile / Closed Environments',
      systemId: 'hostile-closed',
      systemLabel: '5.1 Cabin Environment',
      title: isUrgentEnv ? 'Cabin Environment Outside Safe Limits' : 'Cabin Air / Acoustic Drift Detected',
      severity: isUrgentEnv ? 'urgent' : 'caution',
      classification: isUrgentEnv ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whatItMayShow: 'Cabin CO2, temperature, pressure, O2, or noise may affect health, sleep, and cognitive function.',
      recommendedAction: 'Follow approved ECLSS environmental procedure and flag persistent readings for review.',
      metricSummary: `CO2 ${cabinCo2.toFixed(1)} mmHg · ${cabinTemp.toFixed(1)}°C · ${cabinPressure.toFixed(1)} kPa · O2 ${cabinO2.toFixed(1)}%`,
    });
  }

  if (latest.evaUrgentSymptom) {
    pushAlert({
      id: 'env-eva-urgent',
      hazardId: 'hostile-closed',
      hazardLabel: 'Hazard 5 · Hostile / Closed Environments',
      systemId: 'hostile-closed',
      systemLabel: '5.2 EVA Health',
      title: 'Urgent EVA-Related Symptom Flagged',
      severity: 'urgent',
      classification: 'Urgent clinical-review trigger',
      whatItMayShow: 'Severe breathlessness, chest pain, or collapse during/after EVA requires immediate emergency care.',
      recommendedAction: 'Follow approved emergency EVA termination/recovery protocol; notify medical team immediately.',
      metricSummary: `EVA Phase: ${latest.evaStatus ?? 'In-EVA Spacewalk'}`,
    });
  } else if (latest.evaSymptoms && latest.evaSymptoms.length > 0) {
    pushAlert({
      id: 'env-eva-symptoms',
      hazardId: 'hostile-closed',
      hazardLabel: 'Hazard 5 · Hostile / Closed Environments',
      systemId: 'hostile-closed',
      systemLabel: '5.2 EVA Health',
      title: 'New or Worsening EVA-Related Symptoms',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Possible decompression, hypoxia, joint strain, or suit-related issue requiring medical review.',
      recommendedAction: 'Document EVA phase/symptoms and escalate; app never approves or clears EVA.',
      metricSummary: latest.evaSymptoms.join(', '),
    });
  }

  if (latest.foodSafetyFlag) {
    pushAlert({
      id: 'env-food-safety',
      hazardId: 'hostile-closed',
      hazardLabel: 'Hazard 5 · Hostile / Closed Environments',
      systemId: 'hostile-closed',
      systemLabel: '5.3 Food Safety',
      title: 'Suspected Food-Safety Event or Adverse Reaction',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Suspected spoiled food, contamination, allergic reaction, or GI distress after eating.',
      recommendedAction: 'Document food lot/time, stop suspect item only under approved protocol, and escalate.',
      metricSummary: 'Food safety / adverse GI reaction logged',
    });
  } else if ((latest.foodAcceptabilityScore ?? 3) <= 2) {
    pushAlert({
      id: 'env-food-acceptability',
      hazardId: 'hostile-closed',
      hazardLabel: 'Hazard 5 · Hostile / Closed Environments',
      systemId: 'hostile-closed',
      systemLabel: '5.3 Food Variety',
      title: 'Low Food Acceptability / Menu Fatigue Risk',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Reduced food acceptability can lower calorie and nutrient intake.',
      recommendedAction: 'Log preferred ration swaps and review Hazard 4.5 caloric trend.',
      metricSummary: `Food rating ${latest.foodAcceptabilityScore}/5`,
    });
  }

  if (latest.immuneInfectionSymptoms && latest.immuneInfectionSymptoms.length > 0) {
    pushAlert({
      id: 'env-immune-symptoms',
      hazardId: 'hostile-closed',
      hazardLabel: 'Hazard 5 · Hostile / Closed Environments',
      systemId: 'hostile-closed',
      systemLabel: '5.3 Immune / Infection',
      title: 'New Immune or Infection Symptoms Logged',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Possible immune dysregulation or infection in a closed habitat requiring medical review.',
      recommendedAction: 'Track fever, rash, or sore throat trend and notify Flight Surgeon.',
      metricSummary: latest.immuneInfectionSymptoms.join(', '),
    });
  }

  if (latest.microbiomeSymptomsFlag) {
    pushAlert({
      id: 'env-microbiome-symptoms',
      hazardId: 'hostile-closed',
      hazardLabel: 'Hazard 5 · Hostile / Closed Environments',
      systemId: 'hostile-closed',
      systemLabel: '5.3 Microbiome',
      title: 'Persistent Microbiome GI or Skin Symptoms',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Persistent GI or skin change may reflect closed-environment microbiome shift.',
      recommendedAction: 'Link symptoms with diet & cabin environment context for medical review.',
      metricSummary: 'Persistent GI / skin symptom flagged',
    });
  }

  // Safe streaks (reward adherence & logging, NEVER penalize negative mood!)
  let aredStreakDays = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].aredCompleted) aredStreakDays++;
    else break;
  }

  let hydrationStreakDays = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].fluidIntakeMl >= baseline.fluidTargetMl * 0.9) hydrationStreakDays++;
    else break;
  }

  const sleepLogStreakDays = vault.length;

  let overallOperationalState: AlertSeverity = 'nominal';
  (Object.values(systemSeverities) as AlertSeverity[]).forEach((sev) => {
    overallOperationalState = maxSeverity(overallOperationalState, sev);
  });

  return {
    alerts,
    systemSeverities,
    hazardSeverities,
    behavioralSeverity,
    readinessSummary: {
      bonePct: Number(latest.hipSpineBmdPct.toFixed(1)),
      cardioPct: Number(Math.min(100, vo2PctOfBaseline).toFixed(1)),
      musclePct: Number(latest.strengthPctBaseline.toFixed(1)),
      overallOperationalState,
    },
    streaks: {
      aredStreakDays,
      hydrationStreakDays,
      sleepLogStreakDays,
      pvtCheckInCount: pvtSessions.length,
    },
    hoursAwakeNow,
    inSleepInertiaWindow,
  };
}
