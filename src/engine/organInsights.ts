import {
  AlertSeverity,
  AstronautBaseline,
  DailyTelemetryEntry,
  EnvironmentConfig,
  SPEEventState,
  SystemId,
} from '../types/telemetry';

export interface ActionableInsightPlan {
  guideline: string;
  headline: string;
  steps: [string, string, string];
}

export interface OrganParameterItem {
  id: string;
  systemId: SystemId;
  label: string;
  reading: string;
  vsBaseline: string;
  plainMeaning: string;
  severity: AlertSeverity;
  insight: ActionableInsightPlan;
}

export function getOrganParametersWithInsights(
  systemId: SystemId,
  latest: DailyTelemetryEntry | undefined,
  last7: DailyTelemetryEntry[],
  baseline: AstronautBaseline,
  env: EnvironmentConfig,
  speState: SPEEventState,
  latestSleepHours?: number
): OrganParameterItem[] {
  if (!latest) return [];

  switch (systemId) {
    case 'bone': {
      const hipFlagged = latest.hipSpineBmdPct < 95;
      const neckFlagged = latest.femoralNeckBmdPct < 90;
      const neckWatch = latest.femoralNeckBmdPct <= 91;
      const aredDays = last7.filter((d) => d.aredCompleted).length;
      const aredFlagged = last7.filter((d) => !d.aredCompleted).length >= 2;

      return [
        {
          id: 'hip-spine-bmd',
          systemId: 'bone',
          label: 'Hip & Spine Strength',
          reading: `${latest.hipSpineBmdPct.toFixed(1)}%`,
          vsBaseline: `Baseline: >= 95% (${(latest.hipSpineBmdPct - 95).toFixed(1)}%)`,
          plainMeaning: hipFlagged
            ? 'Below normal limit — needs heavy resistance loading.'
            : 'Normal bone strength for heavy tasks.',
          severity: hipFlagged ? 'urgent' : 'nominal',
          insight: {
            guideline: 'Hazard 4.1 · Gravity Fields (NASA-STD-3001 V1 4027)',
            headline: hipFlagged
              ? 'Step-by-step plan to rebuild hip & spine strength'
              : 'Steps to keep hip & spine bones above the 95% floor',
            steps: hipFlagged
              ? [
                  'Complete full heavy squats and deadlifts on ARED today to restore mechanical load.',
                  'Avoid unapproved sudden twisting until ASCR/medical review confirms safe load.',
                  'Log any new bone pain or post-landing dizziness; ASCR determines high-load clearance.',
                ]
              : [
                  'Keep weighted squats and deadlifts on ARED consistent to simulate gravity load.',
                  'Maintain full target resistance rather than dropping weight on busy sols.',
                  'Log any localized bone pain right away for medical review.',
                ],
          },
        },
        {
          id: 'femoral-neck-bmd',
          systemId: 'bone',
          label: 'Upper Thigh Bone',
          reading: `${latest.femoralNeckBmdPct.toFixed(1)}%`,
          vsBaseline: 'Baseline: >= 90%',
          plainMeaning: 'Near the 90% floor — never skip ARED squats.',
          severity: neckFlagged ? 'urgent' : neckWatch ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 4.1 · Femoral-Neck Floor (V1 4027)',
            headline:
              neckFlagged || neckWatch
                ? 'Step-by-step plan to protect your upper thigh bone'
                : 'Steps to maintain safe thigh-bone density',
            steps:
              neckFlagged || neckWatch
                ? [
                    'Prioritize ARED leg presses, squats, and heel raises—these directly load the femoral neck.',
                    'Maintain daily 1,200 mg calcium and 1,000 IU Vitamin D.',
                    'Keep sodium below 2,300 mg to reduce urinary calcium loss.',
                  ]
                : [
                    'Include full range-of-motion leg presses and heel raises in lower-body sessions.',
                    'Keep protein, calcium, and Vitamin D steady for bone turnover.',
                    'Stay current on scheduled DXA follow-up and post-landing readaptation checks.',
                  ],
          },
        },
        {
          id: 'weekly-ared',
          systemId: 'bone',
          label: 'Weekly Weight Training',
          reading: `${aredDays} / 7 days`,
          vsBaseline: 'Target: 6+ days / week',
          plainMeaning: 'Resistance workouts push minerals back into bones.',
          severity: aredFlagged ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 4.1 · Resistance Adherence (Proposed Trigger)',
            headline: aredFlagged
              ? 'Step-by-step plan to catch up on weight training'
              : 'Steps to keep your weekly lifting streak strong',
            steps: aredFlagged
              ? [
                  'Protect a 45-minute ARED slot today so 2+ missed sessions do not stack.',
                  'Note: exercise completion alone does not prove bone is protected without DXA follow-up.',
                  'Log completed sets or equipment reasons right away for ASCR review.',
                ]
              : [
                  'Aim for 6 resistance sessions per 7 sols with one recovery sol.',
                  'Hydrate 400–500 mL before lifting.',
                  'Log workout modifications promptly if fatigue or strain appears.',
                ],
          },
        },
        {
          id: 'vit-d-calcium',
          systemId: 'bone',
          label: 'Vitamin D & Calcium',
          reading: `${latest.vitaminDIu} IU`,
          vsBaseline: `Target: 1,000 IU · ${latest.calciumMg} mg Ca`,
          plainMeaning: 'Replaces missing UVB light inside the spacecraft.',
          severity:
            latest.vitaminDIu < 800 || latest.calciumMg < 1000 ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 4.1 & 4.5 · Bone Mineral Nutrition',
            headline: 'Steps to keep Vitamin D & calcium working for your bones',
            steps: [
              'Take daily 1,000 IU Vitamin D with a meal—spacecraft cabins block natural UVB sunlight.',
              'Spread ~1,200 mg calcium across meals for steady absorption.',
              'Stay well hydrated so calcium cleared through urine stays diluted.',
            ],
          },
        },
      ];
    }

    case 'cardio': {
      const vo2Pct = (latest.vo2PeakMlKgMin / baseline.vo2PeakMlKgMin) * 100;
      const hrDrift = latest.submaxHrBpm - baseline.submaxHrBpm;
      const restOutside =
        latest.restingHrBpm > baseline.restingHrRange[1] ||
        latest.restingHrBpm < baseline.restingHrRange[0];
      const restUrgent =
        latest.restingHrBpm > baseline.restingHrRange[1] + 10 ||
        latest.restingHrBpm < baseline.restingHrRange[0] - 8;
      const spo2Val = latest.spo2Pct ?? 98;
      const spo2Low = spo2Val < baseline.spo2MinPct;
      const bpUrgent =
        latest.chestOrPresyncope ||
        latest.orthostaticSymptoms ||
        latest.bpSystolic >= 140 ||
        latest.bpDiastolic >= 90 ||
        latest.bpSystolic < 88;
      const bpWatch =
        latest.bpSystolic > baseline.systolicRange[1] ||
        latest.bpDiastolic > baseline.diastolicRange[1] ||
        latest.bpSystolic < baseline.systolicRange[0] ||
        latest.bpDiastolic < baseline.diastolicRange[0];

      return [
        {
          id: 'resting-hr',
          systemId: 'cardio',
          label: 'Resting Heart Rate',
          reading: `${latest.restingHrBpm} bpm`,
          vsBaseline: `Normal: ${baseline.restingHrRange[0]}–${baseline.restingHrRange[1]} bpm`,
          plainMeaning: restOutside
            ? 'Outside your resting baseline — hydrate and rest.'
            : 'Normal resting heart rate for you.',
          severity: restUrgent ? 'urgent' : restOutside ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 4.2 · Cardiovascular & Bio-Monitor Baseline',
            headline: restOutside
              ? 'Step-by-step plan to settle your resting heart rate'
              : 'Steps to keep your resting pulse steady',
            steps: restOutside
              ? [
                  'Rest quietly 10 minutes, hydrate 500 mL, and check Hazard 2 stress or sleep debt.',
                  'Check Hazard 5 Cabin Environment CO2 and temperature telemetry.',
                  'Re-measure pulse calmly before demanding work; ASCR determines EVA clearance.',
                ]
              : [
                  'Keep steady daily fluid intake so blood volume supports cardiac filling.',
                  'Protect your 8-hour sleep block—poor sleep raises morning resting HR.',
                  'Capture pulse in the same resting posture for clean multi-sol trends.',
                ],
          },
        },
        {
          id: 'spo2',
          systemId: 'cardio',
          label: 'Blood Oxygen (SpO2)',
          reading: `${spo2Val}%`,
          vsBaseline: `Normal: >= ${baseline.spo2MinPct}%`,
          plainMeaning: spo2Low
            ? 'Below safe oxygen floor — verify sensor & cabin O2.'
            : 'Healthy oxygen delivery.',
          severity: spo2Val < 92 ? 'urgent' : spo2Low ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 4.2 & 5.1 · Oxygenation & Cabin Air',
            headline: spo2Low
              ? 'Step-by-step plan to verify and restore blood oxygen'
              : 'Steps to maintain healthy blood oxygen',
            steps: spo2Low
              ? [
                  'Re-seat the Bio-Monitor / pulse-ox sensor snugly and hold still 30 seconds.',
                  'Check Environment tab (Hazard 5.1) for cabin O2, pressure, and CO2 levels.',
                  'If persistently below 95% (or < 92%), stop physical tasks and escalate urgently.',
                ]
              : [
                  'Monitor Hazard 5.1 cabin air circulation during sleep and workouts.',
                  'Keep Bio-Monitor sensor contact clean for continuous tracking.',
                  'Report any shortness of breath promptly during EVA or inside cabin.',
                ],
          },
        },
        {
          id: 'blood-pressure',
          systemId: 'cardio',
          label: 'Blood Pressure',
          reading: `${latest.bpSystolic}/${latest.bpDiastolic}`,
          vsBaseline: `Normal: ${baseline.systolicRange[0]}–${baseline.systolicRange[1]} / ${baseline.diastolicRange[0]}–${baseline.diastolicRange[1]}`,
          plainMeaning: `Measured while ${latest.bpPosture}.`,
          severity: bpUrgent ? 'urgent' : bpWatch ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 4.2 · BP & Orthostatic Safety',
            headline:
              bpUrgent || bpWatch
                ? 'Step-by-step plan to stabilize blood pressure'
                : 'Steps to keep blood pressure steady in space',
            steps:
              bpUrgent || bpWatch
                ? [
                    'Stop standing or LBNP testing immediately if dizzy, dimming, or experiencing chest discomfort.',
                    'Rest 5 minutes with cuff at heart height, repeat, and record posture & timing.',
                    'Escalate symptomatic or persistent readings to Flight Surgeon.',
                  ]
                : [
                    'Take BP in the same calm posture with cuff level at the heart.',
                    'Hydrate before upright stand/tilt or LBNP protocols.',
                    'Log orthostatic HR changes after landing or fluid-shift protocols.',
                  ],
          },
        },
        {
          id: 'submax-vo2',
          systemId: 'cardio',
          label: 'Workout HR & VO2',
          reading: `${latest.submaxHrBpm} bpm`,
          vsBaseline: `Base ~${baseline.submaxHrBpm} (${hrDrift >= 0 ? '+' : ''}${hrDrift}) · VO2 ${vo2Pct.toFixed(0)}%`,
          plainMeaning:
            hrDrift >= 8
              ? 'Working harder than baseline for same effort.'
              : 'Matches pre-flight heart efficiency.',
          severity: vo2Pct < 80 ? 'urgent' : hrDrift >= 8 ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 4.2 · NASA-STD-3001 V1 4001–4003',
            headline:
              vo2Pct < 80 || hrDrift >= 8
                ? 'Step-by-step plan to improve workout heart efficiency'
                : 'Steps to keep aerobic endurance ready for EVAs',
            steps:
              vo2Pct < 80 || hrDrift >= 8
                ? [
                    'Drink 500 mL water 30 minutes before cardio—dehydration spikes submax HR.',
                    'Verify sensor fit and finish the assigned treadmill/cycle workload.',
                    'Review trend with ASCR; only ASCR/medical clears EVA or egress readiness.',
                  ]
                : [
                    'Keep VO2 peak >= 80% pre-mission (V1 4003) and above EVA floor (V1 4001/4002).',
                    'Hydrate before and after sessions to preserve plasma volume.',
                    'Monitor 1-minute post-exercise HR recovery after standardized bouts.',
                  ],
          },
        },
        {
          id: 'hrv',
          systemId: 'cardio',
          label: 'Heart Rate Variability (HRV)',
          reading: latest.hrvMs !== undefined ? `${latest.hrvMs} ms` : '--',
          vsBaseline: `Normal: >= ${baseline.hrvMinMs} ms RMSSD`,
          plainMeaning:
            latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs
              ? 'Below recovery floor — nervous system strained.'
              : 'Healthy autonomic recovery reserve.',
          severity:
            latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs * 0.65
              ? 'urgent'
              : latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs
                ? 'caution'
                : 'nominal',
          insight: {
            guideline: 'Hazard 2 & 4.2 · Autonomic Stress Link',
            headline:
              latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs
                ? 'Step-by-step plan to restore autonomic recovery'
                : 'Steps to preserve healthy heart-rate variability',
            steps:
              latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs
                ? [
                    'Spend 10 minutes in slow paced breathing in a dim, quiet crew quarter.',
                    'Hydrate 500 mL and avoid high-intensity overload while HRV recovers.',
                    'Cross-check stress logs in Vault (stress can present physically as arrhythmia/HR changes).',
                  ]
                : [
                    'Capture morning HRV upon waking with clean Bio-Monitor contact.',
                    'Keep 8-hour sleep timing steady across sols.',
                    'Balance heavy workouts with scheduled rest and hydration.',
                  ],
          },
        },
      ];
    }

    case 'nutrition-hydration': {
      const tempVal = latest.bodyTempC ?? 36.8;
      const glucoseVal = latest.bloodGlucoseMgDl ?? 96;
      const tempAbnormal =
        tempVal > baseline.bodyTempCRange[1] || tempVal < baseline.bodyTempCRange[0];
      const glucoseAbnormal =
        glucoseVal < baseline.bloodGlucoseMgDlRange[0] ||
        glucoseVal > baseline.bloodGlucoseMgDlRange[1];
      const fluidLow = latest.fluidIntakeMl < baseline.fluidTargetMl * 0.9;

      return [
        {
          id: 'fluids-today',
          systemId: 'nutrition-hydration',
          label: 'Fluids Drunk Today',
          reading: `${latest.fluidIntakeMl} mL`,
          vsBaseline: `Goal: ${baseline.fluidTargetMl} mL (V2 6109 habitat ~2.5L)`,
          plainMeaning: fluidLow
            ? 'Below personal target — raises kidney-stone risk.'
            : 'Clean hydration protecting kidneys.',
          severity: fluidLow ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 4.5 · Hydration & V2 6109 Habitat Context',
            headline: fluidLow
              ? 'Step-by-step plan to close today’s fluid gap'
              : 'Steps to keep kidneys flushed and protected',
            steps: fluidLow
              ? [
                  'Drink 450–500 mL water now; V2 6109 specifies habitat ~2.5 L/d supply, while alerts track your personal target.',
                  'Pair water with citrus/potassium citrate when urine is concentrated.',
                  'Add 500 mL fluid around heavy ARED or EVA sessions.',
                ]
              : [
                  'Sip steadily through the sol to maintain urine output and dilution.',
                  'Watch urine color and volume rather than relying on thirst alone.',
                  'Escalate flank pain or dysuria urgently under medical protocol.',
                ],
          },
        },
        {
          id: 'body-temp',
          systemId: 'nutrition-hydration',
          label: 'Body Temperature',
          reading: `${tempVal.toFixed(1)}°C`,
          vsBaseline: `Normal: ${baseline.bodyTempCRange[0]}–${baseline.bodyTempCRange[1]}°C`,
          plainMeaning: tempAbnormal
            ? 'Outside normal temperature range — rest and verify.'
            : 'Normal body temperature.',
          severity:
            tempVal >= 38.0 || tempVal <= 35.2
              ? 'urgent'
              : tempAbnormal
                ? 'caution'
                : 'nominal',
          insight: {
            guideline: 'Hazard 4.5 & 5.3 · Thermoregulation & Immune Check',
            headline: tempAbnormal
              ? 'Step-by-step plan for abnormal body temperature'
              : 'Steps to keep body temperature balanced',
            steps: tempAbnormal
              ? [
                  'Verify thermometer reading after 15 minutes of calm rest.',
                  'Log any Hazard 5.3 immune/infection symptoms (chills, sore throat, rash, fatigue).',
                  'Escalate promptly to Flight Surgeon if >= 38.0°C.',
                ]
              : [
                  'Verify Hazard 5.1 cabin airflow and temperature stay comfortable.',
                  'Hydrate after workouts to support thermoregulation.',
                  'Log fever or chills promptly in Environment / Check-In.',
                ],
          },
        },
        {
          id: 'blood-sugar',
          systemId: 'nutrition-hydration',
          label: 'Blood Sugar',
          reading: `${glucoseVal} mg/dL`,
          vsBaseline: `Normal: ${baseline.bloodGlucoseMgDlRange[0]}–${baseline.bloodGlucoseMgDlRange[1]}`,
          plainMeaning: glucoseAbnormal
            ? 'Outside normal fuel zone — balance ration & fluids.'
            : 'Steady metabolic energy.',
          severity:
            glucoseVal < 65 || glucoseVal > 180
              ? 'urgent'
              : glucoseAbnormal
                ? 'caution'
                : 'nominal',
          insight: {
            guideline: 'Hazard 4.5 · Energy, Protein & Metabolic Balance',
            headline: glucoseAbnormal
              ? 'Step-by-step plan to bring blood sugar into the safe zone'
              : 'Steps to maintain steady energy all sol',
            steps:
              glucoseVal < baseline.bloodGlucoseMgDlRange[0]
                ? [
                    'Consume a quick carbohydrate + protein ration and re-check in 15 minutes.',
                    'Meet daily energy (~2,850 kcal) and protein (~112 g) goals.',
                    'Report nausea or food intolerance (Hazard 4.5 & 5.3) if intake stays low.',
                  ]
                : glucoseAbnormal
                  ? [
                      'Hydrate with plain water and balance protein + fiber at next meal.',
                      'Re-check in 1–2 hours and flag persistent shifts for medical review.',
                      'Check Hazard 5.3 food acceptability logs if rations are skipped.',
                    ]
                  : [
                      'Space meals evenly to meet calorie (~2,850 kcal) and protein (~112 g) targets.',
                      'Ensure priority micronutrients (Vit D, K, Ca, K+, C, B1, Folate).',
                      'Rotate rations early if menu fatigue drops appetite.',
                    ],
          },
        },
        {
          id: 'urine-salt',
          systemId: 'nutrition-hydration',
          label: 'Urine & Salt Balance',
          reading: `${latest.urineOutputMl} mL`,
          vsBaseline: `${latest.urineDarkConcentrated ? 'Dark urine' : 'Pale'} · ${latest.sodiumMg} mg salt`,
          plainMeaning: latest.urineDarkConcentrated
            ? 'Dark urine — drink 500 mL water now.'
            : 'Healthy urine dilution.',
          severity:
            latest.renalColicSymptoms
              ? 'urgent'
              : latest.urineDarkConcentrated || latest.sodiumMg > baseline.sodiumLimitMg
                ? 'caution'
                : 'nominal',
          insight: {
            guideline: 'Hazard 4.5 · Kidney-Stone Risk Prevention',
            headline:
              latest.urineDarkConcentrated || latest.sodiumMg > baseline.sodiumLimitMg
                ? 'Step-by-step plan to dilute urine & lower salt load'
                : 'Steps to keep urine clear and sodium in check',
            steps:
              latest.urineDarkConcentrated || latest.sodiumMg > baseline.sodiumLimitMg
                ? [
                    'Drink 500 mL water now to raise urine output and lower supersaturation.',
                    'Keep sodium below 2,300 mg to reduce urinary calcium and SANS pressure.',
                    'Escalate immediately for flank pain, dysuria, or blood in urine (renal colic).',
                  ]
                : [
                    'Target pale urine, ~1,800+ mL output, and healthy urine citrate levels.',
                    'Keep daily sodium under 2,300 mg.',
                    'App monitors hydration trends; it never diagnoses kidney stones.',
                  ],
          },
        },
      ];
    }

    case 'vision-sans': {
      const sleepHrs = latestSleepHours ?? 6.4;
      const sleepUrgent = sleepHrs < 6;
      const sleepWatch = sleepHrs < 7.2;
      const iopAbnormal =
        latest.iopMmHg > baseline.iopMmHgRange[1] || latest.iopMmHg < baseline.iopMmHgRange[0];
      const visionFlagged = latest.visionSymptoms.length > 0 || latest.octExamOverdue;

      return [
        {
          id: 'iop',
          systemId: 'vision-sans',
          label: 'Eye Pressure (IOP)',
          reading: `${latest.iopMmHg} mmHg`,
          vsBaseline: `Normal: ${baseline.iopMmHgRange[0]}–${baseline.iopMmHgRange[1]} mmHg`,
          plainMeaning: iopAbnormal
            ? 'Eye pressure outside baseline range — repeat calmly.'
            : 'Eye pressure is within individual range.',
          severity: iopAbnormal ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 4.4 · Vision / SANS Tonometry',
            headline: iopAbnormal
              ? 'Step-by-step plan to re-check eye pressure'
              : 'Steps to keep eye monitoring consistent',
            steps: iopAbnormal
              ? [
                  'Rest calmly 5 minutes and repeat tonometry only under approved protocol.',
                  'Keep daily sodium below 2,300 mg.',
                  'Route repeated shifts to authorized medical team; app does not diagnose SANS.',
                ]
              : [
                  'Take IOP measurements in consistent calm resting posture.',
                  'Breathe steadily during ARED resistance lifts.',
                  'Pair IOP logs with scheduled OCT/fundoscopy imaging.',
                ],
          },
        },
        {
          id: 'wearable-sleep',
          systemId: 'vision-sans',
          label: 'Sleep (Hazard 2)',
          reading: `${sleepHrs.toFixed(1)} hrs`,
          vsBaseline: `Ref: ${baseline.sleepTargetHours.toFixed(1)} hrs`,
          plainMeaning: 'Evidence reference protecting alertness & mood.',
          severity: sleepUrgent ? 'urgent' : sleepWatch ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 2.1 · Sleep & Circadian Reference',
            headline:
              sleepUrgent || sleepWatch
                ? 'Step-by-step plan to recover your 8-hour sleep block'
                : 'Steps to protect deep circadian rest',
            steps:
              sleepUrgent || sleepWatch
                ? [
                    'Protect an 8-hour sleep block tonight and limit continuous wakefulness < 16h.',
                    'Allow a 2–4h sleep-inertia buffer before high-risk tasks after waking.',
                    'Check Hazard 5.1 cabin noise and CO2 levels if sleep is fragmented.',
                  ]
                : [
                    'Keep sleep/wake aligned with assigned mission schedule.',
                    'Maintain consistent cabin lighting cues before sleep.',
                    'Use 3-min PVT-B in Scans whenever groggy or misaligned.',
                  ],
          },
        },
        {
          id: 'vision-symptoms',
          systemId: 'vision-sans',
          label: 'Vision Symptoms',
          reading:
            latest.visionSymptoms.length === 0
              ? latest.octExamOverdue
                ? 'Scan Overdue'
                : 'Clear'
              : latest.visionSymptoms.join(', '),
          vsBaseline: 'Normal: Clear, no headache',
          plainMeaning: 'Tracks blur, focusing issues, or OCT status.',
          severity:
            latest.visionSymptoms.length > 0
              ? 'urgent'
              : latest.octExamOverdue
                ? 'caution'
                : 'nominal',
          insight: {
            guideline: 'Hazard 4.4 · OCT, Fundoscopy & SANS Review',
            headline: visionFlagged
              ? 'Step-by-step plan for vision changes or overdue exam'
              : 'Steps to monitor vision health in microgravity',
            steps: visionFlagged
              ? [
                  'Confirm blurry focus, visual distortion, or persistent headache details.',
                  'Complete overdue OCT / fundoscopy scan in Scans for optic-disc review.',
                  'Route findings to medical team for ophthalmic assessment.',
                ]
              : [
                  'Complete scheduled visual-acuity, fundoscopy, and OCT scans on time.',
                  'Log any new blurred near focus or morning headache immediately.',
                  'Review longitudinal retinal scans alongside prior pre-flight values.',
                ],
          },
        },
        {
          id: 'fluid-cuff',
          systemId: 'vision-sans',
          label: 'Fluid-Shift Log (Study)',
          reading: latest.sansCountermeasureDone ? 'Logged' : 'Pending',
          vsBaseline: 'Adherence tracking (investigational)',
          plainMeaning: 'Tracks assigned LBNP/cuff study adherence only.',
          severity: latest.sansCountermeasureDone ? 'nominal' : 'caution',
          insight: {
            guideline: 'Hazard 4.4 · SANS Countermeasure Adherence',
            headline: 'Countermeasure logging & research boundary',
            steps: [
              'SANS countermeasures (LBNP, thigh cuffs, B-vitamins) remain investigational; logging does not claim prevention.',
              'Record whether assigned monitoring/countermeasure session was completed today.',
              'Stop immediately if lightheaded or uncomfortable and report to medical team.',
            ],
          },
        },
      ];
    }

    case 'muscle': {
      const strengthLow = latest.strengthPctBaseline < 80;
      const csaLow = latest.muscleCsaPctBaseline < 87;
      const rpeHigh = latest.rpe >= 9;

      return [
        {
          id: 'muscle-strength',
          systemId: 'muscle',
          label: 'Overall Muscle Strength',
          reading: `${latest.strengthPctBaseline.toFixed(1)}%`,
          vsBaseline: 'Min: 80% (V1 4024)',
          plainMeaning: strengthLow
            ? 'Below 80% NASA floor — escalate to ASCR team.'
            : 'Power ready for EVA and landing.',
          severity: strengthLow ? 'urgent' : 'nominal',
          insight: {
            guideline: 'Hazard 4.3 · NASA-STD-3001 V1 4024 (>= 80%)',
            headline: strengthLow
              ? 'Step-by-step plan to restore muscle strength above 80%'
              : 'Steps to keep lifting power well above the 80% minimum',
            steps: strengthLow
              ? [
                  'Complete prescribed ARED compound sets; do not reduce load without medical/ASCR guidance.',
                  'Meet ~112 g daily protein and ~2,850 kcal targets.',
                  'ASCR & medical team determine all EVA, egress, and return-to-duty clearance.',
                ]
              : [
                  'Maintain 6 days/week ARED resistance compliance.',
                  'Pair protein meals with lifting days.',
                  'Track functional mobility tests alongside strength metrics.',
                ],
          },
        },
        {
          id: 'thigh-ultrasound',
          systemId: 'muscle',
          label: 'Thigh Ultrasound Size',
          reading: `${latest.muscleCsaPctBaseline.toFixed(1)}%`,
          vsBaseline: 'Normal: >= 87%',
          plainMeaning: csaLow
            ? 'Early muscle size drift — log ultrasound & nutrition.'
            : 'Muscle size holding steady.',
          severity: csaLow ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 4.3 · Guided Ultrasound CSA Trend',
            headline: csaLow
              ? 'Step-by-step plan to address ultrasound CSA drift'
              : 'Steps to protect leg and core muscle size',
            steps: csaLow
              ? [
                  'Compare guided thigh ultrasound scan against pre-mission baseline in Scans.',
                  'Verify ARED load percentages, calories, and protein have not slipped.',
                  'Flag repeated CSA decline for ASCR review.',
                ]
              : [
                  'Capture scheduled guided ultrasound scans for longitudinal comparison.',
                  'Keep lower-body resistance stimulus full range.',
                  'Support recovery with adequate daily calories and protein.',
                ],
          },
        },
        {
          id: 'workout-rpe',
          systemId: 'muscle',
          label: 'Workout Effort (RPE)',
          reading: `${latest.rpe} / 10`,
          vsBaseline: 'Normal: 5–7 / 10',
          plainMeaning: rpeHigh
            ? 'Very high fatigue effort — add rest or check equipment.'
            : 'Balanced workout tolerance.',
          severity: rpeHigh ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 4.3 · Workload Tolerance (RPE)',
            headline: rpeHigh
              ? 'Step-by-step plan to manage high workout strain'
              : 'Steps to keep workout effort in the 5–7 zone',
            steps: rpeHigh
              ? [
                  'Add 60–90s rest between heavy sets and check hydration and sleep.',
                  'Log equipment drag, fatigue, or pain reasons when modifying a session.',
                  'Flag repeated high RPE trends for ASCR review.',
                ]
              : [
                  'Target RPE 5–7 / 10 for productive mechanical loading.',
                  'Warm up 5 minutes before heavy lifting.',
                  'Log effort honestly to catch early fatigue.',
                ],
          },
        },
        {
          id: 'muscle-pain',
          systemId: 'muscle',
          label: 'Muscle Pain',
          reading: latest.limitingMusclePain ? 'Flagged' : 'None',
          vsBaseline: 'Normal: Pain-free',
          plainMeaning: latest.limitingMusclePain
            ? 'Limiting pain reported — modify under protocol & escalate.'
            : 'No strain limiting assigned tasks.',
          severity: latest.limitingMusclePain ? 'urgent' : 'nominal',
          insight: {
            guideline: 'Hazard 4.3 · Muscle Symptom Review',
            headline: latest.limitingMusclePain
              ? 'Step-by-step plan for activity-limiting muscle pain'
              : 'Steps to keep muscles pain-free',
            steps: latest.limitingMusclePain
              ? [
                  'Stop movements triggering worsening or limiting pain.',
                  'Modify activity only under approved protocol and document anatomical site.',
                  'Escalate persistent symptoms to Flight Surgeon / ASCR team.',
                ]
              : [
                  'Use controlled form on all ARED resistance sets.',
                  'Include post-session mobility to protect spine and hips.',
                  'Report persistent soreness early.',
                ],
          },
        },
      ];
    }

    case 'radiation': {
      const staleBadge =
        latest.dosimetryStatus === 'stale' || latest.dosimetryLastUpdatedHoursAgo > 24;
      const totalCareerMsv = latest.cumulativeMissionDoseMsv + baseline.priorCareerDoseMsv;
      const careerHigh = totalCareerMsv >= baseline.careerRadiationLimitMsv * 0.8;

      return [
        {
          id: 'daily-dose',
          systemId: 'radiation',
          label: 'Today’s Radiation Dose',
          reading: `${latest.dailyDoseMsv.toFixed(2)} mSv`,
          vsBaseline: `Normal: ~${env.radiationAmbientRateMsvDay} mSv/d`,
          plainMeaning: staleBadge
            ? 'Dosimetry stale — NEVER assume nominal.'
            : 'Verified dosimetry inside shielding.',
          severity: staleBadge ? 'data-quality' : 'nominal',
          insight: {
            guideline: 'Hazard 1 · Space Radiation Dosimetry Quality',
            headline: staleBadge
              ? 'Step-by-step plan when dosimetry is stale/missing'
              : 'Steps to keep daily dose ALARA',
            steps: staleBadge
              ? [
                  'Never label exposure Normal when dosimetry is unavailable; symptom reports cannot replace dosimetry.',
                  'Resync personal dosimeter link and verify timestamp/measured status.',
                  'Cross-check cabin radiation telemetry in Sync.',
                ]
              : [
                  'Spend sleep and quiet hours in higher-shielded core water-wall quarters.',
                  'Keep personal dosimeter worn on torso pocket.',
                  'Keep records linked with behavioral health (hippocampus stress + radiation sensitivity).',
                ],
          },
        },
        {
          id: 'dosimeter-badge',
          systemId: 'radiation',
          label: 'Dosimeter Badge',
          reading: staleBadge ? 'Stale' : 'Measured',
          vsBaseline: 'Verified within 24h',
          plainMeaning: staleBadge
            ? 'Over 24h old — reconnect badge immediately.'
            : 'Live measured personal dosimetry.',
          severity: staleBadge ? 'data-quality' : 'nominal',
          insight: {
            guideline: 'Hazard 1 · Data-Quality Trigger',
            headline: staleBadge
              ? 'Step-by-step plan to restore measured dosimetry'
              : 'Steps to maintain verified dosimetry',
            steps: staleBadge
              ? [
                  'Verify personal dosimeter battery and habitat bus connection.',
                  'Confirm measured (not modeled-only) status and timestamp.',
                  'Log event location manually until sensor sync resumes.',
                ]
              : [
                  'Verify dosimeter reads Measured (< 24h) daily.',
                  'Retain longitudinal career logs across flights without treating limits as targets.',
                  'Follow official mission protocols—app never issues independent radiation all-clear.',
                ],
          },
        },
        {
          id: 'career-cumulative',
          systemId: 'radiation',
          label: 'Cumulative Exposure',
          reading: `${totalCareerMsv.toFixed(0)} mSv`,
          vsBaseline: `Advisory: ${baseline.careerRadiationLimitMsv} mSv (ALARA)`,
          plainMeaning: 'Long-term record only — not a safety guarantee.',
          severity: careerHigh ? 'caution' : 'nominal',
          insight: {
            guideline: 'Hazard 1 · Cumulative ALARA & Career Follow-Up',
            headline: 'Longitudinal record & interpretation boundaries',
            steps: [
              'Keep dose As Low As Reasonably Achievable; do not treat historical limits as targets or safety guarantees.',
              'App never generates personalized cancer forecasts or genetic susceptibility scores.',
              'Preserve exposure & post-event follow-up logs across missions (latent phases can mask injury).',
            ],
          },
        },
        {
          id: 'solar-storm',
          systemId: 'radiation',
          label: 'SPE Warning Relay',
          reading: speState.activeWarning ? 'ACTIVE' : 'Quiet',
          vsBaseline: 'Normal: Quiet',
          plainMeaning: speState.activeWarning
            ? 'Relay active — follow shelter protocol.'
            : 'No official SPE relay active.',
          severity: speState.activeWarning ? 'urgent' : 'nominal',
          insight: {
            guideline: 'Hazard 1 · Official-Warning Relay & Shelter Protocol',
            headline: speState.activeWarning
              ? 'Urgent official solar storm shelter protocol'
              : 'Steps to stay ready for SPE relays',
            steps: speState.activeWarning
              ? [
                  `Acknowledge relay and enter ${speState.assignedShelter}; log shelter entry/exit and EVA status.`,
                  'App is never the sole warning channel and never issues an independent all-clear.',
                  'Never exit shelter based only on symptom absence; follow official mission instructions.',
                ]
              : [
                  'Verify assigned shelter route and emergency supplies.',
                  'Record any EVA exposure context alongside official warnings.',
                  'Log nausea, skin changes, GI fluid loss, or CNS red flags for clinical review.',
                ],
          },
        },
      ];
    }
  }
}
