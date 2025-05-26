import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Scene } from 'phaser';
import { EnemySpawner, SpawnZone, SpawnWave } from '../EnemySpawner';
import { EnemyFactory, EnemyType } from '../EnemyFactory';

// Mock Phaser Scene
const mockScene = {
  scale: {
    width: 800,
    height: 600
  },
  time: {
    delayedCall: vi.fn((delay, callback) => {
      // Immediately execute for testing
      callback();
    })
  }
} as unknown as Scene;

// Mock Enemy
const mockEnemy = {
  getName: () => 'Test Enemy',
  getPosition: () => ({ x: 100, y: 100 }),
  isDead: () => false,
  destroy: vi.fn()
};

// Mock EnemyFactory
const mockFactory = {
  createEnemy: vi.fn().mockReturnValue(mockEnemy),
  createSwarm: vi.fn().mockReturnValue([mockEnemy]),
  returnEnemyToPool: vi.fn(),
  update: vi.fn()
} as unknown as EnemyFactory;

describe('EnemySpawner', () => {
  let spawner: EnemySpawner;

  beforeEach(() => {
    spawner = new EnemySpawner(mockScene, mockFactory);
    vi.clearAllMocks();
  });

  afterEach(() => {
    spawner.destroy();
  });

  describe('Spawn Zone Management', () => {
    it('should add and activate spawn zones', () => {
      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 0.5,
        maxEnemies: 10,
        level: 1,
        isActive: false
      };

      spawner.addSpawnZone(zone);
      
      expect(spawner.getActiveZones()).toHaveLength(0);

      spawner.activateZone('test_zone');
      
      expect(spawner.getActiveZones()).toContain('test_zone');
    });

    it('should deactivate and remove spawn zones', () => {
      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 0.5,
        maxEnemies: 10,
        level: 1,
        isActive: true
      };

      spawner.addSpawnZone(zone);
      expect(spawner.getActiveZones()).toContain('test_zone');

      spawner.deactivateZone('test_zone');
      expect(spawner.getActiveZones()).toHaveLength(0);

      spawner.removeSpawnZone('test_zone');
      // Zone should be completely removed
    });

    it('should emit zone activation events', () => {
      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 0.5,
        maxEnemies: 10,
        level: 1,
        isActive: false
      };

      const eventListener = vi.fn();
      spawner.addEventListener(eventListener);
      spawner.addSpawnZone(zone);
      spawner.activateZone('test_zone');

      expect(eventListener).toHaveBeenCalledWith({
        type: 'zoneActivated',
        data: { zoneId: 'test_zone', zone }
      });
    });
  });

  describe('Spawn Wave Management', () => {
    it('should add and start spawn waves', () => {
      const wave: SpawnWave = {
        id: 'test_wave',
        enemies: [
          { type: 'wraith', count: 3, delay: 0 },
          { type: 'ironGolem', count: 1, delay: 1000 }
        ],
        triggerCondition: 'manual',
        isRepeating: false
      };

      const eventListener = vi.fn();
      spawner.addEventListener(eventListener);
      spawner.addSpawnWave(wave);

      const result = spawner.startWave('test_wave');

      expect(result).toBe(true);
      expect(spawner.getActiveWaves()).toContain('test_wave');
      expect(eventListener).toHaveBeenCalledWith({
        type: 'waveStarted',
        data: { waveId: 'test_wave', wave }
      });
    });

    it('should not start already active waves', () => {
      const wave: SpawnWave = {
        id: 'test_wave',
        enemies: [{ type: 'wraith', count: 1, delay: 0 }],
        triggerCondition: 'manual',
        isRepeating: false
      };

      spawner.addSpawnWave(wave);
      spawner.startWave('test_wave');

      // Try to start the same wave again
      const result = spawner.startWave('test_wave');
      expect(result).toBe(false);
    });

    it('should execute wave enemies with delays', () => {
      const wave: SpawnWave = {
        id: 'test_wave',
        enemies: [
          { type: 'wraith', count: 2, delay: 0 },
          { type: 'ironGolem', count: 1, delay: 500 }
        ],
        triggerCondition: 'manual',
        isRepeating: false
      };

      spawner.addSpawnWave(wave);
      spawner.startWave('test_wave');

      // Should call delayedCall for each enemy group
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
    });

    it('should create swarms for carrion bats', () => {
      const wave: SpawnWave = {
        id: 'bat_wave',
        enemies: [
          { type: 'carrionBats', count: 5, delay: 0, isSwarmLeader: true }
        ],
        triggerCondition: 'manual',
        isRepeating: false
      };

      spawner.addSpawnWave(wave);
      spawner.startWave('bat_wave');

      expect(mockFactory.createSwarm).toHaveBeenCalled();
    });

    it('should remove waves', () => {
      const wave: SpawnWave = {
        id: 'test_wave',
        enemies: [{ type: 'wraith', count: 1, delay: 0 }],
        triggerCondition: 'manual',
        isRepeating: false
      };

      spawner.addSpawnWave(wave);
      spawner.startWave('test_wave');
      
      expect(spawner.getActiveWaves()).toContain('test_wave');

      spawner.removeSpawnWave('test_wave');
      
      expect(spawner.getActiveWaves()).not.toContain('test_wave');
    });
  });

  describe('Continuous Spawning', () => {
    it('should spawn enemies in active zones based on spawn rate', () => {
      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 1, // 1 enemy per second
        maxEnemies: 10,
        level: 1,
        isActive: true
      };

      spawner.addSpawnZone(zone);

      // Simulate update calls (spawning should happen based on timing)
      spawner.update(1000); // 1 second

      expect(mockFactory.createEnemy).toHaveBeenCalled();
    });

    it('should not spawn when zone is at capacity', () => {
      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 1,
        maxEnemies: 0, // No capacity
        level: 1,
        isActive: true
      };

      spawner.addSpawnZone(zone);
      spawner.update(1000);

      expect(mockFactory.createEnemy).not.toHaveBeenCalled();
    });

    it('should clean up destroyed enemies', () => {
      const deadEnemy = {
        ...mockEnemy,
        isDead: () => true
      };

      vi.mocked(mockFactory.createEnemy).mockReturnValueOnce(deadEnemy);

      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 1,
        maxEnemies: 10,
        level: 1,
        isActive: true
      };

      spawner.addSpawnZone(zone);
      spawner.update(1000);
      spawner.update(16); // Next frame

      expect(mockFactory.returnEnemyToPool).toHaveBeenCalledWith(deadEnemy);
    });
  });

  describe('Event System', () => {
    it('should add and remove event listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      spawner.addEventListener(listener1);
      spawner.addEventListener(listener2);

      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 1,
        maxEnemies: 10,
        level: 1,
        isActive: false
      };

      spawner.addSpawnZone(zone);
      spawner.activateZone('test_zone');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      spawner.removeEventListener(listener1);
      spawner.deactivateZone('test_zone');

      // listener1 should not be called again, but listener2 should
      expect(listener2).toHaveBeenCalledTimes(2);
    });

    it('should emit enemy spawned events', () => {
      const eventListener = vi.fn();
      spawner.addEventListener(eventListener);

      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 1,
        maxEnemies: 10,
        level: 1,
        isActive: true
      };

      spawner.addSpawnZone(zone);
      spawner.update(1000);

      expect(eventListener).toHaveBeenCalledWith({
        type: 'enemySpawned',
        data: expect.objectContaining({
          enemy: mockEnemy,
          type: 'wraith'
        })
      });
    });
  });

  describe('Utility Methods', () => {
    it('should count spawned enemies', () => {
      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 1,
        maxEnemies: 10,
        level: 1,
        isActive: true
      };

      spawner.addSpawnZone(zone);
      spawner.update(1000);

      expect(spawner.getSpawnedEnemyCount()).toBe(1);
    });

    it('should get spawned enemies by type', () => {
      vi.mocked(mockEnemy.getName).mockReturnValue('Wraith');

      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 1,
        maxEnemies: 10,
        level: 1,
        isActive: true
      };

      spawner.addSpawnZone(zone);
      spawner.update(1000);

      const wraithEnemies = spawner.getSpawnedEnemiesByType('wraith');
      expect(wraithEnemies).toHaveLength(1);
      expect(wraithEnemies[0]).toBe(mockEnemy);
    });

    it('should clear all enemies', () => {
      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 1,
        maxEnemies: 10,
        level: 1,
        isActive: true
      };

      spawner.addSpawnZone(zone);
      spawner.update(1000);

      expect(spawner.getSpawnedEnemyCount()).toBe(1);

      spawner.clearAllEnemies();

      expect(spawner.getSpawnedEnemyCount()).toBe(0);
      expect(mockFactory.returnEnemyToPool).toHaveBeenCalledWith(mockEnemy);
    });

    it('should stop all waves', () => {
      const wave: SpawnWave = {
        id: 'test_wave',
        enemies: [{ type: 'wraith', count: 1, delay: 0 }],
        triggerCondition: 'manual',
        isRepeating: false
      };

      spawner.addSpawnWave(wave);
      spawner.startWave('test_wave');

      expect(spawner.getActiveWaves()).toContain('test_wave');

      spawner.stopAllWaves();

      expect(spawner.getActiveWaves()).toHaveLength(0);
    });
  });

  describe('Spawn Position Generation', () => {
    it('should generate positions within spawn zones', () => {
      const zone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 1,
        maxEnemies: 10,
        level: 1,
        isActive: true
      };

      spawner.addSpawnZone(zone);
      spawner.update(1000);

      expect(mockFactory.createEnemy).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number)
        })
      );

      const call = vi.mocked(mockFactory.createEnemy).mock.calls[0];
      const config = call[0];
      
      expect(config.x).toBeGreaterThanOrEqual(zone.x);
      expect(config.x).toBeLessThanOrEqual(zone.x + zone.width);
      expect(config.y).toBeGreaterThanOrEqual(zone.y);
      expect(config.y).toBeLessThanOrEqual(zone.y + zone.height);
    });

    it('should generate edge positions when no zone is specified', () => {
      const wave: SpawnWave = {
        id: 'test_wave',
        enemies: [{ type: 'wraith', count: 1, delay: 0 }],
        triggerCondition: 'manual',
        isRepeating: false
      };

      spawner.addSpawnWave(wave);
      spawner.startWave('test_wave');

      expect(mockFactory.createEnemy).toHaveBeenCalled();
      
      const call = vi.mocked(mockFactory.createEnemy).mock.calls[0];
      const config = call[0];
      
      // Should be outside screen bounds (edge spawning)
      const isOnEdge = 
        config.x < 0 || config.x > mockScene.scale.width ||
        config.y < 0 || config.y > mockScene.scale.height;
      
      expect(isOnEdge).toBe(true);
    });
  });
});