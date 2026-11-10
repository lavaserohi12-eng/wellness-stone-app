import React, { createContext, useContext, useState } from 'react';

import { PersonaProfile } from '../types/wellness';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

interface PersonaContextValue {
  personaProfile: PersonaProfile | null;
  setPersonaProfile: (profile: PersonaProfile) => void;
  personaSaveStatus: SaveStatus;
  savedPersonaProfileId: string | null;
  personaSaveError: string | null;
  setPersonaSaving: () => void;
  setPersonaSaveResult: (id: string | null, status: 'saved' | 'failed', error?: string) => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [personaProfile, setPersonaProfile] = useState<PersonaProfile | null>(null);
  const [personaSaveStatus, setPersonaSaveStatus] = useState<SaveStatus>('idle');
  const [savedPersonaProfileId, setSavedPersonaProfileId] = useState<string | null>(null);
  const [personaSaveError, setPersonaSaveError] = useState<string | null>(null);

  const setPersonaSaving = () => {
    setPersonaSaveStatus('saving');
    setPersonaSaveError(null);
  };

  const setPersonaSaveResult = (id: string | null, status: 'saved' | 'failed', error?: string) => {
    setSavedPersonaProfileId(id);
    setPersonaSaveStatus(status);
    setPersonaSaveError(error ?? null);
  };

  return (
    <PersonaContext.Provider
      value={{
        personaProfile,
        setPersonaProfile,
        personaSaveStatus,
        savedPersonaProfileId,
        personaSaveError,
        setPersonaSaving,
        setPersonaSaveResult,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within PersonaProvider');
  return ctx;
}
