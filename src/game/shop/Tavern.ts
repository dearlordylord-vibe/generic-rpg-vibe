import { Shop, ShopConfiguration } from './Shop';
import { Equipment, EquipmentType, EquipmentSlot } from '../models/Equipment';

export interface TavernServices {
  healingCost: number;
  restCost: number;
  foodAndDrinkCost: number;
}

export class Tavern extends Shop {
  private healingRate: number = 0.8; // 80% of max health
  private restBonusDuration: number = 300000; // 5 minutes in milliseconds

  constructor() {
    const config: ShopConfiguration = {
      id: 'tavern',
      name: 'The Prancing Pony',
      description: 'A cozy tavern offering rest, food, and healing services',
      unlockRequirements: {
        level: 1
      },
      items: [
        {
          id: 'ale',
          equipment: new Equipment(
            'ale',
            'Hearty Ale',
            EquipmentType.ACCESSORY,
            EquipmentSlot.ACCESSORY,
            {},
            { bonuses: { vitality: 3, luck: 1 } },
            'A refreshing ale that boosts morale and health.',
            1
          ),
          price: 15,
          stock: 50,
          unlimited: true
        },
        {
          id: 'bread',
          equipment: new Equipment(
            'bread',
            'Fresh Bread',
            EquipmentType.ACCESSORY,
            EquipmentSlot.ACCESSORY,
            {},
            { bonuses: { vitality: 2 } },
            'Warm, freshly baked bread that restores energy.',
            1
          ),
          price: 10,
          stock: 30,
          unlimited: true
        },
        {
          id: 'stew',
          equipment: new Equipment(
            'stew',
            'Hearty Stew',
            EquipmentType.ACCESSORY,
            EquipmentSlot.ACCESSORY,
            {},
            { bonuses: { vitality: 8, strength: 2 } },
            'A filling stew that provides substantial nourishment.',
            1
          ),
          price: 25,
          stock: 20,
          unlimited: true
        },
        {
          id: 'travelers_pack',
          equipment: new Equipment(
            'travelers_pack',
            'Traveler\'s Pack',
            EquipmentType.ACCESSORY,
            EquipmentSlot.ACCESSORY,
            {},
            { bonuses: { vitality: 5, dexterity: 3 } },
            'A useful pack containing various travel supplies.',
            2
          ),
          price: 75,
          stock: 5,
          unlimited: false
        }
      ]
    };

    super(config);
  }

  protected canSellItem(_itemId: string): { canSell: boolean; reason?: string } {
    // Tavern doesn't typically buy items from players
    return { canSell: false, reason: 'Tavern does not purchase items' };
  }

  protected getSellPrice(_equipment: Equipment): number {
    // Tavern doesn't buy items
    return 0;
  }

  protected getInitialStock(itemId: string): number {
    const stockMap: Record<string, number> = {
      'ale': 50,
      'bread': 30,
      'stew': 20,
      'travelers_pack': 5
    };

    return stockMap[itemId] || 1;
  }

  public getSpecialServices(): string[] {
    return ['heal', 'rest', 'gather_information'];
  }

  public useSpecialService(serviceId: string, ...args: unknown[]): unknown {
    switch (serviceId) {
      case 'heal':
        return this.healPlayer(args[0] as number, args[1] as number, args[2] as number);
      case 'rest':
        return this.restPlayer(args[0] as number, args[1] as number);
      case 'gather_information':
        return this.gatherInformation(args[0] as string, args[1] as number);
      default:
        throw new Error(`Unknown service: ${serviceId}`);
    }
  }

  public healPlayer(currentHealth: number, maxHealth: number, playerGold: number): {
    success: boolean;
    cost?: number;
    newGold?: number;
    newHealth?: number;
    reason?: string;
  } {
    if (currentHealth >= maxHealth) {
      return { success: false, reason: 'Already at full health' };
    }

    const healthToRestore = Math.floor((maxHealth - currentHealth) * this.healingRate);
    const healingCost = Math.floor(healthToRestore * 0.5); // 0.5 gold per health point

    if (playerGold < healingCost) {
      return { success: false, reason: 'Insufficient gold for healing' };
    }

    const newHealth = Math.min(maxHealth, currentHealth + healthToRestore);

    return {
      success: true,
      cost: healingCost,
      newGold: playerGold - healingCost,
      newHealth
    };
  }

  public restPlayer(playerGold: number, currentTime: number = Date.now()): {
    success: boolean;
    cost?: number;
    newGold?: number;
    restBonusExpiry?: number;
    reason?: string;
  } {
    const restCost = 30;

    if (playerGold < restCost) {
      return { success: false, reason: 'Insufficient gold for rest' };
    }

    const restBonusExpiry = currentTime + this.restBonusDuration;

    return {
      success: true,
      cost: restCost,
      newGold: playerGold - restCost,
      restBonusExpiry
    };
  }

  public gatherInformation(topic: string, playerGold: number): {
    success: boolean;
    cost?: number;
    newGold?: number;
    information?: string;
    reason?: string;
  } {
    const informationCost = 20;

    if (playerGold < informationCost) {
      return { success: false, reason: 'Insufficient gold for information' };
    }

    // Simplified information system
    const informationDatabase: Record<string, string> = {
      'shops': 'The blacksmith requires 500 gold to access premium weapons. The apothecary always has healing potions in stock.',
      'enemies': 'Wraiths are weak to physical attacks but resist magic. Iron Golems are slow but heavily armored.',
      'quests': 'Check the notice board near the village center for available quests and bounties.',
      'secrets': 'They say there\'s a hidden treasure chamber beneath the old oak tree...',
      'default': 'The patrons here speak of many things, but nothing specific about that topic.'
    };

    const information = informationDatabase[topic.toLowerCase()] || informationDatabase['default'];

    return {
      success: true,
      cost: informationCost,
      newGold: playerGold - informationCost,
      information
    };
  }

  public getHealingCost(currentHealth: number, maxHealth: number): number {
    const healthToRestore = Math.floor((maxHealth - currentHealth) * this.healingRate);
    return Math.floor(healthToRestore * 0.5);
  }

  public getRestCost(): number {
    return 30;
  }

  public getInformationCost(): number {
    return 20;
  }

  public getServiceCosts(): TavernServices {
    return {
      healingCost: this.getHealingCost(50, 100), // Example calculation
      restCost: this.getRestCost(),
      foodAndDrinkCost: 15 // Average cost of tavern food/drink
    };
  }
}