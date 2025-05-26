import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerStats } from '../PlayerStats';

describe('PlayerStats', () => {
  let playerStats: PlayerStats;

  beforeEach(() => {
    playerStats = new PlayerStats();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const info = playerStats.getDebugInfo();
      expect(info.base).toEqual({
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        vitality: 10,
        luck: 10
      });
    });
  });

  describe('stat points', () => {
    it('should start with 0 stat points', () => {
      expect(playerStats.getAvailableStatPoints()).toBe(0);
    });

    it('should add stat points correctly', () => {
      playerStats.addStatPoints(5);
      expect(playerStats.getAvailableStatPoints()).toBe(5);
    });

    it('should not allow negative stat points', () => {
      expect(() => playerStats.addStatPoints(-1)).toThrow();
    });
  });

  describe('stat allocation', () => {
    beforeEach(() => {
      playerStats.addStatPoints(10);
    });

    it('should allocate stat points correctly', () => {
      expect(playerStats.allocateStatPoint('strength')).toBe(true);
      expect(playerStats.getBaseStat('strength')).toBe(11);
      expect(playerStats.getAvailableStatPoints()).toBe(9);
    });

    it('should not allocate when no points available', () => {
      playerStats = new PlayerStats(); // Reset to 0 points
      expect(playerStats.allocateStatPoint('strength')).toBe(false);
      expect(playerStats.getBaseStat('strength')).toBe(10);
    });
  });

  describe('derived stats', () => {
    it('should calculate derived stats correctly', () => {
      const derived = playerStats.getDerivedStats();
      expect(derived.maxHealth).toBe(200); // 100 + (vitality * 10)
      expect(derived.maxMana).toBe(100); // 50 + (intelligence * 5)
      expect(derived.physicalDamage).toBe(20); // strength * 2
      expect(derived.magicDamage).toBe(20); // intelligence * 2
    });
  });
}); 