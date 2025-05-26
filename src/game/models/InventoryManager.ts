import { Equipment, EquipmentSlot } from './Equipment';
import { PlayerStats } from './PlayerStats';
import { PlayerLevel } from './PlayerLevel';

export interface InventoryItem {
  id: string;
  equipment: Equipment;
  quantity: number;
  slotIndex?: number;
}

export interface EquippedItems {
  [EquipmentSlot.HEAD]?: Equipment;
  [EquipmentSlot.BODY]?: Equipment;
  [EquipmentSlot.PAWS]?: Equipment;
  [EquipmentSlot.TAIL]?: Equipment;
  [EquipmentSlot.ACCESSORY]?: Equipment;
  [EquipmentSlot.WEAPON]?: Equipment;
  [EquipmentSlot.CHEST]?: Equipment;
}

export interface SerializedInventoryManager {
  inventoryItems: InventoryItem[];
  equippedItems: { [key in EquipmentSlot]?: Equipment };
  maxSlots: number;
}

export class InventoryManager {
  private inventoryItems: Map<string, InventoryItem> = new Map();
  private equippedItems: EquippedItems = {};
  private maxSlots: number;

  constructor(maxSlots: number = 40) {
    this.maxSlots = maxSlots;
  }

  // Inventory Management
  public addItem(equipment: Equipment, quantity: number = 1): boolean {
    const existingItem = this.inventoryItems.get(equipment.getId());
    
    if (existingItem) {
      existingItem.quantity += quantity;
      return true;
    }

    // Check if we have available slots
    if (this.inventoryItems.size >= this.maxSlots) {
      return false; // Inventory full
    }

    const newItem: InventoryItem = {
      id: equipment.getId(),
      equipment,
      quantity,
      slotIndex: this.getNextAvailableSlot()
    };

    this.inventoryItems.set(equipment.getId(), newItem);
    return true;
  }

  public removeItem(equipmentId: string, quantity: number = 1): boolean {
    const item = this.inventoryItems.get(equipmentId);
    if (!item || item.quantity < quantity) {
      return false;
    }

    item.quantity -= quantity;
    if (item.quantity <= 0) {
      this.inventoryItems.delete(equipmentId);
    }

    return true;
  }

  public getItem(equipmentId: string): InventoryItem | undefined {
    return this.inventoryItems.get(equipmentId);
  }

  public getAllItems(): InventoryItem[] {
    return Array.from(this.inventoryItems.values()).sort((a, b) => {
      return (a.slotIndex || 0) - (b.slotIndex || 0);
    });
  }

  public hasItem(equipmentId: string, quantity: number = 1): boolean {
    const item = this.inventoryItems.get(equipmentId);
    return item ? item.quantity >= quantity : false;
  }

  public getAvailableSlots(): number {
    return this.maxSlots - this.inventoryItems.size;
  }

  public getMaxSlots(): number {
    return this.maxSlots;
  }

  public setMaxSlots(newMaxSlots: number): void {
    if (newMaxSlots < this.inventoryItems.size) {
      throw new Error('Cannot reduce max slots below current item count');
    }
    this.maxSlots = newMaxSlots;
  }

  // Equipment Management
  public canEquipItem(equipmentId: string, playerStats: PlayerStats, playerLevel: PlayerLevel): boolean {
    const item = this.inventoryItems.get(equipmentId);
    if (!item) {
      return false;
    }

    return item.equipment.canEquip(playerStats, playerLevel);
  }

  public equipItem(equipmentId: string, playerStats: PlayerStats, playerLevel: PlayerLevel): Equipment | null {
    // Check if we can equip the item
    if (!this.canEquipItem(equipmentId, playerStats, playerLevel)) {
      return null;
    }

    const item = this.inventoryItems.get(equipmentId);
    if (!item) {
      return null;
    }

    const equipment = item.equipment;
    const slot = equipment.getSlot();

    // Store the previously equipped item to return it
    const previouslyEquipped = this.equippedItems[slot] || null;

    // Equip the new item
    this.equippedItems[slot] = equipment;

    // Remove one quantity from inventory
    this.removeItem(equipmentId, 1);

    return previouslyEquipped;
  }

  public unequipItem(slot: EquipmentSlot): boolean {
    const equippedItem = this.equippedItems[slot];
    if (!equippedItem) {
      return false;
    }

    // Try to add the item back to inventory
    if (!this.addItem(equippedItem, 1)) {
      return false; // Inventory full, cannot unequip
    }

    // Remove from equipped items
    delete this.equippedItems[slot];
    return true;
  }

  public getEquippedItem(slot: EquipmentSlot): Equipment | undefined {
    return this.equippedItems[slot];
  }

  public getAllEquippedItems(): EquippedItems {
    return { ...this.equippedItems };
  }

  public isEquipped(equipmentId: string): boolean {
    return Object.values(this.equippedItems).some(item => 
      item && item.getId() === equipmentId
    );
  }

  // Utility Methods
  private getNextAvailableSlot(): number {
    const usedSlots = new Set(
      Array.from(this.inventoryItems.values())
        .map(item => item.slotIndex)
        .filter(index => index !== undefined)
    );

    for (let i = 0; i < this.maxSlots; i++) {
      if (!usedSlots.has(i)) {
        return i;
      }
    }

    return this.inventoryItems.size; // Fallback
  }

  public moveItem(equipmentId: string, newSlotIndex: number): boolean {
    if (newSlotIndex < 0 || newSlotIndex >= this.maxSlots) {
      return false;
    }

    const item = this.inventoryItems.get(equipmentId);
    if (!item) {
      return false;
    }

    // Check if target slot is occupied
    const targetOccupied = Array.from(this.inventoryItems.values())
      .find(i => i.slotIndex === newSlotIndex);

    if (targetOccupied && targetOccupied.id !== equipmentId) {
      // Swap positions
      targetOccupied.slotIndex = item.slotIndex;
    }

    item.slotIndex = newSlotIndex;
    return true;
  }

  public sortInventory(sortBy: 'name' | 'type' | 'rarity' = 'name'): void {
    const items = Array.from(this.inventoryItems.values());
    
    items.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.equipment.getName().localeCompare(b.equipment.getName());
        case 'type':
          return a.equipment.getType().localeCompare(b.equipment.getType());
        case 'rarity':
          return b.equipment.getRarity() - a.equipment.getRarity();
        default:
          return 0;
      }
    });

    // Reassign slot indices
    items.forEach((item, index) => {
      item.slotIndex = index;
    });
  }

  // Serialization
  public serialize(): string {
    const data: SerializedInventoryManager = {
      inventoryItems: Array.from(this.inventoryItems.values()),
      equippedItems: Object.fromEntries(
        Object.entries(this.equippedItems).map(([slot, equipment]) => [
          slot,
          equipment
        ])
      ) as { [key in EquipmentSlot]?: Equipment },
      maxSlots: this.maxSlots
    };

    return JSON.stringify(data);
  }

  public static deserialize(data: string): InventoryManager {
    try {
      const parsed: SerializedInventoryManager = JSON.parse(data);
      
      const manager = new InventoryManager(parsed.maxSlots || 40);
      
      // Restore inventory items
      for (const item of parsed.inventoryItems || []) {
        // Create Equipment instance from the equipment data
        const equipment = Object.assign(new Equipment(), item.equipment);
        const inventoryItem: InventoryItem = {
          ...item,
          equipment
        };
        manager.inventoryItems.set(item.id, inventoryItem);
      }
      
      // Restore equipped items
      if (parsed.equippedItems) {
        for (const [slot, equipmentData] of Object.entries(parsed.equippedItems)) {
          if (equipmentData) {
            // Create Equipment instance from the equipment data
            const equipment = Object.assign(new Equipment(), equipmentData);
            manager.equippedItems[slot as EquipmentSlot] = equipment;
          }
        }
      }
      
      return manager;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to deserialize inventory data: invalid JSON');
      }
      throw error;
    }
  }

  // Debug and Statistics
  public getInventoryStats(): {
    totalItems: number;
    totalQuantity: number;
    usedSlots: number;
    availableSlots: number;
    equipmentByType: Record<string, number>;
    equipmentByRarity: Record<number, number>;
  } {
    const items = Array.from(this.inventoryItems.values());
    const equipmentByType: Record<string, number> = {};
    const equipmentByRarity: Record<number, number> = {};

    let totalQuantity = 0;

    for (const item of items) {
      totalQuantity += item.quantity;
      
      const type = item.equipment.getType();
      equipmentByType[type] = (equipmentByType[type] || 0) + 1;
      
      const rarity = item.equipment.getRarity();
      equipmentByRarity[rarity] = (equipmentByRarity[rarity] || 0) + 1;
    }

    return {
      totalItems: items.length,
      totalQuantity,
      usedSlots: this.inventoryItems.size,
      availableSlots: this.getAvailableSlots(),
      equipmentByType,
      equipmentByRarity
    };
  }

  public clear(): void {
    this.inventoryItems.clear();
    this.equippedItems = {};
  }
}