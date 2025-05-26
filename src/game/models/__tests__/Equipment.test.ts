import { describe, it, expect, beforeEach } from 'vitest';
import { Equipment, EquipmentType, EquipmentSlot } from '../Equipment';
import { PlayerStats } from '../PlayerStats';
import { PlayerLevel } from '../PlayerLevel';

describe('Equipment', () => {
  let equipment: Equipment;
  let playerStats: PlayerStats;
  let level6: PlayerLevel;
  let level4: PlayerLevel;
  let level10: PlayerLevel;
  let level1: PlayerLevel;

  beforeEach(() => {
    equipment = new Equipment(
      'test-sword',
      'Test Sword',
      EquipmentType.WEAPON,
      EquipmentSlot.WEAPON,
      {
        level: 5,
        stats: {
          strength: 15,
          dexterity: 10
        }
      },
      {
        bonuses: {
          strength: 5,
          dexterity: 3
        },
        multipliers: {
          strength: 1.1
        }
      },
      'A test sword for testing',
      3
    );

    playerStats = new PlayerStats({
      strength: 20,
      dexterity: 15,
      intelligence: 10,
      vitality: 10,
      luck: 10
    });

    level6 = new PlayerLevel();
    level6.addXP(900); // Adjusted XP to reach level 6 (100 + 150 + 225 + 337.5 + 506.25 = 1318.75 total needed)
    level4 = new PlayerLevel();
    level4.addXP(300); // Should reach level 4
    level10 = new PlayerLevel();
    level10.addXP(5000); // Should reach level 10
    level1 = new PlayerLevel(); // Starts at level 1
  });

  describe('initialization', () => {
    it('should create an equipment with correct properties', () => {
      expect(equipment.getId()).toBe('test-sword');
      expect(equipment.getName()).toBe('Test Sword');
      expect(equipment.getType()).toBe(EquipmentType.WEAPON);
      expect(equipment.getSlot()).toBe(EquipmentSlot.WEAPON);
      expect(equipment.getDescription()).toBe('A test sword for testing');
      expect(equipment.getRarity()).toBe(3);
    });

    it('should handle default values correctly', () => {
      const basicEquipment = new Equipment(
        'basic',
        'Basic Item',
        EquipmentType.ACCESSORY,
        EquipmentSlot.ACCESSORY,
        { level: 1 },
        { bonuses: {} }
      );

      expect(basicEquipment.getDescription()).toBe('');
      expect(basicEquipment.getRarity()).toBe(1);
    });

    it('should clamp rarity between 1 and 5', () => {
      const lowRarity = new Equipment(
        'low',
        'Low',
        EquipmentType.ARMOR,
        EquipmentSlot.CHEST,
        { level: 1 },
        { bonuses: {} },
        '',
        0
      );
      expect(lowRarity.getRarity()).toBe(1);

      const highRarity = new Equipment(
        'high',
        'High',
        EquipmentType.ARMOR,
        EquipmentSlot.CHEST,
        { level: 1 },
        { bonuses: {} },
        '',
        6
      );
      expect(highRarity.getRarity()).toBe(5);
    });
  });

  describe('requirement checking', () => {
    it('should check level requirements correctly', () => {
      expect(equipment.canEquip(playerStats, level6)).toBe(true);
      expect(equipment.canEquip(playerStats, level4)).toBe(false);
    });

    it('should check stat requirements correctly', () => {
      expect(equipment.canEquip(playerStats, level10)).toBe(true);

      const weakerStats = new PlayerStats({
        strength: 10,
        dexterity: 5
      });
      expect(equipment.canEquip(weakerStats, level10)).toBe(false);
    });

    it('should handle equipment with no stat requirements', () => {
      const noStatReqs = new Equipment(
        'basic',
        'Basic Item',
        EquipmentType.ACCESSORY,
        EquipmentSlot.ACCESSORY,
        { level: 1 },
        { bonuses: {} }
      );

      expect(noStatReqs.canEquip(playerStats, level1)).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const serialized = equipment.serialize();
      const deserialized = Equipment.deserialize(serialized);

      expect(deserialized.getId()).toBe(equipment.getId());
      expect(deserialized.getName()).toBe(equipment.getName());
      expect(deserialized.getType()).toBe(equipment.getType());
      expect(deserialized.getSlot()).toBe(equipment.getSlot());
      expect(deserialized.getRequirements()).toEqual(equipment.getRequirements());
      expect(deserialized.getStats()).toEqual(equipment.getStats());
      expect(deserialized.getDescription()).toBe(equipment.getDescription());
      expect(deserialized.getRarity()).toBe(equipment.getRarity());
    });

    it('should handle invalid serialized data', () => {
      expect(() => Equipment.deserialize('invalid json')).toThrow();
      expect(() => Equipment.deserialize('{}')).toThrow();
    });
  });
}); 