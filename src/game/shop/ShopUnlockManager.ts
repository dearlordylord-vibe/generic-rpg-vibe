import { PlayerStats } from '../models/PlayerStats';

export interface UnlockRequirement {
  type: 'gold' | 'level' | 'quest' | 'item' | 'stat' | 'time' | 'achievement';
  value: unknown;
  description: string;
}

export interface ShopUnlockRequirements {
  shopId: string;
  requirements: UnlockRequirement[];
  unlockMessage?: string;
  prerequisites?: string[]; // Other shops that must be unlocked first
}

export interface PlayerProgress {
  gold: number;
  level: number;
  completedQuests: string[];
  inventory: string[]; // Item IDs
  stats: PlayerStats;
  playtimeHours: number;
  achievements: string[];
  unlockedShops: string[];
}

export interface UnlockValidationResult {
  canUnlock: boolean;
  metRequirements: UnlockRequirement[];
  unmetRequirements: UnlockRequirement[];
  reason?: string;
}

export class ShopUnlockManager {
  private unlockConfigurations: Map<string, ShopUnlockRequirements> = new Map();
  private unlockedShops: Set<string> = new Set();
  private unlockHistory: Array<{ shopId: string; unlockedAt: number; reason: string }> = [];

  constructor() {
    this.initializeDefaultUnlockRequirements();
  }

  private initializeDefaultUnlockRequirements(): void {
    // Blacksmith unlock requirements
    this.addShopUnlockRequirements({
      shopId: 'blacksmith',
      requirements: [
        {
          type: 'gold',
          value: 500,
          description: 'Accumulate 500 gold to gain the blacksmith\'s trust'
        }
      ],
      unlockMessage: 'The blacksmith nods approvingly at your wealth and opens his premium forge to you.',
      prerequisites: []
    });

    // Apothecary unlock requirements
    this.addShopUnlockRequirements({
      shopId: 'apothecary',
      requirements: [
        {
          type: 'level',
          value: 3,
          description: 'Reach level 3 to understand magical items'
        }
      ],
      unlockMessage: 'The apothecary senses your growing magical aptitude and welcomes you to browse their mystical wares.',
      prerequisites: []
    });

    // Tavern unlock requirements (always available)
    this.addShopUnlockRequirements({
      shopId: 'tavern',
      requirements: [
        {
          type: 'level',
          value: 1,
          description: 'All travelers are welcome at the tavern'
        }
      ],
      unlockMessage: 'The tavern keeper waves you in with a warm smile.',
      prerequisites: []
    });

    // Example: Advanced Blacksmith (theoretical future shop)
    this.addShopUnlockRequirements({
      shopId: 'master_blacksmith',
      requirements: [
        {
          type: 'level',
          value: 15,
          description: 'Reach level 15 to work with a master craftsman'
        },
        {
          type: 'quest',
          value: 'forge_trial_complete',
          description: 'Complete the Forge Trial quest'
        },
        {
          type: 'stat',
          value: { strength: 25 },
          description: 'Have at least 25 Strength to handle advanced equipment'
        }
      ],
      unlockMessage: 'The master blacksmith acknowledges your skill and grants you access to legendary crafting.',
      prerequisites: ['blacksmith']
    });

    // Example: Magical Archive (theoretical future shop)
    this.addShopUnlockRequirements({
      shopId: 'magical_archive',
      requirements: [
        {
          type: 'level',
          value: 20,
          description: 'Reach level 20 to access ancient knowledge'
        },
        {
          type: 'achievement',
          value: 'arcane_scholar',
          description: 'Earn the Arcane Scholar achievement'
        },
        {
          type: 'time',
          value: 10, // 10 hours of playtime
          description: 'Demonstrate dedication with 10+ hours of adventure'
        }
      ],
      unlockMessage: 'The ancient tomes recognize your scholarly pursuits and reveal their secrets.',
      prerequisites: ['apothecary']
    });
  }

  public addShopUnlockRequirements(config: ShopUnlockRequirements): void {
    this.unlockConfigurations.set(config.shopId, config);
  }

  public getShopRequirements(shopId: string): ShopUnlockRequirements | undefined {
    return this.unlockConfigurations.get(shopId);
  }

  public checkUnlockEligibility(shopId: string, playerProgress: PlayerProgress): UnlockValidationResult {
    const config = this.unlockConfigurations.get(shopId);
    if (!config) {
      return {
        canUnlock: false,
        metRequirements: [],
        unmetRequirements: [],
        reason: 'Shop configuration not found'
      };
    }

    // Check if already unlocked
    if (this.isShopUnlocked(shopId)) {
      return {
        canUnlock: true,
        metRequirements: config.requirements,
        unmetRequirements: [],
        reason: 'Already unlocked'
      };
    }

    // Check prerequisites first
    if (config.prerequisites) {
      const unmetPrerequisites = config.prerequisites.filter(prereq => 
        !this.isShopUnlocked(prereq)
      );
      
      if (unmetPrerequisites.length > 0) {
        return {
          canUnlock: false,
          metRequirements: [],
          unmetRequirements: config.requirements,
          reason: `Prerequisites not met: ${unmetPrerequisites.join(', ')}`
        };
      }
    }

    const metRequirements: UnlockRequirement[] = [];
    const unmetRequirements: UnlockRequirement[] = [];

    // Check each requirement
    for (const requirement of config.requirements) {
      if (this.checkRequirement(requirement, playerProgress)) {
        metRequirements.push(requirement);
      } else {
        unmetRequirements.push(requirement);
      }
    }

    const canUnlock = unmetRequirements.length === 0;

    return {
      canUnlock,
      metRequirements,
      unmetRequirements,
      reason: canUnlock ? 'All requirements met' : 'Some requirements not met'
    };
  }

  private checkRequirement(requirement: UnlockRequirement, playerProgress: PlayerProgress): boolean {
    switch (requirement.type) {
      case 'gold':
        return playerProgress.gold >= (requirement.value as number);
      
      case 'level':
        return playerProgress.level >= (requirement.value as number);
      
      case 'quest':
        return playerProgress.completedQuests.includes(requirement.value as string);
      
      case 'item':
        return playerProgress.inventory.includes(requirement.value as string);
      
      case 'stat':
        return this.checkStatRequirement(requirement.value as Record<string, number>, playerProgress.stats);
      
      case 'time':
        return playerProgress.playtimeHours >= (requirement.value as number);
      
      case 'achievement':
        return playerProgress.achievements.includes(requirement.value as string);
      
      default:
        return false;
    }
  }

  private checkStatRequirement(statRequirements: Record<string, number>, playerStats: PlayerStats): boolean {
    for (const [stat, requiredValue] of Object.entries(statRequirements)) {
      const currentValue = playerStats.getBaseStat(stat as 'strength' | 'dexterity' | 'intelligence' | 'vitality' | 'luck');
      if (typeof currentValue === 'number' && currentValue < (requiredValue as number)) {
        return false;
      }
    }
    return true;
  }

  public attemptUnlock(shopId: string, playerProgress: PlayerProgress): {
    success: boolean;
    message: string;
    newlyUnlocked?: string[];
  } {
    const validation = this.checkUnlockEligibility(shopId, playerProgress);
    
    if (!validation.canUnlock) {
      return {
        success: false,
        message: validation.reason || 'Requirements not met'
      };
    }

    // Unlock the shop
    this.unlockShop(shopId);
    
    const config = this.unlockConfigurations.get(shopId);
    const unlockMessage = config?.unlockMessage || `${shopId} has been unlocked!`;

    // Check if unlocking this shop triggers other unlocks
    const newlyUnlocked = this.checkCascadingUnlocks(playerProgress);

    return {
      success: true,
      message: unlockMessage,
      newlyUnlocked: newlyUnlocked.length > 0 ? newlyUnlocked : undefined
    };
  }

  public unlockShop(shopId: string, reason: string = 'Requirements met'): void {
    if (!this.unlockedShops.has(shopId)) {
      this.unlockedShops.add(shopId);
      this.unlockHistory.push({
        shopId,
        unlockedAt: Date.now(),
        reason
      });
    }
  }

  public lockShop(shopId: string): void {
    this.unlockedShops.delete(shopId);
  }

  public isShopUnlocked(shopId: string): boolean {
    return this.unlockedShops.has(shopId);
  }

  public getUnlockedShops(): string[] {
    return Array.from(this.unlockedShops);
  }

  public getLockedShops(): string[] {
    const allShops = Array.from(this.unlockConfigurations.keys());
    return allShops.filter(shopId => !this.isShopUnlocked(shopId));
  }

  public checkAllUnlockOpportunities(playerProgress: PlayerProgress): {
    shopId: string;
    validation: UnlockValidationResult;
  }[] {
    const opportunities: {
      shopId: string;
      validation: UnlockValidationResult;
    }[] = [];

    for (const [shopId] of this.unlockConfigurations) {
      if (!this.isShopUnlocked(shopId)) {
        const validation = this.checkUnlockEligibility(shopId, playerProgress);
        opportunities.push({ shopId, validation });
      }
    }

    return opportunities.sort((a, b) => {
      // Sort by how close they are to unlocking (fewer unmet requirements first)
      return a.validation.unmetRequirements.length - b.validation.unmetRequirements.length;
    });
  }

  private checkCascadingUnlocks(playerProgress: PlayerProgress): string[] {
    const newlyUnlocked: string[] = [];
    
    for (const [shopId] of this.unlockConfigurations) {
      if (!this.isShopUnlocked(shopId)) {
        const validation = this.checkUnlockEligibility(shopId, playerProgress);
        if (validation.canUnlock) {
          this.unlockShop(shopId, 'Cascading unlock');
          newlyUnlocked.push(shopId);
        }
      }
    }

    return newlyUnlocked;
  }

  public getUnlockProgress(shopId: string, playerProgress: PlayerProgress): {
    requirementProgress: Array<{
      requirement: UnlockRequirement;
      met: boolean;
      progress?: string;
    }>;
    overallProgress: number;
  } {
    const config = this.unlockConfigurations.get(shopId);
    if (!config) {
      return { requirementProgress: [], overallProgress: 0 };
    }

    const requirementProgress = config.requirements.map(requirement => {
      const met = this.checkRequirement(requirement, playerProgress);
      const progress = this.getRequirementProgress(requirement, playerProgress);
      
      return {
        requirement,
        met,
        progress
      };
    });

    const metCount = requirementProgress.filter(rp => rp.met).length;
    const overallProgress = config.requirements.length > 0 ? metCount / config.requirements.length : 1;

    return {
      requirementProgress,
      overallProgress
    };
  }

  private getRequirementProgress(requirement: UnlockRequirement, playerProgress: PlayerProgress): string {
    switch (requirement.type) {
      case 'gold': {
        const requiredGold = requirement.value as number;
        return `${playerProgress.gold}/${requiredGold} gold`;
      }
      
      case 'level': {
        const requiredLevel = requirement.value as number;
        return `Level ${playerProgress.level}/${requiredLevel}`;
      }
      
      case 'quest': {
        const questId = requirement.value as string;
        const hasQuest = playerProgress.completedQuests.includes(questId);
        return hasQuest ? 'Completed' : 'Not completed';
      }
      
      case 'time': {
        const requiredHours = requirement.value as number;
        return `${playerProgress.playtimeHours.toFixed(1)}/${requiredHours} hours`;
      }
      
      default:
        return 'Progress unknown';
    }
  }

  public getUnlockHistory(): Array<{ shopId: string; unlockedAt: number; reason: string }> {
    return [...this.unlockHistory];
  }

  public serialize(): string {
    return JSON.stringify({
      unlockedShops: Array.from(this.unlockedShops),
      unlockHistory: this.unlockHistory
    });
  }

  public static deserialize(data: string): ShopUnlockManager {
    try {
      const parsed = JSON.parse(data);
      
      const manager = new ShopUnlockManager();
      
      if (parsed.unlockedShops) {
        parsed.unlockedShops.forEach((shopId: string) => {
          manager.unlockedShops.add(shopId);
        });
      }
      
      if (parsed.unlockHistory) {
        manager.unlockHistory = parsed.unlockHistory;
      }
      
      return manager;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to deserialize shop unlock manager: invalid JSON');
      }
      throw error;
    }
  }
}