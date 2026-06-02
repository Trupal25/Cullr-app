import React, { createContext, useContext, useCallback, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScoredResult, ScanStatus, ScanStats, ScanType } from '../types';

const STORAGE_KEY_ONBOARDED = '@cullr/onboarded';
const STORAGE_KEY_STATS = '@cullr/scan_stats';

type ScanState = {
  isOnboarded: boolean;
  scanStatus: ScanStatus;
  scanProgress: number;
  scanPhaseLabel: string;
  scanResults: ScoredResult[];
  selectedIds: Set<string>;
  pendingDeletions: ScoredResult[]; // Staged for removal during the undo window
  stats: ScanStats;
  lastScanType: ScanType;
  isHydrated: boolean;
};

type ScanAction =
  | { type: 'HYDRATE'; onboarded: boolean; stats: ScanStats }
  | { type: 'MARK_ONBOARDED' }
  | { type: 'SET_SCAN_STATUS'; status: ScanStatus }
  | { type: 'SET_SCAN_PROGRESS'; progress: number; label: string }
  | { type: 'SET_RESULTS'; results: ScoredResult[] }
  | { type: 'TOGGLE_SELECT'; id: string }
  | { type: 'SELECT_ALL'; ids: string[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'REMOVE_DELETED'; deletedIds: string[] }
  | { type: 'STAGE_DELETION'; items: ScoredResult[] }
  | { type: 'UNDO_DELETION' }
  | { type: 'COMMIT_REMOVAL'; items: ScoredResult[]; totalBytes: number }
  | { type: 'UPDATE_STATS'; stats: Partial<ScanStats> }
  | { type: 'SET_SCAN_TYPE'; scanType: ScanType }
  | { type: 'CLEAR_RESULTS' };

const DEFAULT_STATS: ScanStats = {
  lastScanDate: null,
  totalScanned: 0,
  totalFlagged: 0,
  totalDeleted: 0,
  totalMBFreed: 0,
};

const initialState: ScanState = {
  isOnboarded: false,
  scanStatus: 'idle',
  scanProgress: 0,
  scanPhaseLabel: '',
  scanResults: [],
  selectedIds: new Set(),
  pendingDeletions: [],
  stats: DEFAULT_STATS,
  lastScanType: 'metadata',
  isHydrated: false,
};

function reducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        isOnboarded: action.onboarded,
        stats: action.stats,
        isHydrated: true,
      };
    case 'MARK_ONBOARDED':
      return { ...state, isOnboarded: true };
    case 'SET_SCAN_STATUS':
      return { ...state, scanStatus: action.status };
    case 'SET_SCAN_PROGRESS':
      return { ...state, scanProgress: action.progress, scanPhaseLabel: action.label };
    case 'SET_RESULTS':
      return { ...state, scanResults: action.results, scanStatus: 'done' };
    case 'TOGGLE_SELECT': {
      const next = new Set(state.selectedIds);
      if (next.has(action.id)) {
        next.delete(action.id);
      } else {
        next.add(action.id);
      }
      return { ...state, selectedIds: next };
    }
    case 'SELECT_ALL': {
      return { ...state, selectedIds: new Set(action.ids) };
    }
    case 'DESELECT_ALL':
      return { ...state, selectedIds: new Set() };
    case 'REMOVE_DELETED': {
      const deletedSet = new Set(action.deletedIds);
      const filtered = state.scanResults.filter((r) => !deletedSet.has(r.asset.id));
      const nextSelected = new Set(state.selectedIds);
      for (const id of action.deletedIds) {
        nextSelected.delete(id);
      }
      return { ...state, scanResults: filtered, selectedIds: nextSelected };
    }

    // ── Undo Delete Flow ──────────────────────────────────────────

    // Move selected items out of scanResults into the pending undo queue.
    // The actual platform removal request is deferred until Undo expires.
    case 'STAGE_DELETION': {
      if (state.pendingDeletions.length > 0) {
        return state;
      }
      const stagedIds = new Set(action.items.map((r) => r.asset.id));
      const remaining = state.scanResults.filter((r) => !stagedIds.has(r.asset.id));
      const nextSelected = new Set(state.selectedIds);
      for (const id of stagedIds) nextSelected.delete(id);
      return {
        ...state,
        scanResults: remaining,
        pendingDeletions: action.items,
        selectedIds: nextSelected,
      };
    }

    // User hit "Undo" — put items back into the results list.
    case 'UNDO_DELETION':
      return {
        ...state,
        scanResults: [...state.pendingDeletions, ...state.scanResults],
        pendingDeletions: [],
      };

    // A platform removal succeeded: remove visible items and update totals atomically.
    case 'COMMIT_REMOVAL': {
      const removedIds = new Set(action.items.map((r) => r.asset.id));
      const nextSelected = new Set(state.selectedIds);
      for (const id of removedIds) nextSelected.delete(id);
      return {
        ...state,
        scanResults: state.scanResults.filter((r) => !removedIds.has(r.asset.id)),
        selectedIds: nextSelected,
        pendingDeletions: [],
        stats: {
          ...state.stats,
          totalDeleted: state.stats.totalDeleted + action.items.length,
          totalMBFreed: state.stats.totalMBFreed + action.totalBytes,
        },
      };
    }

    case 'UPDATE_STATS':
      return { ...state, stats: { ...state.stats, ...action.stats } };
    case 'SET_SCAN_TYPE':
      return { ...state, lastScanType: action.scanType };
    case 'CLEAR_RESULTS':
      return { ...state, scanResults: [], selectedIds: new Set(), pendingDeletions: [], scanStatus: 'idle', scanProgress: 0 };
    default:
      return state;
  }
}

type ScanContextType = {
  state: ScanState;
  markOnboarded: () => void;
  setScanStatus: (status: ScanStatus) => void;
  setScanProgress: (progress: number, label: string) => void;
  setResults: (results: ScoredResult[]) => void;
  setScanType: (scanType: ScanType) => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  removeDeleted: (ids: string[]) => void;
  stageDeletion: (items: ScoredResult[]) => void;
  undoDeletion: () => void;
  commitRemoval: (items: ScoredResult[], totalBytes: number) => void;
  updateStats: (stats: Partial<ScanStats>) => void;
  clearResults: () => void;
};

const ScanContext = createContext<ScanContextType | null>(null);

export function ScanProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate persisted state on mount
  useEffect(() => {
    async function hydrate(): Promise<void> {
      const [onboardedRaw, statsRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_ONBOARDED),
        AsyncStorage.getItem(STORAGE_KEY_STATS),
      ]);
      const onboarded = onboardedRaw === 'true';
      const stats: ScanStats = statsRaw ? JSON.parse(statsRaw) : DEFAULT_STATS;
      dispatch({ type: 'HYDRATE', onboarded, stats });
    }
    hydrate();
  }, []);

  // Persist onboarded flag
  const markOnboarded = useCallback(() => {
    dispatch({ type: 'MARK_ONBOARDED' });
    AsyncStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
  }, []);

  // Persist stats whenever they change
  const updateStats = useCallback((stats: Partial<ScanStats>) => {
    dispatch({ type: 'UPDATE_STATS', stats });
  }, []);

  // Flush stats to storage when results are set or deleted
  useEffect(() => {
    if (state.isHydrated) {
      AsyncStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(state.stats));
    }
  }, [state.stats, state.isHydrated]);

  const setScanStatus = useCallback((status: ScanStatus) => {
    dispatch({ type: 'SET_SCAN_STATUS', status });
  }, []);

  const setScanProgress = useCallback((progress: number, label: string) => {
    dispatch({ type: 'SET_SCAN_PROGRESS', progress, label });
  }, []);

  const setResults = useCallback((results: ScoredResult[]) => {
    dispatch({ type: 'SET_RESULTS', results });
  }, []);

  const setScanType = useCallback((scanType: ScanType) => {
    dispatch({ type: 'SET_SCAN_TYPE', scanType });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_SELECT', id });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    dispatch({ type: 'SELECT_ALL', ids });
  }, []);

  const deselectAll = useCallback(() => {
    dispatch({ type: 'DESELECT_ALL' });
  }, []);

  const removeDeleted = useCallback((ids: string[]) => {
    dispatch({ type: 'REMOVE_DELETED', deletedIds: ids });
  }, []);

  const stageDeletion = useCallback((items: ScoredResult[]) => {
    dispatch({ type: 'STAGE_DELETION', items });
  }, []);

  const undoDeletion = useCallback(() => {
    dispatch({ type: 'UNDO_DELETION' });
  }, []);

  const commitRemoval = useCallback((items: ScoredResult[], totalBytes: number) => {
    dispatch({ type: 'COMMIT_REMOVAL', items, totalBytes });
  }, []);

  const clearResults = useCallback(() => {
    dispatch({ type: 'CLEAR_RESULTS' });
  }, []);

  const value: ScanContextType = {
    state,
    markOnboarded,
    setScanStatus,
    setScanProgress,
    setResults,
    setScanType,
    toggleSelect,
    selectAll,
    deselectAll,
    removeDeleted,
    stageDeletion,
    undoDeletion,
    commitRemoval,
    updateStats,
    clearResults,
  };

  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScanStore(): ScanContextType {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScanStore must be used within ScanProvider');
  return ctx;
}
