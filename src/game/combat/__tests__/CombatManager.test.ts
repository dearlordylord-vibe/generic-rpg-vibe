import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatManager } from '../CombatManager';
import { PlayerStats } from '../../models/PlayerStats';
import { InventoryManager } from '../../models/InventoryManager';

// Mock Phaser Scene
const mockScene = {
  time: {
    now: 0,
    delayedCall: vi.fn()
  }
} as any;

describe('CombatManager', () => {
  let combatManager: CombatManager;
  let playerStats: PlayerStats;
  let inventoryManager: InventoryManager;

  beforeEach(() => {
    playerStats = new PlayerStats();
    inventoryManager = new InventoryManager();
    
    // Reset time
    mockScene.time.now = 5000; // Start at 5 seconds to avoid cooldown issues
    vi.clearAllMocks();
    
    combatManager = new CombatManager(mockScene, playerStats, inventoryManager);
  });

  describe('Enemy Management', () => {
    it('should add enemies correctly', () => {
      const enemyStats = new PlayerStats();
      combatManager.addEnemy('enemy1', 100, 200, enemyStats);
      
      const enemy = combatManager.getEnemyInfo('enemy1');
      expect(enemy).toBeDefined();
      expect(enemy!.id).toBe('enemy1');
      expect(enemy!.x).toBe(100);
      expect(enemy!.y).toBe(200);
    });

    it('should remove enemies correctly', () => {
      const enemyStats = new PlayerStats();
      combatManager.addEnemy('enemy1', 100, 200, enemyStats);
      
      expect(combatManager.getEnemyInfo('enemy1')).toBeDefined();
      
      combatManager.removeEnemy('enemy1');
      expect(combatManager.getEnemyInfo('enemy1')).toBeUndefined();
    });

    it('should update enemy positions', () => {
      const enemyStats = new PlayerStats();
      combatManager.addEnemy('enemy1', 100, 200, enemyStats);
      
      combatManager.updateEnemyPosition('enemy1', 150, 250);
      
      const enemy = combatManager.getEnemyInfo('enemy1');
      expect(enemy!.x).toBe(150);
      expect(enemy!.y).toBe(250);
    });
  });

  describe('Range Detection', () => {
    it('should detect enemies in melee range', () => {
      combatManager.updatePlayerPosition(400, 300);
      
      const enemyStats = new PlayerStats();
      combatManager.addEnemy('enemy1', 450, 300, enemyStats); // 50px away, within 80px range
      
      expect(combatManager.isInMeleeRange(450, 300)).toBe(true);
      
      const enemiesInRange = combatManager.getEnemiesInRange();
      expect(enemiesInRange).toHaveLength(1);
      expect(enemiesInRange[0].id).toBe('enemy1');
    });

    it('should not detect enemies outside melee range', () => {
      combatManager.updatePlayerPosition(400, 300);
      
      const enemyStats = new PlayerStats();
      combatManager.addEnemy('enemy1', 500, 300, enemyStats); // 100px away, outside 80px range
      
      expect(combatManager.isInMeleeRange(500, 300)).toBe(false);
      
      const enemiesInRange = combatManager.getEnemiesInRange();
      expect(enemiesInRange).toHaveLength(0);
    });
  });

  describe('Attack Mechanics', () => {
    beforeEach(() => {
      combatManager.updatePlayerPosition(400, 300);
      
      const enemyStats = new PlayerStats();
      combatManager.addEnemy('enemy1', 450, 300, enemyStats);
    });

    it('should perform successful attacks', () => {
      const result = combatManager.performAttack(450, 300);
      
      expect(result).toBeDefined();
      expect(result!.targetId).toBe('enemy1');
      expect(typeof result!.damage).toBe('number');
      expect(typeof result!.hit).toBe('boolean');
    });

    it('should respect attack cooldown', () => {
      // First attack should succeed
      const result1 = combatManager.performAttack(450, 300);
      expect(result1).toBeDefined();
      
      // Second attack immediately should fail due to cooldown
      const result2 = combatManager.performAttack(450, 300);
      expect(result2).toBeNull();
      
      // After cooldown, should succeed again
      mockScene.time.now = 6100; // 1.1 seconds after first attack (5000 + 1100)
      const result3 = combatManager.performAttack(450, 300);
      expect(result3).toBeDefined();
    });

    it('should not attack enemies out of range', () => {
      // Move enemy out of range
      combatManager.updateEnemyPosition('enemy1', 500, 300);
      
      const result = combatManager.performAttack(500, 300);
      expect(result).toBeNull();
    });

    it('should not attack when no target at position', () => {
      const result = combatManager.performAttack(100, 100); // Empty position
      expect(result).toBeNull();
    });
  });

  describe('Combat Actions', () => {
    it('should start blocking', () => {
      expect(combatManager.isBlocking()).toBe(false);
      
      const success = combatManager.startBlock();
      expect(success).toBe(true);
      expect(combatManager.isBlocking()).toBe(true);
    });

    it('should not block while attacking', () => {
      combatManager.updatePlayerPosition(400, 300);
      const enemyStats = new PlayerStats();
      combatManager.addEnemy('enemy1', 450, 300, enemyStats);
      
      // Start attack
      const attackResult = combatManager.performAttack(450, 300);
      expect(attackResult).toBeDefined(); // Verify attack actually happened
      
      // Check immediately after attack - should still be attacking
      expect(combatManager.isAttacking()).toBe(true);
      
      // Try to block while attacking
      const blockSuccess = combatManager.startBlock();
      expect(blockSuccess).toBe(false);
    });

    it('should perform dodge', () => {
      expect(combatManager.isDodging()).toBe(false);
      
      const success = combatManager.performDodge();
      expect(success).toBe(true);
      expect(combatManager.isDodging()).toBe(true);
    });

    it('should not dodge during other actions', () => {
      // Start blocking first
      combatManager.startBlock();
      
      // Try to dodge while blocking
      const dodgeSuccess = combatManager.performDodge();
      expect(dodgeSuccess).toBe(false);
    });
  });

  describe('Combat State', () => {
    it('should track current action correctly', () => {
      expect(combatManager.getCurrentAction()).toBeNull();
      
      combatManager.startBlock();
      const action = combatManager.getCurrentAction();
      expect(action).toBeDefined();
      expect(action!.type).toBe('block');
    });

    it('should update combat state', () => {
      // This test ensures update method runs without error
      expect(() => combatManager.update()).not.toThrow();
    });

    it('should queue and process actions', () => {
      const action = {
        type: 'dodge' as const,
        timestamp: 0,
        duration: 300,
        cooldown: 2000
      };
      
      combatManager.queueAction(action);
      expect(combatManager.getCurrentAction()).toBeNull();
      
      // Process queue
      combatManager.update();
      expect(combatManager.getCurrentAction()).toBeDefined();
    });

    it('should clear action queue', () => {
      const action = {
        type: 'dodge' as const,
        timestamp: 0,
        duration: 300,
        cooldown: 2000
      };
      
      combatManager.queueAction(action);
      combatManager.clearActionQueue();
      
      // Process queue - should be empty
      combatManager.update();
      expect(combatManager.getCurrentAction()).toBeNull();
    });
  });

  describe('Player Info', () => {
    it('should return player info', () => {
      const playerInfo = combatManager.getPlayerInfo();
      expect(playerInfo.id).toBe('player');
      expect(playerInfo.stats).toBeDefined();
      expect(playerInfo.currentHealth).toBeGreaterThan(0);
      expect(playerInfo.maxHealth).toBeGreaterThan(0);
    });

    it('should return all enemies', () => {
      const enemyStats1 = new PlayerStats();
      const enemyStats2 = new PlayerStats();
      
      combatManager.addEnemy('enemy1', 100, 200, enemyStats1);
      combatManager.addEnemy('enemy2', 300, 400, enemyStats2);
      
      const allEnemies = combatManager.getAllEnemies();
      expect(allEnemies).toHaveLength(2);
      expect(allEnemies.map(e => e.id)).toContain('enemy1');
      expect(allEnemies.map(e => e.id)).toContain('enemy2');
    });
  });
});