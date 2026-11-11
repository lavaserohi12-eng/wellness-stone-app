// src/services/ble/transport.ts
// BLE ABSTRACTION (no real BLE yet). SAI-15 ships the console stub; SAI-16 swaps
// in a real BLE implementation WITHOUT changing any caller.

import { StoneCommand, validateStoneCommand } from "../../types/stoneCommand";

export interface StoneTransport {
  send(command: StoneCommand): Promise<{ ok: boolean; via: string }>;
}

// v0 stub: validate + log. Runs in Expo Go (no native module needed).
export class ConsoleStoneTransport implements StoneTransport {
  async send(command: StoneCommand) {
    const safe = validateStoneCommand(command);
    console.log("[StoneTransport:stub] would send ->", JSON.stringify(safe));
    return { ok: true, via: "console-stub" };
  }
}

// Single entry point every screen calls. Never construct a transport inline.
let transport: StoneTransport = new ConsoleStoneTransport();
export function setStoneTransport(t: StoneTransport) { transport = t; }
export async function sendStoneCommand(command: StoneCommand) {
  return transport.send(command);
}
