import { Equipment } from '../models/Equipment';
import { InventoryManager } from '../models/InventoryManager';

export interface ShopItem {
  id: string;
  equipment: Equipment;
  price: number;
  stock: number;
  unlimited?: boolean;
}

export interface ShopConfiguration {
  id: string;
  name: string;
  description: string;
  unlockRequirements: {
    gold?: number;
    level?: number;
    questsCompleted?: string[];
  };
  items: ShopItem[];
}

export abstract class Shop {
  protected id: string;
  protected name: string;
  protected description: string;
  protected items: Map<string, ShopItem> = new Map();
  protected unlockRequirements: ShopConfiguration['unlockRequirements'];
  protected isUnlocked: boolean = false;

  constructor(config: ShopConfiguration) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.unlockRequirements = config.unlockRequirements;
    
    // Initialize shop items
    config.items.forEach(item => {
      this.items.set(item.id, { ...item });
    });
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

  public getItems(): ShopItem[] {
    return Array.from(this.items.values());
  }

  public getItem(itemId: string): ShopItem | undefined {
    return this.items.get(itemId);
  }

  public isItemAvailable(itemId: string): boolean {
    const item = this.items.get(itemId);
    return item ? (item.unlimited || item.stock > 0) : false;
  }

  public getUnlockRequirements(): ShopConfiguration['unlockRequirements'] {
    return this.unlockRequirements;
  }

  public getIsUnlocked(): boolean {
    return this.isUnlocked;
  }

  public unlock(): void {
    this.isUnlocked = true;
  }

  public lock(): void {
    this.isUnlocked = false;
  }

  public canPurchase(itemId: string, playerGold: number): { canPurchase: boolean; reason?: string } {
    if (!this.isUnlocked) {
      return { canPurchase: false, reason: 'Shop is locked' };
    }

    const item = this.items.get(itemId);
    if (!item) {
      return { canPurchase: false, reason: 'Item not found' };
    }

    if (!this.isItemAvailable(itemId)) {
      return { canPurchase: false, reason: 'Item out of stock' };
    }

    if (playerGold < item.price) {
      return { canPurchase: false, reason: 'Insufficient gold' };
    }

    return { canPurchase: true };
  }

  public purchaseItem(itemId: string, playerInventory: InventoryManager, playerGold: number): {
    success: boolean;
    newGold?: number;
    reason?: string;
  } {
    const purchaseCheck = this.canPurchase(itemId, playerGold);
    if (!purchaseCheck.canPurchase) {
      return { success: false, reason: purchaseCheck.reason };
    }

    const item = this.items.get(itemId);
    if (!item) {
      return { success: false, reason: 'Item not found' };
    }

    // Check if player has inventory space
    if (!playerInventory.addItem(item.equipment, 1)) {
      return { success: false, reason: 'Inventory full' };
    }

    // Deduct stock if not unlimited
    if (!item.unlimited) {
      item.stock -= 1;
    }

    // Return new gold amount
    const newGold = playerGold - item.price;
    return { success: true, newGold };
  }

  public canSell(itemId: string): { canSell: boolean; reason?: string } {
    if (!this.isUnlocked) {
      return { canSell: false, reason: 'Shop is locked' };
    }

    return this.canSellItem(itemId);
  }

  public sellItem(itemId: string, playerInventory: InventoryManager, playerGold: number): {
    success: boolean;
    newGold?: number;
    reason?: string;
  } {
    const sellCheck = this.canSell(itemId);
    if (!sellCheck.canSell) {
      return { success: false, reason: sellCheck.reason };
    }

    const inventoryItem = playerInventory.getItem(itemId);
    if (!inventoryItem) {
      return { success: false, reason: 'Item not in inventory' };
    }

    const sellPrice = this.getSellPrice(inventoryItem.equipment);
    
    // Remove item from inventory
    if (!playerInventory.removeItem(itemId, 1)) {
      return { success: false, reason: 'Failed to remove item from inventory' };
    }

    const newGold = playerGold + sellPrice;
    return { success: true, newGold };
  }

  public restockItem(itemId: string, quantity: number): boolean {
    const item = this.items.get(itemId);
    if (!item || item.unlimited) {
      return false;
    }

    item.stock += quantity;
    return true;
  }

  public resetStock(): void {
    this.items.forEach(item => {
      if (!item.unlimited) {
        // Reset to initial stock - this would be stored in config
        item.stock = this.getInitialStock(item.id);
      }
    });
  }

  // Abstract methods that subclasses must implement
  protected abstract canSellItem(itemId: string): { canSell: boolean; reason?: string };
  protected abstract getSellPrice(equipment: Equipment): number;
  protected abstract getInitialStock(itemId: string): number;

  // Optional hook for specialized shop services
  public abstract getSpecialServices(): string[];
  public abstract useSpecialService(serviceId: string, ...args: unknown[]): unknown;
}