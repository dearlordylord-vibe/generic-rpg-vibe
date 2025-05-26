import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import gameReducer from './slices/gameSlice';
import playerReducer from './slices/playerSlice';
import inventoryReducer from './slices/inventorySlice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
    player: playerReducer,
    inventory: inventoryReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['game/loadState', 'player/updateStats', 'player/updateLevel', 'player/updateEquipment', 'player/damagePlayer'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.stats', 'payload.level', 'payload.equipment'],
        // Ignore these paths in the state
        ignoredPaths: ['game.player.stats', 'game.player.level', 'game.player.equipment', 'player.stateManager']
      }
    })
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector; 