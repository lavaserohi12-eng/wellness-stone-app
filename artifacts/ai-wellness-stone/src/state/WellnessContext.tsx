import React, { createContext, useContext, useState } from 'react';

import { CheckInPayload, RiskLevel } from '../types/wellness';
import { StoneCommand } from '../types/stoneCommand';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

interface WellnessContextValue {
  latestCheckInPayload: CheckInPayload | null;
  latestResponseText: string | null;
  // SAI-13A — null when the latest response is a CRISIS (safety_mode) response;
  // no Stone command is shown in that case.
  latestStoneCommand: StoneCommand | null;
  // SAI-10 — risk_level of the latest displayed response, and whether the
  // Stone command was blocked because of it (surfaced in Developer Debug).
  latestRiskLevel: RiskLevel | null;
  latestStoneBlocked: boolean;
  setCheckInResult: (
    payload: CheckInPayload,
    responseText: string,
    stoneCommand: StoneCommand | null,
    riskLevel: RiskLevel,
  ) => void;
  checkInSaveStatus: SaveStatus;
  savedNightlyEntryId: string | null;
  checkInSaveError: string | null;
  setCheckInSaving: () => void;
  setCheckInSaveResult: (id: string | null, status: 'saved' | 'failed', error?: string) => void;
  clearCheckIn: () => void;
}

const WellnessContext = createContext<WellnessContextValue | null>(null);

export function WellnessProvider({ children }: { children: React.ReactNode }) {
  const [latestCheckInPayload, setLatestCheckInPayload] = useState<CheckInPayload | null>(null);
  const [latestResponseText, setLatestResponseText] = useState<string | null>(null);
  const [latestStoneCommand, setLatestStoneCommand] = useState<StoneCommand | null>(null);
  const [latestRiskLevel, setLatestRiskLevel] = useState<RiskLevel | null>(null);
  const [latestStoneBlocked, setLatestStoneBlocked] = useState(false);
  const [checkInSaveStatus, setCheckInSaveStatus] = useState<SaveStatus>('idle');
  const [savedNightlyEntryId, setSavedNightlyEntryId] = useState<string | null>(null);
  const [checkInSaveError, setCheckInSaveError] = useState<string | null>(null);

  const clearCheckIn = () => {
    setLatestCheckInPayload(null);
    setLatestResponseText(null);
    setLatestStoneCommand(null);
    setLatestRiskLevel(null);
    setLatestStoneBlocked(false);
    setCheckInSaveStatus('idle');
    setSavedNightlyEntryId(null);
    setCheckInSaveError(null);
  };

  const setCheckInResult = (
    payload: CheckInPayload,
    responseText: string,
    stoneCommand: StoneCommand | null,
    riskLevel: RiskLevel,
  ) => {
    setLatestCheckInPayload(payload);
    setLatestResponseText(responseText);
    setLatestStoneCommand(stoneCommand);
    setLatestRiskLevel(riskLevel);
    setLatestStoneBlocked(riskLevel === 'high');
  };

  const setCheckInSaving = () => {
    setCheckInSaveStatus('saving');
    setCheckInSaveError(null);
  };

  const setCheckInSaveResult = (id: string | null, status: 'saved' | 'failed', error?: string) => {
    setSavedNightlyEntryId(id);
    setCheckInSaveStatus(status);
    setCheckInSaveError(error ?? null);
  };

  return (
    <WellnessContext.Provider
      value={{
        latestCheckInPayload,
        latestResponseText,
        latestStoneCommand,
        latestRiskLevel,
        latestStoneBlocked,
        setCheckInResult,
        checkInSaveStatus,
        savedNightlyEntryId,
        checkInSaveError,
        setCheckInSaving,
        setCheckInSaveResult,
        clearCheckIn,
      }}
    >
      {children}
    </WellnessContext.Provider>
  );
}

export function useWellness(): WellnessContextValue {
  const ctx = useContext(WellnessContext);
  if (!ctx) throw new Error('useWellness must be used within WellnessProvider');
  return ctx;
}
