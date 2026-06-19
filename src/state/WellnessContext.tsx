import React, { createContext, useContext, useState } from 'react';

import { AssistantResponse, CheckInPayload } from '../types/wellness';

interface WellnessContextValue {
  latestCheckInPayload: CheckInPayload | null;
  latestAssistantResponse: AssistantResponse | null;
  setLatestCheckInPayload: (payload: CheckInPayload) => void;
  setLatestAssistantResponse: (response: AssistantResponse) => void;
}

const WellnessContext = createContext<WellnessContextValue | null>(null);

export function WellnessProvider({ children }: { children: React.ReactNode }) {
  const [latestCheckInPayload, setLatestCheckInPayload] =
    useState<CheckInPayload | null>(null);
  const [latestAssistantResponse, setLatestAssistantResponse] =
    useState<AssistantResponse | null>(null);

  return (
    <WellnessContext.Provider
      value={{
        latestCheckInPayload,
        latestAssistantResponse,
        setLatestCheckInPayload,
        setLatestAssistantResponse,
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
