import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import StatAllocation from '../StatAllocation';
import { PlayerStats } from '../../game/models/PlayerStats';
import { initializePlayer } from '../../store/slices/playerSlice';
import { GameState } from '../../game/models/GameState';
import type { RootState } from '../../store';
import type { PayloadAction } from '@reduxjs/toolkit';

// Mock Redux store
const createMockStore = (initialStats?: PlayerStats) => {
  const stats = initialStats || new PlayerStats();
  if (!initialStats) {
    stats.addStatPoints(5); // Add 5 stat points by default only if no initial stats provided
  }
  
  const mockState: Partial<RootState> = {
    game: {
      serializedState: new GameState().serialize(),
      isLoading: false,
      error: null,
      lastSave: null
    },
    player: {
      stats: stats.serialize(),
      level: null,
      equipment: null,
      isLoading: false,
      error: null,
      levelUpMessage: null
    }
  };
  
  return configureStore({
    reducer: {
      game: (state = mockState.game) => state,
      player: (state = mockState.player, action: PayloadAction<PlayerStats>) => {
        switch (action.type) {
          case 'player/initializePlayer': {
            const newStats = new PlayerStats();
            newStats.addStatPoints(5);
            return {
              ...state,
              stats: newStats.serialize()
            };
          }
          case 'player/updateStats':
            return {
              ...state,
              stats: action.payload.serialize()
            };
          default:
            return state;
        }
      }
    },
    preloadedState: mockState as RootState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['player/updateStats'],
          ignoredActionPaths: ['payload'],
          ignoredPaths: ['player.stats'],
        },
      }),
  });
};

describe('StatAllocation', () => {
  it('should render all stats with their base values', () => {
    const store = createMockStore();
    store.dispatch(initializePlayer());
    
    render(
      <Provider store={store}>
        <StatAllocation />
      </Provider>
    );

    expect(screen.getByText('Strength')).toBeInTheDocument();
    expect(screen.getByText('Dexterity')).toBeInTheDocument();
    expect(screen.getByText('Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Vitality')).toBeInTheDocument();
    expect(screen.getByText('Luck')).toBeInTheDocument();
  });

  it('should allocate a point when clicking the increase button', () => {
    const store = createMockStore();
    store.dispatch(initializePlayer());
    
    render(
      <Provider store={store}>
        <StatAllocation />
      </Provider>
    );

    // Click the strength increase button directly
    const increaseButton = screen.getByTestId('increase-strength-button');
    fireEvent.click(increaseButton);

    const state = store.getState();
    const updatedStats = PlayerStats.deserialize(state.player.stats);
    expect(updatedStats.getBaseStat('strength')).toBe(11);
    expect(updatedStats.getAvailableStatPoints()).toBe(4);
  });

  it('should disable allocation when no points are available', () => {
    const initialStats = new PlayerStats();
    initialStats.addStatPoints(5);
    // Set available points to 0 by allocating all points to strength
    for (let i = 0; i < 5; i++) {
      initialStats.allocateStatPoint('strength');
    }
    
    const store = createMockStore(initialStats);
    render(
      <Provider store={store}>
        <StatAllocation />
      </Provider>
    );

    // Verify the available points display
    expect(screen.getByText('Available Points: 0')).toBeInTheDocument();

    // Check all stat buttons are disabled
    ['strength', 'dexterity', 'intelligence', 'vitality', 'luck'].forEach(stat => {
      const button = screen.getByTestId(`increase-${stat}-button`);
      expect(button).toBeDisabled();
    });
  });

  it('should not allocate points beyond maximum value', () => {
    const initialStats = new PlayerStats();
    initialStats.addStatPoints(1000); // Give enough points to reach maximum
    
    // Set strength to maximum value by allocating points until we can't anymore
    let previousStrength = 0;
    while (initialStats.canAllocateStatPoint('strength') && initialStats.getBaseStat('strength') !== previousStrength) {
      previousStrength = initialStats.getBaseStat('strength');
      initialStats.allocateStatPoint('strength');
    }
    
    const finalStrength = initialStats.getBaseStat('strength');
    
    const store = createMockStore(initialStats);
    render(
      <Provider store={store}>
        <StatAllocation />
      </Provider>
    );

    // Verify the strength increase button is disabled
    const strengthButton = screen.getByTestId('increase-strength-button');
    expect(strengthButton).toBeDisabled();

    // Verify that we cannot allocate more points to strength
    expect(initialStats.canAllocateStatPoint('strength')).toBe(false);
    
    // The strength should be at its maximum achievable value (either limited by MAX_STAT_VALUE or available points)
    expect(finalStrength).toBeGreaterThan(10); // Should be significantly higher than the starting value of 10
  });

  it('should show available points', () => {
    const store = createMockStore();
    store.dispatch(initializePlayer());
    
    render(
      <Provider store={store}>
        <StatAllocation />
      </Provider>
    );

    expect(screen.getByText('Available Points: 5')).toBeInTheDocument();
  });

  it('should support undo functionality', () => {
    const store = createMockStore();
    store.dispatch(initializePlayer());
    
    render(
      <Provider store={store}>
        <StatAllocation />
      </Provider>
    );

    // First allocate a point
    const increaseButton = screen.getByTestId('increase-strength-button');
    fireEvent.click(increaseButton);

    // Then undo
    const undoButton = screen.getByTestId('undo-button');
    fireEvent.click(undoButton);

    const state = store.getState();
    const updatedStats = PlayerStats.deserialize(state.player.stats);
    expect(updatedStats.getBaseStat('strength')).toBe(10);
    expect(updatedStats.getAvailableStatPoints()).toBe(5);
  });
}); 