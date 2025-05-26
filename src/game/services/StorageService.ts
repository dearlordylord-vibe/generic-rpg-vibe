import { GameState } from '../models/GameState';

export interface SaveInfo {
  timestamp: number;
  version: string;
}

export class StorageService {
  private static readonly STORAGE_KEY = 'catgame_save';
  private static readonly VERSION = '1.0.0';

  static save(state: GameState): void {
    try {
      const saveData = {
        version: this.VERSION,
        timestamp: Date.now(),
        state: state.serialize()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saveData));
    } catch (error) {
      console.error('Failed to save game state:', error);
      throw new Error('Failed to save game state');
    }
  }

  static load(): GameState | null {
    try {
      const saveDataString = localStorage.getItem(this.STORAGE_KEY);
      if (!saveDataString) return null;

      const saveData = JSON.parse(saveDataString);
      
      // Check version compatibility
      if (saveData.version !== this.VERSION) {
        console.warn('Save data version mismatch');
        return null;
      }

      const state = new GameState();
      state.deserialize(saveData.state);
      return state;
    } catch (error) {
      console.error('Failed to load game state:', error);
      return null;
    }
  }

  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static clearSave(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear save data:', error);
      throw new Error('Failed to clear save data');
    }
  }

  static hasSaveData(): boolean {
    try {
      return localStorage.getItem(this.STORAGE_KEY) !== null;
    } catch (error) {
      console.error('Failed to check save data:', error);
      return false;
    }
  }

  static getSaveInfo(): SaveInfo | null {
    try {
      const saveDataString = localStorage.getItem(this.STORAGE_KEY);
      if (!saveDataString) return null;

      const saveData = JSON.parse(saveDataString);
      return {
        version: saveData.version,
        timestamp: saveData.timestamp
      };
    } catch (error) {
      console.error('Failed to get save info:', error);
      return null;
    }
  }
} 