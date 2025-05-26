import { PlayerStats, IBaseStats } from './PlayerStats';
import { PlayerLevel } from './PlayerLevel';
import { Equipment, EquipmentSlot } from './Equipment';
import { InventoryManager } from './InventoryManager';

// Game state component interfaces
export interface IPlayerState {
  stats: PlayerStats;
  level: PlayerLevel;
  position: { x: number; y: number };
  inventory: IInventoryState;
  inventoryManager: InventoryManager;
  quests: IQuestState;
}

export interface IInventoryState {
  items: IInventoryItem[];
  gold: number;
  maxSlots: number;
}

export interface IInventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'quest';
  quantity: number;
  stats?: Partial<IBaseStats>;
}

export interface IQuestState {
  active: IQuest[];
  completed: string[]; // Quest IDs
}

export interface IQuest {
  id: string;
  title: string;
  description: string;
  objectives: IQuestObjective[];
  rewards: IQuestRewards;
  status: 'active' | 'completed' | 'failed';
}

export interface IQuestObjective {
  id: string;
  description: string;
  progress: number;
  required: number;
  completed: boolean;
}

export interface IQuestRewards {
  xp: number;
  gold: number;
  items?: IInventoryItem[];
}

export interface IWorldState {
  enemies: IEnemyState[];
  npcs: INPCState[];
  items: IWorldItem[];
  time: number; // In-game time in milliseconds
  playerPosition?: {
    x: number;
    y: number;
  };
}

export interface IEnemyState {
  id: string;
  type: string;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  level: number;
}

export interface INPCState {
  id: string;
  name: string;
  position: { x: number; y: number };
  quests: string[]; // Quest IDs this NPC can give
}

export interface IWorldItem {
  id: string;
  item: IInventoryItem;
  position: { x: number; y: number };
}

// Events that can be emitted by GameState
export type GameStateEventType = 
  | 'stateChanged'
  | 'playerMoved'
  | 'inventoryChanged'
  | 'questUpdated'
  | 'enemySpawned'
  | 'enemyDefeated'
  | 'itemCollected'
  | 'stateSaved'
  | 'stateLoaded'
  | 'stateError';

export interface GameStateEvent {
  type: GameStateEventType;
  data: any;
}

export type GameStateEventListener = (event: GameStateEvent) => void;

export class GameState {
  private player: IPlayerState;
  private world: IWorldState;
  private eventListeners: Set<GameStateEventListener>;
  private playerStats: PlayerStats;
  private playerLevel: PlayerLevel;
  private equipment: Equipment[];

  constructor() {
    // Initialize player state
    this.player = {
      stats: new PlayerStats(),
      level: new PlayerLevel(),
      position: { x: 0, y: 0 },
      inventory: {
        items: [],
        gold: 0,
        maxSlots: 20
      },
      inventoryManager: new InventoryManager(20),
      quests: {
        active: [],
        completed: []
      }
    };

    // Initialize world state
    this.world = {
      enemies: [],
      npcs: [],
      items: [],
      time: 0
    };

    this.eventListeners = new Set();
    this.playerStats = new PlayerStats();
    this.playerLevel = new PlayerLevel();
    this.equipment = [];
  }

  // Event handling
  public addEventListener(listener: GameStateEventListener): void {
    this.eventListeners.add(listener);
  }

  public removeEventListener(listener: GameStateEventListener): void {
    this.eventListeners.delete(listener);
  }

  private emitEvent(type: GameStateEventType, data: any): void {
    const event: GameStateEvent = { type, data };
    this.eventListeners.forEach(listener => listener(event));
  }

  // State access methods
  public getPlayerState(): IPlayerState {
    return { ...this.player };
  }

  public getWorldState(): IWorldState {
    return { ...this.world };
  }

  // Player state update methods
  public updatePlayerPosition(x: number, y: number): void {
    this.player.position = { x, y };
    this.emitEvent('playerMoved', { position: { x, y } });
  }

  public addInventoryItem(item: IInventoryItem): boolean {
    if (this.player.inventory.items.length >= this.player.inventory.maxSlots) {
      return false;
    }

    const existingItem = this.player.inventory.items.find(i => i.id === item.id);
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      this.player.inventory.items.push({ ...item });
    }

    this.emitEvent('inventoryChanged', { 
      added: item,
      inventory: this.player.inventory 
    });
    return true;
  }

  public removeInventoryItem(itemId: string, quantity: number = 1): boolean {
    const itemIndex = this.player.inventory.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return false;

    const item = this.player.inventory.items[itemIndex];
    if (item.quantity < quantity) return false;

    item.quantity -= quantity;
    if (item.quantity === 0) {
      this.player.inventory.items.splice(itemIndex, 1);
    }

    this.emitEvent('inventoryChanged', {
      removed: { itemId, quantity },
      inventory: this.player.inventory
    });
    return true;
  }

  // World state update methods
  public spawnEnemy(enemy: IEnemyState): void {
    this.world.enemies.push({ ...enemy });
    this.emitEvent('enemySpawned', { enemy });
  }

  public removeEnemy(enemyId: string): void {
    const index = this.world.enemies.findIndex(e => e.id === enemyId);
    if (index !== -1) {
      const enemy = this.world.enemies[index];
      this.world.enemies.splice(index, 1);
      this.emitEvent('enemyDefeated', { enemy });
    }
  }

  public addWorldItem(item: IWorldItem): void {
    this.world.items.push({ ...item });
  }

  public removeWorldItem(itemId: string): IWorldItem | undefined {
    const index = this.world.items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      const item = this.world.items[index];
      this.world.items.splice(index, 1);
      this.emitEvent('itemCollected', { item });
      return item;
    }
    return undefined;
  }

  // Quest management
  public startQuest(quest: IQuest): boolean {
    if (this.player.quests.active.some(q => q.id === quest.id) ||
        this.player.quests.completed.includes(quest.id)) {
      return false;
    }

    this.player.quests.active.push({ ...quest, status: 'active' });
    this.emitEvent('questUpdated', { 
      quest,
      action: 'started'
    });
    return true;
  }

  public updateQuestProgress(questId: string, objectiveId: string, progress: number): void {
    const quest = this.player.quests.active.find(q => q.id === questId);
    if (!quest) return;

    const objective = quest.objectives.find(o => o.id === objectiveId);
    if (!objective) return;

    objective.progress = Math.min(objective.required, progress);
    objective.completed = objective.progress >= objective.required;

    // Check if all objectives are completed
    if (quest.objectives.every(o => o.completed)) {
      quest.status = 'completed';
      this.player.quests.completed.push(quest.id);
      this.player.quests.active = this.player.quests.active.filter(q => q.id !== questId);

      // Apply rewards
      this.player.inventory.gold += quest.rewards.gold;
      this.player.level.addXP(quest.rewards.xp);
      quest.rewards.items?.forEach(item => this.addInventoryItem(item));
    }

    this.emitEvent('questUpdated', {
      quest,
      objectiveId,
      progress,
      action: quest.status === 'completed' ? 'completed' : 'updated'
    });
  }

  // Player state management
  public getPlayerStats(): PlayerStats {
    return this.playerStats;
  }

  public getPlayerLevel(): PlayerLevel {
    return this.playerLevel;
  }

  public getEquipment(): Equipment[] {
    return [...this.equipment];
  }

  public addEquipment(item: Equipment): void {
    this.equipment.push(item);
  }

  public removeEquipment(itemId: string): void {
    this.equipment = this.equipment.filter(item => item.getId() !== itemId);
  }

  // Equipment management using InventoryManager
  public equipItem(equipmentId: string): Equipment | null {
    const previouslyEquipped = this.player.inventoryManager.equipItem(
      equipmentId, 
      this.player.stats, 
      this.player.level
    );
    
    if (previouslyEquipped) {
      this.emitEvent('inventoryChanged', { 
        action: 'equipped',
        item: equipmentId,
        previouslyEquipped: previouslyEquipped.getId()
      });
    }
    
    return previouslyEquipped;
  }

  public unequipItem(slot: EquipmentSlot): boolean {
    const success = this.player.inventoryManager.unequipItem(slot);
    
    if (success) {
      this.emitEvent('inventoryChanged', { 
        action: 'unequipped',
        slot
      });
    }
    
    return success;
  }

  public getEquippedItem(slot: EquipmentSlot): Equipment | undefined {
    return this.player.inventoryManager.getEquippedItem(slot);
  }

  public getAllEquippedItems() {
    return this.player.inventoryManager.getAllEquippedItems();
  }

  public addItemToInventory(equipment: Equipment, quantity: number = 1): boolean {
    const success = this.player.inventoryManager.addItem(equipment, quantity);
    
    if (success) {
      this.emitEvent('inventoryChanged', { 
        action: 'added',
        item: equipment.getId(),
        quantity
      });
    }
    
    return success;
  }

  // World state management
  public getWorld(): IWorldState {
    return { ...this.world };
  }

  public updateWorld(newState: Partial<IWorldState>): void {
    this.world = { ...this.world, ...newState };
  }

  // Serialization
  public serialize(): string {
    const state = {
      player: {
        ...this.player,
        stats: this.player.stats.serialize(),
        level: this.player.level.serialize(),
        inventoryManager: this.player.inventoryManager.serialize()
      },
      world: this.world
    };
    return JSON.stringify(state);
  }

  public deserialize(data: string): void {
    try {
      const state = JSON.parse(data);
      
      if (!state || !state.player || !state.world) {
        throw new Error('Invalid state structure');
      }

      // Deserialize player state
      this.player = {
        ...state.player,
        stats: PlayerStats.deserialize(state.player.stats),
        level: PlayerLevel.deserialize(state.player.level),
        position: state.player.position || { x: 0, y: 0 },
        inventory: state.player.inventory || {
          items: [],
          gold: 0,
          maxSlots: 20
        },
        inventoryManager: state.player.inventoryManager 
          ? InventoryManager.deserialize(state.player.inventoryManager)
          : new InventoryManager(20),
        quests: state.player.quests || {
          active: [],
          completed: []
        }
      };

      // Deserialize world state
      this.world = {
        ...state.world,
        enemies: state.world.enemies || [],
        npcs: state.world.npcs || [],
        items: state.world.items || [],
        time: state.world.time || 0
      };

      this.emitEvent('stateLoaded', { state });
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to deserialize game state: Invalid JSON');
      }
      throw error;
    }
  }
} 