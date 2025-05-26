import { Shop, ShopConfiguration } from './Shop';
import { Equipment, EquipmentType, EquipmentSlot } from '../models/Equipment';

export class Apothecary extends Shop {
  constructor() {
    const config: ShopConfiguration = {
      id: 'apothecary',
      name: 'Mystical Apothecary',
      description: 'Purveyor of magical potions and enchanted accessories',
      unlockRequirements: {
        level: 3
      },
      items: [
        {
          id: 'health_potion',
          equipment: new Equipment(
            'health_potion',
            'Health Potion',
            EquipmentType.ACCESSORY,
            EquipmentSlot.ACCESSORY,
            {},
            { bonuses: { vitality: 5 } },
            'A red potion that restores health when consumed.',
            1
          ),
          price: 50,
          stock: 20,
          unlimited: true
        },
        {
          id: 'mana_potion',
          equipment: new Equipment(
            'mana_potion',
            'Mana Potion',
            EquipmentType.ACCESSORY,
            EquipmentSlot.ACCESSORY,
            {},
            { bonuses: { intelligence: 5 } },
            'A blue potion that restores magical energy.',
            1
          ),
          price: 60,
          stock: 15,
          unlimited: true
        },
        {
          id: 'strength_elixir',
          equipment: new Equipment(
            'strength_elixir',
            'Strength Elixir',
            EquipmentType.ACCESSORY,
            EquipmentSlot.ACCESSORY,
            { level: 5 },
            { bonuses: { strength: 8 }, multipliers: { strength: 1.1 } },
            'A powerful elixir that temporarily enhances physical strength.',
            2
          ),
          price: 120,
          stock: 8,
          unlimited: false
        },
        {
          id: 'luck_charm',
          equipment: new Equipment(
            'luck_charm',
            'Lucky Rabbit\'s Foot',
            EquipmentType.ACCESSORY,
            EquipmentSlot.ACCESSORY,
            {},
            { bonuses: { luck: 10 } },
            'A mystical charm that brings good fortune to its bearer.',
            3
          ),
          price: 200,
          stock: 3,
          unlimited: false
        },
        {
          id: 'wisdom_pendant',
          equipment: new Equipment(
            'wisdom_pendant',
            'Pendant of Wisdom',
            EquipmentType.ACCESSORY,
            EquipmentSlot.ACCESSORY,
            { level: 8 },
            { bonuses: { intelligence: 12, luck: 3 } },
            'An ancient pendant that sharpens the mind and enhances magical abilities.',
            3
          ),
          price: 350,
          stock: 2,
          unlimited: false
        },
        {
          id: 'antidote',
          equipment: new Equipment(
            'antidote',
            'Universal Antidote',
            EquipmentType.ACCESSORY,
            EquipmentSlot.ACCESSORY,
            {},
            {},
            'Cures all poisons and negative status effects.',
            2
          ),
          price: 80,
          stock: 10,
          unlimited: true
        }
      ]
    };

    super(config);
  }

  protected canSellItem(_itemId: string): { canSell: boolean; reason?: string } {
    // Apothecary accepts magical items and potions for sale
    return { canSell: true };
  }

  protected getSellPrice(equipment: Equipment): number {
    // Apothecary offers 50% of the item's estimated value for magical items
    let baseValue = equipment.getRarity() * 40;
    
    if (equipment.getStats().bonuses) {
      const bonuses = equipment.getStats().bonuses;
      const totalBonuses = (bonuses?.intelligence || 0) + 
                          (bonuses?.luck || 0) + 
                          (bonuses?.vitality || 0) + 
                          (bonuses?.strength || 0) + 
                          (bonuses?.dexterity || 0);
      baseValue += totalBonuses * 6;
    }

    // Bonus for multipliers
    if (equipment.getStats().multipliers) {
      const multipliers = equipment.getStats().multipliers;
      const totalMultipliers = (multipliers?.intelligence || 1) + 
                              (multipliers?.luck || 1) + 
                              (multipliers?.vitality || 1) + 
                              (multipliers?.strength || 1) + 
                              (multipliers?.dexterity || 1) - 5; // Subtract base of 1 for each
      baseValue += totalMultipliers * 50;
    }

    return Math.floor(baseValue * 0.5);
  }

  protected getInitialStock(itemId: string): number {
    const stockMap: Record<string, number> = {
      'health_potion': 20,
      'mana_potion': 15,
      'strength_elixir': 8,
      'luck_charm': 3,
      'wisdom_pendant': 2,
      'antidote': 10
    };

    return stockMap[itemId] || 1;
  }

  public getSpecialServices(): string[] {
    return ['identify', 'enchant', 'brew_custom_potion'];
  }

  public useSpecialService(serviceId: string, ...args: any[]): any {
    switch (serviceId) {
      case 'identify':
        return this.identifyItem(args[0], args[1]);
      case 'enchant':
        return this.enchantItem(args[0], args[1], args[2]);
      case 'brew_custom_potion':
        return this.brewCustomPotion(args[0], args[1], args[2]);
      default:
        throw new Error(`Unknown service: ${serviceId}`);
    }
  }

  private identifyItem(equipment: Equipment, playerGold: number): {
    success: boolean;
    cost?: number;
    newGold?: number;
    itemInfo?: any;
    reason?: string;
  } {
    const identifyCost = 25;
    
    if (playerGold < identifyCost) {
      return { success: false, reason: 'Insufficient gold for identification' };
    }

    // Return detailed information about the item
    const itemInfo = {
      name: equipment.getName(),
      type: equipment.getType(),
      slot: equipment.getSlot(),
      rarity: equipment.getRarity(),
      requirements: equipment.getRequirements(),
      stats: equipment.getStats(),
      description: equipment.getDescription(),
      estimatedValue: this.getSellPrice(equipment) * 2
    };

    return {
      success: true,
      cost: identifyCost,
      newGold: playerGold - identifyCost,
      itemInfo
    };
  }

  private enchantItem(equipment: Equipment, enchantmentType: string, playerGold: number): {
    success: boolean;
    cost?: number;
    newGold?: number;
    enchantedEquipment?: Equipment;
    reason?: string;
  } {
    const enchantCost = equipment.getRarity() * 150;
    
    if (playerGold < enchantCost) {
      return { success: false, reason: 'Insufficient gold for enchantment' };
    }

    // Create enchanted version
    const enchantedStats = { ...equipment.getStats() };
    let enchantedName = equipment.getName();

    switch (enchantmentType) {
      case 'intelligence':
        enchantedStats.bonuses = {
          ...enchantedStats.bonuses,
          intelligence: (enchantedStats.bonuses?.intelligence || 0) + 5
        };
        enchantedName += ' of Wisdom';
        break;
      case 'luck':
        enchantedStats.bonuses = {
          ...enchantedStats.bonuses,
          luck: (enchantedStats.bonuses?.luck || 0) + 3
        };
        enchantedName += ' of Fortune';
        break;
      case 'vitality':
        enchantedStats.bonuses = {
          ...enchantedStats.bonuses,
          vitality: (enchantedStats.bonuses?.vitality || 0) + 4
        };
        enchantedName += ' of Health';
        break;
      default:
        return { success: false, reason: 'Unknown enchantment type' };
    }

    const enchantedEquipment = new Equipment(
      equipment.getId() + '_enchanted',
      enchantedName,
      equipment.getType(),
      equipment.getSlot(),
      equipment.getRequirements(),
      enchantedStats,
      equipment.getDescription() + ' (Enchanted by the Apothecary)',
      Math.min(5, equipment.getRarity() + 1)
    );

    return {
      success: true,
      cost: enchantCost,
      newGold: playerGold - enchantCost,
      enchantedEquipment
    };
  }

  private brewCustomPotion(potionType: string, _ingredients: string[], playerGold: number): {
    success: boolean;
    cost?: number;
    newGold?: number;
    customPotion?: Equipment;
    reason?: string;
  } {
    const brewCost = 100;
    
    if (playerGold < brewCost) {
      return { success: false, reason: 'Insufficient gold for custom brewing' };
    }

    // Simplified custom potion creation
    const customPotion = new Equipment(
      `custom_${potionType}_potion`,
      `Custom ${potionType.charAt(0).toUpperCase() + potionType.slice(1)} Potion`,
      EquipmentType.ACCESSORY,
      EquipmentSlot.ACCESSORY,
      {},
      { bonuses: { [potionType]: 10 } },
      `A specially brewed potion that enhances ${potionType}.`,
      2
    );

    return {
      success: true,
      cost: brewCost,
      newGold: playerGold - brewCost,
      customPotion
    };
  }
}