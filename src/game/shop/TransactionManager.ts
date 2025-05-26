import { InventoryManager } from '../models/InventoryManager';
import { Equipment } from '../models/Equipment';

export interface Transaction {
  id: string;
  type: 'purchase' | 'sale' | 'service';
  timestamp: number;
  shopId: string;
  itemId?: string;
  serviceId?: string;
  quantity: number;
  goldAmount: number;
  playerGoldBefore: number;
  playerGoldAfter: number;
  success: boolean;
  reason?: string;
}

export interface GoldManager {
  currentGold: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: number;
}

export interface TransactionResult {
  success: boolean;
  newGold?: number;
  reason?: string;
  transaction?: Transaction;
  additionalEffects?: {
    itemAdded?: Equipment;
    itemRemoved?: Equipment;
    serviceApplied?: unknown;
  };
}

export interface PriceModifier {
  id: string;
  type: 'reputation' | 'bulk' | 'event' | 'quest' | 'time';
  modifier: number; // Multiplier (1.0 = no change, 0.8 = 20% discount, 1.2 = 20% markup)
  condition?: unknown;
  description: string;
  expiresAt?: number;
}

export class TransactionManager {
  private goldManager: GoldManager;
  private transactionHistory: Transaction[] = [];
  private priceModifiers: Map<string, PriceModifier> = new Map();
  private dailySpendingLimit: number = 10000; // Default spending limit
  private dailySpending: number = 0;
  private lastDailyReset: string = new Date().toDateString();

  constructor(initialGold: number = 100) {
    this.goldManager = {
      currentGold: initialGold,
      totalEarned: 0,
      totalSpent: 0,
      lastUpdated: Date.now()
    };
  }

  public getCurrentGold(): number {
    return this.goldManager.currentGold;
  }

  public addGold(amount: number, _reason: string = 'Gold added'): boolean {
    if (amount <= 0) return false;

    this.goldManager.currentGold += amount;
    this.goldManager.totalEarned += amount;
    this.goldManager.lastUpdated = Date.now();

    // Log as a transaction
    this.logTransaction({
      id: this.generateTransactionId(),
      type: 'sale',
      timestamp: Date.now(),
      shopId: 'system',
      quantity: 1,
      goldAmount: amount,
      playerGoldBefore: this.goldManager.currentGold - amount,
      playerGoldAfter: this.goldManager.currentGold,
      success: true,
      reason: _reason
    });

    return true;
  }

  public deductGold(amount: number, _reason: string = 'Gold deducted'): boolean {
    if (amount <= 0 || amount > this.goldManager.currentGold) {
      return false;
    }

    this.goldManager.currentGold -= amount;
    this.goldManager.totalSpent += amount;
    this.goldManager.lastUpdated = Date.now();

    return true;
  }

  public canAfford(amount: number): boolean {
    return this.goldManager.currentGold >= amount;
  }

  public purchaseItem(
    shopId: string,
    itemId: string,
    basePrice: number,
    quantity: number,
    playerInventory: InventoryManager,
    equipment: Equipment
  ): TransactionResult {
    this.checkDailyReset();

    // Calculate final price with modifiers
    const finalPrice = this.calculateFinalPrice(basePrice, 'purchase', shopId, itemId) * quantity;

    // Check daily spending limit
    if (this.dailySpending + finalPrice > this.dailySpendingLimit) {
      return {
        success: false,
        reason: 'Daily spending limit exceeded'
      };
    }

    // Check if player can afford
    if (!this.canAfford(finalPrice)) {
      return {
        success: false,
        reason: 'Insufficient gold'
      };
    }

    // Check inventory space
    if (!playerInventory.addItem(equipment, quantity)) {
      return {
        success: false,
        reason: 'Inventory full'
      };
    }

    // Process transaction
    const goldBefore = this.goldManager.currentGold;
    this.deductGold(finalPrice, `Purchased ${equipment.getName()}`);
    this.dailySpending += finalPrice;

    const transaction: Transaction = {
      id: this.generateTransactionId(),
      type: 'purchase',
      timestamp: Date.now(),
      shopId,
      itemId,
      quantity,
      goldAmount: finalPrice,
      playerGoldBefore: goldBefore,
      playerGoldAfter: this.goldManager.currentGold,
      success: true
    };

    this.logTransaction(transaction);

    return {
      success: true,
      newGold: this.goldManager.currentGold,
      transaction,
      additionalEffects: {
        itemAdded: equipment
      }
    };
  }

  public sellItem(
    shopId: string,
    itemId: string,
    baseSellPrice: number,
    quantity: number,
    playerInventory: InventoryManager
  ): TransactionResult {
    // Check if player has the item
    if (!playerInventory.hasItem(itemId, quantity)) {
      return {
        success: false,
        reason: 'Item not found in inventory'
      };
    }

    const inventoryItem = playerInventory.getItem(itemId);
    if (!inventoryItem) {
      return {
        success: false,
        reason: 'Item not found'
      };
    }

    // Calculate final sell price with modifiers
    const finalPrice = this.calculateFinalPrice(baseSellPrice, 'sale', shopId, itemId) * quantity;

    // Remove item from inventory
    if (!playerInventory.removeItem(itemId, quantity)) {
      return {
        success: false,
        reason: 'Failed to remove item from inventory'
      };
    }

    // Process transaction
    const goldBefore = this.goldManager.currentGold;
    this.addGold(finalPrice, `Sold ${inventoryItem.equipment.getName()}`);

    const transaction: Transaction = {
      id: this.generateTransactionId(),
      type: 'sale',
      timestamp: Date.now(),
      shopId,
      itemId,
      quantity,
      goldAmount: finalPrice,
      playerGoldBefore: goldBefore,
      playerGoldAfter: this.goldManager.currentGold,
      success: true
    };

    this.logTransaction(transaction);

    return {
      success: true,
      newGold: this.goldManager.currentGold,
      transaction,
      additionalEffects: {
        itemRemoved: inventoryItem.equipment
      }
    };
  }

  public purchaseService(
    shopId: string,
    serviceId: string,
    basePrice: number,
    serviceData?: any
  ): TransactionResult {
    this.checkDailyReset();

    // Calculate final price with modifiers
    const finalPrice = this.calculateFinalPrice(basePrice, 'service', shopId, serviceId);

    // Check daily spending limit
    if (this.dailySpending + finalPrice > this.dailySpendingLimit) {
      return {
        success: false,
        reason: 'Daily spending limit exceeded'
      };
    }

    // Check if player can afford
    if (!this.canAfford(finalPrice)) {
      return {
        success: false,
        reason: 'Insufficient gold'
      };
    }

    // Process transaction
    const goldBefore = this.goldManager.currentGold;
    this.deductGold(finalPrice, `Service: ${serviceId}`);
    this.dailySpending += finalPrice;

    const transaction: Transaction = {
      id: this.generateTransactionId(),
      type: 'service',
      timestamp: Date.now(),
      shopId,
      serviceId,
      quantity: 1,
      goldAmount: finalPrice,
      playerGoldBefore: goldBefore,
      playerGoldAfter: this.goldManager.currentGold,
      success: true
    };

    this.logTransaction(transaction);

    return {
      success: true,
      newGold: this.goldManager.currentGold,
      transaction,
      additionalEffects: {
        serviceApplied: serviceData
      }
    };
  }

  public addPriceModifier(modifier: PriceModifier): void {
    this.priceModifiers.set(modifier.id, modifier);
  }

  public removePriceModifier(modifierId: string): boolean {
    return this.priceModifiers.delete(modifierId);
  }

  public getActivePriceModifiers(_transactionType?: string, _shopId?: string): PriceModifier[] {
    const currentTime = Date.now();
    
    return Array.from(this.priceModifiers.values()).filter(modifier => {
      // Check if expired
      if (modifier.expiresAt && currentTime > modifier.expiresAt) {
        this.priceModifiers.delete(modifier.id);
        return false;
      }

      // Add more condition checks here based on modifier type
      return true;
    });
  }

  private calculateFinalPrice(
    basePrice: number,
    _transactionType: 'purchase' | 'sale' | 'service',
    _shopId: string,
    _itemId?: string
  ): number {
    let finalPrice = basePrice;
    const activeModifiers = this.getActivePriceModifiers(_transactionType, _shopId);

    for (const modifier of activeModifiers) {
      finalPrice *= modifier.modifier;
    }

    // Ensure minimum price of 1 gold
    return Math.max(1, Math.floor(finalPrice));
  }

  private checkDailyReset(): void {
    const currentDate = new Date().toDateString();
    if (currentDate !== this.lastDailyReset) {
      this.dailySpending = 0;
      this.lastDailyReset = currentDate;
    }
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logTransaction(transaction: Transaction): void {
    this.transactionHistory.push(transaction);
    
    // Keep only last 1000 transactions to prevent memory issues
    if (this.transactionHistory.length > 1000) {
      this.transactionHistory = this.transactionHistory.slice(-1000);
    }
  }

  public getTransactionHistory(limit: number = 50): Transaction[] {
    return this.transactionHistory
      .slice(-limit)
      .reverse(); // Most recent first
  }

  public getTransactionsByShop(shopId: string, limit: number = 20): Transaction[] {
    return this.transactionHistory
      .filter(t => t.shopId === shopId)
      .slice(-limit)
      .reverse();
  }

  public getTransactionsByType(type: Transaction['type'], limit: number = 20): Transaction[] {
    return this.transactionHistory
      .filter(t => t.type === type)
      .slice(-limit)
      .reverse();
  }

  public getSpendingStats(): {
    today: number;
    thisWeek: number;
    thisMonth: number;
    allTime: number;
    averageDaily: number;
    largestTransaction: number;
  } {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    const purchaseTransactions = this.transactionHistory.filter(t => 
      t.type === 'purchase' || t.type === 'service'
    );

    const today = this.dailySpending;
    const thisWeek = purchaseTransactions
      .filter(t => now - t.timestamp <= weekMs)
      .reduce((sum, t) => sum + t.goldAmount, 0);
    const thisMonth = purchaseTransactions
      .filter(t => now - t.timestamp <= monthMs)
      .reduce((sum, t) => sum + t.goldAmount, 0);
    const allTime = this.goldManager.totalSpent;

    const daysActive = Math.max(1, Math.ceil((now - (this.transactionHistory[0]?.timestamp || now)) / dayMs));
    const averageDaily = allTime / daysActive;

    const largestTransaction = Math.max(
      ...purchaseTransactions.map(t => t.goldAmount),
      0
    );

    return {
      today,
      thisWeek,
      thisMonth,
      allTime,
      averageDaily,
      largestTransaction
    };
  }

  public getEarningStats(): {
    today: number;
    thisWeek: number;
    thisMonth: number;
    allTime: number;
    averageDaily: number;
    largestSale: number;
  } {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    const saleTransactions = this.transactionHistory.filter(t => t.type === 'sale');

    // For today, we'd need to track this separately or filter by date
    const today = saleTransactions
      .filter(t => now - t.timestamp <= dayMs)
      .reduce((sum, t) => sum + t.goldAmount, 0);
    const thisWeek = saleTransactions
      .filter(t => now - t.timestamp <= weekMs)
      .reduce((sum, t) => sum + t.goldAmount, 0);
    const thisMonth = saleTransactions
      .filter(t => now - t.timestamp <= monthMs)
      .reduce((sum, t) => sum + t.goldAmount, 0);
    const allTime = this.goldManager.totalEarned;

    const daysActive = Math.max(1, Math.ceil((now - (this.transactionHistory[0]?.timestamp || now)) / dayMs));
    const averageDaily = allTime / daysActive;

    const largestSale = Math.max(
      ...saleTransactions.map(t => t.goldAmount),
      0
    );

    return {
      today,
      thisWeek,
      thisMonth,
      allTime,
      averageDaily,
      largestSale
    };
  }

  public setDailySpendingLimit(limit: number): void {
    this.dailySpendingLimit = Math.max(0, limit);
  }

  public getDailySpendingInfo(): {
    limit: number;
    spent: number;
    remaining: number;
    percentage: number;
  } {
    this.checkDailyReset();
    
    return {
      limit: this.dailySpendingLimit,
      spent: this.dailySpending,
      remaining: Math.max(0, this.dailySpendingLimit - this.dailySpending),
      percentage: this.dailySpendingLimit > 0 ? (this.dailySpending / this.dailySpendingLimit) * 100 : 0
    };
  }

  public serialize(): string {
    return JSON.stringify({
      goldManager: this.goldManager,
      transactionHistory: this.transactionHistory.slice(-500), // Keep only recent transactions
      priceModifiers: Array.from(this.priceModifiers.entries()),
      dailySpendingLimit: this.dailySpendingLimit,
      dailySpending: this.dailySpending,
      lastDailyReset: this.lastDailyReset
    });
  }

  public static deserialize(data: string): TransactionManager {
    try {
      const parsed = JSON.parse(data);
      
      const manager = new TransactionManager(0);
      
      if (parsed.goldManager) {
        manager.goldManager = parsed.goldManager;
      }
      
      if (parsed.transactionHistory) {
        manager.transactionHistory = parsed.transactionHistory;
      }
      
      if (parsed.priceModifiers) {
        manager.priceModifiers = new Map(parsed.priceModifiers);
      }
      
      if (parsed.dailySpendingLimit !== undefined) {
        manager.dailySpendingLimit = parsed.dailySpendingLimit;
      }
      
      if (parsed.dailySpending !== undefined) {
        manager.dailySpending = parsed.dailySpending;
      }
      
      if (parsed.lastDailyReset) {
        manager.lastDailyReset = parsed.lastDailyReset;
      }
      
      return manager;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to deserialize transaction manager: invalid JSON');
      }
      throw error;
    }
  }
}