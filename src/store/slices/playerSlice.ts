import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { PlayerStats } from '../../game/models/PlayerStats';
import { PlayerLevel } from '../../game/models/PlayerLevel';
import { Equipment } from '../../game/models/Equipment';
import { RootState } from '..';
import { ImmerStateManager } from '../../utils/immerHelpers';

interface PlayerState {
  stats: string | null; // Serialized PlayerStats
  level: string | null; // Serialized PlayerLevel
  equipment: string | null; // Serialized Equipment
  isLoading: boolean;
  error: string | null;
  levelUpMessage: string | null; // Level up notification message
  stateManager: ImmerStateManager; // Immer state manager for undo/redo
}

const initialState: PlayerState = {
  stats: null,
  level: null,
  equipment: null,
  isLoading: false,
  error: null,
  levelUpMessage: null,
  stateManager: new ImmerStateManager()
};

export const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    initializePlayer: (state) => {
      const stats = new PlayerStats();
      const level = new PlayerLevel();
      const equipment = new Equipment();
      
      // Give player some initial stat points for testing
      stats.addStatPoints(10);
      
      state.stats = stats.serialize();
      state.level = level.serialize();
      state.equipment = equipment.serialize();
      state.error = null;
    },
    updateStats: (state, action: PayloadAction<PlayerStats>) => {
      state.stats = action.payload.serialize();
    },
    updateLevel: (state, action: PayloadAction<PlayerLevel>) => {
      state.level = action.payload.serialize();
    },
    addXP: (state, action: PayloadAction<number>) => {
      if (!state.level || !state.stats) return;
      
      const level = PlayerLevel.deserialize(state.level);
      const stats = PlayerStats.deserialize(state.stats);
      
      const oldLevel = level.getLevelInfo().currentLevel;
      level.addXP(action.payload);
      const newLevel = level.getLevelInfo().currentLevel;
      
      // If level increased, grant stat points
      if (newLevel > oldLevel) {
        let totalStatPoints = 0;
        const config = level.getConfig();
        
        for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
          let points = config.baseStatPoints;
          if (config.bonusStatPointLevels.includes(lvl)) {
            points += config.bonusStatPointAmount;
          }
          totalStatPoints += points;
        }
        
        stats.addStatPoints(totalStatPoints);
        state.stats = stats.serialize();
        
        // Set level up message
        state.levelUpMessage = `Level Up! You reached level ${newLevel} and gained ${totalStatPoints} stat points!`;
      }
      
      state.level = level.serialize();
    },
    updateEquipment: (state, action: PayloadAction<Equipment>) => {
      state.equipment = action.payload.serialize();
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearLevelUpMessage: (state) => {
      state.levelUpMessage = null;
    },
    saveStateSnapshot: (state, action: PayloadAction<string>) => {
      if (state.stats && state.level && state.equipment) {
        const stats = PlayerStats.deserialize(state.stats);
        const level = PlayerLevel.deserialize(state.level);
        const equipment = Equipment.deserialize(state.equipment);
        
        const snapshot = state.stateManager.createSnapshot(
          stats, level, equipment, action.payload
        );
        state.stateManager.pushState(snapshot);
      }
    },
    undoState: (state) => {
      const previousState = state.stateManager.undo();
      if (previousState) {
        state.stats = previousState.stats;
        state.level = previousState.level;
        state.equipment = previousState.equipment;
      }
    },
    redoState: (state) => {
      const nextState = state.stateManager.redo();
      if (nextState) {
        state.stats = nextState.stats;
        state.level = nextState.level;
        state.equipment = nextState.equipment;
      }
    },
    clearStateHistory: (state) => {
      state.stateManager.clearHistory();
    }
  }
});

// Export actions
export const {
  initializePlayer,
  updateStats,
  updateLevel,
  addXP,
  updateEquipment,
  setError,
  clearError,
  clearLevelUpMessage,
  saveStateSnapshot,
  undoState,
  redoState,
  clearStateHistory
} = playerSlice.actions;

// Selectors
const selectPlayerStatsRaw = (state: RootState) => state.player.stats;

export const selectPlayerStats = createSelector(
  [selectPlayerStatsRaw],
  (stats): PlayerStats | null => {
    if (!stats) return null;
    return PlayerStats.deserialize(stats);
  }
);

export const selectPlayerLevel = createSelector(
  [(state: RootState) => state.player.level],
  (level): PlayerLevel | null => {
    if (!level) return null;
    return PlayerLevel.deserialize(level);
  }
);

export const selectPlayerEquipment = createSelector(
  [(state: RootState) => state.player.equipment],
  (equipment): Equipment | null => {
    if (!equipment) return null;
    return Equipment.deserialize(equipment);
  }
);

export const selectPlayerError = (state: RootState): string | null => state.player.error;
export const selectPlayerIsLoading = (state: RootState): boolean => state.player.isLoading;
export const selectLevelUpMessage = (state: RootState): string | null => state.player.levelUpMessage;
export const selectCanUndo = (state: RootState): boolean => state.player.stateManager.canUndo();
export const selectCanRedo = (state: RootState): boolean => state.player.stateManager.canRedo();
export const selectCurrentStateDescription = (state: RootState): string => state.player.stateManager.getCurrentDescription();

export default playerSlice.reducer; 