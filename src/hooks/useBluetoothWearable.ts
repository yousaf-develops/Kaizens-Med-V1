import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BleConnectionStatus,
  BleDeviceInfo,
  BleLiveSnapshot,
  BleScanMode,
  BluetoothEnvironmentCheck,
  BLE_OPTIONAL_SERVICES,
  BLE_STANDARD_SERVICES,
  checkBluetoothEnvironment,
  computeRmssdMs,
  decodeBloodPressureMeasurement,
  decodeGlucoseMeasurement,
  decodeHeartRateMeasurement,
  decodePulseOximeterMeasurement,
  decodeTemperatureMeasurement,
  encodeHeartRateGattPacket,
  encodePulseOxGattPacket,
  encodeTemperatureGattPacket,
  payloadFromBleSnapshot,
} from '../engine/bluetoothWearable';
import { WearableReadingPayload } from '../types/telemetry';

interface WebBluetoothCharacteristic {
  startNotifications: () => Promise<WebBluetoothCharacteristic>;
  stopNotifications?: () => Promise<WebBluetoothCharacteristic>;
  readValue: () => Promise<DataView>;
  addEventListener: (type: string, listener: (ev: Event) => void) => void;
  removeEventListener?: (type: string, listener: (ev: Event) => void) => void;
}

interface WebBluetoothService {
  getCharacteristic: (uuid: string) => Promise<WebBluetoothCharacteristic>;
}

interface WebBluetoothServer {
  connected: boolean;
  disconnect: () => void;
  getPrimaryService: (uuid: string) => Promise<WebBluetoothService>;
}

interface WebBluetoothDevice {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect: () => Promise<WebBluetoothServer>;
    disconnect: () => void;
  };
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface WebBluetoothNavigator {
  bluetooth?: {
    requestDevice: (options: {
      filters?: Array<{ services: string[] }>;
      acceptAllDevices?: boolean;
      optionalServices?: string[];
    }) => Promise<WebBluetoothDevice>;
  };
}

const INITIAL_SNAPSHOT: BleLiveSnapshot = {
  rrIntervalsMs: [],
  packetCount: 0,
  lastPacketISO: null,
  recentBpmSeries: [],
};

export interface UseBluetoothWearableOptions {
  onLiveReading?: (payload: WearableReadingPayload) => void;
}

export function useBluetoothWearable(options: UseBluetoothWearableOptions = {}) {
  const { onLiveReading } = options;
  const onLiveReadingRef = useRef(onLiveReading);
  onLiveReadingRef.current = onLiveReading;

  const [envCheck, setEnvCheck] = useState<BluetoothEnvironmentCheck>({
    supported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    inIframe: false,
    availabilityKnown: false,
    adapterAvailable: true,
  });

  const [status, setStatus] = useState<BleConnectionStatus>('disconnected');
  const [scanMode, setScanMode] = useState<BleScanMode>('medical');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [autoSyncToHud, setAutoSyncToHud] = useState<boolean>(true);
  const [deviceInfo, setDeviceInfo] = useState<BleDeviceInfo | null>(null);
  const [snapshot, setSnapshot] = useState<BleLiveSnapshot>(INITIAL_SNAPSHOT);

  const deviceRef = useRef<WebBluetoothDevice | null>(null);
  const serverRef = useRef<WebBluetoothServer | null>(null);
  const cleanupsRef = useRef<Array<() => void>>([]);
  const simTimerRef = useRef<number | null>(null);
  const rrWindowRef = useRef<number[]>([]);
  const lastAutoSyncAtRef = useRef<number>(0);
  const autoSyncRef = useRef(autoSyncToHud);
  autoSyncRef.current = autoSyncToHud;

  useEffect(() => {
    checkBluetoothEnvironment().then(setEnvCheck);
  }, []);

  const cleanupStreams = useCallback(() => {
    if (simTimerRef.current !== null) {
      window.clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    cleanupsRef.current.forEach((fn) => {
      try {
        fn();
      } catch {
        // Ignore cleanup errors during disconnect
      }
    });
    cleanupsRef.current = [];
  }, []);

  const disconnect = useCallback(() => {
    cleanupStreams();
    try {
      serverRef.current?.disconnect();
    } catch {
      // Ignore already disconnected server
    }
    serverRef.current = null;
    setStatus('disconnected');
    setStatusMessage('Watch unlinked.');
  }, [cleanupStreams]);

  useEffect(() => {
    return () => {
      cleanupStreams();
      try {
        serverRef.current?.disconnect();
      } catch {
        // Ignore
      }
    };
  }, [cleanupStreams]);

  const pushSnapshotUpdate = useCallback(
    (
      devName: string,
      updater: (prev: BleLiveSnapshot) => BleLiveSnapshot,
      forceSync = false
    ) => {
      setSnapshot((prev) => {
        const next = updater(prev);
        const nowMs = Date.now();
        if (autoSyncRef.current && (forceSync || nowMs - lastAutoSyncAtRef.current >= 2200)) {
          lastAutoSyncAtRef.current = nowMs;
          const payload = payloadFromBleSnapshot(devName, next);
          window.setTimeout(() => onLiveReadingRef.current?.(payload), 0);
        }
        return next;
      });
    },
    []
  );

  const attachGattServices = useCallback(
    async (device: WebBluetoothDevice, server: WebBluetoothServer) => {
      cleanupStreams();
      const devName = device.name?.trim() || 'Bluetooth Wearable';
      const foundServices: string[] = [];
      let manufacturer: string | undefined;
      let model: string | undefined;
      let batteryPct: number | null = null;

      // 1. Optional Device Information (0x180A)
      try {
        const infoSvc = await server.getPrimaryService(BLE_STANDARD_SERVICES.DEVICE_INFO);
        foundServices.push('Device Info');
        const decoder = new TextDecoder('utf-8');
        try {
          const mfgChar = await infoSvc.getCharacteristic('manufacturer_name_string');
          manufacturer = decoder.decode(await mfgChar.readValue()).replace(/\0/g, '').trim();
        } catch {
          // Optional
        }
        try {
          const mdlChar = await infoSvc.getCharacteristic('model_number_string');
          model = decoder.decode(await mdlChar.readValue()).replace(/\0/g, '').trim();
        } catch {
          // Optional
        }
      } catch {
        // Not exposed
      }

      // 2. Battery Service (0x180F)
      try {
        const battSvc = await server.getPrimaryService(BLE_STANDARD_SERVICES.BATTERY);
        foundServices.push('Battery');
        const battChar = await battSvc.getCharacteristic('battery_level');
        const battView = await battChar.readValue();
        batteryPct = battView.getUint8(0);
        try {
          await battChar.startNotifications();
          const onBatt = (ev: Event) => {
            const val = (ev.target as unknown as { value?: DataView })?.value;
            if (!val) return;
            const pct = val.getUint8(0);
            setDeviceInfo((prev) => (prev ? { ...prev, batteryPct: pct } : prev));
          };
          battChar.addEventListener('characteristicvaluechanged', onBatt);
          cleanupsRef.current.push(() => {
            battChar.removeEventListener?.('characteristicvaluechanged', onBatt);
            battChar.stopNotifications?.().catch(() => {});
          });
        } catch {
          // Read-only battery is normal
        }
      } catch {
        // Optional
      }

      // 3. Heart Rate Service (0x180D) + RR Intervals -> HRV
      try {
        const hrSvc = await server.getPrimaryService(BLE_STANDARD_SERVICES.HEART_RATE);
        foundServices.push('Heart Rate');
        const hrChar = await hrSvc.getCharacteristic('heart_rate_measurement');
        await hrChar.startNotifications();
        const onHr = (ev: Event) => {
          const val = (ev.target as unknown as { value?: DataView })?.value;
          if (!val) return;
          const decoded = decodeHeartRateMeasurement(val);
          if (decoded.rrIntervalsMs.length > 0) {
            rrWindowRef.current = [
              ...rrWindowRef.current,
              ...decoded.rrIntervalsMs,
            ].slice(-24);
          }
          const hrvMs = computeRmssdMs(rrWindowRef.current);
          pushSnapshotUpdate(devName, (prev) => ({
            ...prev,
            bpm: decoded.bpm > 0 ? decoded.bpm : prev.bpm,
            sensorContact: decoded.sensorContact,
            energyExpendedKj: decoded.energyExpendedKj ?? prev.energyExpendedKj,
            rrIntervalsMs: rrWindowRef.current,
            hrvMs: hrvMs ?? prev.hrvMs,
            packetCount: prev.packetCount + 1,
            lastPacketISO: new Date().toISOString(),
            recentBpmSeries:
              decoded.bpm > 0
                ? [...prev.recentBpmSeries, decoded.bpm].slice(-20)
                : prev.recentBpmSeries,
          }));
        };
        hrChar.addEventListener('characteristicvaluechanged', onHr);
        cleanupsRef.current.push(() => {
          hrChar.removeEventListener?.('characteristicvaluechanged', onHr);
          hrChar.stopNotifications?.().catch(() => {});
        });
      } catch {
        // Device may expose another health service
      }

      // 4. Pulse Oximeter Service (0x1822)
      try {
        const plxSvc = await server.getPrimaryService(BLE_STANDARD_SERVICES.PULSE_OXIMETER);
        foundServices.push('Pulse Oximeter');
        for (const charUuid of ['plx_continuous_measurement', 'plx_spot_check_measurement']) {
          try {
            const plxChar = await plxSvc.getCharacteristic(charUuid);
            await plxChar.startNotifications();
            const onPlx = (ev: Event) => {
              const val = (ev.target as unknown as { value?: DataView })?.value;
              if (!val) return;
              const decoded = decodePulseOximeterMeasurement(val);
              pushSnapshotUpdate(devName, (prev) => ({
                ...prev,
                spo2Pct: decoded.spo2Pct ?? prev.spo2Pct,
                bpm: prev.bpm ?? decoded.pulseBpm,
                packetCount: prev.packetCount + 1,
                lastPacketISO: new Date().toISOString(),
              }));
            };
            plxChar.addEventListener('characteristicvaluechanged', onPlx);
            cleanupsRef.current.push(() => {
              plxChar.removeEventListener?.('characteristicvaluechanged', onPlx);
              plxChar.stopNotifications?.().catch(() => {});
            });
          } catch {
            // Try next char
          }
        }
      } catch {
        // Not exposed
      }

      // 5. Health Thermometer Service (0x1809)
      try {
        const tempSvc = await server.getPrimaryService(BLE_STANDARD_SERVICES.HEALTH_THERMOMETER);
        foundServices.push('Thermometer');
        const tempChar = await tempSvc.getCharacteristic('temperature_measurement');
        await tempChar.startNotifications();
        const onTemp = (ev: Event) => {
          const val = (ev.target as unknown as { value?: DataView })?.value;
          if (!val) return;
          const celsius = decodeTemperatureMeasurement(val);
          if (celsius !== undefined) {
            pushSnapshotUpdate(devName, (prev) => ({
              ...prev,
              bodyTempC: celsius,
              packetCount: prev.packetCount + 1,
              lastPacketISO: new Date().toISOString(),
            }));
          }
        };
        tempChar.addEventListener('characteristicvaluechanged', onTemp);
        cleanupsRef.current.push(() => {
          tempChar.removeEventListener?.('characteristicvaluechanged', onTemp);
          tempChar.stopNotifications?.().catch(() => {});
        });
      } catch {
        // Not exposed
      }

      // 6. Blood Pressure Service (0x1810)
      try {
        const bpSvc = await server.getPrimaryService(BLE_STANDARD_SERVICES.BLOOD_PRESSURE);
        foundServices.push('Blood Pressure');
        const bpChar = await bpSvc.getCharacteristic('blood_pressure_measurement');
        await bpChar.startNotifications();
        const onBp = (ev: Event) => {
          const val = (ev.target as unknown as { value?: DataView })?.value;
          if (!val) return;
          const decoded = decodeBloodPressureMeasurement(val);
          pushSnapshotUpdate(devName, (prev) => ({
            ...prev,
            bpSystolic: decoded.systolic ?? prev.bpSystolic,
            bpDiastolic: decoded.diastolic ?? prev.bpDiastolic,
            bpm: decoded.pulseBpm ?? prev.bpm,
            packetCount: prev.packetCount + 1,
            lastPacketISO: new Date().toISOString(),
          }));
        };
        bpChar.addEventListener('characteristicvaluechanged', onBp);
        cleanupsRef.current.push(() => {
          bpChar.removeEventListener?.('characteristicvaluechanged', onBp);
          bpChar.stopNotifications?.().catch(() => {});
        });
      } catch {
        // Not exposed
      }

      // 7. Glucose Service (0x1808)
      try {
        const gluSvc = await server.getPrimaryService(BLE_STANDARD_SERVICES.GLUCOSE);
        foundServices.push('Glucose');
        const gluChar = await gluSvc.getCharacteristic('glucose_measurement');
        await gluChar.startNotifications();
        const onGlu = (ev: Event) => {
          const val = (ev.target as unknown as { value?: DataView })?.value;
          if (!val) return;
          const mgDl = decodeGlucoseMeasurement(val);
          if (mgDl !== undefined) {
            pushSnapshotUpdate(devName, (prev) => ({
              ...prev,
              bloodGlucoseMgDl: mgDl,
              packetCount: prev.packetCount + 1,
              lastPacketISO: new Date().toISOString(),
            }));
          }
        };
        gluChar.addEventListener('characteristicvaluechanged', onGlu);
        cleanupsRef.current.push(() => {
          gluChar.removeEventListener?.('characteristicvaluechanged', onGlu);
          gluChar.stopNotifications?.().catch(() => {});
        });
      } catch {
        // Not exposed
      }

      setDeviceInfo({
        name: devName,
        manufacturer,
        model,
        batteryPct,
        supportedServices: foundServices,
      });

      if (foundServices.length === 0) {
        setStatus('connected');
        setStatusMessage(
          `Connected to ${devName}, but no health services were broadcast. Enable health sharing on your device or import a file.`
        );
      } else {
        setStatus('connected');
        setStatusMessage(
          `Connected live to ${devName}.`
        );
      }
    },
    [cleanupStreams, pushSnapshotUpdate]
  );

  const connectRealDevice = useCallback(
    async (modeOverride?: BleScanMode) => {
      const mode = modeOverride ?? scanMode;
      const nav = navigator as unknown as WebBluetoothNavigator;
      const check = await checkBluetoothEnvironment();
      setEnvCheck(check);

      if (!nav.bluetooth || !check.supported) {
        setStatus('error');
        setStatusMessage(
          'This browser does not support Bluetooth pairing. Use Chrome or Edge, or use the simulated wearable streams below.'
        );
        return;
      }

      try {
        setStatus('connecting');
        setStatusMessage(
          mode === 'medical'
            ? 'Scanning for nearby health wearables...'
            : 'Scanning for all nearby Bluetooth devices...'
        );

        const requestOptions =
          mode === 'all'
            ? {
                acceptAllDevices: true,
                optionalServices: BLE_OPTIONAL_SERVICES,
              }
            : {
                filters: [
                  { services: [BLE_STANDARD_SERVICES.HEART_RATE] },
                  { services: [BLE_STANDARD_SERVICES.PULSE_OXIMETER] },
                  { services: [BLE_STANDARD_SERVICES.HEALTH_THERMOMETER] },
                  { services: [BLE_STANDARD_SERVICES.BLOOD_PRESSURE] },
                  { services: [BLE_STANDARD_SERVICES.GLUCOSE] },
                  { services: [BLE_STANDARD_SERVICES.FITNESS_MACHINE] },
                ],
                optionalServices: BLE_OPTIONAL_SERVICES,
              };

        const device = await nav.bluetooth.requestDevice(requestOptions);
        deviceRef.current = device;

        const onDisconnected = () => {
          cleanupStreams();
          setStatus('disconnected');
          setStatusMessage(
            `${device.name || 'Wearable'} disconnected. Select Reconnect to resume.`
          );
        };
        device.addEventListener('gattserverdisconnected', onDisconnected);

        const server = await device.gatt?.connect();
        if (!server) {
          setStatus('error');
          setStatusMessage('Device found, but failed to open Bluetooth connection.');
          return;
        }

        serverRef.current = server;
        rrWindowRef.current = [];
        setSnapshot(INITIAL_SNAPSHOT);
        await attachGattServices(device, server);
      } catch (err) {
        const errName = err instanceof Error ? err.name : '';
        const errMsg = err instanceof Error ? err.message : String(err);

        if (errName === 'NotFoundError') {
          setStatus('disconnected');
          setStatusMessage(
            mode === 'medical'
              ? 'No wearable selected. Try scanning all nearby devices.'
              : 'Device selection cancelled.'
          );
        } else if (
          errName === 'SecurityError' ||
          errMsg.toLowerCase().includes('permissions policy') ||
          errMsg.toLowerCase().includes('disallowed')
        ) {
          setStatus('error');
          setStatusMessage(
            'Embedded preview frames restrict Bluetooth pairing. Open in a standalone Chrome or Edge tab, or use a simulated stream below.'
          );
        } else {
          setStatus('error');
          setStatusMessage(errMsg || 'Could not connect to wearable.');
        }
      }
    },
    [attachGattServices, cleanupStreams, scanMode]
  );

  const reconnectLastDevice = useCallback(async () => {
    const dev = deviceRef.current;
    if (!dev?.gatt) {
      return connectRealDevice();
    }
    try {
      setStatus('connecting');
      setStatusMessage(`Reconnecting to ${dev.name || 'Bluetooth Wearable'}...`);
      const server = await dev.gatt.connect();
      serverRef.current = server;
      await attachGattServices(dev, server);
    } catch (err) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Reconnect failed.');
    }
  }, [attachGattServices, connectRealDevice]);

  /**
   * Generates real binary Bluetooth SIG GATT packets (0x2A37, 0x2A5F, 0x2A1C) and runs them
   * through the exact production DataView binary decoders so users can verify end-to-end BLE streaming
   * even inside restricted iframe previews without physical BLE hardware.
   */
  const startSimulatedGattStream = useCallback(
    async (scenario: 'normal' | 'drift' = 'normal') => {
      cleanupStreams();
      rrWindowRef.current = [];
      const devName =
        scenario === 'normal'
          ? 'Simulated Wearable (Normal)'
          : 'Simulated Wearable (Elevated)';

      setDeviceInfo({
        name: devName,
        manufacturer: 'Crew Telemetry Sim',
        model: 'GATT Stream v1',
        batteryPct: 86,
        supportedServices: ['Heart Rate', 'Blood Oxygen', 'Body Temperature'],
      });
      setStatus('simulated');
      setStatusMessage(`Streaming live readings from ${devName}.`);

      let tick = 0;
      const emitPacket = () => {
        tick += 1;
        const baseBpm = scenario === 'normal' ? 64 : 84;
        const bpmJitter = Math.round(Math.sin(tick * 0.7) * 3);
        const targetBpm = baseBpm + bpmJitter;
        const rrBase = Math.round(60000 / targetBpm);
        const rrDelta = scenario === 'normal' ? 38 : 14;
        const hrPacket = encodeHeartRateGattPacket(targetBpm, [
          rrBase - rrDelta,
          rrBase + rrDelta,
        ]);
        const decodedHr = decodeHeartRateMeasurement(hrPacket);

        const spo2Packet = encodePulseOxGattPacket(
          scenario === 'normal' ? 98 : 94,
          decodedHr.bpm
        );
        const decodedPlx = decodePulseOximeterMeasurement(spo2Packet);

        const tempPacket = encodeTemperatureGattPacket(scenario === 'normal' ? 36.7 : 37.7);
        const decodedTemp = decodeTemperatureMeasurement(tempPacket);

        rrWindowRef.current = [
          ...rrWindowRef.current,
          ...decodedHr.rrIntervalsMs,
        ].slice(-24);
        const hrvMs = computeRmssdMs(rrWindowRef.current);

        pushSnapshotUpdate(
          devName,
          (prev) => ({
            ...prev,
            bpm: decodedHr.bpm,
            sensorContact: decodedHr.sensorContact,
            rrIntervalsMs: rrWindowRef.current,
            hrvMs: hrvMs ?? prev.hrvMs,
            spo2Pct: decodedPlx.spo2Pct ?? prev.spo2Pct,
            bodyTempC: decodedTemp ?? prev.bodyTempC,
            packetCount: prev.packetCount + 1,
            lastPacketISO: new Date().toISOString(),
            recentBpmSeries: [...prev.recentBpmSeries, decodedHr.bpm].slice(-20),
          }),
          tick === 1
        );
      };

      emitPacket();
      simTimerRef.current = window.setInterval(emitPacket, 1500);
    },
    [cleanupStreams, pushSnapshotUpdate]
  );

  return {
    envCheck,
    status,
    scanMode,
    setScanMode,
    statusMessage,
    autoSyncToHud,
    setAutoSyncToHud,
    deviceInfo,
    snapshot,
    canReconnect: !!deviceRef.current?.gatt && status !== 'connected' && status !== 'connecting',
    connectRealDevice,
    reconnectLastDevice,
    startSimulatedGattStream,
    disconnect,
  };
}
