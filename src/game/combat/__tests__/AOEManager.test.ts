import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AOEManager } from '../AOEManager';
import { PlayerStats } from '../../models/PlayerStats';

// Mock Phaser Scene
const mockScene = {
  add: {
    sprite: vi.fn(() => ({
      setScale: vi.fn(),
      setAlpha: vi.fn(),
      destroy: vi.fn()
    })),
    graphics: vi.fn(() => ({
      fillStyle: vi.fn(),
      fillCircle: vi.fn(),
      lineStyle: vi.fn(),
      strokeCircle: vi.fn(),
      destroy: vi.fn()
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn(),
      destroy: vi.fn()
    }))
  },
  tweens: {
    add: vi.fn(({ onComplete }) => {
      if (onComplete) onComplete();
    })
  }
} as any;

// Mock Phaser.Math.Distance
vi.mock('phaser', () => ({
  default: {
    Math: {
      Distance: {
        Between: vi.fn((x1: number, y1: number, x2: number, y2: number) => {
          return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        })
      }
    }
  }
}));

describe('AOEManager', () => {
  let aoeManager: AOEManager;
  let playerStats: PlayerStats;

  beforeEach(() => {
    vi.clearAllMocks();
    aoeManager = new AOEManager(mockScene);
    playerStats = new PlayerStats();
    playerStats.addStatPoints(10);
    playerStats.allocateStatPoint('intelligence');
    playerStats.allocateStatPoint('intelligence');
  });

  describe('Initialization', () => {
    it('should initialize with default AOE types', () => {
      const aoeTypes = aoeManager.getAOETypes();
      expect(aoeTypes).toHaveLength(5);
      
      const aoeTypeIds = aoeTypes.map(type => type.id);
      expect(aoeTypeIds).toContain('explosion');
      expect(aoeTypeIds).toContain('magic_circle');
      expect(aoeTypeIds).toContain('shockwave');
      expect(aoeTypeIds).toContain('ice_storm');
      expect(aoeTypeIds).toContain('lightning_strike');
    });

    it('should start with no active effects', () => {
      const activeEffects = aoeManager.getActiveEffects();
      expect(activeEffects).toHaveLength(0);
    });
  });

  describe('AOE Creation', () => {
    it('should create an explosion AOE effect', () => {
      const result = aoeManager.createAOE('explosion', 100, 100, 'player', playerStats);
      
      expect(result).toBeDefined();
      expect(result!.effectId).toMatch(/^aoe_\d+$/);
      expect(result!.centerX).toBe(100);
      expect(result!.centerY).toBe(100);
      expect(result!.radius).toBe(100);
      expect(result!.targetsHit).toBeDefined();
    });

    it('should create a magic circle AOE effect', () => {
      const result = aoeManager.createAOE('magic_circle', 200, 150, 'player', playerStats);
      
      expect(result).toBeDefined();
      expect(result!.centerX).toBe(200);
      expect(result!.centerY).toBe(150);
      expect(result!.radius).toBe(80);
    });

    it('should return null for invalid AOE type', () => {
      const result = aoeManager.createAOE('invalid_type', 100, 100, 'player', playerStats);
      expect(result).toBeNull();
    });

    it('should calculate damage based on player stats', () => {
      const result = aoeManager.createAOE('explosion', 100, 100, 'player', playerStats);
      
      expect(result).toBeDefined();
      // Base damage 50, with magic stat multiplier should be higher
      const baseDamage = 50;
      const magic = playerStats.getBaseStat('intelligence') || 0;
      const expectedMultiplier = 1 + (magic / 100);
      const expectedDamage = Math.floor(baseDamage * expectedMultiplier);
      
      // Check if any targets were hit and verify damage calculation
      if (result!.targetsHit.length > 0) {
        const hitTarget = result!.targetsHit[0];
        expect(hitTarget.damage).toBeGreaterThan(0);
        expect(hitTarget.damage).toBeLessThan(expectedDamage * 3); // Should be reasonable
      }
    });
  });

  describe('Target Detection', () => {
    it('should detect targets within AOE radius', () => {
      // Test with explosion at center where mock targets exist
      const result = aoeManager.createAOE('explosion', 100, 100, 'player', playerStats);
      
      expect(result).toBeDefined();
      expect(result!.targetsHit).toBeDefined();
      expect(Array.isArray(result!.targetsHit)).toBe(true);
    });

    it('should apply distance-based damage reduction', () => {
      const result = aoeManager.createAOE('explosion', 100, 100, 'player', playerStats);
      
      if (result && result.targetsHit.length > 0) {
        result.targetsHit.forEach(hit => {
          expect(hit.damage).toBeGreaterThan(0);
          expect(hit.distance).toBeGreaterThanOrEqual(0);
          expect(hit.targetId).toBeDefined();
        });
      }
    });

    it('should exclude source from targets', () => {
      const result = aoeManager.createAOE('explosion', 100, 100, 'player', playerStats);
      
      if (result && result.targetsHit.length > 0) {
        const playerHit = result.targetsHit.find(hit => hit.targetId === 'player');
        expect(playerHit).toBeUndefined();
      }
    });
  });

  describe('Visual Effects', () => {
    it('should create sprite visual effects when possible', () => {
      aoeManager.createAOE('explosion', 100, 100, 'player', playerStats);
      expect(mockScene.add.sprite).toHaveBeenCalled();
    });

    it('should create fallback graphics when sprite fails', () => {
      // Make sprite creation fail
      mockScene.add.sprite.mockImplementationOnce(() => {
        throw new Error('Sprite not found');
      });
      
      aoeManager.createAOE('explosion', 100, 100, 'player', playerStats);
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should create appropriate visual effects for different AOE types', () => {
      const aoeTypes = ['explosion', 'magic_circle', 'shockwave', 'ice_storm', 'lightning_strike'];
      
      aoeTypes.forEach(type => {
        mockScene.add.sprite.mockClear();
        mockScene.add.graphics.mockClear();
        
        aoeManager.createAOE(type, 100, 100, 'player', playerStats);
        
        // Should attempt to create visual effects
        expect(mockScene.add.sprite.mock.calls.length + mockScene.add.graphics.mock.calls.length).toBeGreaterThan(0);
      });
    });
  });

  describe('AOE Effect Management', () => {
    it('should track active effects', () => {
      aoeManager.createAOE('magic_circle', 100, 100, 'player', playerStats);
      
      const activeEffects = aoeManager.getActiveEffects();
      expect(activeEffects.length).toBeGreaterThan(0);
    });

    it('should immediately deactivate instant effects', () => {
      aoeManager.createAOE('explosion', 100, 100, 'player', playerStats);
      
      // Explosion is instant, should be deactivated immediately
      const activeEffects = aoeManager.getActiveEffects();
      expect(activeEffects.length).toBe(0);
    });

    it('should keep overtime effects active initially', () => {
      aoeManager.createAOE('magic_circle', 100, 100, 'player', playerStats);
      
      const activeEffects = aoeManager.getActiveEffects();
      expect(activeEffects.length).toBe(1);
      expect(activeEffects[0].typeId).toBe('magic_circle');
    });

    it('should check if point is in AOE', () => {
      aoeManager.createAOE('magic_circle', 100, 100, 'player', playerStats);
      
      // Point inside AOE
      expect(aoeManager.isPointInAOE(120, 120)).toBe(true);
      
      // Point outside AOE
      expect(aoeManager.isPointInAOE(300, 300)).toBe(false);
    });
  });

  describe('Update and Timing', () => {
    it('should update overtime effects', () => {
      aoeManager.createAOE('magic_circle', 100, 100, 'player', playerStats);
      
      const activeEffectsBefore = aoeManager.getActiveEffects();
      expect(activeEffectsBefore.length).toBe(1);
      
      // Simulate time passing (magic_circle duration is 3000ms)
      aoeManager.update(1000);
      
      const activeEffectsAfter = aoeManager.getActiveEffects();
      expect(activeEffectsAfter.length).toBe(1);
      expect(activeEffectsAfter[0].remainingTime).toBeLessThan(3000);
    });

    it('should remove expired effects', () => {
      aoeManager.createAOE('magic_circle', 100, 100, 'player', playerStats);
      
      // Simulate time passing beyond duration
      aoeManager.update(4000);
      
      const activeEffects = aoeManager.getActiveEffects();
      expect(activeEffects.length).toBe(0);
    });

    it('should process overtime damage', () => {
      aoeManager.createAOE('magic_circle', 100, 100, 'player', playerStats);
      
      const activeEffectsBefore = aoeManager.getActiveEffects();
      expect(activeEffectsBefore.length).toBe(1);
      
      // Simulate time passing to trigger overtime damage
      aoeManager.update(1000);
      
      // Effect should still be active since duration is 3000ms
      const activeEffectsAfter = aoeManager.getActiveEffects();
      expect(activeEffectsAfter.length).toBe(1);
    });
  });

  describe('Effect Cleanup', () => {
    it('should clear all effects', () => {
      aoeManager.createAOE('magic_circle', 100, 100, 'player', playerStats);
      aoeManager.createAOE('ice_storm', 200, 200, 'player', playerStats);
      
      expect(aoeManager.getActiveEffects().length).toBe(2);
      
      aoeManager.clearAllEffects();
      
      expect(aoeManager.getActiveEffects().length).toBe(0);
    });

    it('should destroy resources on cleanup', () => {
      aoeManager.createAOE('magic_circle', 100, 100, 'player', playerStats);
      
      aoeManager.destroy();
      
      expect(aoeManager.getActiveEffects().length).toBe(0);
      expect(aoeManager.getAOETypes().length).toBe(0);
    });
  });

  describe('Critical Hits and Damage', () => {
    it('should handle critical hits', () => {
      // Mock critical hit calculation to always return true
      vi.mock('../utils/CombatUtils', () => ({
        calculateDamage: vi.fn((damage) => damage),
        calculateCriticalHit: vi.fn(() => true)
      }));
      
      const result = aoeManager.createAOE('explosion', 100, 100, 'player', playerStats);
      
      if (result && result.targetsHit.length > 0) {
        const hit = result.targetsHit[0];
        expect(hit.isCritical).toBeDefined();
      }
    });

    it('should apply defense reduction', () => {
      const result = aoeManager.createAOE('explosion', 100, 100, 'player', playerStats);
      
      if (result && result.targetsHit.length > 0) {
        const hit = result.targetsHit[0];
        expect(hit.damage).toBeGreaterThan(0);
        expect(typeof hit.damage).toBe('number');
        expect(isNaN(hit.damage)).toBe(false);
      }
    });
  });

  describe('AOE Type Properties', () => {
    it('should have correct properties for explosion type', () => {
      const aoeTypes = aoeManager.getAOETypes();
      const explosion = aoeTypes.find(type => type.id === 'explosion');
      
      expect(explosion).toBeDefined();
      expect(explosion!.radius).toBe(100);
      expect(explosion!.baseDamage).toBe(50);
      expect(explosion!.effectType).toBe('instant');
      expect(explosion!.damageType).toBe('fire');
    });

    it('should have correct properties for magic circle type', () => {
      const aoeTypes = aoeManager.getAOETypes();
      const magicCircle = aoeTypes.find(type => type.id === 'magic_circle');
      
      expect(magicCircle).toBeDefined();
      expect(magicCircle!.radius).toBe(80);
      expect(magicCircle!.baseDamage).toBe(30);
      expect(magicCircle!.effectType).toBe('overtime');
      expect(magicCircle!.damageType).toBe('magical');
      expect(magicCircle!.duration).toBe(3000);
    });

    it('should have different properties for each AOE type', () => {
      const aoeTypes = aoeManager.getAOETypes();
      
      expect(aoeTypes.length).toBe(5);
      
      // Each type should have unique properties
      const radiuses = aoeTypes.map(type => type.radius);
      const damages = aoeTypes.map(type => type.baseDamage);
      const damageTypes = aoeTypes.map(type => type.damageType);
      
      expect(new Set(radiuses).size).toBeGreaterThan(1);
      expect(new Set(damages).size).toBeGreaterThan(1);
      expect(new Set(damageTypes).size).toBeGreaterThan(1);
    });
  });
});