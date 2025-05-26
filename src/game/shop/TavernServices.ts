export interface HealingService {
  type: 'instant' | 'overtime' | 'full';
  healingAmount: number;
  duration?: number; // for overtime healing in milliseconds
  cost: number;
  requirements?: {
    minLevel?: number;
    maxUsesPerDay?: number;
  };
}

export interface RestService {
  type: 'short' | 'long' | 'premium';
  duration: number; // in milliseconds
  benefits: {
    healthRegenBonus?: number;
    manaRegenBonus?: number;
    expBonus?: number;
    statBonus?: { [stat: string]: number };
  };
  cost: number;
}

export interface InformationService {
  topic: string;
  cost: number;
  information: string;
  requirements?: {
    minLevel?: number;
    completedQuests?: string[];
  };
}

export class TavernServiceManager {
  private healingServices: Map<string, HealingService> = new Map();
  private restServices: Map<string, RestService> = new Map();
  private informationDatabase: Map<string, InformationService> = new Map();
  private dailyUsage: Map<string, { [serviceId: string]: number }> = new Map(); // playerId -> serviceUsage
  private lastResetDate: string = new Date().toDateString();

  constructor() {
    this.initializeServices();
  }

  private initializeServices(): void {
    // Healing Services
    this.healingServices.set('basic_heal', {
      type: 'instant',
      healingAmount: 0.5, // 50% of max health
      cost: 30,
      requirements: { maxUsesPerDay: 3 }
    });

    this.healingServices.set('advanced_heal', {
      type: 'instant',
      healingAmount: 0.8, // 80% of max health
      cost: 50,
      requirements: { minLevel: 5, maxUsesPerDay: 2 }
    });

    this.healingServices.set('full_heal', {
      type: 'full',
      healingAmount: 1.0, // 100% of max health
      cost: 80,
      requirements: { minLevel: 10, maxUsesPerDay: 1 }
    });

    this.healingServices.set('regeneration', {
      type: 'overtime',
      healingAmount: 0.1, // 10% per tick
      duration: 60000, // 1 minute
      cost: 25,
      requirements: { maxUsesPerDay: 5 }
    });

    // Rest Services
    this.restServices.set('short_rest', {
      type: 'short',
      duration: 300000, // 5 minutes
      benefits: {
        healthRegenBonus: 0.1,
        manaRegenBonus: 0.15
      },
      cost: 20
    });

    this.restServices.set('long_rest', {
      type: 'long',
      duration: 600000, // 10 minutes
      benefits: {
        healthRegenBonus: 0.2,
        manaRegenBonus: 0.25,
        expBonus: 0.05
      },
      cost: 35
    });

    this.restServices.set('premium_room', {
      type: 'premium',
      duration: 900000, // 15 minutes
      benefits: {
        healthRegenBonus: 0.3,
        manaRegenBonus: 0.35,
        expBonus: 0.1,
        statBonus: { luck: 5, vitality: 3 }
      },
      cost: 60
    });

    // Information Services
    this.informationDatabase.set('shops', {
      topic: 'shops',
      cost: 10,
      information: 'The blacksmith requires 500 gold to access premium weapons. The apothecary always has healing potions in stock. Visit shops regularly as they restock their items.',
      requirements: {}
    });

    this.informationDatabase.set('enemies', {
      topic: 'enemies',
      cost: 15,
      information: 'Wraiths are weak to physical attacks but resist magic. Iron Golems are slow but heavily armored. Carrion Bats attack in swarms - area attacks work well.',
      requirements: {}
    });

    this.informationDatabase.set('quests', {
      topic: 'quests',
      cost: 20,
      information: 'Check the notice board near the village center for available quests and bounties. Completing quests unlocks new areas and rewards.',
      requirements: {}
    });

    this.informationDatabase.set('secrets', {
      topic: 'secrets',
      cost: 50,
      information: 'They say there\'s a hidden treasure chamber beneath the old oak tree. The village elder knows ancient magic that can enhance equipment.',
      requirements: { minLevel: 8 }
    });

    this.informationDatabase.set('advanced_tactics', {
      topic: 'advanced_tactics',
      cost: 75,
      information: 'Combining equipment effects can create powerful synergies. Time your special abilities for maximum impact. Environmental hazards can be used against enemies.',
      requirements: { minLevel: 15, completedQuests: ['combat_mastery'] }
    });
  }

  public getAvailableHealingServices(playerLevel: number): HealingService[] {
    return Array.from(this.healingServices.values()).filter(service => 
      !service.requirements?.minLevel || playerLevel >= service.requirements.minLevel
    );
  }

  public getAvailableRestServices(): RestService[] {
    return Array.from(this.restServices.values());
  }

  public getAvailableInformation(playerLevel: number, completedQuests: string[]): InformationService[] {
    return Array.from(this.informationDatabase.values()).filter(service => {
      if (service.requirements?.minLevel && playerLevel < service.requirements.minLevel) {
        return false;
      }
      if (service.requirements?.completedQuests) {
        return service.requirements.completedQuests.every(quest => completedQuests.includes(quest));
      }
      return true;
    });
  }

  public useHealingService(
    serviceId: string, 
    playerId: string, 
    currentHealth: number, 
    maxHealth: number, 
    playerGold: number,
    playerLevel: number = 1
  ): {
    success: boolean;
    newHealth?: number;
    newGold?: number;
    healingOverTime?: {
      startTime: number;
      endTime: number;
      tickInterval: number;
      healingPerTick: number;
    };
    reason?: string;
  } {
    const service = this.healingServices.get(serviceId);
    if (!service) {
      return { success: false, reason: 'Service not found' };
    }

    // Check level requirement
    if (service.requirements?.minLevel && playerLevel < service.requirements.minLevel) {
      return { success: false, reason: 'Level requirement not met' };
    }

    // Check daily usage limit
    if (service.requirements?.maxUsesPerDay) {
      this.checkDailyReset();
      const playerUsage = this.dailyUsage.get(playerId) || {};
      const usageCount = playerUsage[serviceId] || 0;
      
      if (usageCount >= service.requirements.maxUsesPerDay) {
        return { success: false, reason: 'Daily usage limit reached' };
      }
    }

    // Check if player has enough gold
    if (playerGold < service.cost) {
      return { success: false, reason: 'Insufficient gold' };
    }

    // Check if healing is needed
    if (currentHealth >= maxHealth) {
      return { success: false, reason: 'Already at full health' };
    }

    // Calculate healing
    let newHealth = currentHealth;
    let healingOverTime: { startTime: number; endTime: number; tickInterval: number; healingPerTick: number } | undefined = undefined;

    switch (service.type) {
      case 'instant': {
        const healAmount = Math.floor(maxHealth * service.healingAmount);
        newHealth = Math.min(maxHealth, currentHealth + healAmount);
        break;
      }
        
      case 'full': {
        newHealth = maxHealth;
        break;
      }
        
      case 'overtime': {
        const currentTime = Date.now();
        const tickInterval = 10000; // 10 seconds per tick
        const healingPerTick = Math.floor(maxHealth * service.healingAmount);
        
        healingOverTime = {
          startTime: currentTime,
          endTime: currentTime + service.duration!,
          tickInterval,
          healingPerTick
        };
        break;
      }
    }

    // Update daily usage
    this.updateDailyUsage(playerId, serviceId);

    return {
      success: true,
      newHealth: service.type !== 'overtime' ? newHealth : currentHealth,
      newGold: playerGold - service.cost,
      healingOverTime
    };
  }

  public useRestService(
    serviceId: string,
    playerGold: number,
    currentTime: number = Date.now()
  ): {
    success: boolean;
    newGold?: number;
    restBenefits?: RestService['benefits'] & { expiresAt: number };
    reason?: string;
  } {
    const service = this.restServices.get(serviceId);
    if (!service) {
      return { success: false, reason: 'Service not found' };
    }

    if (playerGold < service.cost) {
      return { success: false, reason: 'Insufficient gold' };
    }

    const expiresAt = currentTime + service.duration;

    return {
      success: true,
      newGold: playerGold - service.cost,
      restBenefits: {
        ...service.benefits,
        expiresAt
      }
    };
  }

  public getInformation(
    topic: string,
    playerGold: number,
    playerLevel: number = 1,
    completedQuests: string[] = []
  ): {
    success: boolean;
    newGold?: number;
    information?: string;
    reason?: string;
  } {
    const service = this.informationDatabase.get(topic);
    if (!service) {
      return { 
        success: false, 
        reason: 'No information available on that topic' 
      };
    }

    // Check requirements
    if (service.requirements?.minLevel && playerLevel < service.requirements.minLevel) {
      return { success: false, reason: 'You need more experience to understand this information' };
    }

    if (service.requirements?.completedQuests) {
      const hasAllQuests = service.requirements.completedQuests.every(quest => 
        completedQuests.includes(quest)
      );
      if (!hasAllQuests) {
        return { success: false, reason: 'You need to complete certain quests first' };
      }
    }

    if (playerGold < service.cost) {
      return { success: false, reason: 'Insufficient gold' };
    }

    return {
      success: true,
      newGold: playerGold - service.cost,
      information: service.information
    };
  }

  private checkDailyReset(): void {
    const currentDate = new Date().toDateString();
    if (currentDate !== this.lastResetDate) {
      this.dailyUsage.clear();
      this.lastResetDate = currentDate;
    }
  }

  private updateDailyUsage(playerId: string, serviceId: string): void {
    if (!this.dailyUsage.has(playerId)) {
      this.dailyUsage.set(playerId, {});
    }
    
    const playerUsage = this.dailyUsage.get(playerId)!;
    playerUsage[serviceId] = (playerUsage[serviceId] || 0) + 1;
  }

  public getRemainingDailyUses(playerId: string, serviceId: string): number {
    const service = this.healingServices.get(serviceId);
    if (!service?.requirements?.maxUsesPerDay) {
      return Infinity;
    }

    this.checkDailyReset();
    const playerUsage = this.dailyUsage.get(playerId) || {};
    const usageCount = playerUsage[serviceId] || 0;
    
    return Math.max(0, service.requirements.maxUsesPerDay - usageCount);
  }

  public getServiceCosts(): {
    healing: { [serviceId: string]: number };
    rest: { [serviceId: string]: number };
    information: { [topic: string]: number };
  } {
    return {
      healing: Object.fromEntries(
        Array.from(this.healingServices.entries()).map(([id, service]) => [id, service.cost])
      ),
      rest: Object.fromEntries(
        Array.from(this.restServices.entries()).map(([id, service]) => [id, service.cost])
      ),
      information: Object.fromEntries(
        Array.from(this.informationDatabase.entries()).map(([id, service]) => [id, service.cost])
      )
    };
  }

  public serialize(): string {
    return JSON.stringify({
      dailyUsage: Array.from(this.dailyUsage.entries()),
      lastResetDate: this.lastResetDate
    });
  }

  public static deserialize(data: string): TavernServiceManager {
    try {
      const parsed = JSON.parse(data);
      
      const manager = new TavernServiceManager();
      
      if (parsed.dailyUsage) {
        manager.dailyUsage = new Map(parsed.dailyUsage);
      }
      
      if (parsed.lastResetDate) {
        manager.lastResetDate = parsed.lastResetDate;
      }
      
      return manager;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to deserialize tavern service manager: invalid JSON');
      }
      throw error;
    }
  }
}