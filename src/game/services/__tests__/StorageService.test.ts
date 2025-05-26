import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from '../StorageService';
import { GameState } from '../../models/GameState';

describe('StorageService', () => {
  let mockLocalStorage: { [key: string]: string };
  let gameState: GameState;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    };

    // Create a new GameState for each test
    gameState = new GameState();
  });

  describe('save', () => {
    it('should save game state to localStorage', () => {
      StorageService.save(gameState);
      
      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
      const savedData = JSON.parse(mockLocalStorage['catgame_save']);
      expect(savedData).toHaveProperty('version');
      expect(savedData).toHaveProperty('timestamp');
      expect(savedData).toHaveProperty('state');
    });

    it('should throw error if localStorage fails', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      expect(() => StorageService.save(gameState)).toThrow('Failed to save game state');
    });
  });

  describe('load', () => {
    it('should return null if no save data exists', () => {
      expect(StorageService.load()).toBeNull();
    });

    it('should load and deserialize game state', () => {
      // First save some state
      StorageService.save(gameState);
      
      // Then load it
      const loadedState = StorageService.load();
      expect(loadedState).toBeInstanceOf(GameState);
    });

    it('should return null if version mismatch', () => {
      const invalidSave = {
        version: '0.9.0',
        timestamp: Date.now(),
        state: gameState.serialize()
      };
      localStorage.setItem('catgame_save', JSON.stringify(invalidSave));

      expect(StorageService.load()).toBeNull();
    });

    it('should return null if save data is corrupted', () => {
      localStorage.setItem('catgame_save', 'invalid json');
      expect(StorageService.load()).toBeNull();
    });
  });

  describe('clearSave', () => {
    it('should remove save data from localStorage', () => {
      StorageService.save(gameState);
      StorageService.clearSave();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('catgame_save');
      expect(StorageService.hasSaveData()).toBe(false);
    });

    it('should throw error if localStorage fails', () => {
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => StorageService.clearSave()).toThrow('Failed to clear save data');
    });
  });

  describe('hasSaveData', () => {
    it('should return true if save data exists', () => {
      StorageService.save(gameState);
      expect(StorageService.hasSaveData()).toBe(true);
    });

    it('should return false if no save data exists', () => {
      expect(StorageService.hasSaveData()).toBe(false);
    });

    it('should return false if localStorage fails', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(StorageService.hasSaveData()).toBe(false);
    });
  });

  describe('getSaveInfo', () => {
    it('should return save info if save data exists', () => {
      StorageService.save(gameState);
      const info = StorageService.getSaveInfo();
      
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('timestamp');
    });

    it('should return null if no save data exists', () => {
      expect(StorageService.getSaveInfo()).toBeNull();
    });

    it('should return null if save data is corrupted', () => {
      localStorage.setItem('catgame_save', 'invalid json');
      expect(StorageService.getSaveInfo()).toBeNull();
    });
  });
}); 