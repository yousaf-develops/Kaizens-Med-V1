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
    label: 'NASA-backed threshold',
    appBadge: 'NASA-backed threshold',
    definition:
      'A value or requirement directly stated in an applicable NASA standard, such as NASA-STD-3001 (V1 4027 BMD, V1 4001/4002/4003 VO2max, V1 4024 strength, V2 6109 water provision).',
    authorityBoundary: 'This type of threshold is not labeled as "proposed". Formal standard reference only.',
  },
  {
    id: 'cls-evidence',
    label: 'Evidence-based reference point',
    appBadge: 'Evidence-based reference point',
    definition:
      'A reference value supported by peer-reviewed spaceflight or analog studies (8h sleep/24h, 16h wakefulness, 2–4h sleep inertia, 6.5h/48h workload) used conservatively to prompt review.',
    authorityBoundary: 'Individual medical/team-approved targets override general reference points.',
  },
  {
    id: 'cls-operational',
    label: 'Proposed operational trigger',
    appBadge: 'Proposed operational trigger',
    definition:
      'A conservative alert rule proposed by the research team to identify a possible concern early (e.g., 2+ missed exercise days or multi-day drift).',
    authorityBoundary: 'Not a NASA requirement, diagnostic threshold, or basis for restricting activity or granting clearance.',
  },
  {
    id: 'cls-clinical',
    label: 'Clinical-review trigger',
    appBadge: 'Clinical-review trigger',
    definition:
      'A symptom, abnormal result, or concerning finding that must be documented and routed for medical or behavioral-health review.',
    authorityBoundary: 'App documents trends and timing without diagnosing conditions or prescribing treatment.',
  },
  {
    id: 'cls-urgent',
    label: 'Urgent clinical-review trigger',
    appBadge: 'Urgent clinical-review trigger',
    definition:
      'A potentially serious symptom or finding (fainting/collapse, chest pain, severe EVA breathlessness, renal colic, new CNS deficit) requiring immediate emergency crew medical aid.',
    authorityBoundary: 'Routes immediately to approved emergency protocols; never relies on app scores for acute triage.',
  },
  {
    id: 'cls-compliance',
    label: 'Protocol/compliance trigger',
    appBadge: 'Protocol/compliance trigger',
    definition:
      'A required assessment, examination, OCT/fundoscopy imaging, follow-up, or countermeasure that is overdue, incomplete, or missed.',
    authorityBoundary: 'Tracks schedule compliance; completion alone does not guarantee physiological protection.',
  },
  {
    id: 'cls-data-quality',
    label: 'Data-quality trigger',
    appBadge: 'Data-quality trigger',
    definition:
      'Missing, stale, incomplete, unverified, or improperly formatted dosimetry, environmental, or SEU-affected monitoring data.',
    authorityBoundary: 'App never labels radiation or cabin status "Normal" when readings are stale or unavailable.',
  },
  {
    id: 'cls-warning',
    label: 'Official-warning relay',
    appBadge: 'Official-warning relay',
    definition:
      'An authenticated external warning or mission instruction (e.g., Solar Particle Event warning) that the app relays and records.',
    authorityBoundary: 'The app is never the sole warning channel and never issues an independent all-clear.',
  },
  {
    id: 'cls-mission-doc',
    label: 'Mission-protocol documentation',
    appBadge: 'Mission-protocol documentation',
    definition:
      'A required protective action, assigned storm shelter entry/exit, EVA exposure event, or acknowledgment recorded for flight continuity.',
    authorityBoundary: 'Records mission-approved protective actions; sheltering and EVA clearance follow official procedures.',
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
  const last3 = history.slice(-3);
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
    // HAZARD 1: SPACE RADIATION (Pages 2–3)
    // =========================================================================
    {
      id: 'h1-personal-dosimetry',
      domainId: 'space-radiation',
      domainLabel: '1. Space Radiation',
      subSection: 'Dosimetry & Quality',
      monitorTopic: 'Personal Radiation Exposure & Measured Status',
      currentReading: `${latest.dailyDoseMsv.toFixed(2)} mSv/d (${latest.dosimetryStatus}, ${latest.dosimetryLastUpdatedHoursAgo}h)`,
      baselineTarget: 'Verified personal dose (<24h), quantity, timestamp & measured status',
      severity: latest.dosimetryStatus === 'stale' || latest.dosimetryLastUpdatedHoursAgo > 24 ? 'data-quality' : 'nominal',
      triggerClass: 'Data-quality trigger',
      whenAppAlerts: 'Personal dosimeter or ambient radiation reading is missing, stale (>24h), incomplete, or unverified.',
      whatAlertMayShow: 'Exposure cannot be assumed normal when readings are unavailable; symptoms cannot substitute for dosimetry.',
      whatAppDoes: 'Visibly flags stale telemetry and displays latest verified dose rate and source.',
      dataSourceUpdate: 'Personal Dosimeter & Cabin Bus / continuous',
      linkedSystemId: 'radiation',
    },
    {
      id: 'h1-cumulative-alara',
      domainId: 'space-radiation',
      domainLabel: '1. Space Radiation',
      subSection: 'Cumulative ALARA',
      monitorTopic: 'Cumulative Mission & Career Exposure Record',
      currentReading: `Mission ${latest.cumulativeMissionDoseMsv.toFixed(1)} mSv · Career ${(latest.cumulativeMissionDoseMsv + baseline.priorCareerDoseMsv).toFixed(1)} mSv`,
      baselineTarget: `ALARA below mission-approved limit (${baseline.careerRadiationLimitMsv} mSv ref)`,
      severity: latest.cumulativeMissionDoseMsv + baseline.priorCareerDoseMsv >= baseline.careerRadiationLimitMsv * 0.8 ? 'caution' : 'nominal',
      triggerClass: 'Mission-protocol documentation',
      whenAppAlerts: 'Approaching mission-approved review milestones or missing cumulative exposure continuity records.',
      whatAlertMayShow: 'Cumulative exposure informs long-term cancer-risk awareness without treating a limit as a target or safety guarantee.',
      whatAppDoes: 'Maintains longitudinal mission/career exposure logs without generating cancer forecasts.',
      dataSourceUpdate: 'Cumulative Exposure Archive / daily',
      linkedSystemId: 'radiation',
    },
    {
      id: 'h1-spe-shelter-eva',
      domainId: 'space-radiation',
      domainLabel: '1. Space Radiation',
      subSection: 'SPE, Shelter & EVA',
      monitorTopic: 'SPE Warning Relay, Shelter Occupancy & EVA Exposure Context',
      currentReading: speState.activeWarning
        ? `${speState.eventId} · ${speState.shelterOccupied ? 'In Shelter' : 'Entry Pending'}`
        : `No Active SPE · EVA Context: ${latest.evaExposureContext ? 'Active' : 'Shielded'}`,
      baselineTarget: 'Immediate relay, shelter entry/exit timestamps & mission EVA return status',
      severity: speState.activeWarning ? 'urgent' : 'nominal',
      triggerClass: 'Official-warning relay',
      whenAppAlerts: 'Authenticated external SPE warning issued; tracks acknowledgment, assigned shelter occupancy, and active EVA.',
      whatAlertMayShow: 'SPEs and lightly shielded EVAs require timely protective shielding per approved mission procedures.',
      whatAppDoes: 'Relays official instructions and retains timeline; never acts as sole channel or issues independent all-clear.',
      dataSourceUpdate: 'Mission Relay & EVA Record / real-time event',
      linkedSystemId: 'radiation',
    },
    {
      id: 'h1-prodromal-skin-gi',
      domainId: 'space-radiation',
      domainLabel: '1. Space Radiation',
      subSection: 'Prodromal / GI / Skin',
      monitorTopic: 'Nausea, Fatigue, Diarrhea / Fluid Loss & Skin Changes',
      currentReading:
        latest.radiationProdromalSymptoms.length > 0 || latest.skinChangeFlag || latest.giFluidLossFlag
          ? `${[...latest.radiationProdromalSymptoms, latest.skinChangeFlag ? 'Skin' : '', latest.giFluidLossFlag ? 'GI Loss' : ''].filter(Boolean).join(', ')}`
          : 'Clear · No Skin/GI Flags',
      baselineTarget: 'No event-linked nausea/vomiting, GI fluid loss, or redness/blistering',
      severity:
        latest.radiationProdromalSymptoms.length > 0 || latest.skinChangeFlag || latest.giFluidLossFlag
          ? 'caution'
          : 'nominal',
      triggerClass: 'Clinical-review trigger',
      whenAppAlerts: 'Event-linked nausea/vomiting, persistent fatigue, GI fluid loss, or chronological skin changes logged.',
      whatAlertMayShow: 'Documented for medical review; app never infers dose from time-to-vomiting or diagnoses GI/skin dose.',
      whatAppDoes: 'Links GI loss with hydration records, stores timestamped skin photos, and flags clinician review.',
      dataSourceUpdate: 'Symptom Log & Skin Photos / anytime',
      linkedSystemId: 'radiation',
    },
    {
      id: 'h1-bfo-cns-followup',
      domainId: 'space-radiation',
      domainLabel: '1. Space Radiation',
      subSection: 'BFO, CNS & Post-Event',
      monitorTopic: 'Blood-Forming Organ (BFO) Labs, Urgent CNS & Post-Event Continuity',
      currentReading: latest.neurologicalRedFlag
        ? 'URGENT CNS DEFICIT'
        : `BFO Labs: ${bfoStatus} · Post-Event Record Active`,
      baselineTarget: 'Verified BFO nominal · Zero confusion/collapse · Preserved post-event records',
      severity: latest.neurologicalRedFlag ? 'urgent' : bfoStatus !== 'Nominal' ? 'caution' : 'nominal',
      triggerClass: latest.neurologicalRedFlag ? 'Urgent clinical-review trigger' : 'Clinical-review trigger',
      whenAppAlerts: 'Abnormal clinician blood tests, fever/bleeding, OR new confusion, coordination difficulty, seizure, or collapse.',
      whatAlertMayShow: 'Acute neurological changes require emergency crew response; latent-phase improvement does not equal recovery.',
      whatAppDoes: 'Triggers urgent emergency medical routing; preserves post-event/long-term clinician schedules across flights.',
      dataSourceUpdate: 'Clinician Labs & Emergency Self-Report / anytime',
      linkedSystemId: 'radiation',
    },

    // =========================================================================
    // HAZARD 2: ISOLATION AND CONFINEMENT (Pages 4–9)
    // =========================================================================
    {
      id: 'h2-sleep-duration-quality',
      domainId: 'isolation-confinement',
      domainLabel: '2. Isolation & Confinement',
      subSection: '2.1 Sleep & Circadian',
      monitorTopic: 'Sleep Duration, Quality & Circadian Alignment',
      currentReading: `${latestVault?.sleepHours.toFixed(1) ?? '6.4'}h (7d avg ${avgSleep7.toFixed(1)}h) · Quality ${latestVault?.sleepQuality ?? 3}/5`,
      baselineTarget: `>= ${baseline.sleepTargetHours.toFixed(1)}h / 24h (Evidence ref) · Aligned to schedule`,
      severity:
        latestVault && prevVault && latestVault.sleepHours < baseline.sleepTargetHours && prevVault.sleepHours < baseline.sleepTargetHours
          ? 'caution'
          : poorSleepDays >= 3
            ? 'caution'
            : 'nominal',
      triggerClass: 'Evidence-based reference point',
      whenAppAlerts: 'Sleep < 8h target on 2+ consecutive days, poor sleep quality >= 3 days, or repeated bedtime/wake shifts.',
      whatAlertMayShow: 'Chronic sleep deficiency (ISS avg ~6h) impairs alertness, mood, and HPA stress hormone regulation.',
      whatAppDoes: 'Audits noise/temp/CO2/light exposure, shows weekly average, and keeps private entries local by default.',
      dataSourceUpdate: 'Actigraphy & Private Sleep Log / daily',
      linkedTab: 'vault',
    },
    {
      id: 'h2-wake-inertia',
      domainId: 'isolation-confinement',
      domainLabel: '2. Isolation & Confinement',
      subSection: '2.1 Wake & Inertia',
      monitorTopic: 'Acute Wakefulness Limit (16h) & Post-Wake Sleep Inertia (2–4h)',
      currentReading: `${evaluation.hoursAwakeNow.toFixed(1)}h awake · ${evaluation.inSleepInertiaWindow ? 'In 2–4h Inertia' : 'Post-Inertia Clear'}`,
      baselineTarget: '< 16.0h continuous wakefulness · 2–4h buffer before critical tasks',
      severity:
        evaluation.hoursAwakeNow >= 16
          ? 'urgent'
          : evaluation.inSleepInertiaWindow
            ? 'caution'
            : 'nominal',
      triggerClass: 'Evidence-based reference point',
      whenAppAlerts: 'Continuous wakefulness approaches 16h or a safety-critical task falls within 2–4h of waking.',
      whatAlertMayShow: 'Acute sleep deprivation and abrupt-awakening sleep inertia degrade decision-making and reaction speed.',
      whatAppDoes: 'Displays live time since waking and recommends approved rest or alertness staging.',
      dataSourceUpdate: 'Wearable / Schedule / continuous while awake',
      linkedTab: 'vault',
    },
    {
      id: 'h2-pvt-vigilance',
      domainId: 'isolation-confinement',
      domainLabel: '2. Isolation & Confinement',
      subSection: '2.1 Fatigue & PVT-B',
      monitorTopic: 'Fatigue, Alertness & 3-Min PVT-B Reaction Self Test',
      currentReading: latestPvt
        ? `Mean ${latestPvt.meanRtMs} ms (base ${baseline.pvtBaselineMs}) · ${latestPvt.lapsesCount} lapses`
        : 'No PVT-B run logged',
      baselineTarget: `Within personal baseline (${baseline.pvtBaselineMs} ms) · < 2 lapses (>355 ms)`,
      severity:
        latestPvt && (latestPvt.meanRtMs > baseline.pvtBaselineMs + 45 || latestPvt.lapsesCount >= 2)
          ? 'caution'
          : 'nominal',
      triggerClass: 'Proposed operational trigger',
      whenAppAlerts: 'PVT-B drifts > +45 ms above personal baseline, lapses >= 2, or fatigue persists after rest.',
      whatAlertMayShow: 'Sustained attention is affected by sleep deficiency, circadian shifts, and elevated cabin CO2.',
      whatAppDoes: 'Compares strictly against personal baseline (not population norms) with graphical Reaction Self Test feedback.',
      dataSourceUpdate: '3-Min PVT-B Self Test / daily or pre-EVA',
      linkedTab: 'assessments',
    },
    {
      id: 'h2-workload-autonomy',
      domainId: 'isolation-confinement',
      domainLabel: '2. Isolation & Confinement',
      subSection: '2.1 Workload & Autonomy',
      monitorTopic: 'Workload Limits (6.5h/d, 48h/wk) & Schedule Autonomy',
      currentReading: `${latestVault?.workloadHours.toFixed(1) ?? '6.9'}h today · ${weeklyWorkHours.toFixed(1)}h/wk · Control ${latestVault?.scheduleControl ?? 3}/5`,
      baselineTarget: '<= 6.5h/day · <= 48h/week (Critical: 10h x 3+d or >60h/wk)',
      severity:
        highWorkDays >= 3 || weeklyWorkHours > 60
          ? 'urgent'
          : weeklyWorkHours > 48 || (latestVault?.workloadHours ?? 0) > 6.5
            ? 'caution'
            : 'nominal',
      triggerClass: 'Evidence-based reference point',
      whenAppAlerts: 'Workload repeatedly exceeds 6.5h/d or 48h/wk, reaches critical overload, or low autonomy / busywork persists.',
      whatAlertMayShow: 'Being meaningfully busy with schedule control protects morale; busywork and overload erode sleep.',
      whatAppDoes: 'Tracks planned vs. actual hours, flags overload, and supports astronaut schedule autonomy.',
      dataSourceUpdate: 'Schedule & Work Log / daily and weekly',
      linkedTab: 'vault',
    },
    {
      id: 'h2-mood-cohesion-hippocampus',
      domainId: 'isolation-confinement',
      domainLabel: '2. Isolation & Confinement',
      subSection: '2.2 Behavioral Brief',
      monitorTopic: 'Mood, HPA Stress, Team Cohesion, Privacy Vault & Hippocampus Cross-Link',
      currentReading: `Mood ${latestVault?.moodScore ?? 3}/5 · Stress ${latestVault?.stressScore ?? 3}/5 · Cohesion ${latestVault?.crewCohesionScore ?? 4}/5`,
      baselineTarget: 'Multi-day well-being stable · Local privacy-first vault (opt-in PPC share)',
      severity: evaluation.behavioralSeverity,
      triggerClass: 'Proposed operational trigger',
      whenAppAlerts: 'Sustained multi-day decline across sleep, mood, stress, cohesion, or stress coinciding with radiation exposure.',
      whatAlertMayShow: 'Combats underreporting via local storage; hippocampus is sensitive to both stress and radiation (cross-linked).',
      whatAppDoes: 'Tracks multi-day trends rather than single-day dips; offers voluntary Flight Surgeon / PPC prompt at red drift.',
      dataSourceUpdate: 'Private Vault Check-In + HRV / daily voluntary',
      linkedTab: 'vault',
    },

    // =========================================================================
    // HAZARD 3: DISTANCE FROM EARTH (Pages 10–11)
    // =========================================================================
    {
      id: 'h3-crew-ground-comm',
      domainId: 'distance-from-earth',
      domainLabel: '3. Distance from Earth',
      subSection: '3.1 Crew-Ground Comms',
      monitorTopic: 'Crew-Ground Communication Structure & Delay Resilience',
      currentReading: latest.commBreakdownFlag
        ? `Comm Breakdown Flagged (${env.oneWayLatencyLabel})`
        : `Clear · Latency ${env.oneWayLatencyLabel}`,
      baselineTarget: 'Clear, structured async communications within 4–24 min delay envelope',
      severity: latest.commBreakdownFlag ? 'caution' : 'nominal',
      triggerClass: 'Proposed operational trigger',
      whenAppAlerts: 'Repeated misunderstood, delayed, incomplete, or out-of-sequence comms or high frustration during comm events.',
      whatAlertMayShow: 'Up to 20–24 min one-way delays impair coordination, shared situational awareness, and crew-ground trust.',
      whatAppDoes: 'Prompts structured async handoff templates and flags repeated breakdowns under privacy rules.',
      dataSourceUpdate: 'Communication Event Log / during comms',
      linkedTab: 'sync',
    },
    {
      id: 'h3-offline-bandwidth-cmo',
      domainId: 'distance-from-earth',
      domainLabel: '3. Distance from Earth',
      subSection: '3.2 Operational Constraints',
      monitorTopic: 'Offline Edge Autonomy, Store-and-Forward Bandwidth & Non-CMO Support',
      currentReading: `Edge Active · ${env.communicationMode}`,
      baselineTarget: '100% offline rule engine, compressed delta packets (<1 KB) & guided non-specialist UX',
      severity: 'nominal',
      triggerClass: 'Mission-protocol documentation',
      whenAppAlerts: 'Tracks local packet compression for store-and-forward downlink without blocking offline triage.',
      whatAlertMayShow: '3–4 crew exploration teams operate without a dedicated chief medical officer under strict bandwidth caps.',
      whatAppDoes: 'Executes all scoring locally on device, syncs compact delta packets, and provides guided step-by-step plans.',
      dataSourceUpdate: 'Local IndexedDB / Offline Store / continuous',
      linkedTab: 'sync',
    },
    {
      id: 'h3-seu-sensors-datasets',
      domainId: 'distance-from-earth',
      domainLabel: '3. Distance from Earth',
      subSection: '3.2–3.5 Hardware & Tools',
      monitorTopic: 'SEU Radiation Checksum, CSA Bio-Monitor, CHP-IDA & OSDR Alignment',
      currentReading: `SEU ${latest.seuChecksumOk === false ? 'Warning' : 'Verified'} · ${latest.wearableSource ?? 'CSA Bio-Monitor'}`,
      baselineTarget: 'Checksum-verified local state · Whisper offline voice · Green/Yellow/Red low-load UX',
      severity: latest.seuChecksumOk === false ? 'data-quality' : 'nominal',
      triggerClass: 'Data-quality trigger',
      whenAppAlerts: 'Single Event Upset (SEU) cosmic-ray checksum mismatch or corrupted sensor packet detected.',
      whatAlertMayShow: 'Space hardware is prone to SEUs; resilient verification prevents acting on corrupted telemetry.',
      whatAppDoes: 'Integrates CSA Bio-Monitor, BLE wearables, MQTT/SpaceWire bus, voice logging, and OSDR/PhysioNet schemas.',
      dataSourceUpdate: 'CHP-IDA Edge Schema & BLE / continuous',
      linkedTab: 'sync',
    },

    // =========================================================================
    // HAZARD 4: GRAVITY FIELDS (Pages 12–18)
    // =========================================================================
    {
      id: 'h4-bone-bmd',
      domainId: 'gravity-fields',
      domainLabel: '4. Gravity Fields',
      subSection: '4.1 Bone Health',
      monitorTopic: 'Bone Mineral Density (Hip, Spine & Femoral Neck) & Multi-Scan Trend',
      currentReading: `Hip/Spine ${latest.hipSpineBmdPct.toFixed(1)}% · Thigh ${latest.femoralNeckBmdPct.toFixed(1)}% (Δ ${bmdRateDelta.toFixed(1)}%/7d)`,
      baselineTarget: 'Hip/Spine >= 95% · Femoral Neck >= 90% pre-mission',
      severity: latest.hipSpineBmdPct < 95 || latest.femoralNeckBmdPct < 90 ? 'urgent' : bmdRateDelta <= -1.5 ? 'caution' : 'nominal',
      triggerClass: 'NASA-backed threshold',
      standardCitation: 'NASA-STD-3001 V1 4027',
      whenAppAlerts: 'New approved DXA drops below 95% hip/spine or 90% femoral neck, or declines faster than approved trend.',
      whatAlertMayShow: 'Bone mineral loss raises fracture risk and delays high-load tolerance after landing.',
      whatAppDoes: 'Flags for ASCR/medical review with scan site and baseline comparison; exercise logs alone never prove protection.',
      dataSourceUpdate: 'DXA Scan & Trend / when entered',
      linkedSystemId: 'bone',
    },
    {
      id: 'h4-bone-ared-postlanding',
      domainId: 'gravity-fields',
      domainLabel: '4. Gravity Fields',
      subSection: '4.1 Bone & Post-Landing',
      monitorTopic: 'ARED Adherence, Bone Markers, Injury Pain & Post-Landing Readaptation',
      currentReading: `${7 - missedAred}/7 ARED · ${latest.postLandingPhase ?? 'In-Flight'}${latest.postLandingUrgentCollapse ? ' · COLLAPSE' : latest.postLandingSymptoms ? ' · Dizzy' : ''}`,
      baselineTarget: 'Prescribed ARED & Vit D/Ca met · Stable post-landing upright recovery',
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
      whenAppAlerts: '2+ missed ARED workouts/week, bone pain, or post-landing dizziness, balance difficulty, or fainting/collapse.',
      whatAlertMayShow: 'Crew readjusting to Earth, lunar, or Martian gravity need recovery criteria before high-load tasks.',
      whatAppDoes: 'Supports recovery tracking & urgent collapse escalation; never grants landing, EVA, or return-to-duty clearance.',
      dataSourceUpdate: 'ARED Log, Labs & Post-Landing Report / daily',
      linkedSystemId: 'bone',
    },
    {
      id: 'h4-cardio-vo2-submax',
      domainId: 'gravity-fields',
      domainLabel: '4. Gravity Fields',
      subSection: '4.2 Cardiovascular',
      monitorTopic: 'VO2 Peak, Submaximal HR, Workload Tolerance & Post-Bout Recovery',
      currentReading: `${latest.vo2PeakMlKgMin.toFixed(1)} ml/min/kg (${vo2Pct.toFixed(0)}%) · Submax ${latest.submaxHrBpm} bpm · RPE ${latest.rpe}/10`,
      baselineTarget: `>= 80% base (V1 4003) · EVA >= ${env.evaVo2Floor} (V1 4001/4002)`,
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
      standardCitation: 'NASA-STD-3001 V1 4001 / 4002 / 4003',
      whenAppAlerts: 'VO2 peak < 80% base or below EVA floor (32.9 microgravity; 36.5 surface), or repeated submax HR/RPE drift.',
      whatAlertMayShow: 'Lower plasma volume and cardiac adaptation reduce capacity for EVA, emergency egress, and ambulation.',
      whatAppDoes: 'Prompts sensor/hydration verification and routes readiness trends to ASCR/medical team.',
      dataSourceUpdate: 'Ergometer, Bio-Monitor & RPE / each test',
      linkedSystemId: 'cardio',
    },
    {
      id: 'h4-cardio-bp-ortho',
      domainId: 'gravity-fields',
      domainLabel: '4. Gravity Fields',
      subSection: '4.2 BP & Orthostatic',
      monitorTopic: 'Blood Pressure (Posture/Timing) & Orthostatic Stand / Tilt / LBNP Tolerance',
      currentReading: `${latest.bpSystolic}/${latest.bpDiastolic} (${latest.bpPosture}) · Stand Δ+${orthoHrDelta} bpm`,
      baselineTarget: `${baseline.systolicRange[0]}–${baseline.systolicRange[1]} / ${baseline.diastolicRange[0]}–${baseline.diastolicRange[1]} · Zero dizziness/presyncope`,
      severity:
        latest.chestOrPresyncope || latest.orthostaticSymptoms || latest.bpSystolic >= 140
          ? 'urgent'
          : orthoHrDelta >= 28
            ? 'caution'
            : 'nominal',
      triggerClass: 'Urgent clinical-review trigger',
      whenAppAlerts: 'Abnormal repeated BP or ANY dizziness, visual dimming, chest discomfort, fainting, or presyncope during stand/LBNP.',
      whatAlertMayShow: 'Orthostatic intolerance: difficulty maintaining brain perfusion upright after microgravity.',
      whatAppDoes: 'Instructs stopping upright test immediately, sitting/lying safely, and escalating under emergency protocol.',
      dataSourceUpdate: 'Approved BP Cuff & Stand/Tilt/LBNP / scheduled & post-landing',
      linkedSystemId: 'cardio',
    },
    {
      id: 'h4-muscle-strength-csa',
      domainId: 'gravity-fields',
      domainLabel: '4. Gravity Fields',
      subSection: '4.3 Muscle Health',
      monitorTopic: 'Muscle Strength (>= 80%), Guided Ultrasound CSA, Function & Pain',
      currentReading: `Strength ${latest.strengthPctBaseline.toFixed(1)}% · CSA ${latest.muscleCsaPctBaseline.toFixed(1)}% · Mobility ${mobilityPct.toFixed(1)}%`,
      baselineTarget: 'Strength >= 80% (V1 4024) · CSA >= 87% · Zero limiting pain',
      severity:
        latest.strengthPctBaseline < 80 || latest.limitingMusclePain
          ? 'urgent'
          : latest.muscleCsaPctBaseline < 87 || mobilityPct < 82
            ? 'caution'
            : 'nominal',
      triggerClass: 'NASA-backed threshold',
      standardCitation: 'NASA-STD-3001 V1 4024',
      whenAppAlerts: 'Strength < 80% pre-flight, repeated ultrasound CSA drift, functional decline, or activity-limiting strain.',
      whatAlertMayShow: 'Insufficient strength or focal atrophy impairs EVA suit work, lifting, and post-landing egress.',
      whatAppDoes: 'Links ARED + protein logs with serial ultrasound comparisons in Scans; ASCR sets all task clearance.',
      dataSourceUpdate: 'Strength Test, Ultrasound & Functional Exam',
      linkedSystemId: 'muscle',
    },
    {
      id: 'h4-sans-vision-oct',
      domainId: 'gravity-fields',
      domainLabel: '4. Gravity Fields',
      subSection: '4.4 Vision / SANS',
      monitorTopic: 'Vision Symptoms, OCT/Fundoscopy, IOP & Investigational Countermeasures',
      currentReading: `IOP ${latest.iopMmHg} mmHg · OCT: ${octFinding}${latest.octExamOverdue ? ' (Overdue)' : ''} · CM ${latest.sansCountermeasureDone ? 'Done' : 'Missed'}`,
      baselineTarget: `IOP ${baseline.iopMmHgRange[0]}–${baseline.iopMmHgRange[1]} · Timely OCT · Clear focus`,
      severity:
        latest.visionSymptoms.length > 0 || octFinding !== 'Normal'
          ? 'urgent'
          : latest.octExamOverdue || !latest.sansCountermeasureDone || Math.abs(latest.acuityDeltaLines) >= 2
            ? 'caution'
            : 'nominal',
      triggerClass: latest.octExamOverdue ? 'Protocol/compliance trigger' : 'Clinical-review trigger',
      whenAppAlerts: 'New visual symptoms, >=2-line acuity shift, overdue/abnormal OCT imaging, abnormal IOP, or missed CM log.',
      whatAlertMayShow: 'Headward fluid shift may trigger optic-disc edema or refractive changes; LBNP/thigh cuffs/B-vitamins remain under study.',
      whatAppDoes: 'Tracks exam compliance and adherence only; makes zero claims that countermeasures prevent or treat SANS.',
      dataSourceUpdate: 'OCT, Fundoscopy, Tonometry & CM Log',
      linkedSystemId: 'vision-sans',
    },
    {
      id: 'h4-nutrition-hydration-v26109',
      domainId: 'gravity-fields',
      domainLabel: '4. Gravity Fields',
      subSection: '4.5 Nutrition & Hydration',
      monitorTopic: 'Calories, Protein, Body Mass, Micronutrients, Hydration (V2 6109) & Renal Colic',
      currentReading: `${latest.caloriesKcal} kcal · ${latest.proteinG}g pro · ${latest.fluidIntakeMl} mL in / ${latest.urineOutputMl} mL out · Citrate ${urineCitrate} mg/d`,
      baselineTarget: `${baseline.calorieTargetKcal} kcal · Na <= ${baseline.sodiumLimitMg} mg · Habitat ~2.5 L/d V2 6109`,
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
      standardCitation: 'NASA-STD-3001 V2 6109 Context',
      whenAppAlerts: 'Low fluid/calories/protein, dark urine, high sodium, low citrate, eating symptoms, or ANY renal colic pain.',
      whatAlertMayShow: 'Separates V2 6109 habitat water-provision spec from individual dehydration cutoffs; bone loss + low urine favors stones.',
      whatAppDoes: 'Displays intake/output trends and escalates flank pain or hematuria urgently without diagnosing deficiencies.',
      dataSourceUpdate: 'Dietary/Fluid Logs, Urine Labs & Self-Report / daily',
      linkedSystemId: 'nutrition-hydration',
    },

    // =========================================================================
    // HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS (Pages 19–20)
    // =========================================================================
    {
      id: 'h5-cabin-environment',
      domainId: 'hostile-closed',
      domainLabel: '5. Hostile / Closed Env',
      subSection: '5.1 Cabin Environment',
      monitorTopic: 'Cabin Temperature, Pressure, Gas Levels (CO2/O2) & Noise',
      currentReading: `${cabinTemp.toFixed(1)}°C · ${cabinPressure.toFixed(1)} kPa · CO2 ${cabinCo2.toFixed(1)} mmHg · O2 ${cabinO2.toFixed(1)}% · ${cabinNoise} dBA`,
      baselineTarget: `Temp ${baseline.cabinTempCRange[0]}–${baseline.cabinTempCRange[1]}°C · ${baseline.cabinPressureKpaRange[0]}–${baseline.cabinPressureKpaRange[1]} kPa · CO2 <= ${baseline.cabinCo2MaxMmHg}`,
      severity: cabinOutSeverity,
      triggerClass: cabinOutSeverity === 'urgent' ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whenAppAlerts: 'Cabin temperature, pressure, CO2, O2, or acoustic noise drifts outside approved limits or pairs with symptoms.',
      whatAlertMayShow: 'Closed-cabin gas or temperature swings degrade sleep, cause headaches, and impair cognitive performance (HERA evidence).',
      whatAppDoes: 'Displays current conditions without auto-adjusting vehicle hardware or diagnosing environmental illness.',
      dataSourceUpdate: 'Environmental Bus (MQTT / SpaceWire) / continuous',
      linkedTab: 'environment',
    },
    {
      id: 'h5-env-data-availability',
      domainId: 'hostile-closed',
      domainLabel: '5. Hostile / Closed Env',
      subSection: '5.1 Data Availability',
      monitorTopic: 'Environmental-Monitoring Data Availability Guard',
      currentReading: latest.envDataStatus === 'stale' ? 'STALE / UNVERIFIED' : 'Measured & Current',
      baselineTarget: 'All required cabin gas, temp & pressure readings live',
      severity: latest.envDataStatus === 'stale' ? 'data-quality' : 'nominal',
      triggerClass: 'Data-quality trigger',
      whenAppAlerts: 'Required cabin environmental reading is missing, stale, or unverified.',
      whatAlertMayShow: 'Environmental safety cannot be confirmed when readings are outdated.',
      whatAppDoes: 'Flags data-quality warning instead of ever displaying absent environmental data as Normal.',
      dataSourceUpdate: 'Environmental Bus Heartbeat / continuous',
      linkedTab: 'environment',
    },
    {
      id: 'h5-eva-health',
      domainId: 'hostile-closed',
      domainLabel: '5. Hostile / Closed Env',
      subSection: '5.2 EVA Health',
      monitorTopic: 'Pre-, In-, and Post-EVA Symptoms & Recovery Tracking',
      currentReading: `${latest.evaStatus ?? 'Nominal / Inside'}${latest.evaUrgentSymptom ? ' · URGENT' : latest.evaSymptoms && latest.evaSymptoms.length > 0 ? ` · ${latest.evaSymptoms.join(', ')}` : ' · Clear'}`,
      baselineTarget: 'Follow pre/in/post-EVA procedures · Prompt symptom reporting',
      severity: latest.evaUrgentSymptom ? 'urgent' : latest.evaSymptoms && latest.evaSymptoms.length > 0 ? 'caution' : 'nominal',
      triggerClass: latest.evaUrgentSymptom ? 'Urgent clinical-review trigger' : 'Clinical-review trigger',
      whenAppAlerts: 'Dizziness, breathlessness, chest discomfort, joint pain, or rash during/after EVA; urgent if severe.',
      whatAlertMayShow: 'Possible decompression sickness, hypoxia, elevated suit CO2, or physical strain requiring medical review.',
      whatAppDoes: 'Tracks EVA phase & recovery; never diagnoses DCS/hypoxia or determines EVA begin/continue/return clearance.',
      dataSourceUpdate: 'EVA Log, Suit Telemetry & Self-Report / per EVA',
      linkedTab: 'environment',
    },
    {
      id: 'h5-food-acceptability-safety',
      domainId: 'hostile-closed',
      domainLabel: '5. Hostile / Closed Env',
      subSection: '5.3 Food Acceptability & Safety',
      monitorTopic: 'Food Acceptability, Variety & Adverse Food Reactions',
      currentReading: `Variety ${foodScore}/5 · Safety: ${latest.foodSafetyFlag ? 'Adverse Event' : 'Clear'}`,
      baselineTarget: 'Rating >= 4/5 · Zero spoiled food or GI reaction after eating',
      severity: latest.foodSafetyFlag ? 'urgent' : foodScore <= 2 ? 'caution' : 'nominal',
      triggerClass: latest.foodSafetyFlag ? 'Clinical-review trigger' : 'Proposed operational trigger',
      whenAppAlerts: 'Repeated low variety scores/menu fatigue OR suspected spoiled food, contamination, allergic or GI reaction.',
      whatAlertMayShow: 'Menu fatigue impairs calorie intake; adverse reactions require stopping suspect items per approved protocol.',
      whatAppDoes: 'Tracks ration acceptability trends and logs suspected food item, timing, and symptoms for review.',
      dataSourceUpdate: 'Food Rating & Safety Log / daily or anytime',
      linkedTab: 'environment',
    },
    {
      id: 'h5-immune-microbiome',
      domainId: 'hostile-closed',
      domainLabel: '5. Hostile / Closed Env',
      subSection: '5.3 Immune & Microbiome',
      monitorTopic: 'Immune / Infection Symptoms & Microbiome-Related Shifts',
      currentReading: `${latest.immuneInfectionSymptoms && latest.immuneInfectionSymptoms.length > 0 ? latest.immuneInfectionSymptoms.join(', ') : 'Immune Clear'} · Microbiome: ${latest.microbiomeSymptomsFlag ? 'Flagged' : 'Clear'}`,
      baselineTarget: 'Zero fever, rash, sore throat, or persistent GI/skin changes',
      severity:
        (latest.immuneInfectionSymptoms && latest.immuneInfectionSymptoms.length > 0) ||
        latest.microbiomeSymptomsFlag
          ? 'caution'
          : 'nominal',
      triggerClass: 'Clinical-review trigger',
      whenAppAlerts: 'Fever, rash, sore throat, persistent fatigue, allergic flares, or persistent GI/skin symptoms.',
      whatAlertMayShow: 'Closed habitats & HPA stress alter immune regulation and microbial communities.',
      whatAppDoes: 'Documents immune/microbiome symptoms alongside food and environment logs for medical review.',
      dataSourceUpdate: 'Self-Report / anytime or when symptoms occur',
      linkedTab: 'environment',
    },
  ];
}
