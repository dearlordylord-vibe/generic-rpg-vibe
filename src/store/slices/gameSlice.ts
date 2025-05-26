import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GameState } from '../../game/models/GameState';
import { StorageService } from '../../game/services/StorageService';
import { RootState } from '..';

interface GameSliceState {
  serializedState: string | null;
  isLoading: boolean;
  error: string | null;
  lastSave: number | null;
}

const initialState: GameSliceState = {
  serializedState: null,
  isLoading: false,
  error: null,
  lastSave: null
};

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    initializeGame: (state) => {
      const gameState = new GameState();
      state.serializedState = gameState.serialize();
      state.error = null;
    },
    loadState: (state) => {
      try {
        state.isLoading = true;
        state.error = null;
        const loadedState = StorageService.load();
        if (loadedState) {
          state.serializedState = loadedState.serialize();
          state.lastSave = Date.now();
        } else {
          const newState = new GameState();
          state.serializedState = newState.serialize();
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to load game state';
      } finally {
        state.isLoading = false;
      }
    },
    saveState: (state) => {
      try {
        if (state.serializedState) {
          const gameState = new GameState();
          gameState.deserialize(state.serializedState);
          StorageService.save(gameState);
          state.lastSave = Date.now();
          state.error = null;
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to save game state';
      }
    },
    updateGameState: (state, action: PayloadAction<GameState>) => {
      state.serializedState = action.payload.serialize();
      state.error = null;
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
  initializeGame,
  loadState,
  saveState,
  updateGameState,
  setError,
  clearError
} = gameSlice.actions;

// Selectors
export const selectGameState = (state: RootState): GameState | null => {
  if (!state.game.serializedState) return null;
  const gameState = new GameState();
  gameState.deserialize(state.game.serializedState);
  return gameState;
};

export const selectIsLoading = (state: RootState): boolean => state.game.isLoading;
export const selectError = (state: RootState): string | null => state.game.error;
export const selectLastSave = (state: RootState): number | null => state.game.lastSave;

export default gameSlice.reducer; 