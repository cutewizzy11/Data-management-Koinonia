
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type VettingStatus = 'PENDING' | 'VETTED' | 'REJECTED';
export type NinStatus = 'PENDING' | 'MATCH' | 'MISMATCH' | 'ERROR';

export interface VettingRecord {
  vetting_status: VettingStatus;
  vetted_by?: string;
  vetted_at?: string; // ISO string
  nin_status?: NinStatus;
  nin_checked_at?: string; // ISO
  provider_reference?: string;
  nin_compare_summary?: string;
}

type State = Record<string, VettingRecord>; // keyed by person id

interface VettingContextValue {
  state: State;
  markVetted: (id: string, userId: string) => VettingRecord;
  undoVetted: (id: string, previous?: VettingRecord | null) => void;
  setNinStatus: (id: string, nin: Omit<VettingRecord, 'vetting_status'> & { nin_status: NinStatus }) => void;
  clear: () => void;
}

const VettingContext = createContext<VettingContextValue | undefined>(undefined);
const LS_KEY = 'vetting.state';

export const VettingProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<State>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as State) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  const markVetted = (id: string, userId: string): VettingRecord => {
    const rec: VettingRecord = {
      ...(state[id] || {}),
      vetting_status: 'VETTED',
      vetted_by: userId,
      vetted_at: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, [id]: rec }));
    return rec;
  };

  const undoVetted = (id: string, previous?: VettingRecord | null) => {
    setState(prev => {
      const copy = { ...prev };
      if (!previous) {
        // fallback to resetting to PENDING
        copy[id] = { ...(copy[id] || {}), vetting_status: 'PENDING', vetted_by: undefined, vetted_at: undefined };
      } else {
        copy[id] = previous;
      }
      return copy;
    });
  };

  const setNinStatus: VettingContextValue['setNinStatus'] = (id, nin) => {
    setState(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { vetting_status: 'PENDING' as VettingStatus }),
        ...nin,
        nin_checked_at: nin.nin_checked_at || new Date().toISOString(),
      },
    }));
  };

  const clear = () => setState({});

  const value: VettingContextValue = useMemo(() => ({ state, markVetted, undoVetted, setNinStatus, clear }), [state]);

  return <VettingContext.Provider value={value}>{children}</VettingContext.Provider>;
};

export const useVetting = (): VettingContextValue => {
  const ctx = useContext(VettingContext);
  if (!ctx) throw new Error('useVetting must be used within VettingProvider');
  return ctx;
};
