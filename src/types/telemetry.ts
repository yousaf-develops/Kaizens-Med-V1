export type MissionEnvironment =
  | 'mars-transit'
  | 'orbital-iss'
  | 'pressurized-rover'
  | 'lunar-base'
  | 'mars-base';

export type HazardCategoryId =
  | 'space-radiation'
  | 'isolation-confinement'
  | 'distance-from-earth'
  | 'gravity-fields'
  | 'hostile-closed';

export type SystemId =
  | 'vision-sans'
  | 'cardio'
  | 'nutrition-hydration'
  | 'bone'
  | 'muscle'
  | 'radiation';

export type AlertSeverity = 'nominal' | 'caution' | 'urgent' | 'data-quality';

export type TriggerClassification =
  | 'NASA-backed threshold'
  | 'Evidence-based reference point'
  | 'Proposed operational trigger'
  | 'Clinical-review trigger'
  | 'Urgent clinical-review trigger'
  | 'Protocol/compliance trigger'
  | 'Data-quality trigger'
  | 'Official-warning relay'
  | 'Mission-protocol documentation';

export type NavTab =
  | 'hud'
  | 'vitals'
  | 'environment'
  | 'research'
  | 'systems'
  | 'assessments'
  | 'vault'
  | 'sync';

export interface EnvironmentConfig {
  id: MissionEnvironment;
  label: string;
  shortLabel: string;
  environmentType: 'Spacecraft' | 'Space Station' | 'Rover' | 'Moon Base' | 'Mars Base';
  gravityLabel: string;
  vehicle: string;
  missionDayLabel: string;
  currentDay: number;
  totalMissionDays: number;
  oneWayLatencyLabel: string;
  oneWayLatencySeconds: number;
  evaVo2Floor: number;
  evaContextLabel: string;
  radiationAmbientRateMsvDay: number;
  communicationMode: string;
  environmentHealthInsights: [string, string, string];
}

export type AstronautGender = 'male' | 'female';

export interface AstronautProfile {
  firstName: string;
  lastName?: string;
  gender: AstronautGender;
  onboardedAtISO: string;
}

export interface CoreHazardMeta {
  id: HazardCategoryId;
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
  shortTitle: string;
  subtitle: string;
  pdfPages: string;
  summary: string;
  targetTab: NavTab;
}

export interface AstronautBaseline {
  callsign: string;
  gender?: AstronautGender;
  missionQuarter: number;
  hipBmdGcm2: number;
  spineBmdGcm2: number;
  femoralNeckBmdGcm2: number;
  vo2PeakMlKgMin: number;
  submaxHrBpm: number;
  systolicRange: [number, number];
  diastolicRange: [number, number];
  strength1RmKg: number;
  muscleCsaCm2: number;
  iopMmHgRange: [number, number];
  bodyMassKg: number;
  calorieTargetKcal: number;
  proteinTargetG: number;
  sodiumLimitMg: number;
  fluidTargetMl: number;
  sleepTargetHours: number;
  pvtBaselineMs: number;
  careerRadiationLimitMsv: number;
  priorCareerDoseMsv: number;
  // Wearable Vital Baselines
  restingHrRange: [number, number];
  hrvMinMs: number;
  spo2MinPct: number;
  bodyTempCRange: [number, number];
  bloodGlucoseMgDlRange: [number, number];
  // Cabin Environment Baselines (Hazard 5)
  cabinTempCRange: [number, number];
  cabinPressureKpaRange: [number, number];
  cabinCo2MaxMmHg: number;
  cabinO2PctRange: [number, number];
}

export type EvaPhaseStatus =
  | 'Nominal / Inside'
  | 'Pre-EVA Prep'
  | 'In-EVA Spacewalk'
  | 'Post-EVA Recovery';

export type PostLandingPhase = 'In-Flight' | 'Post-Landing Readapting' | 'Recovered';

export interface DailyTelemetryEntry {
  id: string;
  sol: number;
  dateISO: string;

  // Hazard 4.1: Bone Health & Post-Landing Readaptation
  hipSpineBmdPct: number;
  femoralNeckBmdPct: number;
  aredCompleted: boolean;
  aredLoadPct: number;
  calciumMg: number;
  vitaminDIu: number;
  boneTurnoverAbnormal: boolean;
  bonePainSymptom: boolean;
  postLandingPhase?: PostLandingPhase;
  postLandingSymptoms?: boolean;
  postLandingUrgentCollapse?: boolean;

  // Hazard 4.2: Cardiovascular & Aerobic Fitness
  vo2PeakMlKgMin: number;
  submaxHrBpm: number;
  restingHrBpm: number;
  bpSystolic: number;
  bpDiastolic: number;
  bpPosture: 'seated' | 'supine' | 'standing';
  aerobicCompleted: boolean;
  rpe: number;
  hrRecovery1MinBpm: number;
  orthostaticSymptoms: boolean;
  chestOrPresyncope: boolean;
  orthostaticHrDeltaBpm?: number;

  // Hazard 4.3: Muscle Health
  strengthPctBaseline: number;
  muscleCsaPctBaseline: number;
  limitingMusclePain: boolean;
  functionalMobilityPct?: number;

  // Hazard 4.4: Vision / SANS
  iopMmHg: number;
  acuityDeltaLines: number;
  octExamOverdue: boolean;
  sansCountermeasureDone: boolean;
  visionSymptoms: string[];
  octRetinalFinding?: 'Normal' | 'Mild Optic-Disc Edema' | 'Choroidal Folds';

  // Hazard 4.5: Nutrition & Hydration
  caloriesKcal: number;
  bodyMassKg: number;
  proteinG: number;
  sodiumMg: number;
  fluidIntakeMl: number;
  urineOutputMl: number;
  urineDarkConcentrated: boolean;
  renalColicSymptoms: boolean;
  nutritionSymptomsFlag?: boolean;
  urineCitrateMgDay?: number;

  // Hazard 1: Space Radiation
  dailyDoseMsv: number;
  cumulativeMissionDoseMsv: number;
  dosimetryStatus: 'measured' | 'modeled' | 'stale';
  dosimetryLastUpdatedHoursAgo: number;
  radiationProdromalSymptoms: string[];
  neurologicalRedFlag: boolean;
  bfoLabStatus?: 'Nominal' | 'Pending Review' | 'Flagged';
  skinChangeFlag?: boolean;
  giFluidLossFlag?: boolean;
  evaExposureContext?: boolean;

  // Hazard 3: Distance from Earth (Comms, Bandwidth & Hardware)
  commBreakdownFlag?: boolean;
  commLatencyMinutes?: number;
  seuChecksumOk?: boolean;

  // Hazard 5: Hostile / Closed Environments (Cabin, EVA, Food Safety, Immune, Microbiome)
  cabinTempC?: number;
  cabinPressureKpa?: number;
  cabinCo2MmHg?: number;
  cabinO2Pct?: number;
  cabinNoiseDba?: number;
  envDataStatus?: 'measured' | 'stale';
  evaStatus?: EvaPhaseStatus;
  evaSymptoms?: string[];
  evaUrgentSymptom?: boolean;
  foodAcceptabilityScore?: 1 | 2 | 3 | 4 | 5;
  foodSafetyFlag?: boolean;
  immuneInfectionSymptoms?: string[];
  microbiomeSymptomsFlag?: boolean;

  // Connected Wearable Vitals
  spo2Pct?: number;
  bodyTempC?: number;
  bloodGlucoseMgDl?: number;
  hrvMs?: number;
  wearableSource?: string;
  wearableLastSyncISO?: string;
}

export interface EvaluatedAlert {
  id: string;
  hazardId: HazardCategoryId;
  hazardLabel: string;
  systemId: SystemId | 'behavioral' | 'distance' | 'hostile-closed';
  systemLabel: string;
  title: string;
  severity: AlertSeverity;
  classification: TriggerClassification;
  standardRef?: string;
  whatItMayShow: string;
  recommendedAction: string;
  metricSummary: string;
}

export interface DailyActionStep {
  id: string;
  label: string;
  detail: string;
  actionType?: 'ared' | 'hydration' | 'sans' | 'checkup';
}

export interface SystemKnowledge {
  id: SystemId;
  hazardId: HazardCategoryId;
  hazardTitle: string;
  name: string;
  shortName: string;
  bodyRegion: string;
  plainTitle: string;
  whyItMatters: string;
  examSteps: string[];
  countermeasures: string[];
  dailyActions: DailyActionStep[];
  standardsCitation: string;
  primarySource: string;
}

export interface MediaAssessmentItem {
  id: string;
  category: 'muscle-ultrasound' | 'skin-radiation' | 'oct-retina' | 'other';
  anatomicalSite: string;
  capturedAtISO: string;
  sol: number;
  notes: string;
  dataUrl: string;
  flaggedForClinician: boolean;
}

export interface PVTSessionResult {
  id: string;
  timestampISO: string;
  sol: number;
  mode: 'standard-3m' | 'calibration-45s';
  meanRtMs: number;
  medianRtMs: number;
  lapsesCount: number;
  falseStarts: number;
  trialsCount: number;
  hoursAwakeAtTest: number;
  reactionSamplesMs: number[];
}

export interface BehavioralVaultEntry {
  id: string;
  sol: number;
  dateISO: string;
  sleepHours: number;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  wakeTimeISO: string;
  workloadHours: number;
  scheduleControl: 1 | 2 | 3 | 4 | 5;
  moodScore: 1 | 2 | 3 | 4 | 5;
  stressScore: 1 | 2 | 3 | 4 | 5;
  meaningfulWork: boolean;
  crewCohesionScore: 1 | 2 | 3 | 4 | 5;
  commDelayTension: boolean;
  privateJournalText: string;
  sharedWithFlightSurgeon: boolean;
}

export interface SPEEventState {
  activeWarning: boolean;
  eventId: string;
  issuedAtISO: string | null;
  acknowledged: boolean;
  shelterOccupied: boolean;
  shelterEnteredAtISO: string | null;
  assignedShelter: string;
  evaActiveDuringWarning: boolean;
}

export interface DeltaSyncPacket {
  id: string;
  createdAtISO: string;
  sol: number;
  domain: string;
  summary: string;
  payloadBytes: number;
  includesBehavioralData: boolean;
  status: 'queued' | 'transmitting' | 'acknowledged';
  acknowledgedAtISO?: string;
}

export interface StreakSummary {
  aredStreakDays: number;
  hydrationStreakDays: number;
  sleepLogStreakDays: number;
  pvtCheckInCount: number;
}

export interface WearableReadingPayload {
  deviceName: string;
  sourceType: 'bluetooth' | 'file-import' | 'manual' | 'preset';
  capturedAtISO: string;
  restingHrBpm?: number;
  submaxHrBpm?: number;
  hrvMs?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  spo2Pct?: number;
  bodyTempC?: number;
  bloodGlucoseMgDl?: number;
  vo2PeakMlKgMin?: number;
  sleepHours?: number;
  fluidIntakeMl?: number;
  dailyDoseMsv?: number;
}

export type BaselineVerdict = 'normal' | 'borderline' | 'not-normal';

export interface BaselineComparisonItem {
  key: string;
  label: string;
  readingDisplay: string;
  baselineDisplay: string;
  deltaDisplay: string;
  verdict: BaselineVerdict;
  explanation: string;
  targetSystem: SystemId;
}

export interface WearableComparisonResult {
  deviceName: string;
  capturedAtISO: string;
  items: BaselineComparisonItem[];
  normalCount: number;
  borderlineCount: number;
  notNormalCount: number;
  overallStatus: BaselineVerdict;
  summaryText: string;
}

export type ResearchDomainId = HazardCategoryId;

export interface ResearchParameterRow {
  id: string;
  domainId: ResearchDomainId;
  domainLabel: string;
  subSection: string;
  monitorTopic: string;
  currentReading: string;
  baselineTarget: string;
  severity: AlertSeverity;
  triggerClass: TriggerClassification;
  standardCitation?: string;
  whenAppAlerts: string;
  whatAlertMayShow: string;
  whatAppDoes: string;
  dataSourceUpdate: string;
  linkedSystemId?: SystemId;
  linkedTab?: NavTab;
  actionableSteps?: [string, string, string];
}

export interface AlertClassificationSpec {
  id: string;
  label: string;
  appBadge: TriggerClassification;
  definition: string;
  authorityBoundary: string;
}

export interface RoutinePromptItem {
  id: string;
  title: string;
  plainInstruction: string;
  whyItMatters: string;
  xpReward: number;
  priority: 'due-now' | 'routine' | 'completed';
  statusColor: AlertSeverity;
  cadenceLabel: string;
  targetTab?: NavTab;
  targetSystem?: SystemId;
  actionId?: string;
}

export interface GamificationBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressText: string;
}

export interface GamificationState {
  xp: number;
  completedPromptIds: string[];
  lastAwardLabel: string | null;
}
