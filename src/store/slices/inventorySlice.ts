import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GameState, IInventoryItem } from '../../game/models/GameState';
import { EquipmentSlot } from '../../game/models/Equipment';
import { RootState } from '..';

interface InventorySliceState {
  draggedItem: {
    item: IInventoryItem;
    sourceSlot: number;
    sourceType: 'inventory' | 'equipment';
  } | null;
}

const initialState: InventorySliceState = {
  draggedItem: null,
};

export const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setDraggedItem: (state, action: PayloadAction<InventorySliceState['draggedItem']>) => {
      state.draggedItem = action.payload;
    },
    clearDraggedItem: (state) => {
      state.draggedItem = null;
    },
    moveInventoryItem: (state, _action: PayloadAction<{
      gameState: GameState;
      fromSlot: number;
      toSlot: number;
    }>) => {
      // This will be handled by the game slice, just clear dragged item
      state.draggedItem = null;
    },
    equipItem: (state, _action: PayloadAction<{
      gameState: GameState;
      itemId: string;
      slot: EquipmentSlot;
    }>) => {
      // This will be handled by the game slice, just clear dragged item
      state.draggedItem = null;
    },
    unequipItem: (state, _action: PayloadAction<{
      gameState: GameState;
      slot: EquipmentSlot;
    }>) => {
      // This will be handled by the game slice, just clear dragged item
      state.draggedItem = null;
    },
  },
});

// Actions
export const {
  setDraggedItem,
  clearDraggedItem,
  moveInventoryItem,
  equipItem,
  unequipItem,
} = inventorySlice.actions;

// Selectors
export const selectDraggedItem = (state: RootState) => state.inventory.draggedItem;

export default inventorySlice.reducer;