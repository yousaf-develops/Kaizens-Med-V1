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
          label: 'Hip & Spine Density',
          reading: `${latest.hipSpineBmdPct.toFixed(1)}%`,
          vsBaseline: `Target: 95%+ (${(latest.hipSpineBmdPct - 95).toFixed(1)}%)`,
          plainMeaning: hipFlagged
            ? 'Below safe limit — prioritize resistance training and notify flight surgeon.'
            : 'Bone density is within the normal range.',
          severity: hipFlagged ? 'urgent' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Bone Health',
            headline: hipFlagged
              ? 'Actions to protect hip and spine density'
              : 'Maintaining hip and spine strength',
            steps: hipFlagged
              ? [
                  'Complete scheduled squats and deadlifts on the resistance machine today.',
                  'Avoid sudden heavy twists until cleared by the flight surgeon.',
                  'Report any bone soreness or post-landing unsteadiness immediately.',
                ]
              : [
                  'Continue weighted squats and lifts on schedule.',
                  'Maintain full resistance loads across the week.',
                  'Report any localized bone pain early.',
                ],
          },
        },
        {
          id: 'femoral-neck-bmd',
          systemId: 'bone',
          label: 'Upper Thigh Bone',
          reading: `${latest.femoralNeckBmdPct.toFixed(1)}%`,
          vsBaseline: 'Target: 90%+',
          plainMeaning:
            neckFlagged || neckWatch
              ? 'Near lower limit — complete all lower-body strength sets.'
              : 'Upper leg bone density is stable.',
          severity: neckFlagged ? 'urgent' : neckWatch ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Leg Bone Density',
            headline:
              neckFlagged || neckWatch
                ? 'Actions to support upper leg bone'
                : 'Maintaining leg bone resilience',
            steps:
              neckFlagged || neckWatch
                ? [
                    'Include leg presses, squats, and heel raises in today’s session.',
                    'Take your daily calcium and vitamin D supplements.',
                    'Keep sodium intake low to reduce calcium loss.',
                  ]
                : [
                    'Keep full leg presses and heel raises in your training plan.',
                    'Meet daily protein and calcium targets.',
                    'Complete scheduled bone density checks on time.',
                  ],
          },
        },
        {
          id: 'weekly-ared',
          systemId: 'bone',
          label: 'Resistance Training',
          reading: `${aredDays} / 7 days`,
          vsBaseline: 'Target: 6 days per week',
          plainMeaning: 'Regular strength workouts preserve bone density in low gravity.',
          severity: aredFlagged ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Strength Routine',
            headline: aredFlagged
              ? 'Actions to catch up on resistance training'
              : 'Staying consistent with strength workouts',
            steps: aredFlagged
              ? [
                  'Schedule a full resistance training session today.',
                  'Ensure routine bone density scans are up to date.',
                  'Note any fatigue or equipment issues in your log.',
                ]
              : [
                  'Complete 6 resistance workouts every 7 days.',
                  'Drink 500 ml of water before lifting.',
                  'Log unusual soreness after heavy sessions.',
                ],
          },
        },
        {
          id: 'vit-d-calcium',
          systemId: 'bone',
          label: 'Vitamin D & Calcium',
          reading: `${latest.vitaminDIu} IU`,
          vsBaseline: `Target: 1,000 IU · ${latest.calciumMg} mg calcium`,
          plainMeaning: 'Replaces sunlight exposure lost indoors.',
          severity:
            latest.vitaminDIu < 800 || latest.calciumMg < 1000 ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Bone Nutrition',
            headline: 'Supporting bone mineral absorption',
            steps: [
              'Take vitamin D daily with a meal.',
              'Include calcium-rich foods across your meals.',
              'Maintain steady daily hydration.',
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
            ? 'Outside your normal range — hydrate and re-check while seated.'
            : 'Resting heart rate is within your normal range.',
          severity: restUrgent ? 'urgent' : restOutside ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Heart Rate',
            headline: restOutside
              ? 'Actions to stabilize resting heart rate'
              : 'Maintaining steady heart function',
            steps: restOutside
              ? [
                  'Rest calmly for 10 minutes and drink 500 ml of water.',
                  'Check cabin temperature and CO2 levels.',
                  'Re-check pulse before starting heavy exertion.',
                ]
              : [
                  'Hydrate consistently throughout your shift.',
                  'Protect 8 hours of uninterrupted sleep.',
                  'Measure resting pulse in the same relaxed posture.',
                ],
          },
        },
        {
          id: 'spo2',
          systemId: 'cardio',
          label: 'Blood Oxygen',
          reading: `${spo2Val}%`,
          vsBaseline: `Normal: ${baseline.spo2MinPct}%+`,
          plainMeaning: spo2Low
            ? 'Below normal — check watch fit and inspect cabin oxygen.'
            : 'Blood oxygen level is normal.',
          severity: spo2Val < 92 ? 'urgent' : spo2Low ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Oxygen Saturation',
            headline: spo2Low
              ? 'Actions for low blood oxygen'
              : 'Maintaining healthy blood oxygen',
            steps: spo2Low
              ? [
                  'Snug the wrist sensor and hold still for 30 seconds.',
                  'Open Cabin & Suits to inspect cabin oxygen and CO2.',
                  'Stop strenuous work and contact the flight surgeon if it stays low.',
                ]
              : [
                  'Verify cabin ventilation before sleep and workouts.',
                  'Keep optical wearable sensors clean.',
                  'Report any shortness of breath immediately.',
                ],
          },
        },
        {
          id: 'blood-pressure',
          systemId: 'cardio',
          label: 'Blood Pressure',
          reading: `${latest.bpSystolic}/${latest.bpDiastolic} mmHg`,
          vsBaseline: `Normal: ${baseline.systolicRange[0]}–${baseline.systolicRange[1]} / ${baseline.diastolicRange[0]}–${baseline.diastolicRange[1]}`,
          plainMeaning:
            bpUrgent || bpWatch
              ? `Measured ${latest.bpPosture} — sit calmly and re-test.`
              : `Normal reading measured while ${latest.bpPosture}.`,
          severity: bpUrgent ? 'urgent' : bpWatch ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Blood Pressure',
            headline:
              bpUrgent || bpWatch
                ? 'Actions to verify blood pressure'
                : 'Best practices for blood pressure',
            steps:
              bpUrgent || bpWatch
                ? [
                    'Sit or lie down immediately if you feel dizzy or lightheaded.',
                    'Rest 5 minutes with the cuff at heart height and re-measure.',
                    'Notify the flight surgeon if readings remain out of range.',
                  ]
                : [
                    'Keep the arm cuff level with your heart during checks.',
                    'Hydrate before standing blood pressure assessments.',
                    'Always log your body posture alongside the reading.',
                  ],
          },
        },
        {
          id: 'submax-vo2',
          systemId: 'cardio',
          label: 'Exercise Heart Rate',
          reading: `${latest.submaxHrBpm} bpm`,
          vsBaseline: `Baseline ~${baseline.submaxHrBpm} (${hrDrift >= 0 ? '+' : ''}${hrDrift}) · Fitness ${vo2Pct.toFixed(0)}%`,
          plainMeaning:
            vo2Pct < 80
              ? 'Cardio fitness is below the spacewalk safety floor — contact flight surgeon.'
              : hrDrift >= 8
                ? 'Heart is working harder than usual for standard exercise.'
                : 'Cardio response to exercise is normal.',
          severity: vo2Pct < 80 ? 'urgent' : hrDrift >= 8 ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Aerobic Capacity',
            headline:
              vo2Pct < 80 || hrDrift >= 8
                ? 'Actions to improve exercise heart response'
                : 'Sustaining spacewalk fitness',
            steps:
              vo2Pct < 80 || hrDrift >= 8
                ? [
                    'Drink 500 ml of water 30 minutes before cardio workouts.',
                    'Confirm wearable strap tension and complete moderate cardio.',
                    'Review trends with the flight surgeon before spacewalk prep.',
                  ]
                : [
                    'Maintain scheduled cycling or treadmill workouts.',
                    'Hydrate before and after endurance exercise.',
                    'Monitor 1-minute heart rate recovery after workouts.',
                  ],
          },
        },
        {
          id: 'hrv',
          systemId: 'cardio',
          label: 'Heart Recovery (HRV)',
          reading: latest.hrvMs !== undefined ? `${latest.hrvMs} ms` : '--',
          vsBaseline: `Normal: ${baseline.hrvMinMs}+ ms`,
          plainMeaning:
            latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs
              ? 'Shows elevated fatigue or stress — prioritize rest and fluids.'
              : 'Recovery score is normal.',
          severity:
            latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs * 0.65
              ? 'urgent'
              : latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs
                ? 'caution'
                : 'nominal',
          insight: {
            guideline: 'Flight Rule · Autonomic Recovery',
            headline:
              latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs
                ? 'Actions to improve physical recovery'
                : 'Maintaining strong daily recovery',
            steps:
              latest.hrvMs !== undefined && latest.hrvMs < baseline.hrvMinMs
                ? [
                    'Take 10 minutes for slow paced breathing in a quiet area.',
                    'Drink 500 ml of water and prioritize an earlier bedtime.',
                    'Record high stress or fatigue in your Private Log.',
                  ]
                : [
                    'Capture recovery scores shortly after waking.',
                    'Keep a consistent sleep and wake window.',
                    'Balance heavy training with adequate rest.',
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
          label: 'Fluid Intake',
          reading: `${latest.fluidIntakeMl} ml`,
          vsBaseline: `Target: ${baseline.fluidTargetMl} ml`,
          plainMeaning: fluidLow
            ? 'Below daily target — drink water now to protect kidney health.'
            : 'Daily hydration is on target.',
          severity: fluidLow ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Hydration',
            headline: fluidLow
              ? 'Actions to restore hydration'
              : 'Maintaining healthy daily hydration',
            steps: fluidLow
              ? [
                  'Drink 500 ml of water right away.',
                  'Monitor urine color until it returns to pale yellow.',
                  'Increase fluid intake after exercise and spacewalks.',
                ]
              : [
                  'Drink fluids steadily throughout the day.',
                  'Check urine color regularly rather than relying on thirst.',
                  'Report any flank discomfort immediately.',
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
            ? 'Outside normal range — rest and re-check temperature.'
            : 'Body temperature is normal.',
          severity:
            tempVal >= 38.0 || tempVal <= 35.2
              ? 'urgent'
              : tempAbnormal
                ? 'caution'
                : 'nominal',
          insight: {
            guideline: 'Flight Rule · Temperature',
            headline: tempAbnormal
              ? 'Actions for abnormal body temperature'
              : 'Maintaining normal thermal balance',
            steps: tempAbnormal
              ? [
                  'Rest for 15 minutes and re-measure body temperature.',
                  'Log any chills, sore throat, or cough in Cabin & Suits.',
                  'Contact the flight surgeon if temperature stays above 38.0°C.',
                ]
              : [
                  'Keep cabin ventilation and cooling comfortable.',
                  'Rehydrate after workouts to assist cooling.',
                  'Report fever or chills immediately.',
                ],
          },
        },
        {
          id: 'blood-sugar',
          systemId: 'nutrition-hydration',
          label: 'Blood Glucose',
          reading: `${glucoseVal} mg/dL`,
          vsBaseline: `Normal: ${baseline.bloodGlucoseMgDlRange[0]}–${baseline.bloodGlucoseMgDlRange[1]} mg/dL`,
          plainMeaning: glucoseAbnormal
            ? 'Outside normal range — adjust food or fluids and re-check.'
            : 'Blood glucose is normal.',
          severity:
            glucoseVal < 65 || glucoseVal > 180
              ? 'urgent'
              : glucoseAbnormal
                ? 'caution'
                : 'nominal',
          insight: {
            guideline: 'Flight Rule · Nutrition & Energy',
            headline: glucoseAbnormal
              ? 'Actions to stabilize blood glucose'
              : 'Maintaining steady daily energy',
            steps:
              glucoseVal < baseline.bloodGlucoseMgDlRange[0]
                ? [
                    'Consume fast-acting carbs with protein now and re-check in 15 minutes.',
                    'Finish scheduled meals without skipping rations.',
                    'Notify the flight surgeon if nausea prevents eating.',
                  ]
                : glucoseAbnormal
                  ? [
                      'Drink plain water and choose balanced protein at your next meal.',
                      'Re-check blood glucose in 1 to 2 hours.',
                      'Report food intolerance or poor appetite.',
                    ]
                  : [
                      'Space meals evenly across your shift.',
                      'Finish daily vitamin and mineral supplements.',
                      'Rotate meal selections if appetite drops.',
                    ],
          },
        },
        {
          id: 'urine-salt',
          systemId: 'nutrition-hydration',
          label: 'Urine Output & Sodium',
          reading: `${latest.urineOutputMl} ml`,
          vsBaseline: `${latest.urineDarkConcentrated ? 'Dark urine' : 'Clear / Pale'} · ${latest.sodiumMg} mg sodium`,
          plainMeaning: latest.urineDarkConcentrated
            ? 'Dark concentrated urine — drink 500 ml of water promptly.'
            : 'Urine output and concentration look normal.',
          severity:
            latest.renalColicSymptoms
              ? 'urgent'
              : latest.urineDarkConcentrated || latest.sodiumMg > baseline.sodiumLimitMg
                ? 'caution'
                : 'nominal',
          insight: {
            guideline: 'Flight Rule · Kidney & Sodium Care',
            headline:
              latest.urineDarkConcentrated || latest.sodiumMg > baseline.sodiumLimitMg
                ? 'Actions to improve hydration and lower sodium'
                : 'Protecting kidney health in flight',
            steps:
              latest.urineDarkConcentrated || latest.sodiumMg > baseline.sodiumLimitMg
                ? [
                    'Drink 500 ml of water immediately.',
                    'Select lower-sodium meal packs for upcoming meals.',
                    'Notify the flight surgeon immediately if flank or urinary pain occurs.',
                  ]
                : [
                    'Keep urine pale yellow throughout the day.',
                    'Keep sodium below your daily target.',
                    'Report side pain or painful urination right away.',
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
          label: 'Eye Pressure',
          reading: `${latest.iopMmHg} mmHg`,
          vsBaseline: `Normal: ${baseline.iopMmHgRange[0]}–${baseline.iopMmHgRange[1]} mmHg`,
          plainMeaning: iopAbnormal
            ? 'Outside normal range — rest quietly and re-check.'
            : 'Eye pressure is within normal limits.',
          severity: iopAbnormal ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Ocular Health',
            headline: iopAbnormal
              ? 'Actions for elevated eye pressure'
              : 'Protecting vision in low gravity',
            steps: iopAbnormal
              ? [
                  'Rest calmly for 5 minutes and repeat the eye pressure measurement.',
                  'Reduce sodium intake to help limit fluid retention.',
                  'Transmit results to the flight eye specialist.',
                ]
              : [
                  'Measure eye pressure only when calm and rested.',
                  'Breathe smoothly without holding breath during heavy lifts.',
                  'Complete scheduled eye imaging on time.',
                ],
          },
        },
        {
          id: 'wearable-sleep',
          systemId: 'vision-sans',
          label: 'Sleep Duration',
          reading: `${sleepHrs.toFixed(1)} hrs`,
          vsBaseline: `Target: ${baseline.sleepTargetHours.toFixed(1)} hrs`,
          plainMeaning: sleepUrgent || sleepWatch
            ? 'Below target sleep — prioritize full rest tonight.'
            : 'Sleep duration supports peak alertness.',
          severity: sleepUrgent ? 'urgent' : sleepWatch ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Sleep & Alertness',
            headline:
              sleepUrgent || sleepWatch
                ? 'Actions to restore an 8-hour sleep routine'
                : 'Maintaining healthy sleep quality',
            steps:
              sleepUrgent || sleepWatch
                ? [
                    'Protect an uninterrupted 8-hour sleep block tonight.',
                    'Allow a short wake-up period before critical duties.',
                    'Use hearing protection or check cabin noise if awakened.',
                  ]
                : [
                    'Keep a consistent sleep onset schedule.',
                    'Dim cabin lighting 45 minutes before sleep.',
                    'Complete a quick reaction check if feeling fatigued.',
                  ],
          },
        },
        {
          id: 'vision-symptoms',
          systemId: 'vision-sans',
          label: 'Vision & Eye Exam',
          reading:
            latest.visionSymptoms.length === 0
              ? latest.octExamOverdue
                ? 'Exam Due'
                : 'Clear'
              : latest.visionSymptoms.join(', '),
          vsBaseline: 'Normal: Clear vision, no headache',
          plainMeaning: visionFlagged
            ? 'Action needed — log vision symptoms or complete scheduled eye scan.'
            : 'No blurry vision or overdue eye scans.',
          severity:
            latest.visionSymptoms.length > 0
              ? 'urgent'
              : latest.octExamOverdue
                ? 'caution'
                : 'nominal',
          insight: {
            guideline: 'Flight Rule · Eye Imaging',
            headline: visionFlagged
              ? 'Actions for vision symptoms or due exam'
              : 'Monitoring eyesight changes',
            steps: visionFlagged
              ? [
                  'Record any blurred near vision or persistent headache.',
                  'Complete overdue eye imaging in the Checks section.',
                  'Notify the flight surgeon immediately for new vision loss.',
                ]
              : [
                  'Perform scheduled vision and eye imaging checks on time.',
                  'Report blurry text or morning headaches early.',
                  'Compare new eye images against pre-flight baselines.',
                ],
          },
        },
        {
          id: 'fluid-cuff',
          systemId: 'vision-sans',
          label: 'Fluid Shift Protocol',
          reading: latest.sansCountermeasureDone ? 'Completed' : 'Pending',
          vsBaseline: 'Daily protocol check',
          plainMeaning: 'Tracks completion of assigned lower-body leg cuff sessions.',
          severity: latest.sansCountermeasureDone ? 'nominal' : 'caution',
          insight: {
            guideline: 'Flight Rule · Fluid Management',
            headline: 'Leg cuff protocol guidance',
            steps: [
              'Complete the session as directed by your flight medical plan.',
              'Record session completion here after finishing.',
              'Stop immediately if you feel lightheaded or dizzy.',
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
          label: 'Muscle Strength',
          reading: `${latest.strengthPctBaseline.toFixed(1)}%`,
          vsBaseline: 'Target: 80%+ of baseline',
          plainMeaning: strengthLow
            ? 'Below safety floor — notify flight surgeon before spacewalks.'
            : 'Strength is normal for mission operations.',
          severity: strengthLow ? 'urgent' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Muscle Strength',
            headline: strengthLow
              ? 'Actions to rebuild muscle strength'
              : 'Maintaining mission-ready strength',
            steps: strengthLow
              ? [
                  'Complete full scheduled resistance sets without skipping weight.',
                  'Meet daily protein and calorie goals.',
                  'Consult the flight surgeon prior to heavy spacewalk tasks.',
                ]
              : [
                  'Train resistance exercises 6 days per week.',
                  'Consume balanced protein following strength sessions.',
                  'Track functional mobility alongside strength scores.',
                ],
          },
        },
        {
          id: 'thigh-ultrasound',
          systemId: 'muscle',
          label: 'Thigh Muscle Size',
          reading: `${latest.muscleCsaPctBaseline.toFixed(1)}%`,
          vsBaseline: 'Target: 87%+ of baseline',
          plainMeaning: csaLow
            ? 'Gradual muscle loss detected — review workouts and nutrition.'
            : 'Thigh muscle volume is stable.',
          severity: csaLow ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Muscle Volume',
            headline: csaLow
              ? 'Actions to prevent leg muscle loss'
              : 'Maintaining leg muscle mass',
            steps: csaLow
              ? [
                  'Compare ultrasound scans side by side in the Checks tab.',
                  'Ensure full lower-body training load and protein intake.',
                  'Share repeat downward trends with the flight surgeon.',
                ]
              : [
                  'Capture scheduled ultrasound scans consistently.',
                  'Use full range of motion on squats and presses.',
                  'Maintain daily protein targets.',
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
            ? 'Unusually high strain — increase rest intervals and hydrate.'
            : 'Training effort feels normal and sustainable.',
          severity: rpeHigh ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Training Load',
            headline: rpeHigh
              ? 'Actions when workouts feel overly hard'
              : 'Managing steady training load',
            steps: rpeHigh
              ? [
                  'Extend rest between sets by 1 to 2 minutes and drink water.',
                  'Note whether poor sleep or equipment friction caused high effort.',
                  'Notify medical staff if repeated sessions feel 9 or 10 out of 10.',
                ]
              : [
                  'Aim for moderate-to-hard effort around 5 to 7 out of 10.',
                  'Warm up for 5 minutes before heavy lifts.',
                  'Rate each workout honestly based on perceived strain.',
                ],
          },
        },
        {
          id: 'muscle-pain',
          systemId: 'muscle',
          label: 'Limiting Muscle Pain',
          reading: latest.limitingMusclePain ? 'Present' : 'None',
          vsBaseline: 'Normal: No limiting pain',
          plainMeaning: latest.limitingMusclePain
            ? 'Pain restricts movement — pause training and contact medical team.'
            : 'No limiting muscle pain reported.',
          severity: latest.limitingMusclePain ? 'urgent' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Injury Prevention',
            headline: latest.limitingMusclePain
              ? 'Actions for limiting muscle pain'
              : 'Keeping muscles injury-free',
            steps: latest.limitingMusclePain
              ? [
                  'Stop any exercise movement that triggers sharp pain.',
                  'Modify workout load only with medical guidance.',
                  'Monitor and report persistent swelling or weakness.',
                ]
              : [
                  'Maintain controlled lifting form under load.',
                  'Stretch lightly after workouts.',
                  'Log minor stiffness early before it worsens.',
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
          label: 'Daily Radiation Dose',
          reading: `${latest.dailyDoseMsv.toFixed(2)} mSv`,
          vsBaseline: `Expected ambient: ~${env.radiationAmbientRateMsvDay} mSv`,
          plainMeaning: staleBadge
            ? 'Sensor reading is outdated — sync your radiation badge.'
            : 'Daily radiation exposure is properly tracked and normal.',
          severity: staleBadge ? 'data-quality' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Daily Dosimetry',
            headline: staleBadge
              ? 'Actions when radiation badge data is outdated'
              : 'Minimizing daily radiation exposure',
            steps: staleBadge
              ? [
                  'Never treat radiation as Normal when sensor data is outdated.',
                  'Sync your chest radiation badge immediately.',
                  'Check cabin radiation monitors in Earth Sync.',
                ]
              : [
                  'Sleep inside shielded crew quarters.',
                  'Wear your personal radiation badge continuously.',
                  'Record any solar storm exposure in your mission log.',
                ],
          },
        },
        {
          id: 'dosimeter-badge',
          systemId: 'radiation',
          label: 'Radiation Badge',
          reading: staleBadge ? 'Update Needed' : 'Live & Synced',
          vsBaseline: 'Synced within 24 hours',
          plainMeaning: staleBadge
            ? 'No update in over 24 hours — reconnect badge.'
            : 'Personal badge is reporting live readings.',
          severity: staleBadge ? 'data-quality' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Sensor Integrity',
            headline: staleBadge
              ? 'Actions to restore radiation badge sync'
              : 'Maintaining reliable sensor tracking',
            steps: staleBadge
              ? [
                  'Inspect badge power and dock connection.',
                  'Confirm status returns to Live & Synced.',
                  'Note work locations manually until sync resumes.',
                ]
              : [
                  'Verify live status daily during shift start.',
                  'Preserve cumulative mission dose history.',
                  'Follow Ground radiation advisories at all times.',
                ],
          },
        },
        {
          id: 'career-cumulative',
          systemId: 'radiation',
          label: 'Career Radiation Total',
          reading: `${totalCareerMsv.toFixed(0)} mSv`,
          vsBaseline: `Career limit: ${baseline.careerRadiationLimitMsv} mSv`,
          plainMeaning: 'Tracks lifetime cumulative exposure against safety limits.',
          severity: careerHigh ? 'caution' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Career Limit',
            headline: 'Protecting long-term health',
            steps: [
              'Keep cumulative radiation exposure as low as reasonably achievable.',
              'Maintain complete records across all missions.',
              'Complete routine medical follow-ups as scheduled.',
            ],
          },
        },
        {
          id: 'solar-storm',
          systemId: 'radiation',
          label: 'Solar Storm Status',
          reading: speState.activeWarning ? 'STORM ACTIVE' : 'Clear',
          vsBaseline: 'Normal: Clear',
          plainMeaning: speState.activeWarning
            ? 'Active solar storm — remain in shielded shelter until all-clear.'
            : 'No active solar particle warning.',
          severity: speState.activeWarning ? 'urgent' : 'nominal',
          insight: {
            guideline: 'Flight Rule · Solar Storm Shelter',
            headline: speState.activeWarning
              ? 'Immediate actions during solar storm'
              : 'Solar storm preparedness',
            steps: speState.activeWarning
              ? [
                  `Enter ${speState.assignedShelter} and confirm shelter status.`,
                  'Remain inside until Mission Control issues official all-clear.',
                  'Do not exit early even if you feel completely fine.',
                ]
              : [
                  'Keep the route to shielded quarters clear.',
                  'Log any spacewalk during solar watch periods.',
                  'Report nausea, skin redness, or confusion right away.',
                ],
          },
        },
      ];
    }
  }
}
