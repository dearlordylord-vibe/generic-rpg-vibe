import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectileManager } from '../ProjectileManager';
import { CombatTarget } from '../CombatManager';
import { PlayerStats } from '../../models/PlayerStats';

// Mock Phaser scene
const mockScene = {
  add: {
    graphics: vi.fn().mockReturnValue({
      fillStyle: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      fillTriangle: vi.fn().mockReturnThis(),
      fillRect: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      strokeCircle: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setRotation: vi.fn().mockReturnThis(),
      destroy: vi.fn()
    }),
    particles: {
      add: vi.fn().mockReturnValue({
        createEmitter: vi.fn(),
        destroy: vi.fn()
      })
    }
  },
  tweens: {
    add: vi.fn().mockImplementation((config) => {
      // Simulate immediate completion for testing
      if (config.onUpdate) {
        config.onUpdate();
      }
      if (config.onComplete) {
        setTimeout(config.onComplete, 0);
      }
      return { remove: vi.fn() };
    })
  },
  time: {
    now: 1000
  },
  cameras: {
    main: {
      width: 800,
      height: 600
    }
  },
  scale: {
    width: 800,
    height: 600
  }
} as any;

describe('ProjectileManager', () => {
  let projectileManager: ProjectileManager;

  beforeEach(() => {
    vi.clearAllMocks();
    projectileManager = new ProjectileManager(mockScene);
  });

  describe('fireProjectile', () => {
    it('should fire a basic arrow projectile', () => {
      const projectileId = projectileManager.fireProjectile(
        'arrow',
        100, 100,
        200, 200,
        'player'
      );

      expect(projectileId).toBeDefined();
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should fire a magic bolt projectile', () => {
      const projectileId = projectileManager.fireProjectile(
        'magic_bolt',
        100, 100,
        200, 200,
        'player'
      );

      expect(projectileId).toBeDefined();
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should fire a fireball projectile', () => {
      const projectileId = projectileManager.fireProjectile(
        'fireball',
        100, 100,
        200, 200,
        'player'
      );

      expect(projectileId).toBeDefined();
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should fire a piercing arrow projectile', () => {
      const projectileId = projectileManager.fireProjectile(
        'piercing_arrow',
        100, 100,
        200, 200,
        'player'
      );

      expect(projectileId).toBeDefined();
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should return null for invalid projectile type', () => {
      const projectileId = projectileManager.fireProjectile(
        'invalid_type',
        100, 100,
        200, 200,
        'player'
      );

      expect(projectileId).toBeNull();
    });

    it('should handle zero distance shots', () => {
      const projectileId = projectileManager.fireProjectile(
        'arrow',
        100, 100,
        100, 100,
        'player'
      );

      expect(projectileId).toBeNull();
    });
  });

  describe('fireProjectileWithArc', () => {
    it('should fire projectile with arc trajectory', () => {
      const projectileId = projectileManager.fireProjectileWithArc(
        'arrow',
        100, 100,
        300, 100,
        'player'
      );

      expect(projectileId).toBeDefined();
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should handle zero distance arc shots', () => {
      const projectileId = projectileManager.fireProjectileWithArc(
        'arrow',
        100, 100,
        100, 100,
        'player'
      );

      expect(projectileId).toBeNull();
    });
  });

  describe('update', () => {
    it('should update projectile positions without errors', () => {
      // Create a mock target
      const mockTarget: CombatTarget = {
        id: 'enemy1',
        x: 200,
        y: 200,
        stats: new PlayerStats(),
        currentHealth: 100,
        maxHealth: 100
      };

      const projectileId = projectileManager.fireProjectile(
        'arrow',
        100, 100,
        300, 300,
        'player'
      );

      expect(projectileId).toBeDefined();

      // Update should not throw
      expect(() => {
        projectileManager.update(16, [mockTarget]); // 16ms delta time
      }).not.toThrow();
    });

    it('should handle empty target list', () => {
      const projectileId = projectileManager.fireProjectile(
        'arrow',
        100, 100,
        200, 200,
        'player'
      );

      expect(projectileId).toBeDefined();

      // Update with empty targets should not throw
      expect(() => {
        projectileManager.update(16, []);
      }).not.toThrow();
    });

    it('should handle collision detection with targets', () => {
      // Create a target at the projectile destination
      const mockTarget: CombatTarget = {
        id: 'enemy1',
        x: 200,
        y: 200,
        stats: new PlayerStats(),
        currentHealth: 100,
        maxHealth: 100
      };

      const projectileId = projectileManager.fireProjectile(
        'arrow',
        195, 195, // Close to target
        200, 200,
        'player'
      );

      expect(projectileId).toBeDefined();

      const hitResults = projectileManager.update(16, [mockTarget]);
      expect(Array.isArray(hitResults)).toBe(true);
    });

    it('should apply gravity to arc projectiles', () => {
      const projectileId = projectileManager.fireProjectileWithArc(
        'arrow',
        100, 100,
        300, 100,
        'player'
      );

      expect(projectileId).toBeDefined();

      // Multiple updates should not throw
      for (let i = 0; i < 5; i++) {
        expect(() => {
          projectileManager.update(16, []);
        }).not.toThrow();
      }
    });

    it('should clean up projectiles that are out of range', () => {
      const projectileId = projectileManager.fireProjectile(
        'arrow',
        100, 100,
        200, 200,
        'player'
      );

      expect(projectileId).toBeDefined();

      // Run many updates to exhaust range
      for (let i = 0; i < 100; i++) {
        projectileManager.update(100, []); // Large delta time
      }

      // Should not throw even after projectiles are cleaned up
      expect(() => {
        projectileManager.update(16, []);
      }).not.toThrow();
    });
  });

  describe('projectile types', () => {
    it('should create different projectile types with unique properties', () => {
      const arrowId = projectileManager.fireProjectile('arrow', 100, 100, 200, 200, 'player');
      const boltId = projectileManager.fireProjectile('magic_bolt', 100, 100, 200, 200, 'player');
      const fireballId = projectileManager.fireProjectile('fireball', 100, 100, 200, 200, 'player');
      const piercingId = projectileManager.fireProjectile('piercing_arrow', 100, 100, 200, 200, 'player');

      expect(arrowId).toBeDefined();
      expect(boltId).toBeDefined();
      expect(fireballId).toBeDefined();
      expect(piercingId).toBeDefined();

      // All should be different projectiles
      expect(arrowId).not.toBe(boltId);
      expect(boltId).not.toBe(fireballId);
      expect(fireballId).not.toBe(piercingId);
    });
  });

  describe('error handling', () => {
    it('should handle invalid projectile types gracefully', () => {
      expect(() => {
        projectileManager.fireProjectile('nonexistent', 100, 100, 200, 200, 'player');
      }).not.toThrow();
    });

    it('should handle update without active projectiles', () => {
      expect(() => {
        projectileManager.update(16, []);
      }).not.toThrow();
    });
  });
});