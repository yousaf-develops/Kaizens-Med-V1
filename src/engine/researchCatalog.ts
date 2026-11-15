import { CORE_FIVE_HAZARDS } from '../data/nasaStandards';
import { EvaluationResult } from './ruleEngine';
import {
  AlertClassificationSpec,
  AlertSeverity,
  AstronautBaseline,
  BehavioralVaultEntry,
  CoreHazardMeta,
  DailyTelemetryEntry,
  EnvironmentConfig,
  PVTSessionResult,
  ResearchParameterRow,
  SPEEventState,
} from '../types/telemetry';

export const RESEARCH_DOMAINS: CoreHazardMeta[] = CORE_FIVE_HAZARDS;

export const ALERT_CLASSIFICATION_SPECS: AlertClassificationSpec[] = [
  {
    id: 'cls-nasa',
    label: 'Core Safety Limit',
    appBadge: 'NASA-backed threshold',
    definition: 'An established safety boundary from mission medical standards (e.g., 95% bone density, 80% muscle strength).',
    authorityBoundary: 'Flags critical thresholds clearly; final mission decisions stay with crew medical staff.',
  },
  {
    id: 'cls-evidence',
    label: 'Healthy Reference Guide',
    appBadge: 'Evidence-based reference point',
    definition: 'A proven mission benchmark from past flights, such as targeting 8 hours of sleep per night.',
    authorityBoundary: 'Your flight surgeon may tailor personal targets to your mission.',
  },
  {
    id: 'cls-operational',
    label: 'Early Trend Watch',
    appBadge: 'Proposed operational trigger',
    definition: 'An early prompt when a health reading drifts across two or more days before reaching a safety limit.',
    authorityBoundary: 'Supports early self-care and prevention; not a medical diagnosis.',
  },
  {
    id: 'cls-clinical',
    label: 'Medical Review Alert',
    appBadge: 'Clinical-review trigger',
    definition: 'A reading or symptom that should be shared with your flight surgeon on schedule.',
    authorityBoundary: 'Organizes your readings clearly without diagnosing conditions.',
  },
  {
    id: 'cls-urgent',
    label: 'Urgent Action Alert',
    appBadge: 'Urgent clinical-review trigger',
    definition: 'A high-priority warning such as chest discomfort, near-fainting, or severe pain.',
    authorityBoundary: 'Advises pausing activity immediately and contacting medical support.',
  },
  {
    id: 'cls-compliance',
    label: 'Scheduled Check Reminder',
    appBadge: 'Protocol/compliance trigger',
    definition: 'A prompt when a routine measurement, scan, or workout is due.',
    authorityBoundary: 'Helps maintain consistent mission tracking.',
  },
  {
    id: 'cls-data-quality',
    label: 'Sensor Update Needed',
    appBadge: 'Data-quality trigger',
    definition: 'A reading that is missing or outdated so old numbers are never misread as Normal.',
    authorityBoundary: 'Flags stale telemetry until a fresh reading is synced.',
  },
  {
    id: 'cls-warning',
    label: 'Mission Safety Relay',
    appBadge: 'Official-warning relay',
    definition: 'An official mission hazard notice from Ground, such as a Solar Storm alert.',
    authorityBoundary: 'Wait for Ground all-clear before leaving sheltered modules.',
  },
  {
    id: 'cls-mission-doc',
    label: 'Mission Log Record',
    appBadge: 'Mission-protocol documentation',
    definition: 'A permanent record confirming preventive steps completed during the mission.',
    authorityBoundary: 'Maintains a clean health record across phases.',
  },
];

export function buildComprehensiveResearchCatalog(
  history: DailyTelemetryEntry[],
  baseline: AstronautBaseline,
  env: EnvironmentConfig,
  vault: BehavioralVaultEntry[],
  pvtSessions: PVTSessionResult[],
  speState: SPEEventState,
  evaluation: EvaluationResult
): ResearchParameterRow[] {
  const latest = history[history.length - 1];
  const last7 = history.slice(-7);
  const prev = history.length >= 2 ? history[history.length - 2] : undefined;
  const latestVault = vault[vault.length - 1];
  const prevVault = vault.length >= 2 ? vault[vault.length - 2] : undefined;
  const latestPvt = pvtSessions[pvtSessions.length - 1];

  if (!latest) return [];

  const missedAred = last7.filter((d) => !d.aredCompleted).length;
  const missedAero = last7.filter((d) => !d.aerobicCompleted).length;
  const bmdRateDelta =
    history.length >= 7
      ? Number((latest.hipSpineBmdPct - history[Math.max(0, history.length - 7)].hipSpineBmdPct).toFixed(1))
      : -1.1;
  const vo2Pct = (latest.vo2PeakMlKgMin / baseline.vo2PeakMlKgMin) * 100;
  const avgSleep7 =
    vault.slice(-7).reduce((acc, v) => acc + v.sleepHours, 0) / Math.max(1, vault.slice(-7).length);
  const weeklyWorkHours = vault.slice(-7).reduce((acc, v) => acc + v.workloadHours, 0);
  const highWorkDays = vault.slice(-7).filter((v) => v.workloadHours >= 10).length;
  const poorSleepDays = vault.slice(-3).filter((v) => v.sleepQuality <= 2).length;
  const cabinTemp = latest.cabinTempC ?? 22.3;
  const cabinPressure = latest.cabinPressureKpa ?? 101.3;
  const cabinCo2 = latest.cabinCo2MmHg ?? 2.8;
  const cabinO2 = latest.cabinO2Pct ?? 20.9;
  const cabinNoise = latest.cabinNoiseDba ?? 61;
  const orthoHrDelta = latest.orthostaticHrDeltaBpm ?? 14;
  const mobilityPct = latest.functionalMobilityPct ?? 88.5;
  const octFinding = latest.octRetinalFinding ?? 'Normal';
  const foodScore = latest.foodAcceptabilityScore ?? 3;
  const urineCitrate = latest.urineCitrateMgDay ?? 390;
  const bfoStatus = latest.bfoLabStatus ?? 'Nominal';
  const bodyMassDeltaPct = ((latest.bodyMassKg - baseline.bodyMassKg) / baseline.bodyMassKg) * 100;

  const cabinOutSeverity: AlertSeverity =
    cabinCo2 >= 4.0 ||
    cabinTemp < baseline.cabinTempCRange[0] ||
    cabinTemp > baseline.cabinTempCRange[1] ||
    cabinPressure < baseline.cabinPressureKpaRange[0] ||
    cabinPressure > baseline.cabinPressureKpaRange[1]
      ? 'urgent'
      : cabinCo2 >= 3.2 || cabinNoise >= 68
        ? 'caution'
        : 'nominal';

  return [
    // =========================================================================
    // 1. RADIATION
    // =========================================================================
    {
      id: 'h1-personal-dosimetry',
      domainId: 'space-radiation',
      domainLabel: '1. Radiation',
      subSection: 'Radiation Badge',
      monitorTopic: 'Daily Radiation & Badge Sync',
      currentReading: `${latest.dailyDoseMsv.toFixed(2)} mSv (${latest.dosimetryStatus === 'measured' ? 'Live' : 'Outdated'})`,
      baselineTarget: 'Fresh badge reading every 24h',
      severity: latest.dosimetryStatus === 'stale' || latest.dosimetryLastUpdatedHoursAgo > 24 ? 'data-quality' : 'nominal',
      triggerClass: 'Data-quality trigger',
      whenAppAlerts: 'Your personal radiation badge has not synced in over 24 hours.',
      whatAlertMayShow: 'Radiation cannot be felt; only live badge readings confirm exposure.',
      whatAppDoes: 'Sync your chest dosimeter badge and inspect cabin radiation sensors.',
      dataSourceUpdate: 'Chest Dosimeter · Live',
      linkedSystemId: 'radiation',
    },
    {
      id: 'h1-cumulative-alara',
      domainId: 'space-radiation',
      domainLabel: '1. Radiation',
      subSection: 'Total Exposure',
      monitorTopic: 'Mission & Career Radiation Totals',
      currentReading: `Mission ${latest.cumulativeMissionDoseMsv.toFixed(1)} mSv · Career ${(latest.cumulativeMissionDoseMsv + baseline.priorCareerDoseMsv).toFixed(1)} mSv`,
      baselineTarget: `Stay well below ${baseline.careerRadiationLimitMsv} mSv limit`,
      severity: latest.cumulativeMissionDoseMsv + baseline.priorCareerDoseMsv >= baseline.careerRadiationLimitMsv * 0.8 ? 'caution' : 'nominal',
      triggerClass: 'Mission-protocol documentation',
      whenAppAlerts: 'Cumulative radiation approaches long-term mission guidelines.',
      whatAlertMayShow: 'Helps keep lifetime radiation exposure as low as reasonably achievable.',
      whatAppDoes: 'Maximize time in shielded quarters and log daily totals for review.',
      dataSourceUpdate: 'Mission Log · Daily',
      linkedSystemId: 'radiation',
    },
    {
      id: 'h1-spe-shelter-eva',
      domainId: 'space-radiation',
      domainLabel: '1. Radiation',
      subSection: 'Solar Storms',
      monitorTopic: 'Solar Storm Warning & Shielded Shelter',
      currentReading: speState.activeWarning
        ? `${speState.shelterOccupied ? 'Inside Shelter' : 'Move to Shelter'}`
        : `Normal Sky · ${latest.evaExposureContext ? 'Spacewalk' : 'Inside Cabin'}`,
      baselineTarget: 'Enter water-wall shelter promptly on warning',
      severity: speState.activeWarning ? 'urgent' : 'nominal',
      triggerClass: 'Official-warning relay',
      whenAppAlerts: 'Mission Control issues an active solar particle storm warning.',
      whatAlertMayShow: 'Elevated solar radiation outside requires thicker shielding.',
      whatAppDoes: 'Move to your assigned shelter immediately and remain until all-clear.',
      dataSourceUpdate: 'Ground Advisory · Live',
      linkedSystemId: 'radiation',
    },
    {
      id: 'h1-prodromal-skin-gi',
      domainId: 'space-radiation',
      domainLabel: '1. Radiation',
      subSection: 'Skin & Digestion',
      monitorTopic: 'Digestive Upset or Skin Changes After Exposure',
      currentReading:
        latest.radiationProdromalSymptoms.length > 0 || latest.skinChangeFlag || latest.giFluidLossFlag
          ? `${[...latest.radiationProdromalSymptoms, latest.skinChangeFlag ? 'Skin redness' : '', latest.giFluidLossFlag ? 'Digestive upset' : ''].filter(Boolean).join(', ')}`
          : 'Clear · No symptoms',
      baselineTarget: 'No nausea, digestive upset, or skin changes',
      severity:
        latest.radiationProdromalSymptoms.length > 0 || latest.skinChangeFlag || latest.giFluidLossFlag
          ? 'caution'
          : 'nominal',
      triggerClass: 'Clinical-review trigger',
      whenAppAlerts: 'You log nausea, fatigue, or skin irritation after a radiation event.',
      whatAlertMayShow: 'Provides helpful context to medical staff after high-radiation periods.',
      whatAppDoes: 'Maintain steady hydration, capture a dated photo if needed, and notify your doctor.',
      dataSourceUpdate: 'Self Log · Anytime',
      linkedSystemId: 'radiation',
    },
    {
      id: 'h1-bfo-cns-followup',
      domainId: 'space-radiation',
      domainLabel: '1. Radiation',
      subSection: 'Lab & Alertness',
      monitorTopic: 'Blood Lab Checks & Sudden Confusion',
      currentReading: latest.neurologicalRedFlag
        ? 'URGENT SUPPORT NEEDED'
        : `Blood labs: ${bfoStatus === 'Nominal' ? 'Normal' : bfoStatus}`,
      baselineTarget: 'Normal blood labs and clear coordination',
      severity: latest.neurologicalRedFlag ? 'urgent' : bfoStatus !== 'Nominal' ? 'caution' : 'nominal',
      triggerClass: latest.neurologicalRedFlag ? 'Urgent clinical-review trigger' : 'Clinical-review trigger',
      whenAppAlerts: 'Blood lab checks drift or sudden confusion or balance loss is reported.',
      whatAlertMayShow: 'Sudden coordination or alertness issues require immediate crew assistance.',
      whatAppDoes: 'Stop hazardous work at once and alert crew and flight surgeon.',
      dataSourceUpdate: 'Medical Review · Anytime',
      linkedSystemId: 'radiation',
    },

    // =========================================================================
    // 2. ISOLATION & SLEEP
    // =========================================================================
    {
      id: 'h2-sleep-duration-quality',
      domainId: 'isolation-confinement',
      domainLabel: '2. Isolation & Sleep',
      subSection: 'Sleep',
      monitorTopic: 'Sleep Duration & Quality',
      currentReading: `${latestVault?.sleepHours.toFixed(1) ?? '6.4'}h (7d avg ${avgSleep7.toFixed(1)}h) · Quality ${latestVault?.sleepQuality ?? 3}/5`,
      baselineTarget: `Target ${baseline.sleepTargetHours.toFixed(1)} hours nightly`,
      severity:
        latestVault && prevVault && latestVault.sleepHours < baseline.sleepTargetHours && prevVault.sleepHours < baseline.sleepTargetHours
          ? 'caution'
          : poorSleepDays >= 3
            ? 'caution'
            : 'nominal',
      triggerClass: 'Evidence-based reference point',
      whenAppAlerts: 'Sleep falls below 8 hours for two nights in a row.',
      whatAlertMayShow: 'Sleep debt lowers focus, reaction speed, and stress resilience.',
      whatAppDoes: 'Dim cabin lighting early and plan an uninterrupted 8-hour rest period.',
      dataSourceUpdate: 'Private Log · Daily',
      linkedTab: 'vault',
    },
    {
      id: 'h2-wake-inertia',
      domainId: 'isolation-confinement',
      domainLabel: '2. Isolation & Sleep',
      subSection: 'Hours Awake',
      monitorTopic: 'Continuous Time Awake & Morning Grogginess',
      currentReading: `${evaluation.hoursAwakeNow.toFixed(1)}h awake · ${evaluation.inSleepInertiaWindow ? 'Waking Window' : 'Alert Window'}`,
      baselineTarget: 'Under 16 hours awake · Avoid critical tasks right after waking',
      severity:
        evaluation.hoursAwakeNow >= 16
          ? 'urgent'
          : evaluation.inSleepInertiaWindow
            ? 'caution'
            : 'nominal',
      triggerClass: 'Evidence-based reference point',
      whenAppAlerts: 'Awake 16+ hours or performing precision tasks right after waking.',
      whatAlertMayShow: 'Extended wakefulness markedly increases human error.',
      whatAppDoes: 'Pause complex tasks and schedule rest when reaching 16 hours awake.',
      dataSourceUpdate: 'Wearable · Live',
      linkedTab: 'vault',
    },
    {
      id: 'h2-pvt-vigilance',
      domainId: 'isolation-confinement',
      domainLabel: '2. Isolation & Sleep',
      subSection: 'Reaction Speed',
      monitorTopic: 'Alertness & Reaction Check',
      currentReading: latestPvt
        ? `${(latestPvt.meanRtMs / 1000).toFixed(2)}s avg (normal ${(baseline.pvtBaselineMs / 1000).toFixed(2)}s) · ${latestPvt.lapsesCount} slow`
        : 'No test logged',
      baselineTarget: `Near ${(baseline.pvtBaselineMs / 1000).toFixed(2)}s · Under 2 slow taps`,
      severity:
        latestPvt && (latestPvt.meanRtMs > baseline.pvtBaselineMs + 45 || latestPvt.lapsesCount >= 2)
          ? 'caution'
          : 'nominal',
      triggerClass: 'Proposed operational trigger',
      whenAppAlerts: 'Reaction speed slows significantly compared to your baseline.',
      whatAlertMayShow: 'Often caused by accumulated fatigue or elevated cabin CO2.',
      whatAppDoes: 'Review sleep hours and cabin CO2 before high-precision operations.',
      dataSourceUpdate: 'Checks · Daily',
      linkedTab: 'assessments',
    },
    {
      id: 'h2-workload-autonomy',
      domainId: 'isolation-confinement',
      domainLabel: '2. Isolation & Sleep',
      subSection: 'Workload',
      monitorTopic: 'Daily Shift Hours & Schedule Balance',
      currentReading: `${latestVault?.workloadHours.toFixed(1) ?? '6.9'}h today · ${weeklyWorkHours.toFixed(1)}h this week`,
      baselineTarget: 'Target 6.5h/day · Max 48h/week',
      severity:
        highWorkDays >= 3 || weeklyWorkHours > 60
          ? 'urgent'
          : weeklyWorkHours > 48 || (latestVault?.workloadHours ?? 0) > 6.5
            ? 'caution'
            : 'nominal',
      triggerClass: 'Evidence-based reference point',
      whenAppAlerts: 'Daily shift exceeds 6.5 hours or weekly hours exceed 48.',
      whatAlertMayShow: 'Sustained overwork erodes sleep recovery and focus.',
      whatAppDoes: 'Defer non-urgent tasks so rest and exercise windows stay intact.',
      dataSourceUpdate: 'Private Log · Daily',
      linkedTab: 'vault',
    },
    {
      id: 'h2-mood-cohesion-hippocampus',
      domainId: 'isolation-confinement',
      domainLabel: '2. Isolation & Sleep',
      subSection: 'Mood & Crew',
      monitorTopic: 'Mood, Stress & Crew Cohesion (Private)',
      currentReading: `Mood ${latestVault?.moodScore ?? 3}/5 · Stress ${latestVault?.stressScore ?? 3}/5 · Cohesion ${latestVault?.crewCohesionScore ?? 4}/5`,
      baselineTarget: 'Steady well-being · Stored locally unless shared',
      severity: evaluation.behavioralSeverity,
      triggerClass: 'Proposed operational trigger',
      whenAppAlerts: 'Sleep and fatigue markers trend down across multiple days.',
      whatAlertMayShow: 'Long-duration isolation increases cumulative mental strain.',
      whatAppDoes: 'Take quiet downtime and opt in to share with your flight surgeon if helpful.',
      dataSourceUpdate: 'Private Log · Opt-In',
      linkedTab: 'vault',
    },

    // =========================================================================
    // 3. DISTANCE FROM EARTH
    // =========================================================================
    {
      id: 'h3-crew-ground-comm',
      domainId: 'distance-from-earth',
      domainLabel: '3. Distance From Earth',
      subSection: 'Communications',
      monitorTopic: 'Earth–Crew Signal Delay Handling',
      currentReading: latest.commBreakdownFlag
        ? `Comms friction (${env.oneWayLatencyLabel})`
        : `Clear · ${env.oneWayLatencyLabel}`,
      baselineTarget: 'Structured, unambiguous messages',
      severity: latest.commBreakdownFlag ? 'caution' : 'nominal',
      triggerClass: 'Proposed operational trigger',
      whenAppAlerts: 'Communication delay tension or out-of-order notes occur.',
      whatAlertMayShow: 'One-way delays up to 20+ minutes can confuse back-and-forth threads.',
      whatAppDoes: 'Use numbered action points and confirm receipt on critical requests.',
      dataSourceUpdate: 'Comms Log · Anytime',
      linkedTab: 'sync',
    },
    {
      id: 'h3-offline-bandwidth-cmo',
      domainId: 'distance-from-earth',
      domainLabel: '3. Distance From Earth',
      subSection: 'Offline Capability',
      monitorTopic: 'Offline Health Engine & Compact Sync',
      currentReading: `Offline Ready · ${env.communicationMode}`,
      baselineTarget: 'Full health evaluation works without Ground link',
      severity: 'nominal',
      triggerClass: 'Mission-protocol documentation',
      whenAppAlerts: 'Tracks compact update packets waiting for Ground sync.',
      whatAlertMayShow: 'Ensures crew independence even when Earth connection is delayed.',
      whatAppDoes: 'Save everything locally first and transmit compact updates when ready.',
      dataSourceUpdate: 'On-Device Storage · Live',
      linkedTab: 'sync',
    },
    {
      id: 'h3-seu-sensors-datasets',
      domainId: 'distance-from-earth',
      domainLabel: '3. Distance From Earth',
      subSection: 'Device Integrity',
      monitorTopic: 'Memory Integrity & Wearable Connection',
      currentReading: `Memory ${latest.seuChecksumOk === false ? 'Verify Needed' : 'Healthy'} · ${latest.wearableSource ?? 'Mission Watch'}`,
      baselineTarget: 'Verified local storage and active wearable sync',
      severity: latest.seuChecksumOk === false ? 'data-quality' : 'nominal',
      triggerClass: 'Data-quality trigger',
      whenAppAlerts: 'Local memory verification detects a checksum mismatch.',
      whatAlertMayShow: 'Prevents corrupted readings from displaying as valid.',
      whatAppDoes: 'Run the verification button in Earth Sync to confirm data integrity.',
      dataSourceUpdate: 'Integrity Check · Live',
      linkedTab: 'sync',
    },

    // =========================================================================
    // 4. LOW GRAVITY
    // =========================================================================
    {
      id: 'h4-bone-bmd',
      domainId: 'gravity-fields',
      domainLabel: '4. Low Gravity',
      subSection: 'Bone Density',
      monitorTopic: 'Hip, Spine & Thigh Bone Strength',
      currentReading: `Hip & Spine ${latest.hipSpineBmdPct.toFixed(1)}% · Thigh ${latest.femoralNeckBmdPct.toFixed(1)}% (${bmdRateDelta >= 0 ? `+${bmdRateDelta.toFixed(1)}` : bmdRateDelta.toFixed(1)}% / 7d)`,
      baselineTarget: 'Hip & Spine 95%+ · Thigh 90%+',
      severity: latest.hipSpineBmdPct < 95 || latest.femoralNeckBmdPct < 90 ? 'urgent' : bmdRateDelta <= -1.5 ? 'caution' : 'nominal',
      triggerClass: 'NASA-backed threshold',
      standardCitation: 'Bone Safety Standard',
      whenAppAlerts: 'Hip & spine drops below 95% or thigh drops below 90%.',
      whatAlertMayShow: 'Weightlessness gradually reduces bone mineral density if loading drops.',
      whatAppDoes: 'Complete daily resistance squats/deadlifts and alert your flight surgeon.',
      dataSourceUpdate: 'Bone Assessment · Periodic',
      linkedSystemId: 'bone',
    },
    {
      id: 'h4-bone-ared-postlanding',
      domainId: 'gravity-fields',
      domainLabel: '4. Low Gravity',
      subSection: 'Resistance & Landing',
      monitorTopic: 'Strength Training, Bone Pain & Post-Landing Balance',
      currentReading: `${7 - missedAred}/7 workouts · ${latest.postLandingPhase ?? 'In-Flight'}${latest.postLandingUrgentCollapse ? ' · UNABLE TO STAND' : latest.postLandingSymptoms ? ' · Dizziness' : ''}`,
      baselineTarget: 'Daily resistance session · Steady after landing',
      severity:
        latest.bonePainSymptom || latest.postLandingUrgentCollapse
          ? 'urgent'
          : missedAred >= 2 || latest.boneTurnoverAbnormal || latest.postLandingSymptoms
            ? 'caution'
            : 'nominal',
      triggerClass:
        latest.postLandingUrgentCollapse
          ? 'Urgent clinical-review trigger'
          : latest.bonePainSymptom || latest.postLandingSymptoms
            ? 'Clinical-review trigger'
            : 'Proposed operational trigger',
      whenAppAlerts: '2+ missed workouts in a week, bone pain, or post-landing dizziness.',
      whatAlertMayShow: 'Missed loading speeds bone loss; gravity return strains circulation.',
      whatAppDoes: 'Stay on resistance training and report any bone pain or fainting right away.',
      dataSourceUpdate: 'Training Log · Daily',
      linkedSystemId: 'bone',
    },
    {
      id: 'h4-cardio-vo2-submax',
      domainId: 'gravity-fields',
      domainLabel: '4. Low Gravity',
      subSection: 'Heart & Lungs',
      monitorTopic: 'Aerobic Fitness, Exercise Heart Rate & Effort',
      currentReading: `Fitness ${vo2Pct.toFixed(0)}% · Exercise HR ${latest.submaxHrBpm} bpm · Effort ${latest.rpe}/10`,
      baselineTarget: 'Maintain 80%+ aerobic fitness for spacewalks',
      severity:
        vo2Pct < 80 || latest.vo2PeakMlKgMin < env.evaVo2Floor
          ? 'urgent'
          : (latest.submaxHrBpm - baseline.submaxHrBpm >= 8 &&
              (prev ? prev.submaxHrBpm - baseline.submaxHrBpm >= 8 : false)) ||
              missedAero >= 2 ||
              latest.rpe >= 8
            ? 'caution'
            : 'nominal',
      triggerClass: 'NASA-backed threshold',
      standardCitation: 'Cardio Readiness Standard',
      whenAppAlerts: 'Fitness falls below 80% or easy workouts cause an unusually fast pulse.',
      whatAlertMayShow: 'Low gravity reduces blood volume and aerobic capacity.',
      whatAppDoes: 'Complete cardio sessions, hydrate well, and verify watch fit.',
      dataSourceUpdate: 'Heart Sensor · Each Session',
      linkedSystemId: 'cardio',
    },
    {
      id: 'h4-cardio-bp-ortho',
      domainId: 'gravity-fields',
      domainLabel: '4. Low Gravity',
      subSection: 'Blood Pressure',
      monitorTopic: 'Blood Pressure & Standing Tolerance',
      currentReading: `${latest.bpSystolic}/${latest.bpDiastolic} mmHg (${latest.bpPosture}) · Stand +${orthoHrDelta} bpm`,
      baselineTarget: `${baseline.systolicRange[0]}–${baseline.systolicRange[1]} / ${baseline.diastolicRange[0]}–${baseline.diastolicRange[1]} mmHg · No dizziness`,
      severity:
        latest.chestOrPresyncope || latest.orthostaticSymptoms || latest.bpSystolic >= 140
          ? 'urgent'
          : orthoHrDelta >= 28
            ? 'caution'
            : 'nominal',
      triggerClass: 'Urgent clinical-review trigger',
      whenAppAlerts: 'Blood pressure leaves safe range or standing causes dizziness.',
      whatAlertMayShow: 'Circulation adjusts slowly when transitioning to standing gravity.',
      whatAppDoes: 'Sit or lie down at once if dizzy, hydrate, and inform your flight surgeon.',
      dataSourceUpdate: 'Blood Pressure Cuff · Daily',
      linkedSystemId: 'cardio',
    },
    {
      id: 'h4-muscle-strength-csa',
      domainId: 'gravity-fields',
      domainLabel: '4. Low Gravity',
      subSection: 'Muscles',
      monitorTopic: 'Muscle Strength, Thigh Volume & Pain',
      currentReading: `Strength ${latest.strengthPctBaseline.toFixed(1)}% · Size ${latest.muscleCsaPctBaseline.toFixed(1)}% · Mobility ${mobilityPct.toFixed(1)}%`,
      baselineTarget: 'Strength 80%+ · Thigh size 87%+ · No limiting pain',
      severity:
        latest.strengthPctBaseline < 80 || latest.limitingMusclePain
          ? 'urgent'
          : latest.muscleCsaPctBaseline < 87 || mobilityPct < 82
            ? 'caution'
            : 'nominal',
      triggerClass: 'NASA-backed threshold',
      standardCitation: 'Muscle Safety Standard',
      whenAppAlerts: 'Strength drops under 80%, thigh volume shrinks, or pain limits work.',
      whatAlertMayShow: 'Deconditioned muscles raise injury risk during spacewalks and landing.',
      whatAppDoes: 'Keep strength training consistent, hit protein goals, and rest sore strains.',
      dataSourceUpdate: 'Strength & Scan Log',
      linkedSystemId: 'muscle',
    },
    {
      id: 'h4-sans-vision-oct',
      domainId: 'gravity-fields',
      domainLabel: '4. Low Gravity',
      subSection: 'Eyes & Brain',
      monitorTopic: 'Vision Clarity, Retinal Scans & Eye Pressure',
      currentReading: `Eye Pressure ${latest.iopMmHg} mmHg · Scan: ${octFinding}${latest.octExamOverdue ? ' (Due)' : ''}`,
      baselineTarget: `Pressure ${baseline.iopMmHgRange[0]}–${baseline.iopMmHgRange[1]} mmHg · Clear near vision`,
      severity:
        latest.visionSymptoms.length > 0 || octFinding !== 'Normal'
          ? 'urgent'
          : latest.octExamOverdue || !latest.sansCountermeasureDone || Math.abs(latest.acuityDeltaLines) >= 2
            ? 'caution'
            : 'nominal',
      triggerClass: latest.octExamOverdue ? 'Protocol/compliance trigger' : 'Clinical-review trigger',
      whenAppAlerts: 'Blurred near vision, eye pressure drift, or overdue eye scan.',
      whatAlertMayShow: 'Fluid shifting toward the head in low gravity can gradually flatten the eye.',
      whatAppDoes: 'Complete eye imaging on schedule and report any blurry vision promptly.',
      dataSourceUpdate: 'Eye Scanner · Scheduled',
      linkedSystemId: 'vision-sans',
    },
    {
      id: 'h4-nutrition-hydration-v26109',
      domainId: 'gravity-fields',
      domainLabel: '4. Low Gravity',
      subSection: 'Fluids & Nutrition',
      monitorTopic: 'Fluid Intake, Calories, Sodium & Kidney Protection',
      currentReading: `${latest.caloriesKcal} kcal · ${latest.proteinG}g protein · ${latest.fluidIntakeMl} ml fluid · ${urineCitrate} mg citrate`,
      baselineTarget: `${baseline.calorieTargetKcal} kcal · <= ${baseline.sodiumLimitMg} mg sodium · ~2,500 ml fluid`,
      severity:
        latest.renalColicSymptoms
          ? 'urgent'
          : latest.fluidIntakeMl < baseline.fluidTargetMl * 0.9 ||
              latest.urineDarkConcentrated ||
              latest.sodiumMg > baseline.sodiumLimitMg ||
              bodyMassDeltaPct <= -3 ||
              latest.nutritionSymptomsFlag
            ? 'caution'
            : 'nominal',
      triggerClass: latest.renalColicSymptoms ? 'Urgent clinical-review trigger' : 'NASA-backed threshold',
      standardCitation: 'Hydration Standard',
      whenAppAlerts: 'Low water, dark urine, low calories, excess sodium, or side pain.',
      whatAlertMayShow: 'Dehydration and high sodium increase kidney stone risk and bone loss.',
      whatAppDoes: 'Drink 2.5 L of water daily, watch sodium, and report side pain at once.',
      dataSourceUpdate: 'Nutrition Log · Daily',
      linkedSystemId: 'nutrition-hydration',
    },

    // =========================================================================
    // 5. CABIN & SUITS
    // =========================================================================
    {
      id: 'h5-cabin-environment',
      domainId: 'hostile-closed',
      domainLabel: '5. Cabin & Suits',
      subSection: 'Cabin Air',
      monitorTopic: 'Temperature, Pressure, CO2, Oxygen & Noise',
      currentReading: `${cabinTemp.toFixed(1)} °C · CO2 ${cabinCo2.toFixed(1)} mmHg · O2 ${cabinO2.toFixed(1)}% · ${cabinNoise} dB`,
      baselineTarget: `${baseline.cabinTempCRange[0]}–${baseline.cabinTempCRange[1]} °C · CO2 <= ${baseline.cabinCo2MaxMmHg} mmHg`,
      severity: cabinOutSeverity,
      triggerClass: cabinOutSeverity === 'urgent' ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whenAppAlerts: 'Cabin CO2 rises or temperature, pressure, or oxygen drifts out of range.',
      whatAlertMayShow: 'Elevated CO2 causes headaches, slower reaction speed, and poor sleep.',
      whatAppDoes: 'Verify air scrubbers and ventilation fans and notify the flight crew.',
      dataSourceUpdate: 'Cabin Sensors · Live',
      linkedTab: 'environment',
    },
    {
      id: 'h5-env-data-availability',
      domainId: 'hostile-closed',
      domainLabel: '5. Cabin & Suits',
      subSection: 'Sensor Health',
      monitorTopic: 'Live Cabin Environmental Stream',
      currentReading: latest.envDataStatus === 'stale' ? 'UPDATE NEEDED' : 'Live & Verified',
      baselineTarget: 'All cabin air sensors updating continuously',
      severity: latest.envDataStatus === 'stale' ? 'data-quality' : 'nominal',
      triggerClass: 'Data-quality trigger',
      whenAppAlerts: 'Cabin environmental telemetry pauses or goes stale.',
      whatAlertMayShow: 'Air safety cannot be confirmed from outdated sensor values.',
      whatAppDoes: 'Inspect cabin wall sensor modules until live readings resume.',
      dataSourceUpdate: 'Cabin Sensors · Live',
      linkedTab: 'environment',
    },
    {
      id: 'h5-eva-health',
      domainId: 'hostile-closed',
      domainLabel: '5. Cabin & Suits',
      subSection: 'Spacewalks',
      monitorTopic: 'Spacewalk Readiness & Suit Symptoms',
      currentReading: `${latest.evaStatus ?? 'Nominal / Inside'}${latest.evaUrgentSymptom ? ' · URGENT' : latest.evaSymptoms && latest.evaSymptoms.length > 0 ? ` · ${latest.evaSymptoms.join(', ')}` : ' · Normal'}`,
      baselineTarget: 'Symptom-free before, during, and after spacewalks',
      severity: latest.evaUrgentSymptom ? 'urgent' : latest.evaSymptoms && latest.evaSymptoms.length > 0 ? 'caution' : 'nominal',
      triggerClass: latest.evaUrgentSymptom ? 'Urgent clinical-review trigger' : 'Clinical-review trigger',
      whenAppAlerts: 'Dizziness, breathing difficulty, joint pain, or chest discomfort occurs in suit.',
      whatAlertMayShow: 'Suit pressure changes or heavy work strain can trigger rapid symptoms.',
      whatAppDoes: 'Halt exertion on urgent symptoms, return safely, and notify your flight surgeon.',
      dataSourceUpdate: 'Spacewalk Log · Each EVA',
      linkedTab: 'environment',
    },
    {
      id: 'h5-food-acceptability-safety',
      domainId: 'hostile-closed',
      domainLabel: '5. Cabin & Suits',
      subSection: 'Food Safety',
      monitorTopic: 'Meal Quality & Food Safety Inspection',
      currentReading: `Rating ${foodScore}/5 · Safety: ${latest.foodSafetyFlag ? 'Issue Flagged' : 'Normal'}`,
      baselineTarget: 'Rating 4+/5 · No compromised ration packs',
      severity: latest.foodSafetyFlag ? 'urgent' : foodScore <= 2 ? 'caution' : 'nominal',
      triggerClass: latest.foodSafetyFlag ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whenAppAlerts: 'Food packs appear swollen/spoiled or meal ratings stay low.',
      whatAlertMayShow: 'Spoiled packs risk illness; poor meals lower calorie intake.',
      whatAppDoes: 'Quarantine suspect ration packs and report stomach upset promptly.',
      dataSourceUpdate: 'Nutrition Log · Daily',
      linkedTab: 'environment',
    },
    {
      id: 'h5-immune-microbiome',
      domainId: 'hostile-closed',
      domainLabel: '5. Cabin & Suits',
      subSection: 'Illness & Skin',
      monitorTopic: 'Immune, Infection & Digestive Monitoring',
      currentReading: `${latest.immuneInfectionSymptoms && latest.immuneInfectionSymptoms.length > 0 ? latest.immuneInfectionSymptoms.join(', ') : 'No symptoms'} · Digestive/Skin: ${latest.microbiomeSymptomsFlag ? 'Flagged' : 'Normal'}`,
      baselineTarget: 'No fever, rash, sore throat, or digestive upset',
      severity:
        (latest.immuneInfectionSymptoms && latest.immuneInfectionSymptoms.length > 0) ||
        latest.microbiomeSymptomsFlag
          ? 'caution'
          : 'nominal',
      triggerClass: 'Clinical-review trigger',
      whenAppAlerts: 'Fever, rash, sore throat, or ongoing digestive symptoms appear.',
      whatAlertMayShow: 'Closed habitats allow minor infections and skin irritation to linger.',
      whatAppDoes: 'Rest, stay hydrated, log symptoms, and notify your flight surgeon.',
      dataSourceUpdate: 'Self Log · Anytime',
      linkedTab: 'environment',
    },
  ];
}
