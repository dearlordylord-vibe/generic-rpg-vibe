import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GameState, IInventoryItem } from '../../game/models/GameState';
import { Equipment, EquipmentSlot, EquipmentType } from '../../game/models/Equipment';
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
    },
    moveInventoryItem: (state, action: PayloadAction<{
      fromIndex: number;
      toIndex: number;
    }>) => {
      try {
        if (!state.serializedState) return;
        const gameState = new GameState();
        gameState.deserialize(state.serializedState);
        
        const playerState = gameState.getPlayerState();
        const items = [...playerState.inventory.items];
        
        if (action.payload.fromIndex >= 0 && action.payload.fromIndex < items.length &&
            action.payload.toIndex >= 0 && action.payload.toIndex < playerState.inventory.maxSlots) {
          
          // Remove item from source
          const [movedItem] = items.splice(action.payload.fromIndex, 1);
          
          // Insert at target position
          if (action.payload.toIndex < items.length) {
            items.splice(action.payload.toIndex, 0, movedItem);
          } else {
            items.push(movedItem);
          }
          
          // Update inventory
          playerState.inventory.items = items;
          state.serializedState = gameState.serialize();
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to move inventory item';
      }
    },
    addInventoryItem: (state, action: PayloadAction<IInventoryItem>) => {
      try {
        if (!state.serializedState) return;
        const gameState = new GameState();
        gameState.deserialize(state.serializedState);
        
        const success = gameState.addInventoryItem(action.payload);
        if (success) {
          state.serializedState = gameState.serialize();
        } else {
          state.error = 'Inventory is full';
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to add inventory item';
      }
    },
    removeInventoryItem: (state, action: PayloadAction<{
      itemId: string;
      quantity?: number;
    }>) => {
      try {
        if (!state.serializedState) return;
        const gameState = new GameState();
        gameState.deserialize(state.serializedState);
        
        const success = gameState.removeInventoryItem(
          action.payload.itemId, 
          action.payload.quantity || 1
        );
        if (success) {
          state.serializedState = gameState.serialize();
        } else {
          state.error = 'Failed to remove item';
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to remove inventory item';
      }
    },
    addTestItems: (state) => {
      try {
        if (!state.serializedState) return;
        const gameState = new GameState();
        gameState.deserialize(state.serializedState);
        
        // Add test items for development
        const testItems: IInventoryItem[] = [
          {
            id: 'sword1',
            name: 'Iron Sword',
            type: 'weapon',
            quantity: 1,
            stats: { strength: 5 }
          },
          {
            id: 'potion1',
            name: 'Health Potion',
            type: 'consumable',
            quantity: 3
          },
          {
            id: 'armor1',
            name: 'Leather Armor',
            type: 'armor',
            quantity: 1,
            stats: { vitality: 3 }
          }
        ];
        
        testItems.forEach(item => gameState.addInventoryItem(item));
        
        // Also add some gold for testing
        const playerState = gameState.getPlayerState();
        playerState.inventory.gold = 100;
        
        state.serializedState = gameState.serialize();
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to add test items';
      }
    },
    addTestEquipment: (state) => {
      try {
        if (!state.serializedState) return;
        const gameState = new GameState();
        gameState.deserialize(state.serializedState);
        
        // Create test equipment items
        const testEquipment = [
          new Equipment(
            'test_sword',
            'Iron Sword',
            EquipmentType.WEAPON,
            EquipmentSlot.WEAPON,
            { level: 1 },
            { bonuses: { strength: 5, dexterity: 2 } },
            'A basic iron sword for beginners.',
            1
          ),
          new Equipment(
            'test_helmet',
            'Leather Helm',
            EquipmentType.ARMOR,
            EquipmentSlot.HEAD,
            { level: 1 },
            { bonuses: { vitality: 3 } },
            'A simple leather helmet.',
            1
          ),
          new Equipment(
            'test_armor',
            'Cloth Robe',
            EquipmentType.ARMOR,
            EquipmentSlot.BODY,
            { level: 1 },
            { bonuses: { intelligence: 4, vitality: 2 } },
            'A basic cloth robe.',
            1
          ),
          new Equipment(
            'test_gloves',
            'Leather Gloves',
            EquipmentType.ARMOR,
            EquipmentSlot.PAWS,
            { level: 1 },
            { bonuses: { dexterity: 3 } },
            'Simple leather gloves.',
            1
          )
        ];
        
        // Add equipment to inventory
        testEquipment.forEach(equipment => {
          gameState.addItemToInventory(equipment, 1);
        });
        
        state.serializedState = gameState.serialize();
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to add test equipment';
      }
    },
    equipItem: (state, action: PayloadAction<{
      equipmentId: string;
    }>) => {
      try {
        if (!state.serializedState) return;
        const gameState = new GameState();
        gameState.deserialize(state.serializedState);
        
        gameState.equipItem(action.payload.equipmentId);
        state.serializedState = gameState.serialize();
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to equip item';
      }
    },
    unequipItem: (state, action: PayloadAction<{
      slot: EquipmentSlot;
    }>) => {
      try {
        if (!state.serializedState) return;
        const gameState = new GameState();
        gameState.deserialize(state.serializedState);
        
        const success = gameState.unequipItem(action.payload.slot);
        if (success) {
          state.serializedState = gameState.serialize();
        } else {
          state.error = 'Failed to unequip item - inventory may be full';
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to unequip item';
      }
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
  clearError,
  moveInventoryItem,
  addInventoryItem,
  removeInventoryItem,
  addTestItems,
  addTestEquipment,
  equipItem,
  unequipItem
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