import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryManager } from '../InventoryManager';
import { Equipment, EquipmentType, EquipmentSlot } from '../Equipment';
import { PlayerStats } from '../PlayerStats';
import { PlayerLevel } from '../PlayerLevel';

describe('InventoryManager', () => {
  let inventoryManager: InventoryManager;
  let playerStats: PlayerStats;
  let playerLevel: PlayerLevel;
  let sword: Equipment;
  let helmet: Equipment;
  let accessory: Equipment;

  beforeEach(() => {
    inventoryManager = new InventoryManager(10); // Small inventory for testing
    
    playerStats = new PlayerStats({
      strength: 20,
      dexterity: 15,
      intelligence: 10,
      vitality: 10,
      luck: 10
    });

    playerLevel = new PlayerLevel();
    playerLevel.addXP(1000); // Level up to test requirements

    sword = new Equipment(
      'sword-1',
      'Iron Sword',
      EquipmentType.WEAPON,
      EquipmentSlot.WEAPON,
      { level: 1, stats: { strength: 5 } },
      { bonuses: { strength: 10 } },
      'A sharp iron sword',
      2
    );

    helmet = new Equipment(
      'helmet-1',
      'Iron Helmet',
      EquipmentType.ARMOR,
      EquipmentSlot.HEAD,
      { level: 1 },
      { bonuses: { vitality: 5 } },
      'A protective iron helmet',
      2
    );

    accessory = new Equipment(
      'ring-1',
      'Magic Ring',
      EquipmentType.ACCESSORY,
      EquipmentSlot.ACCESSORY,
      { level: 3, stats: { intelligence: 8 } },
      { bonuses: { intelligence: 15 } },
      'A magical ring',
      3
    );
  });

  describe('inventory management', () => {
    it('should add items to inventory', () => {
      expect(inventoryManager.addItem(sword, 1)).toBe(true);
      expect(inventoryManager.hasItem('sword-1', 1)).toBe(true);
      expect(inventoryManager.getItem('sword-1')?.quantity).toBe(1);
    });

    it('should stack identical items', () => {
      inventoryManager.addItem(sword, 2);
      inventoryManager.addItem(sword, 3);
      
      expect(inventoryManager.getItem('sword-1')?.quantity).toBe(5);
    });

    it('should remove items from inventory', () => {
      inventoryManager.addItem(sword, 5);
      
      expect(inventoryManager.removeItem('sword-1', 2)).toBe(true);
      expect(inventoryManager.getItem('sword-1')?.quantity).toBe(3);
      
      expect(inventoryManager.removeItem('sword-1', 3)).toBe(true);
      expect(inventoryManager.hasItem('sword-1')).toBe(false);
    });

    it('should not remove more items than available', () => {
      inventoryManager.addItem(sword, 2);
      
      expect(inventoryManager.removeItem('sword-1', 5)).toBe(false);
      expect(inventoryManager.getItem('sword-1')?.quantity).toBe(2);
    });

    it('should respect max slots limit', () => {
      const smallInventory = new InventoryManager(2);
      
      expect(smallInventory.addItem(sword, 1)).toBe(true);
      expect(smallInventory.addItem(helmet, 1)).toBe(true);
      expect(smallInventory.addItem(accessory, 1)).toBe(false); // Should fail, inventory full
      
      expect(smallInventory.getAvailableSlots()).toBe(0);
    });

    it('should get all items sorted by slot index', () => {
      inventoryManager.addItem(sword, 1);
      inventoryManager.addItem(helmet, 1);
      inventoryManager.addItem(accessory, 1);
      
      const allItems = inventoryManager.getAllItems();
      expect(allItems).toHaveLength(3);
      expect(allItems[0].equipment.getId()).toBe('sword-1');
      expect(allItems[1].equipment.getId()).toBe('helmet-1');
      expect(allItems[2].equipment.getId()).toBe('ring-1');
    });

    it('should allow changing max slots', () => {
      inventoryManager.setMaxSlots(20);
      expect(inventoryManager.getMaxSlots()).toBe(20);
      
      // Fill inventory
      for (let i = 0; i < 15; i++) {
        const item = new Equipment(`item-${i}`, `Item ${i}`, EquipmentType.ACCESSORY, EquipmentSlot.ACCESSORY);
        inventoryManager.addItem(item, 1);
      }
      
      // Should not be able to reduce below current item count
      expect(() => inventoryManager.setMaxSlots(10)).toThrow();
    });
  });

  describe('equipment management', () => {
    beforeEach(() => {
      inventoryManager.addItem(sword, 1);
      inventoryManager.addItem(helmet, 1);
      inventoryManager.addItem(accessory, 1);
    });

    it('should check if item can be equipped', () => {
      expect(inventoryManager.canEquipItem('sword-1', playerStats, playerLevel)).toBe(true);
      expect(inventoryManager.canEquipItem('helmet-1', playerStats, playerLevel)).toBe(true);
      expect(inventoryManager.canEquipItem('ring-1', playerStats, playerLevel)).toBe(true);
    });

    it('should prevent equipping items that do not meet requirements', () => {
      const lowStats = new PlayerStats({ strength: 1, dexterity: 1 });
      expect(inventoryManager.canEquipItem('sword-1', lowStats, playerLevel)).toBe(false);
      
      const lowLevel = new PlayerLevel(); // Level 1
      expect(inventoryManager.canEquipItem('ring-1', playerStats, lowLevel)).toBe(false);
    });

    it('should equip items successfully', () => {
      const previouslyEquipped = inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      
      expect(previouslyEquipped).toBeNull(); // Nothing was equipped before
      expect(inventoryManager.getEquippedItem(EquipmentSlot.WEAPON)).toBe(sword);
      expect(inventoryManager.hasItem('sword-1')).toBe(false); // Removed from inventory
      expect(inventoryManager.isEquipped('sword-1')).toBe(true);
    });

    it('should return previously equipped item when equipping new one', () => {
      // Equip first sword
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      
      // Add another sword and equip it
      const sword2 = new Equipment('sword-2', 'Steel Sword', EquipmentType.WEAPON, EquipmentSlot.WEAPON);
      inventoryManager.addItem(sword2, 1);
      
      const previouslyEquipped = inventoryManager.equipItem('sword-2', playerStats, playerLevel);
      
      expect(previouslyEquipped).toBe(sword);
      expect(inventoryManager.getEquippedItem(EquipmentSlot.WEAPON)).toBe(sword2);
    });

    it('should unequip items successfully', () => {
      inventoryManager.equipItem('helmet-1', playerStats, playerLevel);
      
      expect(inventoryManager.unequipItem(EquipmentSlot.HEAD)).toBe(true);
      expect(inventoryManager.getEquippedItem(EquipmentSlot.HEAD)).toBeUndefined();
      expect(inventoryManager.hasItem('helmet-1')).toBe(true); // Back in inventory
    });

    it('should not unequip when inventory is full', () => {
      // Fill inventory completely
      const fullInventory = new InventoryManager(3);
      fullInventory.addItem(sword, 1);
      fullInventory.addItem(helmet, 1);
      fullInventory.addItem(accessory, 1);
      
      // Equip helmet (removes it from inventory)
      fullInventory.equipItem('helmet-1', playerStats, playerLevel);
      
      // Add item to fill the slot freed by equipping
      const extraItem = new Equipment('extra', 'Extra Item', EquipmentType.ACCESSORY, EquipmentSlot.ACCESSORY);
      fullInventory.addItem(extraItem, 1);
      
      // Should not be able to unequip because inventory is full
      expect(fullInventory.unequipItem(EquipmentSlot.HEAD)).toBe(false);
    });

    it('should get all equipped items', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      inventoryManager.equipItem('helmet-1', playerStats, playerLevel);
      
      const equippedItems = inventoryManager.getAllEquippedItems();
      expect(equippedItems[EquipmentSlot.WEAPON]).toBe(sword);
      expect(equippedItems[EquipmentSlot.HEAD]).toBe(helmet);
      expect(Object.keys(equippedItems)).toHaveLength(2);
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      inventoryManager.addItem(sword, 2);
      inventoryManager.addItem(helmet, 1);
      inventoryManager.addItem(accessory, 3);
    });

    it('should move items between slots', () => {
      expect(inventoryManager.moveItem('sword-1', 5)).toBe(true);
      expect(inventoryManager.getItem('sword-1')?.slotIndex).toBe(5);
    });

    it('should swap items when moving to occupied slot', () => {
      const swordSlot = inventoryManager.getItem('sword-1')?.slotIndex;
      const helmetSlot = inventoryManager.getItem('helmet-1')?.slotIndex;
      
      inventoryManager.moveItem('sword-1', helmetSlot!);
      
      expect(inventoryManager.getItem('sword-1')?.slotIndex).toBe(helmetSlot);
      expect(inventoryManager.getItem('helmet-1')?.slotIndex).toBe(swordSlot);
    });

    it('should sort inventory by name', () => {
      inventoryManager.sortInventory('name');
      const items = inventoryManager.getAllItems();
      
      expect(items[0].equipment.getName()).toBe('Iron Helmet');
      expect(items[1].equipment.getName()).toBe('Iron Sword');
      expect(items[2].equipment.getName()).toBe('Magic Ring');
    });

    it('should sort inventory by rarity', () => {
      inventoryManager.sortInventory('rarity');
      const items = inventoryManager.getAllItems();
      
      expect(items[0].equipment.getRarity()).toBe(3); // Magic Ring
      expect(items[1].equipment.getRarity()).toBe(2); // Iron Sword
      expect(items[2].equipment.getRarity()).toBe(2); // Iron Helmet
    });

    it('should provide inventory statistics', () => {
      const stats = inventoryManager.getInventoryStats();
      
      expect(stats.totalItems).toBe(3);
      expect(stats.totalQuantity).toBe(6); // 2 + 1 + 3
      expect(stats.usedSlots).toBe(3);
      expect(stats.availableSlots).toBe(7);
      expect(stats.equipmentByType.weapon).toBe(1);
      expect(stats.equipmentByType.armor).toBe(1);
      expect(stats.equipmentByType.accessory).toBe(1);
      expect(stats.equipmentByRarity[2]).toBe(2);
      expect(stats.equipmentByRarity[3]).toBe(1);
    });

    it('should clear inventory', () => {
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
      
      inventoryManager.clear();
      
      expect(inventoryManager.getAllItems()).toHaveLength(0);
      expect(inventoryManager.getAllEquippedItems()).toEqual({});
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      inventoryManager.addItem(sword, 2);
      inventoryManager.addItem(helmet, 1);
      inventoryManager.equipItem('sword-1', playerStats, playerLevel);
    });

    it('should serialize and deserialize correctly', () => {
      const serialized = inventoryManager.serialize();
      const deserialized = InventoryManager.deserialize(serialized);
      
      expect(deserialized.getMaxSlots()).toBe(inventoryManager.getMaxSlots());
      expect(deserialized.getAllItems()).toHaveLength(inventoryManager.getAllItems().length);
      expect(deserialized.getEquippedItem(EquipmentSlot.WEAPON)?.getId()).toBe(sword.getId());
    });

    it('should handle invalid serialized data', () => {
      expect(() => InventoryManager.deserialize('invalid json')).toThrow();
    });

    it('should handle empty serialized data', () => {
      const emptyManager = InventoryManager.deserialize('{}');
      expect(emptyManager.getMaxSlots()).toBe(40); // Default
      expect(emptyManager.getAllItems()).toHaveLength(0);
    });
  });
});