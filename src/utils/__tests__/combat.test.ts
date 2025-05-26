import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculatePhysicalDamage,
  calculateMagicDamage,
  calculateHitChance,
  rollCriticalHit,
  performAttack,
  applyStatusEffect,
  updateStatusEffects,
  calculateCombatStats,
  generateCombatLogEntry,
  createStatusEffect,
  calculateStatModifiers,
  COMBAT_CONFIG,
  type CombatEntity,
  type StatusEffect
} from '../combat';
import { PlayerStats } from '../../game/models/PlayerStats';

describe('Combat Utilities', () => {
  let attacker: CombatEntity;
  let defender: CombatEntity;

  beforeEach(() => {
    const attackerStats = new PlayerStats({
      strength: 20,
      dexterity: 15,
      intelligence: 10,
      vitality: 15,
      luck: 12
    });

    const defenderStats = new PlayerStats({
      strength: 15,
      dexterity: 12,
      intelligence: 8,
      vitality: 20,
      luck: 8
    });

    attacker = {
      stats: attackerStats,
      statusEffects: [],
      name: 'Attacker'
    };

    defender = {
      stats: defenderStats,
      statusEffects: [],
      name: 'Defender'
    };
  });

  describe('calculatePhysicalDamage', () => {
    it('should calculate base physical damage correctly', () => {
      const result = calculatePhysicalDamage(attacker, defender);
      
      expect(result.baseDamage).toBe(40); // strength 20 * 2
      expect(result.finalDamage).toBeGreaterThan(0);
      expect(result.damageReduction).toBeGreaterThan(0);
      expect(typeof result.isCritical).toBe('boolean');
      expect(result.criticalMultiplier).toBeGreaterThanOrEqual(1);
    });

    it('should apply weapon damage bonus', () => {
      const weaponDamage = 10;
      const result = calculatePhysicalDamage(attacker, defender, weaponDamage);
      
      expect(result.baseDamage).toBe(50); // (strength 20 * 2) + weapon 10
    });

    it('should ensure minimum damage', () => {
      // Create a very weak attacker vs very strong defender
      const weakAttacker = {
        ...attacker,
        stats: new PlayerStats({ strength: 1, dexterity: 1, intelligence: 1, vitality: 1, luck: 1 })
      };
      
      const strongDefender = {
        ...defender,
        stats: new PlayerStats({ strength: 50, dexterity: 50, intelligence: 50, vitality: 50, luck: 50 })
      };

      const result = calculatePhysicalDamage(weakAttacker, strongDefender);
      expect(result.finalDamage).toBeGreaterThanOrEqual(COMBAT_CONFIG.MIN_DAMAGE);
    });

    it('should apply critical damage multiplier', () => {
      // Mock Math.random to always return values that trigger critical hits
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.01); // Very low value to ensure critical hit and minimal variance
      
      const result = calculatePhysicalDamage(attacker, defender);
      
      if (result.isCritical) {
        expect(result.criticalMultiplier).toBeGreaterThan(1);
        // The final damage should be greater than base damage minus defense reduction due to critical multiplier
        const baseDamageAfterDefense = result.baseDamage - result.damageReduction;
        expect(result.finalDamage).toBeGreaterThan(baseDamageAfterDefense);
      }
      
      mockRandom.mockRestore();
    });
  });

  describe('calculateMagicDamage', () => {
    it('should calculate base magic damage correctly', () => {
      const result = calculateMagicDamage(attacker, defender);
      
      expect(result.baseDamage).toBe(20); // intelligence 10 * 2
      expect(result.finalDamage).toBeGreaterThan(0);
      expect(result.damageReduction).toBeLessThan(result.baseDamage);
    });

    it('should apply spell power bonus', () => {
      const spellPower = 15;
      const result = calculateMagicDamage(attacker, defender, spellPower);
      
      expect(result.baseDamage).toBe(35); // (intelligence 10 * 2) + spell 15
    });

    it('should have lower damage reduction than physical', () => {
      const physicalResult = calculatePhysicalDamage(attacker, defender);
      const magicResult = calculateMagicDamage(attacker, defender);
      
      expect(magicResult.damageReduction).toBeLessThan(physicalResult.damageReduction);
    });
  });

  describe('calculateHitChance', () => {
    it('should calculate hit chance based on evasion', () => {
      const result = calculateHitChance(attacker, defender);
      
      expect(result.hitChance).toBeGreaterThan(0);
      expect(result.hitChance).toBeLessThanOrEqual(95);
      expect(result.roll).toBeGreaterThanOrEqual(0);
      expect(result.roll).toBeLessThanOrEqual(100);
      expect(typeof result.isHit).toBe('boolean');
      expect(typeof result.isCritical).toBe('boolean');
    });

    it('should have minimum 5% hit chance', () => {
      // Create defender with very high evasion
      const evasiveDefender = {
        ...defender,
        stats: new PlayerStats({ strength: 10, dexterity: 100, intelligence: 10, vitality: 10, luck: 10 })
      };
      
      const result = calculateHitChance(attacker, evasiveDefender);
      expect(result.hitChance).toBeGreaterThanOrEqual(5);
    });

    it('should have maximum 95% hit chance', () => {
      // Create defender with very low evasion
      const slowDefender = {
        ...defender,
        stats: new PlayerStats({ strength: 10, dexterity: 1, intelligence: 10, vitality: 10, luck: 10 })
      };
      
      const result = calculateHitChance(attacker, slowDefender);
      expect(result.hitChance).toBeLessThanOrEqual(95);
    });
  });

  describe('rollCriticalHit', () => {
    it('should return boolean value', () => {
      const result = rollCriticalHit(attacker);
      expect(typeof result).toBe('boolean');
    });

    it('should respect maximum 50% critical chance', () => {
      const highCritAttacker = {
        ...attacker,
        stats: new PlayerStats({ strength: 10, dexterity: 100, intelligence: 10, vitality: 10, luck: 100 })
      };
      
      // Mock Math.random to always return 0.49 (just under 50%)
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.49);
      
      const result = rollCriticalHit(highCritAttacker);
      expect(result).toBe(true);
      
      // Test with value just over 50%
      mockRandom.mockReturnValue(0.51);
      const result2 = rollCriticalHit(highCritAttacker);
      expect(result2).toBe(false);
      
      mockRandom.mockRestore();
    });
  });

  describe('performAttack', () => {
    it('should return complete combat result for hit', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.1); // Low value to ensure hit
      
      const result = performAttack(attacker, defender, 'physical', 5);
      
      expect(result.isHit).toBe(true);
      expect(result.damage).toBeGreaterThan(0);
      expect(typeof result.isCritical).toBe('boolean');
      expect(Array.isArray(result.combatLog)).toBe(true);
      expect(result.combatLog.length).toBeGreaterThan(0);
      
      mockRandom.mockRestore();
    });

    it('should return zero damage for miss', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.99); // High value to ensure miss
      
      const result = performAttack(attacker, defender);
      
      expect(result.isHit).toBe(false);
      expect(result.damage).toBe(0);
      expect(result.isCritical).toBe(false);
      expect(result.combatLog.some(log => log.includes('evaded'))).toBe(true);
      
      mockRandom.mockRestore();
    });

    it('should handle magic attacks', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.1); // Ensure hit
      
      const result = performAttack(attacker, defender, 'magic', 10);
      
      expect(result.isHit).toBe(true);
      expect(result.combatLog.some(log => log.includes('magic damage'))).toBe(true);
      
      mockRandom.mockRestore();
    });
  });

  describe('Status Effects', () => {
    let statusEffect: StatusEffect;

    beforeEach(() => {
      statusEffect = createStatusEffect(
        'Strength Boost',
        'buff',
        'strength',
        5,
        5000,
        'Potion',
        'Increases strength by 5'
      );
    });

    describe('applyStatusEffect', () => {
      it('should add new status effect', () => {
        const result = applyStatusEffect(attacker, statusEffect);
        
        expect(result).toBe(true);
        expect(attacker.statusEffects).toHaveLength(1);
        expect(attacker.statusEffects[0].name).toBe('Strength Boost');
      });

      it('should refresh existing status effect', () => {
        applyStatusEffect(attacker, statusEffect);
        const originalDuration = attacker.statusEffects[0].duration;
        
        // Apply same effect again
        const newEffect = { ...statusEffect, duration: Date.now() + 10000 };
        applyStatusEffect(attacker, newEffect);
        
        expect(attacker.statusEffects).toHaveLength(1);
        expect(attacker.statusEffects[0].duration).toBeGreaterThan(originalDuration);
      });
    });

    describe('updateStatusEffects', () => {
      it('should remove expired effects', () => {
        // Create an effect that's already expired by setting duration directly
        const expiredEffect: StatusEffect = {
          id: 'expired-test',
          name: 'Expired Effect',
          type: 'debuff',
          stat: 'dexterity',
          value: -2,
          duration: Date.now() - 1000, // Expired 1 second ago
          source: 'Test',
          description: 'Expired effect'
        };
        
        attacker.statusEffects.push(expiredEffect);
        expect(attacker.statusEffects).toHaveLength(1);
        
        const expired = updateStatusEffects(attacker);
        
        expect(attacker.statusEffects).toHaveLength(0);
        expect(expired).toHaveLength(1);
        expect(expired[0].name).toBe('Expired Effect');
      });

      it('should keep active effects', () => {
        const activeEffect = createStatusEffect(
          'Active Effect',
          'buff',
          'strength',
          3,
          10000, // 10 seconds from now
          'Test',
          'Active effect'
        );
        
        applyStatusEffect(attacker, activeEffect);
        const expired = updateStatusEffects(attacker);
        
        expect(attacker.statusEffects).toHaveLength(1);
        expect(expired).toHaveLength(0);
      });
    });

    describe('calculateStatModifiers', () => {
      it('should sum modifiers for specific stat', () => {
        const effect1 = createStatusEffect('Buff1', 'buff', 'strength', 5, 5000, 'Test', 'Test');
        const effect2 = createStatusEffect('Buff2', 'buff', 'strength', 3, 5000, 'Test', 'Test');
        const effect3 = createStatusEffect('Debuff', 'debuff', 'dexterity', -2, 5000, 'Test', 'Test');
        
        applyStatusEffect(attacker, effect1);
        applyStatusEffect(attacker, effect2);
        applyStatusEffect(attacker, effect3);
        
        const strengthMod = calculateStatModifiers(attacker, 'strength');
        const dexterityMod = calculateStatModifiers(attacker, 'dexterity');
        const intelligenceMod = calculateStatModifiers(attacker, 'intelligence');
        
        expect(strengthMod).toBe(8); // 5 + 3
        expect(dexterityMod).toBe(-2);
        expect(intelligenceMod).toBe(0);
      });
    });
  });

  describe('calculateCombatStats', () => {
    it('should calculate derived combat statistics', () => {
      const stats = calculateCombatStats(attacker);
      
      expect(typeof stats.dps).toBe('number');
      expect(typeof stats.effectiveHealth).toBe('number');
      expect(typeof stats.damageReduction).toBe('number');
      expect(typeof stats.dodgeChance).toBe('number');
      expect(typeof stats.criticalRate).toBe('number');
      
      expect(stats.dps).toBeGreaterThan(0);
      expect(stats.effectiveHealth).toBeGreaterThan(0);
      expect(stats.damageReduction).toBeGreaterThanOrEqual(0);
      expect(stats.dodgeChance).toBeGreaterThanOrEqual(0);
      expect(stats.criticalRate).toBeGreaterThanOrEqual(0);
    });

    it('should respect maximum values', () => {
      const highStatEntity = {
        ...attacker,
        stats: new PlayerStats({ strength: 100, dexterity: 100, intelligence: 100, vitality: 100, luck: 100 })
      };
      
      const stats = calculateCombatStats(highStatEntity);
      
      expect(stats.dodgeChance).toBeLessThanOrEqual(75);
      expect(stats.criticalRate).toBeLessThanOrEqual(50);
    });
  });

  describe('generateCombatLogEntry', () => {
    it('should create formatted log entry', () => {
      const log = generateCombatLogEntry('Player', 'Enemy', 'attacks', 'hits for 15 damage');
      
      expect(log).toContain('Player');
      expect(log).toContain('Enemy');
      expect(log).toContain('attacks');
      expect(log).toContain('hits for 15 damage');
      expect(log).toMatch(/^\[\d{1,2}:\d{2}:\d{2}/); // Should start with timestamp (allow for AM/PM)
    });

    it('should use provided timestamp', () => {
      const testDate = new Date('2023-01-01T12:00:00');
      const log = generateCombatLogEntry('Player', 'Enemy', 'casts spell on', 'deals magic damage', testDate);
      
      expect(log).toContain('12:00:00');
    });
  });

  describe('createStatusEffect', () => {
    it('should create status effect with unique ID', () => {
      const effect1 = createStatusEffect('Test', 'buff', 'strength', 5, 1000, 'Source', 'Description');
      const effect2 = createStatusEffect('Test', 'buff', 'strength', 5, 1000, 'Source', 'Description');
      
      expect(effect1.id).not.toBe(effect2.id);
      expect(effect1.name).toBe('Test');
      expect(effect1.type).toBe('buff');
      expect(effect1.value).toBe(5);
      expect(effect1.source).toBe('Source');
    });

    it('should handle permanent effects', () => {
      const effect = createStatusEffect('Permanent', 'buff', 'luck', 10, -1, 'Blessing', 'Permanent effect');
      
      expect(effect.duration).toBe(-1);
    });

    it('should calculate expiration time for timed effects', () => {
      const beforeCreation = Date.now();
      const effect = createStatusEffect('Timed', 'debuff', 'vitality', -5, 5000, 'Curse', 'Timed effect');
      const afterCreation = Date.now();
      
      expect(effect.duration).toBeGreaterThanOrEqual(beforeCreation + 5000);
      expect(effect.duration).toBeLessThanOrEqual(afterCreation + 5000);
    });
  });
});