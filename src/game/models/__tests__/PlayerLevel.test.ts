import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayerLevel } from '../PlayerLevel';

describe('PlayerLevel', () => {
  let playerLevel: PlayerLevel;

  beforeEach(() => {
    playerLevel = new PlayerLevel();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const info = playerLevel.getLevelInfo();
      expect(info.currentLevel).toBe(1);
      expect(info.currentXP).toBe(0);
      expect(info.progress).toBe(0);
    });

    it('should accept custom config', () => {
      const customConfig = {
        baseXP: 200,
        xpScale: 2,
        maxLevel: 20
      };
      const customPlayerLevel = new PlayerLevel(customConfig);
      const config = customPlayerLevel.getConfig();
      expect(config.baseXP).toBe(200);
      expect(config.xpScale).toBe(2);
      expect(config.maxLevel).toBe(20);
      // Default values should be preserved
      expect(config.baseStatPoints).toBe(3);
    });
  });

  describe('XP and leveling', () => {
    it('should handle XP gain correctly', () => {
      playerLevel.addXP(50);
      const info = playerLevel.getLevelInfo();
      expect(info.currentXP).toBe(50);
      expect(info.currentLevel).toBe(1);
      expect(info.progress).toBeCloseTo(0.5); // 50/100 progress to level 2
    });

    it('should level up when sufficient XP is gained', () => {
      playerLevel.addXP(100); // Exactly enough for level 2
      let info = playerLevel.getLevelInfo();
      expect(info.currentLevel).toBe(2);
      expect(info.currentXP).toBe(100);

      playerLevel.addXP(150); // Level 3 requires 150 XP (100 * 1.5)
      info = playerLevel.getLevelInfo();
      expect(info.currentLevel).toBe(3);
    });

    it('should handle multiple level ups in one XP gain', () => {
      // Add enough XP to jump multiple levels
      playerLevel.addXP(1000);
      const info = playerLevel.getLevelInfo();
      expect(info.currentLevel).toBeGreaterThan(3);
    });

    it('should calculate XP requirements correctly', () => {
      const info = playerLevel.getLevelInfo();
      expect(info.xpToNextLevel).toBe(100); // Level 1 to 2 requires 100 XP

      playerLevel.addXP(100);
      const level2Info = playerLevel.getLevelInfo();
      expect(level2Info.xpToNextLevel).toBe(150); // Level 2 to 3 requires 150 XP
    });

    it('should not exceed max level', () => {
      const maxLevelPlayerLevel = new PlayerLevel({ maxLevel: 5 });
      maxLevelPlayerLevel.addXP(100000); // Add excessive XP
      const info = maxLevelPlayerLevel.getLevelInfo();
      expect(info.currentLevel).toBe(5);
    });
  });

  describe('stat points', () => {
    it('should award base stat points on level up', () => {
      const listener = vi.fn();
      playerLevel.addEventListener(listener);
      
      playerLevel.addXP(100); // Level up to 2
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'levelUp',
        data: expect.objectContaining({
          statPointsAwarded: 3 // Base stat points
        })
      }));
    });

    it('should award correct stat points for a single level up', () => {
      const listener = vi.fn();
      playerLevel.addEventListener(listener);
      
      // Get current level info
      const info = playerLevel.getLevelInfo();
      const xpNeeded = info.xpToNextLevel;
      
      // Add just enough XP to level up once
      playerLevel.addXP(xpNeeded);
      
      const levelUpEvent = listener.mock.calls.find(
        call => call[0].type === 'levelUp'
      );
      
      expect(levelUpEvent).toBeDefined();
      // Level 2 should award base stat points (3)
      expect(levelUpEvent![0].data.statPointsAwarded).toBe(3);
    });

    it('should correctly calculate stat points across multiple levels with milestones', () => {
      const listener = vi.fn();
      playerLevel.addEventListener(listener);
      
      // Calculate total XP needed to reach level 6
      let totalXPNeeded = 0;
      for (let level = 2; level <= 6; level++) {
        totalXPNeeded += playerLevel.getDebugInfo().config.baseXP * 
          Math.pow(playerLevel.getDebugInfo().config.xpScale, level - 2);
      }
      
      // Add enough XP to reach level 6
      playerLevel.addXP(totalXPNeeded);
      
      const levelUpCalls = listener.mock.calls.filter(
        call => call[0].type === 'levelUp'
      );
      
      // Find the level 6 event (final level up)
      const level6Event = levelUpCalls.find(
        call => call[0].data.newLevel === 6
      );
      
      expect(level6Event).toBeDefined();
      // Levels 2-4: 3 points each = 9 points
      // Level 5 (milestone): 3 base + 2 bonus = 5 points
      // Level 6: 3 points
      // Total: 17 points
      expect(level6Event![0].data.statPointsAwarded).toBe(17);
      
      // Verify we reached the correct level
      const finalInfo = playerLevel.getLevelInfo();
      expect(finalInfo.currentLevel).toBe(6);
    });

    it('should award bonus stat points at milestone levels', () => {
      const listener = vi.fn();
      playerLevel.addEventListener(listener);
      
      // Add enough XP to reach level 5 (a milestone level)
      playerLevel.addXP(1000);
      
      const levelUpCalls = listener.mock.calls.filter(
        call => call[0].type === 'levelUp'
      );
      
      // Find the level 5 event
      const level5Event = levelUpCalls.find(
        call => call[0].data.newLevel === 5
      );
      
      expect(level5Event).toBeDefined();
      // For levels 2-4: 3 points each = 9 points
      // For level 5: 3 base + 2 bonus = 5 points
      // Total: 14 points
      expect(level5Event![0].data.statPointsAwarded).toBe(14);
    });
  });

  describe('event handling', () => {
    it('should emit xpGained events', () => {
      const listener = vi.fn();
      playerLevel.addEventListener(listener);
      
      playerLevel.addXP(50);
      
      expect(listener).toHaveBeenCalledWith({
        type: 'xpGained',
        data: {
          amount: 50,
          oldXP: 0,
          newXP: 50
        }
      });
    });

    it('should emit levelUp events', () => {
      const listener = vi.fn();
      playerLevel.addEventListener(listener);
      
      playerLevel.addXP(100);
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'levelUp',
        data: expect.objectContaining({
          oldLevel: 1,
          newLevel: 2
        })
      }));
    });

    it('should emit maxLevelReached event', () => {
      const playerLevel = new PlayerLevel({ maxLevel: 2 });
      const listener = vi.fn();
      playerLevel.addEventListener(listener);
      
      playerLevel.addXP(1000);
      
      expect(listener).toHaveBeenCalledWith({
        type: 'maxLevelReached',
        data: null
      });
    });

    it('should handle event listener removal', () => {
      const listener = vi.fn();
      playerLevel.addEventListener(listener);
      playerLevel.removeEventListener(listener);
      
      playerLevel.addXP(100);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error for negative XP', () => {
      expect(() => playerLevel.addXP(-50)).toThrow('XP amount must be positive');
    });

    it('should throw error for zero XP', () => {
      expect(() => playerLevel.addXP(0)).toThrow('XP amount must be positive');
    });
  });

  describe('debug info', () => {
    it('should provide comprehensive debug information', () => {
      playerLevel.addXP(150);
      const debugInfo = playerLevel.getDebugInfo();
      
      expect(debugInfo).toEqual({
        currentXP: 150,
        levelInfo: expect.any(Object),
        config: expect.any(Object)
      });
      
      expect(debugInfo.levelInfo).toEqual({
        currentLevel: expect.any(Number),
        currentXP: 150,
        xpToNextLevel: expect.any(Number),
        totalXPForCurrentLevel: expect.any(Number),
        progress: expect.any(Number)
      });
    });
  });
}); 