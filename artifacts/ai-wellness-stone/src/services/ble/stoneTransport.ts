// src/services/ble/stoneTransport.ts
//
// SAI-19 — Full device transport abstraction: receive telemetry + send commands.
// This is the BROADER interface that wraps both directions.
// The simpler `transport.ts` (SAI-13B/SAI-15) remains for the one-shot
// sendStoneCommand() path on the Response screen.
//
// Real BLE (SAI-16+) replaces MockStoneTransport by implementing StoneDeviceTransport
// without changing any caller.
//
// PRODUCT PATH (SAI-23): Stone → BLE → App → Supabase → OpenAI → App → Stone
// Telemetry received here is flushed to Supabase `device_telemetry_readings`
// via TelemetryBuffer (telemetryBuffer.ts). Supabase is the source of truth.
//
// DEBUG PATH (firmware only): Stone → Wi-Fi → Google Apps Script → Google Sheets
// The Wi-Fi/Sheets path is for Mani's firmware diagnostics ONLY.
// No product feature reads from Sheets. OpenAI never reads from Sheets.

import { TelemetryFrame } from '../../types/stoneTelemetry';
import { StoneCommand, validateStoneCommand } from '../../types/stoneCommand';

export type TelemetryCallback = (frame: TelemetryFrame) => void;

export interface StoneDeviceTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onTelemetryFrame(cb: TelemetryCallback): void;
  sendStoneCommand(command: StoneCommand): Promise<{ ok: boolean; via: string }>;
}

// ---------------------------------------------------------------------------
// MockStoneTransport — emits fake TelemetryFrames every second.
// Validates + logs outgoing StoneCommands. Runs in Expo Go; no native module.
// ---------------------------------------------------------------------------

let mockSeq = 0;

function makeFakeFrame(deviceId: string, sessionId: string): TelemetryFrame {
  mockSeq += 1;
  return {
    type: 'telemetry_frame',
    protocol_version: '2.0',
    device_id: deviceId,
    session_id: sessionId,
    seq: mockSeq,
    captured_at: new Date().toISOString(),
    readings: [
      {
        measurement_type: 'hr_bpm',
        value: Math.round(60 + Math.random() * 20),
        unit: 'bpm',
        confidence: parseFloat((0.85 + Math.random() * 0.14).toFixed(2)),
      },
      {
        measurement_type: 'touch_force',
        value: parseFloat((0.3 + Math.random() * 0.5).toFixed(2)),
        unit: 'normalized',
        confidence: 0.99,
      },
      {
        measurement_type: 'battery_level',
        value: Math.round(70 + Math.random() * 20),
        unit: '%',
        confidence: 1.0,
      },
    ],
  };
}

export class MockStoneTransport implements StoneDeviceTransport {
  private readonly deviceId = 'mock-stone-dev';
  private readonly sessionId: string;
  private callbacks: TelemetryCallback[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.sessionId = `mock-session-${Date.now()}`;
  }

  async connect(): Promise<void> {
    if (this.timer) return;
    console.log('[MockStoneTransport] connected — emitting fake telemetry every 1s');
    this.timer = setInterval(() => {
      const frame = makeFakeFrame(this.deviceId, this.sessionId);
      for (const cb of this.callbacks) cb(frame);
    }, 1_000);
  }

  async disconnect(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[MockStoneTransport] disconnected');
  }

  onTelemetryFrame(cb: TelemetryCallback): void {
    this.callbacks.push(cb);
  }

  async sendStoneCommand(command: StoneCommand): Promise<{ ok: boolean; via: string }> {
    const safe = validateStoneCommand(command);
    console.log('[MockStoneTransport] would send ->', JSON.stringify(safe));
    return { ok: true, via: 'mock-transport' };
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton — swap in real BLE transport via setStoneDeviceTransport()
// ---------------------------------------------------------------------------

let activeTransport: StoneDeviceTransport = new MockStoneTransport();

export function setStoneDeviceTransport(t: StoneDeviceTransport): void {
  activeTransport = t;
}

export function getStoneDeviceTransport(): StoneDeviceTransport {
  return activeTransport;
}
