import { Shop } from './Shop';
import { Blacksmith } from './Blacksmith';
import { Apothecary } from './Apothecary';
import { Tavern } from './Tavern';

export interface VillageConfiguration {
  id: string;
  name: string;
  description: string;
  shops: {
    blacksmith: boolean;
    apothecary: boolean;
    tavern: boolean;
  };
}

export class Village {
  private id: string;
  private name: string;
  private description: string;
  private shops: Map<string, Shop> = new Map();
  private isInitialized: boolean = false;

  constructor(config: VillageConfiguration) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    
    this.initializeShops(config.shops);
  }

  private initializeShops(shopConfig: VillageConfiguration['shops']): void {
    if (shopConfig.blacksmith) {
      const blacksmith = new Blacksmith();
      this.shops.set('blacksmith', blacksmith);
    }

    if (shopConfig.apothecary) {
      const apothecary = new Apothecary();
      this.shops.set('apothecary', apothecary);
    }

    if (shopConfig.tavern) {
      const tavern = new Tavern();
      this.shops.set('tavern', tavern);
    }

    this.isInitialized = true;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getDescription(): string {
    return this.description;
  }

  public getShop(shopId: string): Shop | undefined {
    return this.shops.get(shopId);
  }

  public getAllShops(): Shop[] {
    return Array.from(this.shops.values());
  }

  public getAvailableShops(): Shop[] {
    return this.getAllShops().filter(shop => shop.getIsUnlocked());
  }

  public getShopIds(): string[] {
    return Array.from(this.shops.keys());
  }

  public hasShop(shopId: string): boolean {
    return this.shops.has(shopId);
  }

  public checkShopUnlocks(playerGold: number, playerLevel: number, completedQuests: string[]): string[] {
    const newlyUnlocked: string[] = [];

    this.shops.forEach((shop, shopId) => {
      if (!shop.getIsUnlocked()) {
        const requirements = shop.getUnlockRequirements();
        let canUnlock = true;

        // Check gold requirement
        if (requirements.gold && playerGold < requirements.gold) {
          canUnlock = false;
        }

        // Check level requirement
        if (requirements.level && playerLevel < requirements.level) {
          canUnlock = false;
        }

        // Check quest requirements
        if (requirements.questsCompleted) {
          const hasAllQuests = requirements.questsCompleted.every(quest => 
            completedQuests.includes(quest)
          );
          if (!hasAllQuests) {
            canUnlock = false;
          }
        }

        if (canUnlock) {
          shop.unlock();
          newlyUnlocked.push(shopId);
        }
      }
    });

    return newlyUnlocked;
  }

  public getShopUnlockStatus(): Record<string, { unlocked: boolean; requirements: unknown }> {
    const status: Record<string, { unlocked: boolean; requirements: unknown }> = {};

    this.shops.forEach((shop, shopId) => {
      status[shopId] = {
        unlocked: shop.getIsUnlocked(),
        requirements: shop.getUnlockRequirements()
      };
    });

    return status;
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  public serialize(): string {
    const data = {
      id: this.id,
      name: this.name,
      description: this.description,
      shopUnlocks: this.getShopUnlockStatus(),
      isInitialized: this.isInitialized
    };

    return JSON.stringify(data);
  }

  public static deserialize(data: string, config: VillageConfiguration): Village {
    try {
      const parsed = JSON.parse(data);
      
      const village = new Village(config);
      
      // Restore shop unlock states
      if (parsed.shopUnlocks) {
        Object.entries(parsed.shopUnlocks as Record<string, { unlocked: boolean }>).forEach(([shopId, status]) => {
          const shop = village.getShop(shopId);
          if (shop && status.unlocked) {
            shop.unlock();
          }
        });
      }

      return village;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to deserialize village data: invalid JSON');
      }
      throw error;
    }
  }
}