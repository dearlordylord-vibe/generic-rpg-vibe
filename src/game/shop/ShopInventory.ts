import { ShopItem } from './Shop';

export interface ShopInventoryItem extends ShopItem {
  lastRestocked?: number;
  totalSold?: number;
  popularity?: number;
}

export interface ShopInventoryConfiguration {
  shopId: string;
  restockInterval: number; // in milliseconds
  autoRestock: boolean;
  maxStockMultiplier: number;
}

export class ShopInventory {
  private shopId: string;
  private items: Map<string, ShopInventoryItem> = new Map();
  private restockInterval: number;
  private autoRestock: boolean;
  private maxStockMultiplier: number;
  private lastGlobalRestock: number = Date.now();

  constructor(config: ShopInventoryConfiguration, initialItems: ShopItem[] = []) {
    this.shopId = config.shopId;
    this.restockInterval = config.restockInterval;
    this.autoRestock = config.autoRestock;
    this.maxStockMultiplier = config.maxStockMultiplier;

    // Initialize items with tracking data
    initialItems.forEach(item => {
      this.items.set(item.id, {
        ...item,
        lastRestocked: Date.now(),
        totalSold: 0,
        popularity: 0
      });
    });
  }

  public getItem(itemId: string): ShopInventoryItem | undefined {
    this.checkAutoRestock();
    return this.items.get(itemId);
  }

  public getAllItems(): ShopInventoryItem[] {
    this.checkAutoRestock();
    return Array.from(this.items.values());
  }

  public getAvailableItems(): ShopInventoryItem[] {
    return this.getAllItems().filter(item => 
      item.unlimited || item.stock > 0
    );
  }

  public isItemAvailable(itemId: string): boolean {
    const item = this.items.get(itemId);
    return item ? (item.unlimited || item.stock > 0) : false;
  }

  public purchaseItem(itemId: string): { success: boolean; reason?: string } {
    const item = this.items.get(itemId);
    if (!item) {
      return { success: false, reason: 'Item not found' };
    }

    if (!item.unlimited && item.stock <= 0) {
      return { success: false, reason: 'Item out of stock' };
    }

    // Deduct stock and update tracking
    if (!item.unlimited) {
      item.stock -= 1;
    }
    
    item.totalSold = (item.totalSold || 0) + 1;
    item.popularity = this.calculatePopularity(item);

    return { success: true };
  }

  public addItem(newItem: ShopItem): boolean {
    if (this.items.has(newItem.id)) {
      return false; // Item already exists
    }

    const shopInventoryItem: ShopInventoryItem = {
      ...newItem,
      lastRestocked: Date.now(),
      totalSold: 0,
      popularity: 0
    };

    this.items.set(newItem.id, shopInventoryItem);
    return true;
  }

  public removeItem(itemId: string): boolean {
    return this.items.delete(itemId);
  }

  public updateItemPrice(itemId: string, newPrice: number): boolean {
    const item = this.items.get(itemId);
    if (!item) {
      return false;
    }

    item.price = Math.max(1, newPrice);
    return true;
  }

  public restockItem(itemId: string, quantity?: number): boolean {
    const item = this.items.get(itemId);
    if (!item || item.unlimited) {
      return false;
    }

    if (quantity !== undefined) {
      item.stock += quantity;
    } else {
      // Restock to a calculated amount based on popularity and max stock
      const baseStock = this.getInitialStock(itemId);
      const popularityMultiplier = 1 + (item.popularity || 0) * 0.1;
      const targetStock = Math.floor(baseStock * popularityMultiplier * this.maxStockMultiplier);
      item.stock = Math.min(targetStock, baseStock * this.maxStockMultiplier);
    }

    item.lastRestocked = Date.now();
    return true;
  }

  public restockAllItems(): void {
    this.items.forEach((item, itemId) => {
      if (!item.unlimited) {
        this.restockItem(itemId);
      }
    });

    this.lastGlobalRestock = Date.now();
  }

  public getRestockInfo(): {
    lastGlobalRestock: number;
    nextGlobalRestock: number;
    itemsNeedingRestock: string[];
  } {
    const nextGlobalRestock = this.lastGlobalRestock + this.restockInterval;
    const itemsNeedingRestock: string[] = [];

    this.items.forEach((item, itemId) => {
      if (!item.unlimited && item.stock <= 0) {
        itemsNeedingRestock.push(itemId);
      }
    });

    return {
      lastGlobalRestock: this.lastGlobalRestock,
      nextGlobalRestock,
      itemsNeedingRestock
    };
  }

  public getPopularItems(limit: number = 5): ShopInventoryItem[] {
    return Array.from(this.items.values())
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }

  public getLowStockItems(threshold: number = 2): ShopInventoryItem[] {
    return Array.from(this.items.values())
      .filter(item => !item.unlimited && item.stock <= threshold);
  }

  public getInventoryStats(): {
    totalItems: number;
    availableItems: number;
    outOfStockItems: number;
    totalSales: number;
    averagePopularity: number;
    inventoryValue: number;
  } {
    const items = Array.from(this.items.values());
    const availableItems = items.filter(item => item.unlimited || item.stock > 0);
    const outOfStockItems = items.filter(item => !item.unlimited && item.stock <= 0);
    const totalSales = items.reduce((sum, item) => sum + (item.totalSold || 0), 0);
    const averagePopularity = items.reduce((sum, item) => sum + (item.popularity || 0), 0) / items.length;
    const inventoryValue = items.reduce((sum, item) => {
      return sum + (item.price * (item.unlimited ? 10 : item.stock)); // Assume 10 for unlimited items
    }, 0);

    return {
      totalItems: items.length,
      availableItems: availableItems.length,
      outOfStockItems: outOfStockItems.length,
      totalSales,
      averagePopularity,
      inventoryValue
    };
  }

  public filterItems(criteria: {
    type?: string;
    priceMin?: number;
    priceMax?: number;
    inStock?: boolean;
    minRarity?: number;
    maxRarity?: number;
  }): ShopInventoryItem[] {
    let items = Array.from(this.items.values());

    if (criteria.type) {
      items = items.filter(item => item.equipment.getType() === criteria.type);
    }

    if (criteria.priceMin !== undefined) {
      items = items.filter(item => item.price >= criteria.priceMin!);
    }

    if (criteria.priceMax !== undefined) {
      items = items.filter(item => item.price <= criteria.priceMax!);
    }

    if (criteria.inStock) {
      items = items.filter(item => item.unlimited || item.stock > 0);
    }

    if (criteria.minRarity !== undefined) {
      items = items.filter(item => item.equipment.getRarity() >= criteria.minRarity!);
    }

    if (criteria.maxRarity !== undefined) {
      items = items.filter(item => item.equipment.getRarity() <= criteria.maxRarity!);
    }

    return items;
  }

  public sortItems(sortBy: 'name' | 'price' | 'rarity' | 'popularity' | 'stock', descending: boolean = false): ShopInventoryItem[] {
    const items = Array.from(this.items.values());
    
    items.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.equipment.getName().localeCompare(b.equipment.getName());
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'rarity':
          comparison = a.equipment.getRarity() - b.equipment.getRarity();
          break;
        case 'popularity':
          comparison = (a.popularity || 0) - (b.popularity || 0);
          break;
        case 'stock': {
          const aStock = a.unlimited ? Infinity : a.stock;
          const bStock = b.unlimited ? Infinity : b.stock;
          comparison = aStock === bStock ? 0 : (aStock < bStock ? -1 : 1);
          break;
        }
      }
      
      return descending ? -comparison : comparison;
    });

    return items;
  }

  private checkAutoRestock(): void {
    if (!this.autoRestock) {
      return;
    }

    const currentTime = Date.now();
    if (currentTime - this.lastGlobalRestock >= this.restockInterval) {
      this.restockAllItems();
    }
  }

  private calculatePopularity(item: ShopInventoryItem): number {
    // Simple popularity calculation based on sales frequency
    const timeSinceLastRestock = Date.now() - (item.lastRestocked || Date.now());
    const timeInHours = timeSinceLastRestock / (1000 * 60 * 60);
    const salesPerHour = (item.totalSold || 0) / Math.max(1, timeInHours);
    
    // Normalize to 0-1 scale
    return Math.min(1, salesPerHour / 10);
  }

  private getInitialStock(itemId: string): number {
    // This would ideally come from configuration
    // For now, return a default based on item type/rarity
    const item = this.items.get(itemId);
    if (!item) return 1;

    const rarity = item.equipment.getRarity();
    const baseStock = Math.max(1, 6 - rarity); // Higher rarity = lower base stock
    
    return baseStock;
  }

  public serialize(): string {
    const data = {
      shopId: this.shopId,
      items: Array.from(this.items.entries()),
      restockInterval: this.restockInterval,
      autoRestock: this.autoRestock,
      maxStockMultiplier: this.maxStockMultiplier,
      lastGlobalRestock: this.lastGlobalRestock
    };

    return JSON.stringify(data);
  }

  public static deserialize(data: string, config: ShopInventoryConfiguration): ShopInventory {
    try {
      const parsed = JSON.parse(data);
      
      const inventory = new ShopInventory(config);
      inventory.shopId = parsed.shopId;
      inventory.restockInterval = parsed.restockInterval;
      inventory.autoRestock = parsed.autoRestock;
      inventory.maxStockMultiplier = parsed.maxStockMultiplier;
      inventory.lastGlobalRestock = parsed.lastGlobalRestock;
      
      // Restore items
      if (parsed.items) {
        for (const [itemId, itemData] of parsed.items) {
          inventory.items.set(itemId, itemData);
        }
      }
      
      return inventory;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to deserialize shop inventory: invalid JSON');
      }
      throw error;
    }
  }
}