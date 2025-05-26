import { describe, it, expect, beforeEach } from 'vitest';
import { StatCalculator } from '../StatCalculator';
import { InventoryManager } from '../InventoryManager';
import { Equipment, EquipmentType, EquipmentSlot } from '../Equipment';
import { PlayerStats } from '../PlayerStats';
import { PlayerLevel } from '../PlayerLevel';

describe('StatCalculator', () => {
  let statCalculator: StatCalculator;
  let playerStats: PlayerStats;
  let inventoryManager: InventoryManager;
  let playerLevel: PlayerLevel;
  let sword: Equipment;
  let helmet: Equipment;
  let ring: Equipment;

  beforeEach(() => {
    playerStats = new PlayerStats({
      strength: 20,
      dexterity: 15,
      intelligence: 10,
      vitality: 12,
      luck: 8
    });

    inventoryManager = new InventoryManager(20);
    playerLevel = new PlayerLevel();
    playerLevel.addXP(1000);

    statCalculator = new StatCalculator(playerStats, inventoryManager);

    // Create test equipment
    sword = new Equipment(
      'sword-1',
      'Magic Sword',
      EquipmentType.WEAPON,
      EquipmentSlot.WEAPON,
      { level: 1 },
      {
        bonuses: { strength: 10, dexterity: 5 },
        multipliers: { strength: 1.2 }
      },
      'A magical sword',
      3
    );

    helmet = new Equipment(
      'helmet-1',
      'Iron Helmet',
      EquipmentType.ARMOR,
      EquipmentSlot.HEAD,
      { level: 1 },
      {
        bonuses: { vitality: 8, luck: 3 }
      },
      'A protective helmet',
      2
    );

    ring = new Equipment(
      'ring-1',
      'Wisdom Ring',
      EquipmentType.ACCESSORY,
      EquipmentSlot.ACCESSORY,
      { level: 2 },
      {
        bonuses: { intelligence: 12, luck: 5 },
        multipliers: { intelligence: 1.15, luck: 1.1 }
      },
      'A ring of wisdom',
      4
    );

    // Add items to inventory
    inventoryManager.addItem(sword, 1);
    inventoryManager.addItem(helmet, 1);
    inventoryManager.addItem(ring, 1);
  });

  describe('equipment bonus calculations', () => {
    it('should calculate equipment bonuses with no equipment', () => {
      const bonuses = statCalculator.calculateEquipmentBonuses();
      
      expect(bonuses.strength).toBe(0);
      expect(bonuses.dexterity).toBe(0);
      expect(bonuses.intelligence).toBe(0);
      expect(bonuses.vitality).toBe(0);
      expect(bonuses.luck).toBe(0);
    });

    it('should calculate equipment bonuses with single item equipped', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      
      const bonuses = statCalculator.calculateEquipmentBonuses();
      
      expect(bonuses.strength).toBe(10);
      expect(bonuses.dexterity).toBe(5);
      expect(bonuses.intelligence).toBe(0);
      expect(bonuses.vitality).toBe(0);
      expect(bonuses.luck).toBe(0);
    });

    it('should calculate equipment bonuses with multiple items equipped', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      inventoryManager.equipItem('helmet-1', playerStats, playerLevel);
      inventoryManager.equipItem('ring-1', playerStats, playerLevel);
      
      const bonuses = statCalculator.calculateEquipmentBonuses();
      
      expect(bonuses.strength).toBe(10); // From sword
      expect(bonuses.dexterity).toBe(5); // From sword
      expect(bonuses.intelligence).toBe(12); // From ring
      expect(bonuses.vitality).toBe(8); // From helmet
      expect(bonuses.luck).toBe(8); // 3 from helmet + 5 from ring
    });

    it('should calculate equipment multipliers', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      inventoryManager.equipItem('ring-1', playerStats, playerLevel);
      
      const multipliers = statCalculator.calculateEquipmentMultipliers();
      
      expect(multipliers.strength).toBe(1.2);
      expect(multipliers.dexterity).toBe(1);
      expect(multipliers.intelligence).toBe(1.15);
      expect(multipliers.vitality).toBe(1);
      expect(multipliers.luck).toBe(1.1);
    });
  });

  describe('final stat calculations', () => {
    it('should calculate final stats with no equipment', () => {
      const finalStats = statCalculator.calculateFinalStats();
      
      expect(finalStats.strength).toBe(20); // Base stat
      expect(finalStats.totalStrength).toBe(20); // No bonuses or multipliers
      expect(finalStats.bonusStrength).toBe(0);
      
      expect(finalStats.dexterity).toBe(15);
      expect(finalStats.totalDexterity).toBe(15);
      expect(finalStats.bonusDexterity).toBe(0);
    });

    it('should calculate final stats with equipment bonuses and multipliers', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      inventoryManager.equipItem('ring-1', playerStats, playerLevel);
      
      const finalStats = statCalculator.calculateFinalStats();
      
      // Strength: (20 base + 10 bonus) * 1.2 multiplier = 36
      expect(finalStats.totalStrength).toBe(36);
      expect(finalStats.bonusStrength).toBe(10);
      
      // Dexterity: (15 base + 5 bonus) * 1.0 multiplier = 20
      expect(finalStats.totalDexterity).toBe(20);
      expect(finalStats.bonusDexterity).toBe(5);
      
      // Intelligence: (10 base + 12 bonus) * 1.15 multiplier = 25.3 -> 25
      expect(finalStats.totalIntelligence).toBe(25);
      expect(finalStats.bonusIntelligence).toBe(12);
      
      // Luck: (8 base + 5 bonus) * 1.1 multiplier = 14.3 -> 14
      expect(finalStats.totalLuck).toBe(14);
      expect(finalStats.bonusLuck).toBe(5);
    });

    it('should calculate derived stats with equipment bonuses', () => {
      inventoryManager.equipItem('helmet-1', playerStats, playerLevel);
      inventoryManager.equipItem('ring-1', playerStats, playerLevel);
      
      const derivedStats = statCalculator.calculateDerivedStatsWithEquipment();
      
      // Vitality: 12 base + 8 bonus = 20
      // Max Health: 100 + (20 * 10) = 300
      expect(derivedStats.maxHealth).toBe(300);
      
      // Intelligence: (10 base + 12 bonus) * 1.15 = 25.3 -> 25
      // Max Mana: 50 + (25 * 5) = 175
      expect(derivedStats.maxMana).toBe(175);
      
      // Magic Damage: 25 * 2 = 50
      expect(derivedStats.magicDamage).toBe(50);
    });
  });

  describe('detailed calculations', () => {
    it('should provide detailed stat breakdown', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      
      const detailed = statCalculator.getDetailedCalculation();
      
      expect(detailed.strength.baseStat).toBe(20);
      expect(detailed.strength.equipmentBonus).toBe(10);
      expect(detailed.strength.equipmentMultiplier).toBe(1.2);
      expect(detailed.strength.finalValue).toBe(36); // (20+10)*1.2
      
      expect(detailed.dexterity.baseStat).toBe(15);
      expect(detailed.dexterity.equipmentBonus).toBe(5);
      expect(detailed.dexterity.equipmentMultiplier).toBe(1);
      expect(detailed.dexterity.finalValue).toBe(20); // (15+5)*1
    });

    it('should track equipment contributions', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      inventoryManager.equipItem('helmet-1', playerStats, playerLevel);
      
      const contributions = statCalculator.getEquipmentContributions();
      
      expect(contributions['sword-1'].strength).toBe(10);
      expect(contributions['sword-1'].dexterity).toBe(5);
      expect(contributions['helmet-1'].vitality).toBe(8);
      expect(contributions['helmet-1'].luck).toBe(3);
    });
  });

  describe('equipment simulation', () => {
    it('should simulate equipping an item', () => {
      const simulatedStats = statCalculator.simulateEquipmentChange('sword-1', 'equip');
      
      expect(simulatedStats.totalStrength).toBe(36); // (20+10)*1.2
      expect(simulatedStats.totalDexterity).toBe(20); // (15+5)*1
      expect(simulatedStats.bonusStrength).toBe(10);
      expect(simulatedStats.bonusDexterity).toBe(5);
    });

    it('should simulate unequipping an item', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      
      const simulatedStats = statCalculator.simulateEquipmentChange('sword-1', 'unequip');
      
      expect(simulatedStats.totalStrength).toBe(20); // Base only
      expect(simulatedStats.totalDexterity).toBe(15); // Base only
      expect(simulatedStats.bonusStrength).toBe(0);
      expect(simulatedStats.bonusDexterity).toBe(0);
    });

    it('should throw error when simulating equipment not in inventory', () => {
      expect(() => {
        statCalculator.simulateEquipmentChange('nonexistent', 'equip');
      }).toThrow('Equipment with ID nonexistent not found in inventory');
    });

    it('should throw error when simulating unequip of non-equipped item', () => {
      expect(() => {
        statCalculator.simulateEquipmentChange('sword-1', 'unequip');
      }).toThrow('Equipment with ID sword-1 is not equipped');
    });
  });

  describe('stat increase/decrease calculations', () => {
    it('should calculate stat increase when equipping', () => {
      const increase = statCalculator.getStatIncrease('sword-1');
      
      expect(increase.strength).toBe(16); // From 20 to 36
      expect(increase.dexterity).toBe(5); // From 15 to 20
      expect(increase.intelligence).toBe(0);
      expect(increase.vitality).toBe(0);
      expect(increase.luck).toBe(0);
    });

    it('should calculate stat decrease when unequipping', () => {
      inventoryManager.equipItem('ring-1', playerStats, playerLevel);
      
      const decrease = statCalculator.getStatDecrease('ring-1');
      
      expect(decrease.intelligence).toBe(15); // Lose 15 total intelligence
      expect(decrease.luck).toBe(6); // Lose 6 total luck: (8+5)*1.1=14.3→14 minus 8=6
    });
  });

  describe('modifier integration', () => {
    it('should apply equipment modifiers to player stats', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      statCalculator.applyEquipmentModifiers();
      
      // Check that modifiers were added
      const allModifiers = playerStats.getActiveModifiers();
      const strengthModifier = allModifiers.find(m => m.source === 'equipment_sword-1' && m.stat === 'strength');
      const dexterityModifier = allModifiers.find(m => m.source === 'equipment_sword-1' && m.stat === 'dexterity');
      
      expect(strengthModifier).toBeDefined();
      expect(strengthModifier!.value).toBe(10);
      expect(dexterityModifier).toBeDefined();
      expect(dexterityModifier!.value).toBe(5);
    });

    it('should remove equipment modifiers', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      statCalculator.applyEquipmentModifiers();
      
      // Verify modifiers exist
      expect(playerStats.getActiveModifiers().length).toBeGreaterThan(0);
      
      statCalculator.removeEquipmentModifiers();
      
      // Check that equipment modifiers were removed
      const remainingModifiers = playerStats.getActiveModifiers();
      const equipmentModifiers = remainingModifiers.filter(m => m.source.startsWith('equipment_'));
      expect(equipmentModifiers).toHaveLength(0);
    });

    it('should refresh equipment modifiers', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      statCalculator.applyEquipmentModifiers();
      
      const initialModifierCount = playerStats.getActiveModifiers().length;
      
      // Equip another item
      inventoryManager.equipItem('helmet-1', playerStats, playerLevel);
      statCalculator.refreshEquipmentModifiers();
      
      // Should have modifiers for both items
      const finalModifiers = playerStats.getActiveModifiers();
      expect(finalModifiers.length).toBeGreaterThan(initialModifierCount);
      
      // Check specific modifiers exist
      const swordStrModifier = finalModifiers.find(m => m.id === 'eq_str_sword-1');
      const helmetVitModifier = finalModifiers.find(m => m.id === 'eq_vit_helmet-1');
      
      expect(swordStrModifier).toBeDefined();
      expect(helmetVitModifier).toBeDefined();
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple equipment pieces with overlapping bonuses', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      inventoryManager.equipItem('helmet-1', playerStats, playerLevel);
      inventoryManager.equipItem('ring-1', playerStats, playerLevel);
      
      const finalStats = statCalculator.calculateFinalStats();
      
      // Strength: (20 + 10) * 1.2 = 36
      expect(finalStats.totalStrength).toBe(36);
      
      // Luck: (8 + 3 + 5) * 1.1 = 17.6 -> 17
      expect(finalStats.totalLuck).toBe(17);
      
      // Intelligence: (10 + 12) * 1.15 = 25.3 -> 25
      expect(finalStats.totalIntelligence).toBe(25);
    });

    it('should maintain accuracy through equip/unequip cycles', () => {
      const originalStats = statCalculator.calculateFinalStats();
      
      // Equip sword
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      
      // Unequip sword
      inventoryManager.unequipItem(EquipmentSlot.WEAPON);
      const backToOriginal = statCalculator.calculateFinalStats();
      
      expect(backToOriginal.totalStrength).toBe(originalStats.totalStrength);
      expect(backToOriginal.totalDexterity).toBe(originalStats.totalDexterity);
    });
  });
});