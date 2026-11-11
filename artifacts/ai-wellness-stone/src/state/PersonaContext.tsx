import React, { createContext, useContext, useEffect, useState } from 'react';

import { PersonaProfile } from '../types/wellness';
import { fetchLatestPersonaProfile } from '../services/personaService';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

interface PersonaContextValue {
  personaProfile: PersonaProfile | null;
  setPersonaProfile: (profile: PersonaProfile) => void;
  personaSaveStatus: SaveStatus;
  savedPersonaProfileId: string | null;
  personaSaveError: string | null;
  setPersonaSaving: () => void;
  setPersonaSaveResult: (id: string | null, status: 'saved' | 'failed', error?: string) => void;
  clearPersona: () => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [personaProfile, setPersonaProfile] = useState<PersonaProfile | null>(null);
  const [personaSaveStatus, setPersonaSaveStatus] = useState<SaveStatus>('idle');
  const [savedPersonaProfileId, setSavedPersonaProfileId] = useState<string | null>(null);
  const [personaSaveError, setPersonaSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLatestPersonaProfile()
      .then(profile => {
        if (!cancelled && profile) setPersonaProfile(current => current ?? profile);
      })
      .catch(() => {
        // Preserve an editable local profile if the network is unavailable.
      });
    return () => { cancelled = true; };
  }, []);

  const clearPersona = () => {
    setPersonaProfile(null);
    setPersonaSaveStatus('idle');
    setSavedPersonaProfileId(null);
    setPersonaSaveError(null);
  };

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
        clearPersona,
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
