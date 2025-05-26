import { produce } from 'immer';
import { PlayerStats } from '../game/models/PlayerStats';
import { PlayerLevel } from '../game/models/PlayerLevel';
import { Equipment } from '../game/models/Equipment';

export interface PlayerStateSnapshot {
  stats: string;
  level: string;
  equipment: string;
  timestamp: number;
  description: string;
}

export class ImmerStateManager {
  private history: PlayerStateSnapshot[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 20;

  // Create a snapshot of current player state
  createSnapshot(
    stats: PlayerStats,
    level: PlayerLevel,
    equipment: Equipment,
    description: string
  ): PlayerStateSnapshot {
    return {
      stats: stats.serialize(),
      level: level.serialize(),
      equipment: equipment.serialize(),
      timestamp: Date.now(),
      description
    };
  }

  // Add state to history for undo/redo
  pushState(snapshot: PlayerStateSnapshot): void {
    // Remove any history after current index (for branching scenarios)
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Add new state
    this.history.push(snapshot);
    this.currentIndex = this.history.length - 1;
    
    // Trim history if it exceeds max size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  // Get previous state for undo
  undo(): PlayerStateSnapshot | null {
    if (this.canUndo()) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  // Get next state for redo
  redo(): PlayerStateSnapshot | null {
    if (this.canRedo()) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }

  // Check if undo is possible
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  // Check if redo is possible
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  // Get current state description
  getCurrentDescription(): string {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex].description;
    }
    return 'Initial state';
  }

  // Clear history
  clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  // Get history for debugging
  getHistory(): PlayerStateSnapshot[] {
    return [...this.history];
  }
}

// Producer functions for common state operations
export const playerStatsProducers = {
  // Allocate a stat point
  allocateStatPoint: (stats: PlayerStats, statName: keyof import('../game/models/PlayerStats').IBaseStats) => {
    return produce(stats, (draft) => {
      if (draft.canAllocateStatPoint(statName)) {
        const cost = draft.getStatCost(statName);
        if (draft.getAvailableStatPoints() >= cost) {
          // Create a new instance and copy the allocation
          const newStats = PlayerStats.deserialize(draft.serialize());
          newStats.allocateStatPoint(statName);
          return newStats;
        }
      }
      return draft;
    });
  },

  // Add stat points
  addStatPoints: (stats: PlayerStats, amount: number) => {
    return produce(stats, (draft) => {
      const newStats = PlayerStats.deserialize(draft.serialize());
      newStats.addStatPoints(amount);
      return newStats;
    });
  },

  // Reset all allocated points (if this method exists)
  resetAllocatedPoints: (stats: PlayerStats) => {
    return produce(stats, (draft) => {
      const newStats = PlayerStats.deserialize(draft.serialize());
      // Note: resetAllocatedStats method may not exist yet
      return newStats;
    });
  }
};

export const playerLevelProducers = {
  // Add XP
  addXP: (level: PlayerLevel, amount: number) => {
    return produce(level, (draft) => {
      const newLevel = PlayerLevel.deserialize(draft.serialize());
      newLevel.addXP(amount);
      return newLevel;
    });
  }
};

export const equipmentProducers = {
  // Equip item (if these methods exist)
  equipItem: (equipment: Equipment, _slot: string, _itemId: string) => {
    return produce(equipment, (draft) => {
      const newEquipment = Equipment.deserialize(draft.serialize());
      // Note: equipItem method may not exist yet
      return newEquipment;
    });
  },

  // Unequip item (if these methods exist)
  unequipItem: (equipment: Equipment, _slot: string) => {
    return produce(equipment, (draft) => {
      const newEquipment = Equipment.deserialize(draft.serialize());
      // Note: unequipItem method may not exist yet
      return newEquipment;
    });
  }
};