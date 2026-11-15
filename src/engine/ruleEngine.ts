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
  // RISK 4: LOW GRAVITY (Bone, Cardio, Muscle, Eyes & Brain, Fluids & Nutrition)
  // =========================================================================

  // 1. Bone Density
  if (latest.hipSpineBmdPct < 95 || latest.femoralNeckBmdPct < 90) {
    pushAlert({
      id: 'bone-bmd-threshold',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'bone',
      systemLabel: 'Bone Density',
      title: 'Bone Density Below Safe Level',
      severity: 'urgent',
      classification: 'NASA-backed threshold',
      standardRef: 'Bone Density Rule',
      whatItMayShow: 'Hip, spine, or thigh bone strength dropped below safe mission limits.',
      recommendedAction: 'Complete today’s full resistance training and notify your flight surgeon.',
      metricSummary: `Hip & Spine ${latest.hipSpineBmdPct.toFixed(1)}% (min 95%) · Thigh ${latest.femoralNeckBmdPct.toFixed(1)}% (min 90%)`,
    });
  }

  const missedAredIn7 = last7.filter((d) => !d.aredCompleted).length;
  if (missedAredIn7 >= 2) {
    pushAlert({
      id: 'bone-ared-shortfall',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'bone',
      systemLabel: 'Bone Density',
      title: 'Missed Resistance Workouts This Week',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Skipping strength workouts allows bones and muscles to weaken in low gravity.',
      recommendedAction: 'Complete your scheduled resistance training session today.',
      metricSummary: `${missedAredIn7} workouts missed in the last 7 days`,
    });
  }

  if (latest.boneTurnoverAbnormal) {
    pushAlert({
      id: 'bone-turnover-marker',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'bone',
      systemLabel: 'Bone Density',
      title: 'Elevated Bone Mineral Loss Marker',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Recent lab markers suggest faster bone mineral loss than expected.',
      recommendedAction: 'Stay consistent with resistance workouts and follow up with your flight surgeon.',
      metricSummary: 'Bone turnover marker flagged for review',
    });
  }

  if (latest.bonePainSymptom) {
    pushAlert({
      id: 'bone-injury-symptom',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'bone',
      systemLabel: 'Bone Density',
      title: 'Persistent Bone Pain Reported',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Ongoing localized bone pain or swelling may indicate a stress injury.',
      recommendedAction: 'Pause heavy loading on that area and report it to your flight surgeon.',
      metricSummary: 'Localized bone pain logged',
    });
  }

  if (latest.postLandingUrgentCollapse) {
    pushAlert({
      id: 'bone-post-landing-collapse',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'bone',
      systemLabel: 'After Landing',
      title: 'Unable to Stand Safely After Landing',
      severity: 'urgent',
      classification: 'Urgent clinical-review trigger',
      whatItMayShow: 'Your circulation and balance need immediate post-landing support.',
      recommendedAction: 'Lie flat right away and request immediate crew medical assistance.',
      metricSummary: 'Post-landing collapse or fainting reported',
    });
  } else if (latest.postLandingSymptoms) {
    pushAlert({
      id: 'bone-post-landing-symptoms',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'bone',
      systemLabel: 'After Landing',
      title: 'Dizziness or Unsteadiness After Landing',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Your body is still readjusting to full gravity after landing.',
      recommendedAction: 'Rest safely, rehydrate with electrolyte fluids, and avoid lifting heavy gear.',
      metricSummary: `Status: ${latest.postLandingPhase ?? 'Post-Landing Readapting'}`,
    });
  }

  // 2. Heart & Lungs
  const vo2PctOfBaseline = (latest.vo2PeakMlKgMin / baseline.vo2PeakMlKgMin) * 100;
  const evaFloor = env?.evaVo2Floor ?? 32.9;
  if (vo2PctOfBaseline < 80 || latest.vo2PeakMlKgMin < evaFloor) {
    pushAlert({
      id: 'cardio-vo2-floor',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'cardio',
      systemLabel: 'Heart & Lungs',
      title: 'Aerobic Fitness Below Spacewalk Limit',
      severity: 'urgent',
      classification: 'NASA-backed threshold',
      standardRef: 'Aerobic Readiness Rule',
      whatItMayShow: 'Cardiovascular endurance is lower than required for demanding spacewalks.',
      recommendedAction: 'Resume scheduled cardio intervals and review with your flight surgeon.',
      metricSummary: `Aerobic fitness ${vo2PctOfBaseline.toFixed(0)}% of baseline`,
    });
  }

  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const hrDeltaNow = latest.submaxHrBpm - baseline.submaxHrBpm;
  const hrDeltaPrev = prev ? prev.submaxHrBpm - baseline.submaxHrBpm : 0;
  if (hrDeltaNow >= 8 && hrDeltaPrev >= 8) {
    pushAlert({
      id: 'cardio-submax-hr-drift',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'cardio',
      systemLabel: 'Heart & Lungs',
      title: 'Elevated Heart Rate During Light Exercise',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Your heart is working noticeably harder during routine submaximal workouts.',
      recommendedAction: 'Increase fluid intake, confirm strap fit, and prioritize recovery sleep.',
      metricSummary: `Exercise HR ${latest.submaxHrBpm} bpm (+${hrDeltaNow} above baseline)`,
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
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'cardio',
      systemLabel: 'Heart & Lungs',
      title: 'Chest Discomfort or Near-Fainting Symptoms',
      severity: 'urgent',
      classification: 'Urgent clinical-review trigger',
      whatItMayShow: 'Heart or blood pressure response requires prompt medical evaluation.',
      recommendedAction: 'Stop exertion, sit or lie down immediately, and contact your flight surgeon.',
      metricSummary: `Blood pressure ${latest.bpSystolic}/${latest.bpDiastolic} mmHg`,
    });
  } else if (bpUrgentThreshold) {
    pushAlert({
      id: 'cardio-bp-range',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'cardio',
      systemLabel: 'Heart & Lungs',
      title: 'Blood Pressure Outside Safe Limits',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Measured blood pressure is significantly above or below your safe range.',
      recommendedAction: 'Sit quietly for 5 minutes, repeat the measurement, and inform your flight surgeon.',
      metricSummary: `BP ${latest.bpSystolic}/${latest.bpDiastolic} mmHg (${latest.bpPosture})`,
    });
  } else if (bpOutOfRange) {
    pushAlert({
      id: 'cardio-bp-range',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'cardio',
      systemLabel: 'Heart & Lungs',
      title: 'Blood Pressure Slightly Above Normal Range',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Blood pressure is mildly shifted from your personal Earth baseline.',
      recommendedAction: 'Record posture clearly, hydrate well, and recheck after resting.',
      metricSummary: `BP ${latest.bpSystolic}/${latest.bpDiastolic} mmHg (${latest.bpPosture})`,
    });
  }

  // Wearable / Biometric Checks vs Personal Baseline
  if (
    latest.restingHrBpm > baseline.restingHrRange[1] + 10 ||
    latest.restingHrBpm < baseline.restingHrRange[0] - 8
  ) {
    pushAlert({
      id: 'wearable-resting-hr-urgent',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'cardio',
      systemLabel: 'Heart & Lungs',
      title: 'Resting Heart Rate Well Outside Normal',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Resting pulse is markedly faster or slower than your healthy baseline.',
      recommendedAction: 'Rest quietly, drink 500 ml of water, and recheck in 15 minutes.',
      metricSummary: `Resting HR ${latest.restingHrBpm} bpm (normal ${baseline.restingHrRange[0]}–${baseline.restingHrRange[1]} bpm)`,
    });
  } else if (
    latest.restingHrBpm > baseline.restingHrRange[1] ||
    latest.restingHrBpm < baseline.restingHrRange[0]
  ) {
    pushAlert({
      id: 'wearable-resting-hr-watch',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'cardio',
      systemLabel: 'Heart & Lungs',
      title: 'Resting Heart Rate Slightly Elevated',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Resting heart rate is slightly above your normal zone due to fatigue or mild dehydration.',
      recommendedAction: 'Drink water steadily today and prioritize a full 8-hour sleep period.',
      metricSummary: `Resting HR ${latest.restingHrBpm} bpm (normal ${baseline.restingHrRange[0]}–${baseline.restingHrRange[1]} bpm)`,
    });
  }

  if (latest.spo2Pct !== undefined && latest.spo2Pct < baseline.spo2MinPct) {
    const isUrgentSpo2 = latest.spo2Pct < 92;
    pushAlert({
      id: 'wearable-spo2',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'cardio',
      systemLabel: 'Heart & Lungs',
      title: isUrgentSpo2 ? 'Blood Oxygen Critically Low' : 'Blood Oxygen Below Normal',
      severity: isUrgentSpo2 ? 'urgent' : 'caution',
      classification: isUrgentSpo2 ? 'Urgent clinical-review trigger' : 'Proposed operational trigger',
      whatItMayShow: 'Oxygen saturation is lower than expected, which may reflect sensor fit or cabin air.',
      recommendedAction: 'Reposition wrist sensor, verify cabin O2/CO2 levels, and notify your flight surgeon.',
      metricSummary: `Blood oxygen ${latest.spo2Pct}% (normal ${baseline.spo2MinPct}%+)`,
    });
  }

  if (latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs) {
    const isUrgentHrv = latest.hrvMs < baseline.hrvMinMs * 0.65;
    pushAlert({
      id: 'wearable-hrv',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'cardio',
      systemLabel: 'Heart & Lungs',
      title: isUrgentHrv ? 'High Physical Strain & Fatigue' : 'Heart Recovery Lower Than Normal',
      severity: isUrgentHrv ? 'urgent' : 'caution',
      classification: isUrgentHrv ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whatItMayShow: 'Low heart recovery (HRV) indicates poor sleep, stress, or low fluid intake.',
      recommendedAction: 'Reduce non-essential workload, rehydrate, and aim for early rest tonight.',
      metricSummary: `Recovery (HRV) ${latest.hrvMs} ms (normal ${baseline.hrvMinMs}+ ms)`,
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
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'nutrition-hydration',
      systemLabel: 'Fluids & Nutrition',
      title: latest.bodyTempC >= 38.0 ? 'Fever Detected' : 'Body Temperature Outside Normal',
      severity: isUrgentTemp ? 'urgent' : 'caution',
      classification: isUrgentTemp ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whatItMayShow: 'Body temperature is warmer or cooler than your normal resting baseline.',
      recommendedAction: 'Confirm with an oral thermometer, hydrate, rest, and log any symptoms.',
      metricSummary: `Body temperature ${latest.bodyTempC.toFixed(1)} °C`,
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
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'nutrition-hydration',
      systemLabel: 'Fluids & Nutrition',
      title: latest.bloodGlucoseMgDl < 70 ? 'Low Blood Glucose' : 'Elevated Blood Glucose',
      severity: isUrgentGlucose ? 'urgent' : 'caution',
      classification: isUrgentGlucose ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whatItMayShow: 'Blood sugar is outside your healthy fasting/resting range.',
      recommendedAction:
        latest.bloodGlucoseMgDl < 70
          ? 'Consume a balanced carbohydrate snack right away and recheck in 15 minutes.'
          : 'Drink plain water, avoid simple sugars, and recheck before next meal.',
      metricSummary: `Blood glucose ${latest.bloodGlucoseMgDl} mg/dL (normal ${baseline.bloodGlucoseMgDlRange[0]}–${baseline.bloodGlucoseMgDlRange[1]})`,
    });
  }

  // 3. Muscle Health
  if (latest.strengthPctBaseline < 80) {
    pushAlert({
      id: 'muscle-strength-v14024',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'muscle',
      systemLabel: 'Muscles',
      title: 'Muscle Strength Below 80% Limit',
      severity: 'urgent',
      classification: 'NASA-backed threshold',
      standardRef: 'Muscle Strength Rule',
      whatItMayShow: 'Lower-body and core strength have dropped below safe limits for suit tasks.',
      recommendedAction: 'Complete resistance workouts, prioritize daily protein, and consult your flight surgeon.',
      metricSummary: `Strength ${latest.strengthPctBaseline.toFixed(1)}% (min 80%)`,
    });
  }

  if (latest.muscleCsaPctBaseline < 87) {
    pushAlert({
      id: 'muscle-ultrasound-drift',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'muscle',
      systemLabel: 'Muscles',
      title: 'Gradual Thigh Muscle Loss',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Leg muscle volume is trending slightly below your mission target.',
      recommendedAction: 'Review leg scan photos and keep daily calories and protein on target.',
      metricSummary: `Thigh muscle size ${latest.muscleCsaPctBaseline.toFixed(1)}%`,
    });
  }

  if (latest.limitingMusclePain) {
    pushAlert({
      id: 'muscle-clinical-pain',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'muscle',
      systemLabel: 'Muscles',
      title: 'Work-Limiting Muscle Pain',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Sharp or persistent muscle soreness may indicate an exercise strain.',
      recommendedAction: 'Stop loading that muscle group and notify your flight surgeon.',
      metricSummary: 'Limiting muscle pain flagged',
    });
  }

  // 4. Eyes & Brain
  if (latest.visionSymptoms.length > 0) {
    pushAlert({
      id: 'sans-symptoms',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'vision-sans',
      systemLabel: 'Eyes & Brain',
      title: 'Vision Changes or Persistent Headache',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Headward fluid shift in low gravity can place extra pressure on the eyes.',
      recommendedAction: 'Log details promptly and inform your flight surgeon for an eye exam.',
      metricSummary: `Reported: ${latest.visionSymptoms.join(', ')}`,
    });
  }

  if (latest.octExamOverdue) {
    pushAlert({
      id: 'sans-oct-overdue',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'vision-sans',
      systemLabel: 'Eyes & Brain',
      title: 'Scheduled Eye Scan Overdue',
      severity: 'caution',
      classification: 'Protocol/compliance trigger',
      whatItMayShow: 'Your routine retinal check has not been logged on schedule.',
      recommendedAction: 'Complete your eye scan and upload comparison images in Checks.',
      metricSummary: 'Routine eye scan due',
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
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'vision-sans',
      systemLabel: 'Eyes & Brain',
      title: 'Eye Pressure or Reading Sharpness Shifted',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Eye fluid pressure or visual clarity differs from your pre-flight baseline.',
      recommendedAction: 'Rest calmly, repeat the reading chart check, and schedule eye imaging.',
      metricSummary: `Eye pressure ${latest.iopMmHg} mmHg · Chart shift ${latest.acuityDeltaLines > 0 ? '+' : ''}${latest.acuityDeltaLines} lines`,
    });
  }

  // 5. Fluids & Nutrition
  if (latest.renalColicSymptoms) {
    pushAlert({
      id: 'nutrition-renal-colic',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'nutrition-hydration',
      systemLabel: 'Fluids & Nutrition',
      title: 'Possible Kidney Stone Symptoms',
      severity: 'urgent',
      classification: 'Urgent clinical-review trigger',
      whatItMayShow: 'Flank pain, painful urination, or blood in urine requires immediate evaluation.',
      recommendedAction: 'Stop strenuous activity immediately and contact your flight surgeon.',
      metricSummary: 'Severe flank or urinary symptoms reported',
    });
  }

  const lowFluidDays = last3.filter(
    (d) => d.fluidIntakeMl < baseline.fluidTargetMl * 0.88 || d.urineDarkConcentrated
  ).length;
  if (lowFluidDays >= 2) {
    pushAlert({
      id: 'nutrition-hydration-drift',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'nutrition-hydration',
      systemLabel: 'Fluids & Nutrition',
      title: 'Low Fluid Intake or Concentrated Urine',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      standardRef: 'Hydration Rule',
      whatItMayShow: 'Persistent dehydration significantly raises kidney stone risk in low gravity.',
      recommendedAction: 'Drink 500 ml (2 full glasses) of water now and aim for 2.5 L daily.',
      metricSummary: `Fluid ${latest.fluidIntakeMl} ml (target ${baseline.fluidTargetMl} ml)`,
    });
  }

  const lowEnergyDays = last3.filter((d) => d.caloriesKcal < baseline.calorieTargetKcal * 0.94).length;
  const highSodiumDays = last3.filter((d) => d.sodiumMg > baseline.sodiumLimitMg).length;
  if (lowEnergyDays >= 2 || highSodiumDays >= 2) {
    pushAlert({
      id: 'nutrition-intake-balance',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'nutrition-hydration',
      systemLabel: 'Fluids & Nutrition',
      title: 'Low Calorie Intake or High Sodium Days',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Under-eating or high salt intake speeds up muscle and bone loss.',
      recommendedAction: 'Finish planned meals and choose lower-sodium ration packs tomorrow.',
      metricSummary: `${latest.caloriesKcal} kcal · ${latest.sodiumMg} mg sodium`,
    });
  }

  if (latest.nutritionSymptomsFlag) {
    pushAlert({
      id: 'nutrition-eating-symptoms',
      hazardId: 'gravity-fields',
      hazardLabel: 'Risk 4 · Low Gravity',
      systemId: 'nutrition-hydration',
      systemLabel: 'Fluids & Nutrition',
      title: 'Difficulty Eating or Keeping Fluids Down',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Reduced appetite or digestive upset prevents meeting daily energy and hydration needs.',
      recommendedAction: 'Take small frequent sips of water and inform your flight surgeon.',
      metricSummary: 'Appetite or hydration difficulty reported',
    });
  }

  // =========================================================================
  // RISK 1: RADIATION
  // =========================================================================
  if (latest.dosimetryStatus === 'stale' || latest.dosimetryLastUpdatedHoursAgo > 24) {
    pushAlert({
      id: 'rad-data-quality',
      hazardId: 'space-radiation',
      hazardLabel: 'Risk 1 · Radiation',
      systemId: 'radiation',
      systemLabel: 'Radiation',
      title: 'Radiation Badge Reading Outdated',
      severity: 'data-quality',
      classification: 'Data-quality trigger',
      whatItMayShow: 'Your personal radiation badge has not synced in over 24 hours.',
      recommendedAction: 'Sync your radiation dosimeter badge and inspect cabin radiation sensors.',
      metricSummary: `Last updated ${latest.dosimetryLastUpdatedHoursAgo} hours ago`,
    });
  }

  if (speState.activeWarning) {
    pushAlert({
      id: 'rad-spe-active',
      hazardId: 'space-radiation',
      hazardLabel: 'Risk 1 · Radiation',
      systemId: 'radiation',
      systemLabel: 'Radiation',
      title: 'Active Solar Storm Warning',
      severity: 'urgent',
      classification: 'Official-warning relay',
      whatItMayShow: 'Elevated solar radiation is hitting the hull. Extra shielding is required.',
      recommendedAction: speState.shelterOccupied
        ? `Remain inside ${speState.assignedShelter} until Mission Control confirms all-clear.`
        : `Move immediately to ${speState.assignedShelter} and confirm inside the app.`,
      metricSummary: speState.shelterOccupied ? 'Sheltered safely' : 'Proceed to radiation shelter',
    });
  }

  if (latest.neurologicalRedFlag) {
    pushAlert({
      id: 'rad-neuro-emergency',
      hazardId: 'space-radiation',
      hazardLabel: 'Risk 1 · Radiation',
      systemId: 'radiation',
      systemLabel: 'Radiation',
      title: 'Sudden Confusion or Balance Loss',
      severity: 'urgent',
      classification: 'Urgent clinical-review trigger',
      whatItMayShow: 'Acute balance, coordination, or alertness changes require urgent crew support.',
      recommendedAction: 'Stop all work immediately and alert crew members and your flight surgeon.',
      metricSummary: 'Urgent neurological alert flagged',
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
      hazardLabel: 'Risk 1 · Radiation',
      systemId: 'radiation',
      systemLabel: 'Radiation',
      title: 'Symptoms Logged After Radiation Exposure',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Digestive upset, fatigue, or skin changes recorded for flight surgeon review.',
      recommendedAction: 'Maintain hydration, log dated skin photos if needed, and update symptoms.',
      metricSummary:
        latest.radiationProdromalSymptoms.length > 0
          ? latest.radiationProdromalSymptoms.join(', ')
          : 'Skin or digestive symptom flagged',
    });
  }

  // =========================================================================
  // RISK 2: ISOLATION & SLEEP
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
      hazardLabel: 'Risk 2 · Isolation & Sleep',
      systemId: 'behavioral',
      systemLabel: 'Sleep & Mood',
      title: 'Less Than 8 Hours Sleep (2 Nights)',
      severity: 'caution',
      classification: 'Evidence-based reference point',
      whatItMayShow: 'Repeated short sleep reduces focus, slows reaction speed, and lowers mood.',
      recommendedAction: 'Dim cabin lights 1 hour before rest and schedule 8 hours of sleep tonight.',
      metricSummary: `Last 2 nights: ${prevVault.sleepHours.toFixed(1)}h & ${latestVault.sleepHours.toFixed(1)}h`,
    });
  }

  if (hoursAwakeNow >= 16) {
    behavioralSeverity = maxSeverity(behavioralSeverity, 'urgent');
    pushAlert({
      id: 'beh-acute-wakefulness',
      hazardId: 'isolation-confinement',
      hazardLabel: 'Risk 2 · Isolation & Sleep',
      systemId: 'behavioral',
      systemLabel: 'Sleep & Mood',
      title: 'Awake 16 Hours or Longer',
      severity: 'urgent',
      classification: 'Evidence-based reference point',
      whatItMayShow: 'Extended wakefulness sharply increases reaction lapses on precision tasks.',
      recommendedAction: 'Defer high-precision operations and begin a recovery sleep period.',
      metricSummary: `Awake ${hoursAwakeNow.toFixed(1)} hours`,
    });
  }

  const workloadOverDays = last3Vault.filter((v) => v.workloadHours > 6.5).length;
  const criticalOverload = last3Vault.filter((v) => v.workloadHours >= 10).length >= 3;
  if (criticalOverload || workloadOverDays >= 3) {
    behavioralSeverity = maxSeverity(behavioralSeverity, criticalOverload ? 'urgent' : 'caution');
    pushAlert({
      id: 'beh-workload-overload',
      hazardId: 'isolation-confinement',
      hazardLabel: 'Risk 2 · Isolation & Sleep',
      systemId: 'behavioral',
      systemLabel: 'Sleep & Mood',
      title: criticalOverload ? 'Sustained Heavy Workload (10h+ Daily)' : 'Daily Workload Above 6.5 Hours',
      severity: criticalOverload ? 'urgent' : 'caution',
      classification: 'Evidence-based reference point',
      whatItMayShow: 'Extended shift length leaves insufficient time for sleep and recovery.',
      recommendedAction: 'Reschedule non-critical maintenance tasks to protect rest time.',
      metricSummary: `Recent shifts: ${last3Vault.map((v) => `${v.workloadHours}h`).join(' / ')}`,
    });
  }

  const latestPvt = pvtSessions[pvtSessions.length - 1];
  if (latestPvt && (latestPvt.meanRtMs > baseline.pvtBaselineMs + 45 || latestPvt.lapsesCount >= 2)) {
    behavioralSeverity = maxSeverity(behavioralSeverity, 'caution');
    pushAlert({
      id: 'beh-pvt-vigilance',
      hazardId: 'isolation-confinement',
      hazardLabel: 'Risk 2 · Isolation & Sleep',
      systemId: 'behavioral',
      systemLabel: 'Sleep & Mood',
      title: 'Slower Alertness & Reaction Score',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Fatigue or elevated cabin CO2 is slowing your focus and response speed.',
      recommendedAction: 'Check sleep debt and cabin air quality before critical procedures.',
      metricSummary: `Mean ${(latestPvt.meanRtMs / 1000).toFixed(2)}s (normal ${(baseline.pvtBaselineMs / 1000).toFixed(2)}s)`,
    });
  }

  // =========================================================================
  // RISK 3: DISTANCE FROM EARTH
  // =========================================================================
  const vaultCommTensionCount = last3Vault.filter((v) => v.commDelayTension).length;
  if (latest.commBreakdownFlag || vaultCommTensionCount >= 2) {
    pushAlert({
      id: 'dist-crew-ground-comm',
      hazardId: 'distance-from-earth',
      hazardLabel: 'Risk 3 · Distance From Earth',
      systemId: 'distance',
      systemLabel: 'Communications',
      title: 'Crew–Ground Communication Delay Issue',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Signal latency is causing out-of-order messages or crew-ground friction.',
      recommendedAction: 'Send concise numbered action items and confirm Ground acknowledgment.',
      metricSummary: latest.commBreakdownFlag
        ? `Comms issue flagged (${env.oneWayLatencyLabel})`
        : `${vaultCommTensionCount} recent delay friction notes`,
    });
  }

  if (latest.seuChecksumOk === false) {
    pushAlert({
      id: 'dist-seu-integrity',
      hazardId: 'distance-from-earth',
      hazardLabel: 'Risk 3 · Distance From Earth',
      systemId: 'distance',
      systemLabel: 'Device Memory',
      title: 'Device Memory Integrity Check Needed',
      severity: 'data-quality',
      classification: 'Data-quality trigger',
      whatItMayShow: 'Space radiation may have flipped a bit in local cached storage.',
      recommendedAction: 'Run the verification check in Earth Sync before transmitting.',
      metricSummary: 'Memory checksum needs verification',
    });
  }

  // =========================================================================
  // RISK 5: CABIN & SUITS
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
      hazardLabel: 'Risk 5 · Cabin & Suits',
      systemId: 'hostile-closed',
      systemLabel: 'Cabin Air',
      title: 'Cabin Environmental Sensors Outdated',
      severity: 'data-quality',
      classification: 'Data-quality trigger',
      whatItMayShow: 'Cabin air readings are stale and cannot confirm breathing safety.',
      recommendedAction: 'Inspect wall environmental sensors and restore live cabin telemetry.',
      metricSummary: 'Cabin sensor stream paused',
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
      hazardLabel: 'Risk 5 · Cabin & Suits',
      systemId: 'hostile-closed',
      systemLabel: 'Cabin Air',
      title: isUrgentEnv ? 'Cabin Air Outside Safe Limits' : 'Cabin Warm, Stuffy, or Noisy',
      severity: isUrgentEnv ? 'urgent' : 'caution',
      classification: isUrgentEnv ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whatItMayShow: 'Elevated CO2, high heat, or pressure shift can cause headaches and fatigue.',
      recommendedAction: 'Check CO2 scrubbers and airflow fans, and alert the flight crew.',
      metricSummary: `CO2 ${cabinCo2.toFixed(1)} mmHg · ${cabinTemp.toFixed(1)} °C · O2 ${cabinO2.toFixed(1)}%`,
    });
  }

  if (latest.evaUrgentSymptom) {
    pushAlert({
      id: 'env-eva-urgent',
      hazardId: 'hostile-closed',
      hazardLabel: 'Risk 5 · Cabin & Suits',
      systemId: 'hostile-closed',
      systemLabel: 'Spacewalk',
      title: 'Urgent Spacewalk Symptom Reported',
      severity: 'urgent',
      classification: 'Urgent clinical-review trigger',
      whatItMayShow: 'Shortness of breath, chest pain, or dizziness in a suit requires urgent action.',
      recommendedAction: 'Halt spacewalk safely, return to airlock, and contact your flight surgeon.',
      metricSummary: `Phase: ${latest.evaStatus ?? 'In-EVA Spacewalk'}`,
    });
  } else if (latest.evaSymptoms && latest.evaSymptoms.length > 0) {
    pushAlert({
      id: 'env-eva-symptoms',
      hazardId: 'hostile-closed',
      hazardLabel: 'Risk 5 · Cabin & Suits',
      systemId: 'hostile-closed',
      systemLabel: 'Spacewalk',
      title: 'Spacewalk Discomfort Logged',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Joint ache, suit fit issue, or mild dizziness noted during spacewalk prep or activity.',
      recommendedAction: 'Check suit pressure and fit, log symptoms clearly, and notify medical support.',
      metricSummary: latest.evaSymptoms.join(', '),
    });
  }

  if (latest.foodSafetyFlag) {
    pushAlert({
      id: 'env-food-safety',
      hazardId: 'hostile-closed',
      hazardLabel: 'Risk 5 · Cabin & Suits',
      systemId: 'hostile-closed',
      systemLabel: 'Food Safety',
      title: 'Suspected Food Spoilage or Stomach Upset',
      severity: 'urgent',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'A swollen ration pack or contaminated meal may cause crew illness.',
      recommendedAction: 'Quarantine that food pouch immediately and inform your flight surgeon.',
      metricSummary: 'Food safety issue flagged',
    });
  } else if ((latest.foodAcceptabilityScore ?? 3) <= 2) {
    pushAlert({
      id: 'env-food-acceptability',
      hazardId: 'hostile-closed',
      hazardLabel: 'Risk 5 · Cabin & Suits',
      systemId: 'hostile-closed',
      systemLabel: 'Food Safety',
      title: 'Low Meal Satisfaction',
      severity: 'caution',
      classification: 'Proposed operational trigger',
      whatItMayShow: 'Disliking ration packs increases the risk of falling short on daily calories.',
      recommendedAction: 'Rotate to preferred ration packs and track daily calorie totals.',
      metricSummary: `Food rating ${latest.foodAcceptabilityScore}/5`,
    });
  }

  if (latest.immuneInfectionSymptoms && latest.immuneInfectionSymptoms.length > 0) {
    pushAlert({
      id: 'env-immune-symptoms',
      hazardId: 'hostile-closed',
      hazardLabel: 'Risk 5 · Cabin & Suits',
      systemId: 'hostile-closed',
      systemLabel: 'Cabin Air',
      title: 'Illness or Skin Symptoms Logged',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Mild infections or skin irritation can spread in closed spacecraft habitats.',
      recommendedAction: 'Rest, stay hydrated, avoid close sharing, and update your flight surgeon.',
      metricSummary: latest.immuneInfectionSymptoms.join(', '),
    });
  }

  if (latest.microbiomeSymptomsFlag) {
    pushAlert({
      id: 'env-microbiome-symptoms',
      hazardId: 'hostile-closed',
      hazardLabel: 'Risk 5 · Cabin & Suits',
      systemId: 'hostile-closed',
      systemLabel: 'Cabin Air',
      title: 'Ongoing Digestive or Skin Change',
      severity: 'caution',
      classification: 'Clinical-review trigger',
      whatItMayShow: 'Closed habitats can gradually shift digestive and skin balance.',
      recommendedAction: 'Keep notes alongside meals and cabin sensors for flight surgeon review.',
      metricSummary: 'Digestive or skin change flagged',
    });
  }

  // Safe adherence streaks (reward consistency; never penalize symptom/mood reporting)
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
