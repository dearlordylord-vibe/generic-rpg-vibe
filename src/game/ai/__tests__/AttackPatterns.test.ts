import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttackPatternManager, WraithAttackPatterns, IronGolemAttackPatterns, CarrionBatsAttackPatterns, AttackPatternContext } from '../AttackPatterns';
import { NodeStatus } from '../BehaviorTree';
import { Enemy } from '../../enemies/Enemy';

// Mock Phaser
const mockPhaser = {
  Math: {
    Distance: {
      Between: vi.fn(() => 100)
    },
    Angle: {
      Between: vi.fn(() => 0)
    },
    Clamp: vi.fn((value: number, min: number, max: number) => Math.max(min, Math.min(max, value)))
  },
  Scene: class MockScene {
    add = {
      circle: vi.fn(() => ({ setStrokeStyle: vi.fn(), destroy: vi.fn() })),
      sprite: vi.fn(() => ({ setTint: vi.fn(), setAlpha: vi.fn(), setScale: vi.fn(), destroy: vi.fn() })),
      graphics: vi.fn(() => ({ lineStyle: vi.fn(), lineBetween: vi.fn(), clear: vi.fn(), destroy: vi.fn() })),
      text: vi.fn(() => ({ setOrigin: vi.fn(), destroy: vi.fn() })),
      rectangle: vi.fn(() => ({ destroy: vi.fn() }))
    };
    tweens = {
      add: vi.fn()
    };
    time = {
      delayedCall: vi.fn()
    };
    cameras = {
      main: {
        shake: vi.fn()
      }
    };
  },
  GameObjects: {
    Sprite: class MockSprite {
      x = 100;
      y = 100;
      texture = 'test';
      destroy = vi.fn();
      setPosition = vi.fn();
      setTint = vi.fn();
      setAlpha = vi.fn();
      setScale = vi.fn();
    }
  }
};

// @ts-ignore
global.Phaser = mockPhaser;

// Mock Enemy class
class MockEnemy extends Enemy {
  private mockStats = {
    level: 1,
    maxHealth: 100,
    currentHealth: 100,
    maxMana: 50,
    currentMana: 50,
    physicalDamage: 20,
    magicDamage: 15,
    defense: 10,
    evasion: 5,
    criticalChance: 10,
    criticalDamage: 150,
    experienceReward: 100
  };

  private mockSprite = {
    x: 100,
    y: 100,
    setPosition: vi.fn(),
    setTint: vi.fn(),
    setAlpha: vi.fn(),
    setScale: vi.fn(),
    destroy: vi.fn()
  };

  constructor() {
    super(new mockPhaser.Scene() as any, 100, 100, 'test', 0);
  }

  protected getEnemyName(): string {
    return 'MockEnemy';
  }

  protected initializeStats() {
    return this.mockStats;
  }

  protected initializeBehaviors(): void {}

  public getStats() {
    return this.mockStats;
  }

  public getSprite() {
    return this.mockSprite;
  }

  public emitEvent = vi.fn();
  public heal = vi.fn();
}

describe('AttackPatterns', () => {
  let manager: AttackPatternManager;
  let mockEnemy: MockEnemy;
  let mockTarget: any;
  let mockScene: any;
  let context: AttackPatternContext;

  beforeEach(() => {
    manager = new AttackPatternManager();
    mockEnemy = new MockEnemy();
    mockTarget = new mockPhaser.GameObjects.Sprite();
    mockScene = new mockPhaser.Scene();
    
    context = {
      enemy: mockEnemy,
      target: mockTarget,
      scene: mockScene,
      deltaTime: 16
    };

    vi.clearAllMocks();
  });

  describe('AttackPatternManager', () => {
    it('should initialize with patterns for all enemy types', () => {
      expect(manager.getAvailablePatterns('Wraith')).toHaveLength(2);
      expect(manager.getAvailablePatterns('Iron Golem')).toHaveLength(2);
      expect(manager.getAvailablePatterns('Carrion Bat')).toHaveLength(2);
    });

    it('should return empty array for unknown enemy type', () => {
      expect(manager.getAvailablePatterns('Unknown')).toHaveLength(0);
    });

    it('should select best available pattern', () => {
      const pattern = manager.selectBestPattern('Wraith', context);
      expect(pattern).toBeTruthy();
      expect(pattern?.name).toBe('PhaseStrike');
    });

    it('should respect cooldowns when selecting patterns', () => {
      const pattern = manager.selectBestPattern('Wraith', context);
      if (pattern) {
        // Execute pattern to set lastUsed
        manager.executePattern(pattern, context);
        
        // Try to select again immediately - should be null due to cooldown
        const secondPattern = manager.selectBestPattern('Wraith', context);
        expect(secondPattern?.name).not.toBe(pattern.name);
      }
    });
  });

  describe('WraithAttackPatterns', () => {
    describe('PhaseStrike', () => {
      let pattern: any;

      beforeEach(() => {
        pattern = WraithAttackPatterns.createPhaseStrikePattern();
      });

      it('should create PhaseStrike pattern with correct properties', () => {
        expect(pattern.name).toBe('PhaseStrike');
        expect(pattern.priority).toBe(8);
        expect(pattern.cooldown).toBe(6000);
      });

      it('should execute with sufficient mana', () => {
        mockEnemy.getStats().currentMana = 50;
        const result = pattern.execute(context);
        // Pattern returns RUNNING due to wait node in sequence
        expect([NodeStatus.SUCCESS, NodeStatus.RUNNING]).toContain(result);
      });

      it('should not execute without sufficient mana', () => {
        mockEnemy.getStats().currentMana = 10;
        vi.mocked(mockPhaser.Math.Distance.Between).mockReturnValue(250); // Outside range
        const canExecute = pattern.canExecute(context);
        expect(canExecute).toBe(false);
      });
    });

    describe('SpiritBarrage', () => {
      let pattern: any;

      beforeEach(() => {
        pattern = WraithAttackPatterns.createSpiritBarragePattern();
      });

      it('should create SpiritBarrage pattern with correct properties', () => {
        expect(pattern.name).toBe('SpiritBarrage');
        expect(pattern.priority).toBe(6);
        expect(pattern.cooldown).toBe(10000);
      });

      it('should require sufficient mana to execute', () => {
        mockEnemy.getStats().currentMana = 30;
        const canExecute = pattern.canExecute(context);
        expect(canExecute).toBe(false);

        mockEnemy.getStats().currentMana = 50;
        const canExecute2 = pattern.canExecute(context);
        expect(canExecute2).toBe(true);
      });
    });
  });

  describe('IronGolemAttackPatterns', () => {
    describe('Earthquake', () => {
      let pattern: any;

      beforeEach(() => {
        pattern = IronGolemAttackPatterns.createEarthquakePattern();
      });

      it('should create Earthquake pattern with correct properties', () => {
        expect(pattern.name).toBe('Earthquake');
        expect(pattern.priority).toBe(9);
        expect(pattern.cooldown).toBe(15000);
      });

      it('should execute based on distance', () => {
        vi.mocked(mockPhaser.Math.Distance.Between).mockReturnValue(250);
        const canExecute = pattern.canExecute(context);
        expect(canExecute).toBe(true);

        vi.mocked(mockPhaser.Math.Distance.Between).mockReturnValue(350);
        const canExecute2 = pattern.canExecute(context);
        expect(canExecute2).toBe(false);
      });
    });

    describe('MeteorStrike', () => {
      let pattern: any;

      beforeEach(() => {
        pattern = IronGolemAttackPatterns.createMeteorStrikePattern();
      });

      it('should create MeteorStrike pattern with correct properties', () => {
        expect(pattern.name).toBe('MeteorStrike');
        expect(pattern.priority).toBe(10);
        expect(pattern.cooldown).toBe(20000);
      });

      it('should only execute when health is low', () => {
        mockEnemy.getStats().currentHealth = 80;
        mockEnemy.getStats().maxHealth = 100;
        const canExecute = pattern.canExecute(context);
        expect(canExecute).toBe(false);

        mockEnemy.getStats().currentHealth = 40;
        mockEnemy.getStats().maxHealth = 100;
        const canExecute2 = pattern.canExecute(context);
        expect(canExecute2).toBe(true);
      });
    });
  });

  describe('CarrionBatsAttackPatterns', () => {
    describe('VenomStorm', () => {
      let pattern: any;

      beforeEach(() => {
        pattern = CarrionBatsAttackPatterns.createVenomStormPattern();
      });

      it('should create VenomStorm pattern with correct properties', () => {
        expect(pattern.name).toBe('VenomStorm');
        expect(pattern.priority).toBe(7);
        expect(pattern.cooldown).toBe(12000);
      });

      it('should require sufficient mana', () => {
        mockEnemy.getStats().currentMana = 20;
        const canExecute = pattern.canExecute(context);
        expect(canExecute).toBe(false);

        mockEnemy.getStats().currentMana = 35;
        const canExecute2 = pattern.canExecute(context);
        expect(canExecute2).toBe(true);
      });
    });

    describe('SwarmBlitz', () => {
      let pattern: any;
      let mockCarrionBat: any;

      beforeEach(() => {
        pattern = CarrionBatsAttackPatterns.createSwarmBlitzPattern();
        mockCarrionBat = new MockEnemy();
        mockCarrionBat.getIsSwarmLeader = vi.fn(() => true);
        mockCarrionBat.getSwarmMatesCount = vi.fn(() => 3);
      });

      it('should create SwarmBlitz pattern with correct properties', () => {
        expect(pattern.name).toBe('SwarmBlitz');
        expect(pattern.priority).toBe(9);
        expect(pattern.cooldown).toBe(18000);
      });

      it('should only execute for swarm leaders with low health', () => {
        mockCarrionBat.getStats().currentHealth = 60;
        mockCarrionBat.getStats().maxHealth = 100;
        const contextWithBat = { ...context, enemy: mockCarrionBat };
        
        const canExecute = pattern.canExecute(contextWithBat);
        expect(canExecute).toBe(false);

        mockCarrionBat.getStats().currentHealth = 30;
        mockCarrionBat.getStats().maxHealth = 100;
        const canExecute2 = pattern.canExecute(contextWithBat);
        expect(canExecute2).toBe(true);
      });

      it('should not execute for non-leaders', () => {
        mockCarrionBat.getIsSwarmLeader.mockReturnValue(false);
        mockCarrionBat.getStats().currentHealth = 30;
        mockCarrionBat.getStats().maxHealth = 100;
        const contextWithBat = { ...context, enemy: mockCarrionBat };
        
        const canExecute = pattern.canExecute(contextWithBat);
        expect(canExecute).toBe(false);
      });
    });
  });
});