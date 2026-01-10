import { STORAGE_KEYS } from './constants.js';
import { loadState, saveState } from './state.js';

export const getLastCheckpoint = () => loadState(STORAGE_KEYS.CHECKPOINT, null);

export const setLastCheckpoint = (checkpoint) => {
  if (!checkpoint || !checkpoint.id) return;
  saveState(STORAGE_KEYS.CHECKPOINT, checkpoint);
};

export const clearLastCheckpoint = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CHECKPOINT);
  } catch (error) {
    console.warn('Failed to clear checkpoint:', error);
  }
};

export default {
  getLastCheckpoint,
  setLastCheckpoint,
  clearLastCheckpoint
};
