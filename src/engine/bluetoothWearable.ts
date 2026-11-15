import { WearableReadingPayload } from '../types/telemetry';

export type BleScanMode = 'medical' | 'all';

export type BleConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'simulated'
  | 'error';

export interface BleDeviceInfo {
  name: string;
  manufacturer?: string;
  model?: string;
  batteryPct?: number | null;
  supportedServices: string[];
}

export interface BleLiveSnapshot {
  bpm?: number;
  sensorContact?: 'not-supported' | 'not-detected' | 'detected';
  energyExpendedKj?: number;
  rrIntervalsMs: number[];
  hrvMs?: number;
  spo2Pct?: number;
  bodyTempC?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  bloodGlucoseMgDl?: number;
  packetCount: number;
  lastPacketISO: string | null;
  recentBpmSeries: number[];
}

export interface BluetoothEnvironmentCheck {
  supported: boolean;
  isSecureContext: boolean;
  inIframe: boolean;
  availabilityKnown: boolean;
  adapterAvailable: boolean;
  reason?: string;
}

export const BLE_STANDARD_SERVICES = {
  HEART_RATE: 'heart_rate',
  HEALTH_THERMOMETER: 'health_thermometer',
  BLOOD_PRESSURE: 'blood_pressure',
  PULSE_OXIMETER: 'pulse_oximeter',
  GLUCOSE: 'glucose',
  BATTERY: 'battery_service',
  DEVICE_INFO: 'device_information',
  WEIGHT_SCALE: 'weight_scale',
  FITNESS_MACHINE: 'fitness_machine',
  RUNNING_SPEED: 'running_speed_and_cadence',
  CYCLING_SPEED: 'cycling_speed_and_cadence',
  CYCLING_POWER: 'cycling_power',
} as const;

export const BLE_OPTIONAL_SERVICES: string[] = [
  'heart_rate',
  'health_thermometer',
  'blood_pressure',
  'pulse_oximeter',
  'glucose',
  'battery_service',
  'device_information',
  'weight_scale',
  'fitness_machine',
  'running_speed_and_cadence',
  'cycling_speed_and_cadence',
  'cycling_power',
  '0000fee0-0000-1000-8000-00805f9b34fb', // Xiaomi / Amazfit Mi Band primary service
  '0000fee1-0000-1000-8000-00805f9b34fb',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART service (wearable telemetry)
];

/**
 * Checks whether Chrome/Edge Web Bluetooth APIs are available in the current context.
 */
export async function checkBluetoothEnvironment(): Promise<BluetoothEnvironmentCheck> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supported: false,
      isSecureContext: false,
      inIframe: false,
      availabilityKnown: false,
      adapterAvailable: false,
      reason: 'Browser window context unavailable.',
    };
  }

  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const isSecureContext = window.isSecureContext;
  const nav = navigator as unknown as {
    bluetooth?: {
      requestDevice: unknown;
      getAvailability?: () => Promise<boolean>;
    };
  };

  if (!nav.bluetooth || typeof nav.bluetooth.requestDevice !== 'function') {
    return {
      supported: false,
      isSecureContext,
      inIframe,
      availabilityKnown: false,
      adapterAvailable: false,
      reason:
        'Web Bluetooth API is not available in this browser. Use Google Chrome or Microsoft Edge (HTTPS / localhost).',
    };
  }

  let availabilityKnown = false;
  let adapterAvailable = true;
  if (typeof nav.bluetooth.getAvailability === 'function') {
    try {
      adapterAvailable = await nav.bluetooth.getAvailability();
      availabilityKnown = true;
    } catch {
      availabilityKnown = false;
    }
  }

  return {
    supported: true,
    isSecureContext,
    inIframe,
    availabilityKnown,
    adapterAvailable,
    reason: !adapterAvailable
      ? 'Bluetooth radio unavailable or disallowed by host permissions policy.'
      : undefined,
  };
}

/**
 * Decodes IEEE-11073 16-bit SFLOAT (used by Pulse Oximeter, Blood Pressure, Glucose GATT specs).
 */
export function decodeSfloat16(raw: number): number | undefined {
  // Special NaN / NRes / +-INF reserved values
  if (raw === 0x07ff || raw === 0x0800 || raw === 0x07fe || raw === 0x0802 || raw === 0x0801) {
    return undefined;
  }
  let mantissa = raw & 0x0fff;
  if (mantissa >= 0x0800) mantissa = mantissa - 0x1000;
  let exponent = (raw >> 12) & 0x0f;
  if (exponent >= 0x08) exponent = exponent - 0x10;
  return mantissa * Math.pow(10, exponent);
}

/**
 * Decodes IEEE-11073 32-bit FLOAT (used by Health Thermometer 0x2A1C GATT spec).
 */
export function decodeFloat32(rawUint32: number): number | undefined {
  if (rawUint32 === 0x007fffff || rawUint32 === 0x00800000 || rawUint32 === 0x007ffffe || rawUint32 === 0x00800002) {
    return undefined;
  }
  let mantissa = rawUint32 & 0x00ffffff;
  if (mantissa >= 0x00800000) mantissa = mantissa - 0x01000000;
  let exponent = (rawUint32 >> 24) & 0xff;
  if (exponent >= 0x80) exponent = exponent - 0x100;
  return mantissa * Math.pow(10, exponent);
}

/**
 * Official Bluetooth SIG GATT Heart Rate Measurement (0x2A37) full binary decoder:
 * - Heart Rate (UINT8 or UINT16)
 * - Sensor Contact Status (bits 1-2)
 * - Energy Expended (bit 3)
 * - RR Intervals (bit 4, units of 1/1024 s -> converted to ms)
 */
export function decodeHeartRateMeasurement(value: DataView): {
  bpm: number;
  sensorContact: 'not-supported' | 'not-detected' | 'detected';
  energyExpendedKj?: number;
  rrIntervalsMs: number[];
} {
  if (value.byteLength < 2) {
    return { bpm: 0, sensorContact: 'not-supported', rrIntervalsMs: [] };
  }

  const flags = value.getUint8(0);
  const isUint16 = (flags & 0x01) !== 0;
  const contactBits = (flags >> 1) & 0x03;
  const sensorContact: 'not-supported' | 'not-detected' | 'detected' =
    contactBits === 2
      ? 'not-detected'
      : contactBits === 3
        ? 'detected'
        : 'not-supported';
  const hasEnergyExpended = (flags & 0x08) !== 0;
  const hasRrIntervals = (flags & 0x10) !== 0;

  let offset = 1;
  const bpm = isUint16 && value.byteLength >= 3 ? value.getUint16(offset, true) : value.getUint8(offset);
  offset += isUint16 ? 2 : 1;

  let energyExpendedKj: number | undefined;
  if (hasEnergyExpended && offset + 2 <= value.byteLength) {
    energyExpendedKj = value.getUint16(offset, true);
    offset += 2;
  }

  const rrIntervalsMs: number[] = [];
  if (hasRrIntervals) {
    while (offset + 2 <= value.byteLength) {
      const rrRaw = value.getUint16(offset, true);
      const rrMs = Math.round((rrRaw / 1024) * 1000);
      if (rrMs > 250 && rrMs < 2500) {
        rrIntervalsMs.push(rrMs);
      }
      offset += 2;
    }
  }

  return { bpm, sensorContact, energyExpendedKj, rrIntervalsMs };
}

/**
 * Computes HRV (RMSSD in milliseconds) from a sliding window of RR intervals.
 */
export function computeRmssdMs(rrIntervalsMs: number[]): number | undefined {
  if (rrIntervalsMs.length < 3) return undefined;
  let sumSqDiff = 0;
  let count = 0;
  for (let i = 1; i < rrIntervalsMs.length; i++) {
    const diff = rrIntervalsMs[i] - rrIntervalsMs[i - 1];
    // Reject obvious artifact spikes > 300 ms
    if (Math.abs(diff) <= 300) {
      sumSqDiff += diff * diff;
      count += 1;
    }
  }
  if (count === 0) return undefined;
  return Math.round(Math.sqrt(sumSqDiff / count));
}

/**
 * Decodes Bluetooth SIG Temperature Measurement (0x2A1C) in Celsius.
 */
export function decodeTemperatureMeasurement(value: DataView): number | undefined {
  if (value.byteLength < 5) return undefined;
  const flags = value.getUint8(0);
  const isFahrenheit = (flags & 0x01) !== 0;
  const rawFloat = value.getUint32(1, true);
  const temp = decodeFloat32(rawFloat);
  if (temp === undefined) return undefined;
  const celsius = isFahrenheit ? ((temp - 32) * 5) / 9 : temp;
  return Number(celsius.toFixed(1));
}

/**
 * Decodes Bluetooth SIG Blood Pressure Measurement (0x2A35) into mmHg + optional pulse.
 */
export function decodeBloodPressureMeasurement(value: DataView): {
  systolic?: number;
  diastolic?: number;
  map?: number;
  pulseBpm?: number;
} {
  if (value.byteLength < 7) return {};
  const flags = value.getUint8(0);
  const isKpa = (flags & 0x01) !== 0;
  const hasTimestamp = (flags & 0x02) !== 0;
  const hasPulse = (flags & 0x04) !== 0;

  const toMmHg = (v: number | undefined) =>
    v === undefined ? undefined : Math.round(isKpa ? v * 7.50062 : v);

  const systolic = toMmHg(decodeSfloat16(value.getUint16(1, true)));
  const diastolic = toMmHg(decodeSfloat16(value.getUint16(3, true)));
  const map = toMmHg(decodeSfloat16(value.getUint16(5, true)));

  let offset = 7;
  if (hasTimestamp) offset += 7;
  let pulseBpm: number | undefined;
  if (hasPulse && offset + 2 <= value.byteLength) {
    const rawPulse = decodeSfloat16(value.getUint16(offset, true));
    if (rawPulse !== undefined) pulseBpm = Math.round(rawPulse);
  }

  return { systolic, diastolic, map, pulseBpm };
}

/**
 * Decodes Bluetooth SIG Pulse Oximeter Spot-Check (0x2A5E) or Continuous (0x2A5F).
 */
export function decodePulseOximeterMeasurement(value: DataView): {
  spo2Pct?: number;
  pulseBpm?: number;
} {
  if (value.byteLength < 5) return {};
  const spo2 = decodeSfloat16(value.getUint16(1, true));
  const pr = decodeSfloat16(value.getUint16(3, true));
  return {
    spo2Pct: spo2 !== undefined && spo2 >= 50 && spo2 <= 100 ? Math.round(spo2) : undefined,
    pulseBpm: pr !== undefined && pr >= 25 && pr <= 250 ? Math.round(pr) : undefined,
  };
}

/**
 * Decodes Bluetooth SIG Glucose Measurement (0x2A18) to mg/dL.
 */
export function decodeGlucoseMeasurement(value: DataView): number | undefined {
  if (value.byteLength < 12) return undefined;
  const flags = value.getUint8(0);
  const hasTimeOffset = (flags & 0x01) !== 0;
  const hasConcTypeLoc = (flags & 0x02) !== 0;
  const isMolPerL = (flags & 0x04) !== 0;

  if (!hasConcTypeLoc) return undefined;
  let offset = 10; // flags(1) + seq(2) + baseTime(7)
  if (hasTimeOffset) offset += 2;
  if (offset + 2 > value.byteLength) return undefined;

  const rawConc = decodeSfloat16(value.getUint16(offset, true));
  if (rawConc === undefined) return undefined;

  // Bluetooth SIG default: kg/L -> * 100,000 = mg/dL; mol/L -> * 18,016 = mg/dL
  const mgDl = isMolPerL ? rawConc * 18016 : rawConc * 100000;
  if (mgDl < 20 || mgDl > 600) return undefined;
  return Math.round(mgDl);
}

/**
 * Encodes an authentic binary Bluetooth SIG Heart Rate Measurement (0x2A37) packet
 * (including UINT8 HR + RR intervals) so the GATT loopback tester uses the exact
 * same binary DataView decoder path as real hardware.
 */
export function encodeHeartRateGattPacket(bpm: number, rrMsValues: number[]): DataView {
  const bytes = new Uint8Array(2 + rrMsValues.length * 2);
  // Flags: bit0=0 (UINT8), bits1-2=3 (contact detected), bit4=1 (RR intervals present) -> 0x16
  bytes[0] = rrMsValues.length > 0 ? 0x16 : 0x06;
  bytes[1] = Math.max(30, Math.min(240, Math.round(bpm)));
  const view = new DataView(bytes.buffer);
  rrMsValues.forEach((rrMs, idx) => {
    const rawRr = Math.round((rrMs * 1024) / 1000);
    view.setUint16(2 + idx * 2, rawRr, true);
  });
  return view;
}

/**
 * Encodes an authentic binary Bluetooth SIG Pulse Oximeter Continuous (0x2A5F) packet.
 */
export function encodePulseOxGattPacket(spo2Pct: number, pulseBpm: number): DataView {
  const buf = new ArrayBuffer(5);
  const view = new DataView(buf);
  view.setUint8(0, 0x00);
  // SFLOAT with exponent 0: mantissa in low 12 bits
  view.setUint16(1, Math.round(spo2Pct) & 0x0fff, true);
  view.setUint16(3, Math.round(pulseBpm) & 0x0fff, true);
  return view;
}

/**
 * Encodes an authentic binary Bluetooth SIG Health Thermometer (0x2A1C) packet in Celsius.
 */
export function encodeTemperatureGattPacket(celsius: number): DataView {
  const buf = new ArrayBuffer(5);
  const view = new DataView(buf);
  view.setUint8(0, 0x00); // Celsius
  const mantissa = Math.round(celsius * 10) & 0x00ffffff;
  const exponent = 0xff; // -1 in two's complement int8
  const rawFloat = (exponent << 24) | mantissa;
  view.setUint32(1, rawFloat >>> 0, true);
  return view;
}

/**
 * Converts a live BLE snapshot + device info into a WearableReadingPayload for baseline evaluation.
 */
export function payloadFromBleSnapshot(
  deviceName: string,
  snapshot: BleLiveSnapshot
): WearableReadingPayload {
  return {
    deviceName,
    sourceType: 'bluetooth',
    capturedAtISO: snapshot.lastPacketISO ?? new Date().toISOString(),
    restingHrBpm: snapshot.bpm,
    hrvMs: snapshot.hrvMs,
    spo2Pct: snapshot.spo2Pct,
    bodyTempC: snapshot.bodyTempC,
    bpSystolic: snapshot.bpSystolic,
    bpDiastolic: snapshot.bpDiastolic,
    bloodGlucoseMgDl: snapshot.bloodGlucoseMgDl,
  };
}
