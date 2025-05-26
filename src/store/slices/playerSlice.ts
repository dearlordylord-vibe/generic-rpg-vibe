import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { PlayerStats } from '../../game/models/PlayerStats';
import { PlayerLevel } from '../../game/models/PlayerLevel';
import { Equipment } from '../../game/models/Equipment';
import { RootState } from '..';

interface PlayerState {
  stats: string | null; // Serialized PlayerStats
  level: string | null; // Serialized PlayerLevel
  equipment: string | null; // Serialized Equipment
  isLoading: boolean;
  error: string | null;
}

const initialState: PlayerState = {
  stats: null,
  level: null,
  equipment: null,
  isLoading: false,
  error: null
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
    updateEquipment: (state, action: PayloadAction<Equipment>) => {
      state.equipment = action.payload.serialize();
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

// Export actions
export const {
  initializePlayer,
  updateStats,
  updateLevel,
  updateEquipment,
  setError,
  clearError
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

export default playerSlice.reducer; 