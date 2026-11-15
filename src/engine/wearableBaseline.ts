import {
  AstronautBaseline,
  BaselineComparisonItem,
  BaselineVerdict,
  DailyTelemetryEntry,
  EnvironmentConfig,
  WearableComparisonResult,
  WearableReadingPayload,
} from '../types/telemetry';

export interface WearablePreset {
  id: string;
  deviceName: string;
  subtitle: string;
  payload: WearableReadingPayload;
}

export const WEARABLE_PRESETS: WearablePreset[] = [
  {
    id: 'apple-watch-normal',
    deviceName: 'Apple Watch Ultra 2',
    subtitle: 'Normal resting vitals & solid sleep',
    payload: {
      deviceName: 'Apple Watch Ultra 2',
      sourceType: 'preset',
      capturedAtISO: new Date().toISOString(),
      restingHrBpm: 63,
      submaxHrBpm: 131,
      hrvMs: 54,
      spo2Pct: 99,
      bodyTempC: 36.7,
      vo2PeakMlKgMin: 41.2,
      sleepHours: 7.8,
      fluidIntakeMl: 2580,
    },
  },
  {
    id: 'garmin-dehydration',
    deviceName: 'Garmin Tactix 7',
    subtitle: 'Elevated HR drift & low hydration',
    payload: {
      deviceName: 'Garmin Tactix 7',
      sourceType: 'preset',
      capturedAtISO: new Date().toISOString(),
      restingHrBpm: 79,
      submaxHrBpm: 149,
      hrvMs: 32,
      spo2Pct: 96,
      bodyTempC: 37.3,
      vo2PeakMlKgMin: 37.4,
      sleepHours: 6.1,
      fluidIntakeMl: 1750,
    },
  },
  {
    id: 'nasa-biomonitor-alert',
    deviceName: 'NASA Bio-Monitor + CGM',
    subtitle: 'Fever, low SpO2 & low blood sugar alert',
    payload: {
      deviceName: 'NASA Bio-Monitor + CGM',
      sourceType: 'preset',
      capturedAtISO: new Date().toISOString(),
      restingHrBpm: 92,
      submaxHrBpm: 158,
      hrvMs: 24,
      bpSystolic: 142,
      bpDiastolic: 91,
      spo2Pct: 91,
      bodyTempC: 38.2,
      bloodGlucoseMgDl: 62,
      sleepHours: 5.4,
      fluidIntakeMl: 1920,
    },
  },
  {
    id: 'oura-recovery',
    deviceName: 'Oura Ring Gen 4',
    subtitle: 'Short sleep & mild recovery dip',
    payload: {
      deviceName: 'Oura Ring Gen 4',
      sourceType: 'preset',
      capturedAtISO: new Date().toISOString(),
      restingHrBpm: 74,
      hrvMs: 31,
      bodyTempC: 37.5,
      spo2Pct: 97,
      sleepHours: 5.2,
    },
  },
];

/**
 * Official Bluetooth SIG GATT Heart Rate Measurement (0x2A37) parser.
 * Bit 0 of flags byte: 0 = UINT8 HR value, 1 = UINT16 HR value.
 */
export function parseBleHeartRateMeasurement(value: DataView): number {
  const flags = value.getUint8(0);
  const isUint16 = (flags & 0x01) !== 0;
  return isUint16 ? value.getUint16(1, true) : value.getUint8(1);
}

/**
 * Converts the latest daily telemetry entry + sleep vault into a wearable reading snapshot.
 */
export function readingFromTelemetry(
  latest: DailyTelemetryEntry,
  latestSleepHours?: number
): WearableReadingPayload {
  return {
    deviceName: latest.wearableSource ?? 'NASA Bio-Monitor + Watch',
    sourceType: 'manual',
    capturedAtISO: latest.wearableLastSyncISO ?? new Date().toISOString(),
    restingHrBpm: latest.restingHrBpm,
    submaxHrBpm: latest.submaxHrBpm,
    hrvMs: latest.hrvMs ?? 48,
    bpSystolic: latest.bpSystolic,
    bpDiastolic: latest.bpDiastolic,
    spo2Pct: latest.spo2Pct ?? 98,
    bodyTempC: latest.bodyTempC ?? 36.8,
    bloodGlucoseMgDl: latest.bloodGlucoseMgDl ?? 96,
    vo2PeakMlKgMin: latest.vo2PeakMlKgMin,
    sleepHours: latestSleepHours ?? 6.4,
    fluidIntakeMl: latest.fluidIntakeMl,
    dailyDoseMsv: latest.dailyDoseMsv,
  };
}

/**
 * Compares incoming readings from any wearable device against the astronaut's personal baseline.
 */
export function compareReadingToBaseline(
  reading: WearableReadingPayload,
  baseline: AstronautBaseline,
  env: EnvironmentConfig
): WearableComparisonResult {
  const items: BaselineComparisonItem[] = [];

  if (reading.restingHrBpm !== undefined) {
    const val = reading.restingHrBpm;
    const [minHr, maxHr] = baseline.restingHrRange;
    const mid = Math.round((minHr + maxHr) / 2);
    const diff = val - mid;
    let verdict: BaselineVerdict = 'normal';
    let explanation = 'Matches your normal resting heart rate.';

    if (val > maxHr + 10 || val < minHr - 8) {
      verdict = 'not-normal';
      explanation =
        val > maxHr
          ? 'Significantly faster than your baseline — hydrate and rest before exertion.'
          : 'Unusually low vs. your baseline — verify wearable strap & check dizziness.';
    } else if (val > maxHr || val < minHr) {
      verdict = 'borderline';
      explanation = 'Slightly outside your resting baseline — monitor hydration & sleep.';
    }

    items.push({
      key: 'restingHr',
      label: 'Resting Heart Rate',
      readingDisplay: `${Math.round(val)} bpm`,
      baselineDisplay: `${minHr}–${maxHr} bpm`,
      deltaDisplay: `${diff >= 0 ? '+' : ''}${Math.round(diff)} vs mid`,
      verdict,
      explanation,
      targetSystem: 'cardio',
    });
  }

  if (reading.spo2Pct !== undefined) {
    const val = reading.spo2Pct;
    const diff = val - baseline.spo2MinPct;
    let verdict: BaselineVerdict = 'normal';
    let explanation = 'Healthy blood oxygen level.';
    if (val < 92) {
      verdict = 'not-normal';
      explanation = 'Too low (< 92%) — re-seat sensor & check cabin O2/CO2 immediately.';
    } else if (val < baseline.spo2MinPct) {
      verdict = 'borderline';
      explanation = 'Slightly below 95% target — re-check finger/wrist sensor fit.';
    }

    items.push({
      key: 'spo2',
      label: 'Blood Oxygen (SpO2)',
      readingDisplay: `${val.toFixed(0)}%`,
      baselineDisplay: `>= ${baseline.spo2MinPct}%`,
      deltaDisplay: diff >= 0 ? 'Within range' : `${diff.toFixed(0)}% below min`,
      verdict,
      explanation,
      targetSystem: 'cardio',
    });
  }

  if (reading.bodyTempC !== undefined) {
    const val = reading.bodyTempC;
    const [minT, maxT] = baseline.bodyTempCRange;
    let verdict: BaselineVerdict = 'normal';
    let explanation = 'Body temperature is steady.';
    if (val >= 38.0 || val <= 35.2) {
      verdict = 'not-normal';
      explanation =
        val >= 38.0
          ? 'Fever range (>= 38.0°C) — rest, hydrate, and alert crew medical officer.'
          : 'Unusually cool core temp — warm up and confirm reading.';
    } else if (val > maxT || val < minT) {
      verdict = 'borderline';
      explanation = 'Slightly elevated vs. your baseline — check again in 30 min.';
    }

    items.push({
      key: 'bodyTemp',
      label: 'Body Temperature',
      readingDisplay: `${val.toFixed(1)}°C`,
      baselineDisplay: `${minT.toFixed(1)}–${maxT.toFixed(1)}°C`,
      deltaDisplay:
        val > maxT
          ? `+${(val - maxT).toFixed(1)}°C above`
          : val < minT
            ? `-${(minT - val).toFixed(1)}°C below`
            : 'In range',
      verdict,
      explanation,
      targetSystem: 'nutrition-hydration',
    });
  }

  if (reading.bloodGlucoseMgDl !== undefined) {
    const val = reading.bloodGlucoseMgDl;
    const [minG, maxG] = baseline.bloodGlucoseMgDlRange;
    let verdict: BaselineVerdict = 'normal';
    let explanation = 'Blood sugar is in a safe energy zone.';
    if (val < 65 || val > 180) {
      verdict = 'not-normal';
      explanation =
        val < 65
          ? 'Low blood sugar — eat a quick carb + protein ration right away.'
          : 'High blood sugar — drink plain water and re-check after rest.';
    } else if (val < minG || val > maxG) {
      verdict = 'borderline';
      explanation = 'Slightly outside your usual range — balance meal & fluids.';
    }

    items.push({
      key: 'glucose',
      label: 'Blood Sugar',
      readingDisplay: `${Math.round(val)} mg/dL`,
      baselineDisplay: `${minG}–${maxG} mg/dL`,
      deltaDisplay:
        val < minG
          ? `${Math.round(val - minG)} below`
          : val > maxG
            ? `+${Math.round(val - maxG)} above`
            : 'In range',
      verdict,
      explanation,
      targetSystem: 'nutrition-hydration',
    });
  }

  if (reading.bpSystolic !== undefined && reading.bpDiastolic !== undefined) {
    const sys = reading.bpSystolic;
    const dia = reading.bpDiastolic;
    const [minS, maxS] = baseline.systolicRange;
    const [minD, maxD] = baseline.diastolicRange;
    let verdict: BaselineVerdict = 'normal';
    let explanation = 'Blood pressure is normal for you.';

    if (sys >= 140 || dia >= 90 || sys < 88) {
      verdict = 'not-normal';
      explanation = 'Outside safe threshold — sit calmly and retake while seated at heart level.';
    } else if (sys < minS || sys > maxS || dia < minD || dia > maxD) {
      verdict = 'borderline';
      explanation = 'Slightly off your pre-flight range — check posture & hydration.';
    }

    items.push({
      key: 'bp',
      label: 'Blood Pressure',
      readingDisplay: `${Math.round(sys)}/${Math.round(dia)}`,
      baselineDisplay: `${minS}–${maxS}/${minD}–${maxD}`,
      deltaDisplay: verdict === 'normal' ? 'In range' : 'Off baseline',
      verdict,
      explanation,
      targetSystem: 'cardio',
    });
  }

  if (reading.hrvMs !== undefined) {
    const val = reading.hrvMs;
    const diff = val - baseline.hrvMinMs;
    let verdict: BaselineVerdict = 'normal';
    let explanation = 'Good nervous-system recovery.';
    if (val < baseline.hrvMinMs * 0.65) {
      verdict = 'not-normal';
      explanation = 'Low recovery score — prioritize sleep & lighter load today.';
    } else if (val < baseline.hrvMinMs) {
      verdict = 'borderline';
      explanation = 'Recovery is slightly dipped — focus on fluids & rest.';
    }

    items.push({
      key: 'hrv',
      label: 'HRV Recovery',
      readingDisplay: `${Math.round(val)} ms`,
      baselineDisplay: `>= ${baseline.hrvMinMs} ms`,
      deltaDisplay: diff >= 0 ? `+${Math.round(diff)} ms` : `${Math.round(diff)} ms`,
      verdict,
      explanation,
      targetSystem: 'cardio',
    });
  }

  if (reading.submaxHrBpm !== undefined) {
    const val = reading.submaxHrBpm;
    const diff = val - baseline.submaxHrBpm;
    let verdict: BaselineVerdict = 'normal';
    let explanation = 'Workout heart effort matches baseline.';
    if (diff >= 15) {
      verdict = 'not-normal';
      explanation = 'Heart working much harder than baseline for same exercise.';
    } else if (diff >= 8) {
      verdict = 'borderline';
      explanation = 'Heart beating faster than normal during exercise — drink 500 mL water.';
    }

    items.push({
      key: 'submaxHr',
      label: 'Workout Heart Rate',
      readingDisplay: `${Math.round(val)} bpm`,
      baselineDisplay: `~${baseline.submaxHrBpm} bpm`,
      deltaDisplay: `${diff >= 0 ? '+' : ''}${Math.round(diff)} bpm`,
      verdict,
      explanation,
      targetSystem: 'cardio',
    });
  }

  if (reading.sleepHours !== undefined) {
    const val = reading.sleepHours;
    const diff = val - baseline.sleepTargetHours;
    let verdict: BaselineVerdict = 'normal';
    let explanation = 'Meeting your personal sleep goal.';
    if (val < 6.0) {
      verdict = 'not-normal';
      explanation = 'Short sleep (< 6h) — avoid high-risk spacewalks or run a focus check.';
    } else if (val < baseline.sleepTargetHours - 0.8) {
      verdict = 'borderline';
      explanation = `Below your ${baseline.sleepTargetHours.toFixed(1)}h goal — protect your next sleep window.`;
    }

    items.push({
      key: 'sleep',
      label: 'Sleep Duration',
      readingDisplay: `${val.toFixed(1)} hrs`,
      baselineDisplay: `${baseline.sleepTargetHours.toFixed(1)} hrs`,
      deltaDisplay: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} hrs`,
      verdict,
      explanation,
      targetSystem: 'vision-sans',
    });
  }

  if (reading.vo2PeakMlKgMin !== undefined) {
    const val = reading.vo2PeakMlKgMin;
    const pct = (val / baseline.vo2PeakMlKgMin) * 100;
    let verdict: BaselineVerdict = 'normal';
    let explanation = 'Aerobic fitness supports mission spacewalk floor.';
    if (pct < 80 || val < env.evaVo2Floor) {
      verdict = 'not-normal';
      explanation = `Below EVA floor (${env.evaVo2Floor} ml/kg) — schedule full cardio sessions.`;
    } else if (pct < 86) {
      verdict = 'borderline';
      explanation = 'Trending closer to EVA minimum — stay consistent on bike/treadmill.';
    }

    items.push({
      key: 'vo2',
      label: 'VO2 Aerobic Fitness',
      readingDisplay: `${val.toFixed(1)} ml/kg`,
      baselineDisplay: `${(baseline.vo2PeakMlKgMin * 0.8).toFixed(1)}+ ml/kg`,
      deltaDisplay: `${pct.toFixed(0)}% of base`,
      verdict,
      explanation,
      targetSystem: 'cardio',
    });
  }

  if (reading.fluidIntakeMl !== undefined) {
    const val = reading.fluidIntakeMl;
    const pct = (val / baseline.fluidTargetMl) * 100;
    let verdict: BaselineVerdict = 'normal';
    let explanation = 'Hydration protects kidneys from stones.';
    if (pct < 75) {
      verdict = 'not-normal';
      explanation = 'Low fluid intake — drink 500 mL water now to protect kidneys.';
    } else if (pct < 90) {
      verdict = 'borderline';
      explanation = 'Slightly behind your 2,500 mL hydration target.';
    }

    items.push({
      key: 'hydration',
      label: 'Fluid Intake',
      readingDisplay: `${Math.round(val)} mL`,
      baselineDisplay: `${baseline.fluidTargetMl} mL`,
      deltaDisplay: `${pct.toFixed(0)}% of goal`,
      verdict,
      explanation,
      targetSystem: 'nutrition-hydration',
    });
  }

  const normalCount = items.filter((i) => i.verdict === 'normal').length;
  const borderlineCount = items.filter((i) => i.verdict === 'borderline').length;
  const notNormalCount = items.filter((i) => i.verdict === 'not-normal').length;

  const overallStatus: BaselineVerdict =
    notNormalCount > 0 ? 'not-normal' : borderlineCount > 0 ? 'borderline' : 'normal';

  const summaryText =
    notNormalCount > 0
      ? `${notNormalCount} reading${notNormalCount > 1 ? 's' : ''} outside safe baseline — action needed.`
      : borderlineCount > 0
        ? `${borderlineCount} reading${borderlineCount > 1 ? 's' : ''} slightly off baseline — keep watch.`
        : `All ${normalCount} wearable readings match your healthy baseline.`;

  return {
    deviceName: reading.deviceName,
    capturedAtISO: reading.capturedAtISO,
    items,
    normalCount,
    borderlineCount,
    notNormalCount,
    overallStatus,
    summaryText,
  };
}

/**
 * Universal parser for JSON, CSV, Apple Health XML, or plain text from any wearable export.
 */
export function parseWearableFileOrText(
  rawText: string,
  fileName = 'Wearable Import'
): WearableReadingPayload | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const basePayload: WearableReadingPayload = {
    deviceName: fileName.replace(/\.[^.]+$/, '') || 'Connected Wearable',
    sourceType: 'file-import',
    capturedAtISO: new Date().toISOString(),
  };

  // 1. JSON Format (flat or nested array/object)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const record: Record<string, unknown> = Array.isArray(parsed)
        ? (parsed[parsed.length - 1] ?? {})
        : parsed.latest ?? parsed.data ?? parsed.metrics ?? parsed;

      const pickNum = (keys: string[]): number | undefined => {
        for (const k of keys) {
          for (const recKey of Object.keys(record)) {
            if (recKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k) {
              const num = Number(record[recKey]);
              if (Number.isFinite(num)) return num;
            }
          }
        }
        return undefined;
      };

      const mapped: WearableReadingPayload = {
        ...basePayload,
        deviceName:
          typeof record.device === 'string'
            ? record.device
            : typeof record.deviceName === 'string'
              ? record.deviceName
              : basePayload.deviceName,
        restingHrBpm: pickNum(['restinghr', 'restinghrbpm', 'restingheartrate', 'rhr', 'hr', 'heartrate', 'bpm', 'pulse']),
        submaxHrBpm: pickNum(['submaxhr', 'submaxhrbpm', 'workouthr', 'exercisehr']),
        hrvMs: pickNum(['hrv', 'hrvms', 'rmssd', 'sdnn']),
        bpSystolic: pickNum(['bpsystolic', 'systolic', 'bpsys', 'sbp']),
        bpDiastolic: pickNum(['bpdiastolic', 'diastolic', 'bpdia', 'dbp']),
        spo2Pct: pickNum(['spo2', 'spo2pct', 'bloodoxygen', 'oxygensaturation', 'o2']),
        bodyTempC: pickNum(['bodytemp', 'bodytempc', 'temp', 'temperature', 'skintemp']),
        bloodGlucoseMgDl: pickNum(['bloodglucose', 'bloodglucosemgdl', 'glucose', 'bloodsugar', 'sugar']),
        vo2PeakMlKgMin: pickNum(['vo2', 'vo2max', 'vo2peak', 'vo2peakmlkgmin']),
        sleepHours: pickNum(['sleep', 'sleephours', 'sleephrs', 'sleepduration']),
        fluidIntakeMl: pickNum(['fluidintakeml', 'hydration', 'water', 'waterml', 'fluidsml']),
        dailyDoseMsv: pickNum(['dailydosemsv', 'radiation', 'dose', 'msv']),
      };

      if (hasAnyMetric(mapped)) return mapped;
    } catch {
      // Fall through to CSV / text parser
    }
  }

  // 2. Apple Health XML snippets
  if (trimmed.includes('<Record') || trimmed.includes('HKQuantityTypeIdentifier')) {
    const extractLatestXml = (identifier: string): number | undefined => {
      const regex = new RegExp(`${identifier}[^>]*value=["']([0-9.]+)["']`, 'gi');
      let match: RegExpExecArray | null;
      let lastVal: number | undefined;
      while ((match = regex.exec(trimmed)) !== null) {
        const n = Number(match[1]);
        if (Number.isFinite(n)) lastVal = n;
      }
      return lastVal;
    };

    const rawSpo2 = extractLatestXml('HKQuantityTypeIdentifierOxygenSaturation');
    const mapped: WearableReadingPayload = {
      ...basePayload,
      deviceName: 'Apple Health Export',
      restingHrBpm:
        extractLatestXml('HKQuantityTypeIdentifierRestingHeartRate') ??
        extractLatestXml('HKQuantityTypeIdentifierHeartRate'),
      hrvMs: extractLatestXml('HKQuantityTypeIdentifierHeartRateVariabilitySDNN'),
      spo2Pct: rawSpo2 !== undefined ? (rawSpo2 <= 1 ? Math.round(rawSpo2 * 100) : rawSpo2) : undefined,
      bodyTempC: extractLatestXml('HKQuantityTypeIdentifierBodyTemperature'),
      bloodGlucoseMgDl: extractLatestXml('HKQuantityTypeIdentifierBloodGlucose'),
      bpSystolic: extractLatestXml('HKQuantityTypeIdentifierBloodPressureSystolic'),
      bpDiastolic: extractLatestXml('HKQuantityTypeIdentifierBloodPressureDiastolic'),
      vo2PeakMlKgMin: extractLatestXml('HKQuantityTypeIdentifierVO2Max'),
    };
    if (hasAnyMetric(mapped)) return mapped;
  }

  // 3. CSV Format (Header row + 1 or more data rows)
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length >= 2 && lines[0].includes(',') && lines[1].includes(',')) {
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const values = lines[lines.length - 1].split(',').map((v) => v.trim());

    const pickCsv = (aliases: string[]): number | undefined => {
      for (const alias of aliases) {
        const idx = headers.findIndex((h) => h === alias || h.includes(alias));
        if (idx !== -1 && values[idx] !== undefined) {
          const num = Number(values[idx].replace(/[^\d.-]/g, ''));
          if (Number.isFinite(num) && values[idx] !== '') return num;
        }
      }
      return undefined;
    };

    const mapped: WearableReadingPayload = {
      ...basePayload,
      restingHrBpm: pickCsv(['restinghr', 'rhr', 'heartrate', 'hr', 'bpm', 'pulse']),
      submaxHrBpm: pickCsv(['submaxhr', 'workouthr']),
      hrvMs: pickCsv(['hrv', 'rmssd', 'sdnn']),
      bpSystolic: pickCsv(['systolic', 'bpsys', 'sbp']),
      bpDiastolic: pickCsv(['diastolic', 'bpdia', 'dbp']),
      spo2Pct: pickCsv(['spo2', 'oxygen', 'o2sat']),
      bodyTempC: pickCsv(['temp', 'temperature']),
      bloodGlucoseMgDl: pickCsv(['glucose', 'sugar', 'bg']),
      vo2PeakMlKgMin: pickCsv(['vo2']),
      sleepHours: pickCsv(['sleep']),
      fluidIntakeMl: pickCsv(['water', 'fluid', 'hydration']),
      dailyDoseMsv: pickCsv(['dose', 'radiation', 'msv']),
    };

    if (hasAnyMetric(mapped)) return mapped;
  }

  // 4. Free-text / Key-Value log (e.g., "HR: 74, SpO2: 98%, Temp: 36.8C, Glucose: 102, BP: 120/78")
  const matchNum = (re: RegExp): number | undefined => {
    const m = trimmed.match(re);
    if (!m) return undefined;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : undefined;
  };
  const bpMatch = trimmed.match(/(?:bp|blood\s*pressure)?\s*(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})/i);

  const textMapped: WearableReadingPayload = {
    ...basePayload,
    restingHrBpm: matchNum(/\b(?:resting\s*hr|rhr|heart\s*rate|hr|pulse)\b\s*[:=]?\s*(\d{2,3})/i),
    submaxHrBpm: matchNum(/\b(?:submax\s*hr|workout\s*hr|exercise\s*hr)\b\s*[:=]?\s*(\d{2,3})/i),
    hrvMs: matchNum(/\b(?:hrv|rmssd|sdnn)\b\s*[:=]?\s*(\d{2,3})/i),
    bpSystolic: bpMatch ? Number(bpMatch[1]) : undefined,
    bpDiastolic: bpMatch ? Number(bpMatch[2]) : undefined,
    spo2Pct: matchNum(/\b(?:spo2|oxygen|o2)\b\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)/i),
    bodyTempC: matchNum(/\b(?:temp|temperature)\b\s*[:=]?\s*(\d{2}(?:\.\d+)?)/i),
    bloodGlucoseMgDl: matchNum(/\b(?:glucose|blood\s*sugar|sugar)\b\s*[:=]?\s*(\d{2,3})/i),
    vo2PeakMlKgMin: matchNum(/\b(?:vo2|vo2max|vo2peak)\b\s*[:=]?\s*(\d{2}(?:\.\d+)?)/i),
    sleepHours: matchNum(/\b(?:sleep)\b\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)/i),
    fluidIntakeMl: matchNum(/\b(?:water|fluid|hydration)\b\s*[:=]?\s*(\d{3,4})/i),
  };

  return hasAnyMetric(textMapped) ? textMapped : null;
}

function hasAnyMetric(p: WearableReadingPayload): boolean {
  return (
    p.restingHrBpm !== undefined ||
    p.submaxHrBpm !== undefined ||
    p.hrvMs !== undefined ||
    p.bpSystolic !== undefined ||
    p.spo2Pct !== undefined ||
    p.bodyTempC !== undefined ||
    p.bloodGlucoseMgDl !== undefined ||
    p.vo2PeakMlKgMin !== undefined ||
    p.sleepHours !== undefined ||
    p.fluidIntakeMl !== undefined ||
    p.dailyDoseMsv !== undefined
  );
}
