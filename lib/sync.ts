import { useDrishtiStore } from './store';

let channel: BroadcastChannel | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
let isBroadcasting = false;

const SYNC_ACTIONS = [
  'addHazard',
  'confirmHazard',
  'dismissHazard',
  'resolveHazard',
  'updateIntersection',
  'addAmbulanceTrip',
  'updateAmbulanceProgress',
  'completeAmbulanceTrip',
  'resetDemo',
];

export function initSync() {
  if (typeof window === 'undefined') return;
  if (channel) return;

  channel = new BroadcastChannel('drishti-sync');

  const store = useDrishtiStore;
  const origActions: Record<string, (...args: any[]) => void> = {};

  const state = store.getState();
  SYNC_ACTIONS.forEach((actionName) => {
    origActions[actionName] = (state as any)[actionName];
  });

  const newActions: Record<string, (...args: any[]) => void> = {};
  SYNC_ACTIONS.forEach((actionName) => {
    newActions[actionName] = (...args: any[]) => {
      origActions[actionName](...args);
      if (!isBroadcasting) {
        broadcast(actionName, args);
      }
    };
  });

  store.setState({ ...state, ...newActions } as any);

  (store.getState() as any).applyRemoteAction = (actionName: string, args: any[]) => {
    isBroadcasting = true;
    try {
      origActions[actionName](...args);
      saveToLocalStorage();
    } finally {
      isBroadcasting = false;
    }
  };

  channel.onmessage = (event) => {
    const { action, args, source } = event.data;
    if (source === 'broadcast') return;
    const apply = (store.getState() as any).applyRemoteAction;
    if (apply) {
      apply(action, args);
    }
  };

  const saved = localStorage.getItem('drishti-state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      store.setState(parsed);
    } catch (e) { /* ignore */ }
  } else {
    store.getState().seed();
  }

  function saveToLocalStorage() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        localStorage.setItem('drishti-state', JSON.stringify(store.getState()));
      } catch (e) { /* ignore */ }
      debounceTimer = null;
    }, 250);
  }

  function broadcast(action: string, args: any[]) {
    if (!channel) return;
    channel.postMessage({ action, args, source: 'broadcast' });
    saveToLocalStorage();
  }
}
