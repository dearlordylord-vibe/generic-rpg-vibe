import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Scene } from 'phaser';
import { EnemyFactory, EnemyType, EnemySpawnConfig } from '../EnemyFactory';
import { Enemy } from '../Enemy';
import { Wraith } from '../Wraith';
import { IronGolem } from '../IronGolem';
import { CarrionBats } from '../CarrionBats';

// Mock Phaser Scene
const mockScene = {
  add: {
    sprite: vi.fn().mockReturnValue({
      setPosition: vi.fn(),
      setVisible: vi.fn(),
      setActive: vi.fn(),
      destroy: vi.fn()
    })
  },
  physics: {
    add: {
      existing: vi.fn()
    }
  },
  scale: {
    width: 800,
    height: 600
  },
  time: {
    delayedCall: vi.fn()
  },
  tweens: {
    add: vi.fn()
  },
  cameras: {
    main: {
      shake: vi.fn()
    }
  }
} as unknown as Scene;

// Mock Enemy classes to avoid complex setup
vi.mock('../Wraith', () => ({
  Wraith: vi.fn().mockImplementation((scene, x, y) => ({
    getName: () => 'Wraith',
    getSprite: () => ({ setPosition: vi.fn(), setVisible: vi.fn(), setActive: vi.fn(), body: null }),
    setState: vi.fn(),
    setTarget: vi.fn(),
    getStats: () => ({ maxHealth: 100, currentHealth: 100, maxMana: 50, currentMana: 50 }),
    isDead: () => false,
    destroy: vi.fn(),
    update: vi.fn()
  }))
}));

vi.mock('../IronGolem', () => ({
  IronGolem: vi.fn().mockImplementation((scene, x, y) => ({
    getName: () => 'Iron Golem',
    getSprite: () => ({ setPosition: vi.fn(), setVisible: vi.fn(), setActive: vi.fn(), body: null }),
    setState: vi.fn(),
    setTarget: vi.fn(),
    getStats: () => ({ maxHealth: 200, currentHealth: 200, maxMana: 30, currentMana: 30 }),
    isDead: () => false,
    destroy: vi.fn(),
    update: vi.fn()
  }))
}));

vi.mock('../CarrionBats', () => ({
  CarrionBats: vi.fn().mockImplementation((scene, x, y, isLeader) => ({
    getName: () => isLeader ? 'Carrion Bat Swarm Leader' : 'Carrion Bat',
    getSprite: () => ({ setPosition: vi.fn(), setVisible: vi.fn(), setActive: vi.fn(), body: null }),
    setState: vi.fn(),
    setTarget: vi.fn(),
    getStats: () => ({ maxHealth: 60, currentHealth: 60, maxMana: 20, currentMana: 20 }),
    isDead: () => false,
    destroy: vi.fn(),
    update: vi.fn(),
    addSwarmMate: vi.fn()
  }))
}));

describe('EnemyFactory', () => {
  let factory: EnemyFactory;

  beforeEach(() => {
    factory = new EnemyFactory(mockScene);
    vi.clearAllMocks();
  });

  afterEach(() => {
    factory.destroy();
  });

  describe('Enemy Creation', () => {
    it('should create a wraith enemy', () => {
      const config: EnemySpawnConfig = {
        type: 'wraith',
        x: 100,
        y: 200
      };

      const enemy = factory.createEnemy(config);

      expect(enemy).toBeTruthy();
      expect(Wraith).toHaveBeenCalledWith(mockScene, 100, 200);
    });

    it('should create an iron golem enemy', () => {
      const config: EnemySpawnConfig = {
        type: 'ironGolem',
        x: 150,
        y: 250
      };

      const enemy = factory.createEnemy(config);

      expect(enemy).toBeTruthy();
      expect(IronGolem).toHaveBeenCalledWith(mockScene, 150, 250);
    });

    it('should create carrion bats enemy', () => {
      const config: EnemySpawnConfig = {
        type: 'carrionBats',
        x: 200,
        y: 300,
        isSwarmLeader: true
      };

      const enemy = factory.createEnemy(config);

      expect(enemy).toBeTruthy();
      expect(CarrionBats).toHaveBeenCalledWith(mockScene, 200, 300, true);
    });

    it('should return null for unknown enemy type', () => {
      const config = {
        type: 'unknown' as EnemyType,
        x: 100,
        y: 200
      };

      const enemy = factory.createEnemy(config);

      expect(enemy).toBeNull();
    });
  });

  describe('Enemy Pooling', () => {
    it('should reuse enemies from the pool', () => {
      const config: EnemySpawnConfig = {
        type: 'wraith',
        x: 100,
        y: 200
      };

      // Create first enemy
      const enemy1 = factory.createEnemy(config);
      expect(enemy1).toBeTruthy();
      expect(Wraith).toHaveBeenCalledTimes(1);

      // Return enemy to pool
      factory.returnEnemyToPool(enemy1!);

      // Create second enemy - should reuse from pool
      const config2: EnemySpawnConfig = {
        type: 'wraith',
        x: 150,
        y: 250
      };
      const enemy2 = factory.createEnemy(config2);

      expect(enemy2).toBeTruthy();
      expect(enemy2).toBe(enemy1); // Should be the same instance
      expect(Wraith).toHaveBeenCalledTimes(1); // No new instance created
    });

    it('should track active and inactive enemies correctly', () => {
      const config: EnemySpawnConfig = {
        type: 'wraith',
        x: 100,
        y: 200
      };

      const enemy = factory.createEnemy(config);
      expect(enemy).toBeTruthy();

      const stats = factory.getPoolStats();
      expect(stats.wraith.active).toBe(1);
      expect(stats.wraith.inactive).toBe(0);

      factory.returnEnemyToPool(enemy!);

      const statsAfterReturn = factory.getPoolStats();
      expect(statsAfterReturn.wraith.active).toBe(0);
      expect(statsAfterReturn.wraith.inactive).toBe(1);
    });

    it('should destroy enemies when pool is full', () => {
      factory.setPoolSize('wraith', 1);

      const config: EnemySpawnConfig = {
        type: 'wraith',
        x: 100,
        y: 200
      };

      // Create and return two enemies
      const enemy1 = factory.createEnemy(config);
      const enemy2 = factory.createEnemy(config);

      factory.returnEnemyToPool(enemy1!);
      factory.returnEnemyToPool(enemy2!);

      // Pool should only have one enemy, second should be destroyed
      const stats = factory.getPoolStats();
      expect(stats.wraith.inactive).toBe(1);
      expect(enemy2!.destroy).toHaveBeenCalled();
    });
  });

  describe('Swarm Creation', () => {
    it('should create a swarm of carrion bats', () => {
      const config = {
        type: 'carrionBats' as const,
        x: 100,
        y: 200
      };

      const swarm = factory.createSwarm(config, 3);

      expect(swarm).toHaveLength(3);
      expect(CarrionBats).toHaveBeenCalledTimes(3);
      
      // First call should be for the leader
      expect(CarrionBats).toHaveBeenNthCalledWith(1, mockScene, 100, 200, true);
      // Subsequent calls should be for followers
      expect(CarrionBats).toHaveBeenNthCalledWith(2, mockScene, expect.any(Number), expect.any(Number), false);
      expect(CarrionBats).toHaveBeenNthCalledWith(3, mockScene, expect.any(Number), expect.any(Number), false);
    });

    it('should not create swarm for non-bat enemies', () => {
      const config = {
        type: 'wraith' as const,
        x: 100,
        y: 200
      };

      const swarm = factory.createSwarm(config, 3);

      expect(swarm).toHaveLength(0);
    });
  });

  describe('Active Enemy Management', () => {
    it('should return all active enemies', () => {
      const configs: EnemySpawnConfig[] = [
        { type: 'wraith', x: 100, y: 200 },
        { type: 'ironGolem', x: 150, y: 250 },
        { type: 'carrionBats', x: 200, y: 300 }
      ];

      const enemies = configs.map(config => factory.createEnemy(config));

      const activeEnemies = factory.getActiveEnemies();
      expect(activeEnemies).toHaveLength(3);
      expect(activeEnemies).toEqual(expect.arrayContaining(enemies));
    });

    it('should return active enemies by type', () => {
      const configs: EnemySpawnConfig[] = [
        { type: 'wraith', x: 100, y: 200 },
        { type: 'wraith', x: 110, y: 210 },
        { type: 'ironGolem', x: 150, y: 250 }
      ];

      configs.forEach(config => factory.createEnemy(config));

      const wraithEnemies = factory.getActiveEnemies('wraith');
      const golemEnemies = factory.getActiveEnemies('ironGolem');

      expect(wraithEnemies).toHaveLength(2);
      expect(golemEnemies).toHaveLength(1);
    });
  });

  describe('Pool Management', () => {
    it('should set pool size correctly', () => {
      factory.setPoolSize('wraith', 5);

      const stats = factory.getPoolStats();
      expect(stats.wraith.total).toBeLessThanOrEqual(5);
    });

    it('should clear specific pool', () => {
      const config: EnemySpawnConfig = {
        type: 'wraith',
        x: 100,
        y: 200
      };

      const enemy = factory.createEnemy(config);
      expect(enemy).toBeTruthy();

      factory.clearPool('wraith');

      const stats = factory.getPoolStats();
      expect(stats.wraith.active).toBe(0);
      expect(stats.wraith.inactive).toBe(0);
    });

    it('should clear all pools', () => {
      const configs: EnemySpawnConfig[] = [
        { type: 'wraith', x: 100, y: 200 },
        { type: 'ironGolem', x: 150, y: 250 }
      ];

      configs.forEach(config => factory.createEnemy(config));

      factory.clearPool();

      const stats = factory.getPoolStats();
      Object.values(stats).forEach(poolStats => {
        expect(poolStats.active).toBe(0);
        expect(poolStats.inactive).toBe(0);
      });
    });
  });

  describe('Update Method', () => {
    it('should update all active enemies', () => {
      const configs: EnemySpawnConfig[] = [
        { type: 'wraith', x: 100, y: 200 },
        { type: 'ironGolem', x: 150, y: 250 }
      ];

      const enemies = configs.map(config => factory.createEnemy(config));

      factory.update(16.67); // ~60fps

      enemies.forEach(enemy => {
        expect(enemy!.update).toHaveBeenCalledWith(16.67);
      });
    });

    it('should automatically return dead enemies to pool', () => {
      const config: EnemySpawnConfig = {
        type: 'wraith',
        x: 100,
        y: 200
      };

      const enemy = factory.createEnemy(config);
      expect(enemy).toBeTruthy();

      // Mock enemy as dead
      vi.mocked(enemy!.isDead).mockReturnValue(true);

      factory.update(16.67);

      const stats = factory.getPoolStats();
      expect(stats.wraith.active).toBe(0);
      expect(stats.wraith.inactive).toBe(1);
    });
  });
});