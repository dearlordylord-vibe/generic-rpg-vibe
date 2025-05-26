import { Shop, ShopConfiguration } from './Shop';
import { Equipment, EquipmentType, EquipmentSlot } from '../models/Equipment';

export class Blacksmith extends Shop {
  constructor() {
    const config: ShopConfiguration = {
      id: 'blacksmith',
      name: 'Ironforge Blacksmith',
      description: 'Master craftsman specializing in weapons and armor',
      unlockRequirements: {
        gold: 500
      },
      items: [
        {
          id: 'iron_sword',
          equipment: new Equipment(
            'iron_sword',
            'Iron Sword',
            EquipmentType.WEAPON,
            EquipmentSlot.WEAPON,
            { level: 5 },
            { bonuses: { strength: 10, dexterity: 5 } },
            'A sturdy iron sword, perfect for beginning adventurers.',
            2
          ),
          price: 250,
          stock: 3,
          unlimited: false
        },
        {
          id: 'steel_helmet',
          equipment: new Equipment(
            'steel_helmet',
            'Steel Helmet',
            EquipmentType.ARMOR,
            EquipmentSlot.HEAD,
            { level: 8 },
            { bonuses: { vitality: 8, strength: 3 } },
            'Protective steel helmet that guards against head injuries.',
            2
          ),
          price: 180,
          stock: 2,
          unlimited: false
        },
        {
          id: 'chainmail_armor',
          equipment: new Equipment(
            'chainmail_armor',
            'Chainmail Armor',
            EquipmentType.ARMOR,
            EquipmentSlot.BODY,
            { level: 10 },
            { bonuses: { vitality: 15, dexterity: -2 } },
            'Flexible chainmail that provides excellent protection.',
            3
          ),
          price: 400,
          stock: 1,
          unlimited: false
        },
        {
          id: 'steel_gauntlets',
          equipment: new Equipment(
            'steel_gauntlets',
            'Steel Gauntlets',
            EquipmentType.ARMOR,
            EquipmentSlot.PAWS,
            { level: 6 },
            { bonuses: { strength: 6, vitality: 4 } },
            'Heavy steel gauntlets that enhance grip and protection.',
            2
          ),
          price: 150,
          stock: 2,
          unlimited: false
        },
        {
          id: 'repair_kit',
          equipment: new Equipment(
            'repair_kit',
            'Equipment Repair Kit',
            EquipmentType.ACCESSORY,
            EquipmentSlot.ACCESSORY,
            {},
            {},
            'A kit containing tools and materials to repair damaged equipment.',
            1
          ),
          price: 75,
          stock: 10,
          unlimited: true
        }
      ]
    };

    super(config);
  }

  protected canSellItem(_itemId: string): { canSell: boolean; reason?: string } {
    // Blacksmith accepts weapons and armor for sale
    // We would need to check the item type here, but since we don't have the item
    // in this context, we'll return true for now and check in the actual implementation
    return { canSell: true };
  }

  protected getSellPrice(equipment: Equipment): number {
    // Blacksmith offers 40% of the item's estimated value for weapons/armor
    // For simplicity, we'll base this on rarity and stats
    let baseValue = equipment.getRarity() * 50;
    
    if (equipment.getStats().bonuses) {
      const bonuses = equipment.getStats().bonuses;
      const totalBonuses = (bonuses?.strength || 0) + 
                          (bonuses?.dexterity || 0) + 
                          (bonuses?.vitality || 0) + 
                          (bonuses?.intelligence || 0);
      baseValue += totalBonuses * 5;
    }

    return Math.floor(baseValue * 0.4);
  }

  protected getInitialStock(itemId: string): number {
    const stockMap: Record<string, number> = {
      'iron_sword': 3,
      'steel_helmet': 2,
      'chainmail_armor': 1,
      'steel_gauntlets': 2,
      'repair_kit': 10
    };

    return stockMap[itemId] || 1;
  }

  public getSpecialServices(): string[] {
    return ['repair', 'upgrade', 'customize'];
  }

  public useSpecialService(serviceId: string, ...args: any[]): any {
    switch (serviceId) {
      case 'repair':
        return this.repairEquipment(args[0], args[1]);
      case 'upgrade':
        return this.upgradeEquipment(args[0], args[1], args[2]);
      case 'customize':
        return this.customizeEquipment(args[0], args[1]);
      default:
        throw new Error(`Unknown service: ${serviceId}`);
    }
  }

  private repairEquipment(equipment: Equipment, playerGold: number): {
    success: boolean;
    cost?: number;
    newGold?: number;
    reason?: string;
  } {
    // For now, assume all equipment can be repaired for 10% of its estimated value
    const repairCost = Math.floor(this.getSellPrice(equipment) * 0.25);
    
    if (playerGold < repairCost) {
      return { success: false, reason: 'Insufficient gold for repair' };
    }

    return {
      success: true,
      cost: repairCost,
      newGold: playerGold - repairCost
    };
  }

  private upgradeEquipment(equipment: Equipment, _upgradeType: string, playerGold: number): {
    success: boolean;
    cost?: number;
    newGold?: number;
    upgradedEquipment?: Equipment;
    reason?: string;
  } {
    // Simplified upgrade system - would be more complex in real implementation
    const upgradeCost = equipment.getRarity() * 100;
    
    if (playerGold < upgradeCost) {
      return { success: false, reason: 'Insufficient gold for upgrade' };
    }

    // Create upgraded version (simplified)
    const upgradedEquipment = new Equipment(
      equipment.getId() + '_upgraded',
      equipment.getName() + ' +1',
      equipment.getType(),
      equipment.getSlot(),
      equipment.getRequirements(),
      {
        bonuses: {
          ...equipment.getStats().bonuses,
          strength: (equipment.getStats().bonuses?.strength || 0) + 2,
          vitality: (equipment.getStats().bonuses?.vitality || 0) + 1
        }
      },
      equipment.getDescription() + ' (Enhanced by master blacksmith)',
      Math.min(5, equipment.getRarity() + 1)
    );

    return {
      success: true,
      cost: upgradeCost,
      newGold: playerGold - upgradeCost,
      upgradedEquipment
    };
  }

  private customizeEquipment(equipment: Equipment, _customization: string): {
    success: boolean;
    customizedEquipment?: Equipment;
    reason?: string;
  } {
    // Placeholder for equipment customization
    return {
      success: true,
      customizedEquipment: equipment
    };
  }
}