import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState, IInventoryItem, IEnemyState, IQuest, IWorldItem } from '../GameState';
import { PlayerStats } from '../PlayerStats';
import { PlayerLevel } from '../PlayerLevel';

describe('GameState', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const playerState = gameState.getPlayerState();
      const worldState = gameState.getWorldState();

      expect(playerState.stats).toBeInstanceOf(PlayerStats);
      expect(playerState.level).toBeInstanceOf(PlayerLevel);
      expect(playerState.position).toEqual({ x: 0, y: 0 });
      expect(playerState.inventory.items).toEqual([]);
      expect(playerState.inventory.gold).toBe(0);
      expect(playerState.inventory.maxSlots).toBe(20);
      expect(playerState.quests.active).toEqual([]);
      expect(playerState.quests.completed).toEqual([]);

      expect(worldState.enemies).toEqual([]);
      expect(worldState.npcs).toEqual([]);
      expect(worldState.items).toEqual([]);
      expect(worldState.time).toBe(0);
    });
  });

  describe('event handling', () => {
    it('should emit events when state changes', () => {
      const listener = vi.fn();
      gameState.addEventListener(listener);

      // Test player movement
      gameState.updatePlayerPosition(10, 20);
      expect(listener).toHaveBeenCalledWith({
        type: 'playerMoved',
        data: { position: { x: 10, y: 20 } }
      });

      // Test inventory changes
      const item: IInventoryItem = {
        id: 'sword1',
        name: 'Iron Sword',
        type: 'weapon',
        quantity: 1
      };
      gameState.addInventoryItem(item);
      expect(listener).toHaveBeenCalledWith({
        type: 'inventoryChanged',
        data: expect.objectContaining({
          added: item,
          inventory: expect.any(Object)
        })
      });

      // Test enemy spawning
      const enemy: IEnemyState = {
        id: 'enemy1',
        type: 'goblin',
        position: { x: 100, y: 100 },
        health: 50,
        maxHealth: 50,
        level: 1
      };
      gameState.spawnEnemy(enemy);
      expect(listener).toHaveBeenCalledWith({
        type: 'enemySpawned',
        data: { enemy }
      });
    });
  });

  describe('inventory management', () => {
    const sword: IInventoryItem = {
      id: 'sword1',
      name: 'Iron Sword',
      type: 'weapon',
      quantity: 1
    };

    it('should add items to inventory', () => {
      expect(gameState.addInventoryItem(sword)).toBe(true);
      const state = gameState.getPlayerState();
      expect(state.inventory.items).toHaveLength(1);
      expect(state.inventory.items[0]).toEqual(sword);
    });

    it('should stack items with same id', () => {
      gameState.addInventoryItem(sword);
      gameState.addInventoryItem({ ...sword, quantity: 2 });
      const state = gameState.getPlayerState();
      expect(state.inventory.items).toHaveLength(1);
      expect(state.inventory.items[0].quantity).toBe(3);
    });

    it('should prevent adding items when inventory is full', () => {
      const item = { ...sword, quantity: 1 };
      for (let i = 0; i < 20; i++) {
        gameState.addInventoryItem({ ...item, id: `item${i}` });
      }
      expect(gameState.addInventoryItem({ ...item, id: 'onemore' })).toBe(false);
    });

    it('should remove items from inventory', () => {
      gameState.addInventoryItem({ ...sword, quantity: 3 });
      expect(gameState.removeInventoryItem(sword.id, 2)).toBe(true);
      const state = gameState.getPlayerState();
      expect(state.inventory.items[0].quantity).toBe(1);
    });

    it('should remove item completely when quantity reaches 0', () => {
      gameState.addInventoryItem(sword);
      expect(gameState.removeInventoryItem(sword.id, 1)).toBe(true);
      const state = gameState.getPlayerState();
      expect(state.inventory.items).toHaveLength(0);
    });
  });

  describe('world item management', () => {
    const worldItem: IWorldItem = {
      id: 'sword1',
      item: {
        id: 'sword1',
        name: 'Iron Sword',
        type: 'weapon',
        quantity: 1
      },
      position: { x: 100, y: 100 }
    };

    it('should add and remove world items', () => {
      gameState.addWorldItem(worldItem);
      const state = gameState.getWorldState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(worldItem);

      const removed = gameState.removeWorldItem(worldItem.id);
      expect(removed).toEqual(worldItem);
      expect(gameState.getWorldState().items).toHaveLength(0);
    });
  });

  describe('quest management', () => {
    const quest: IQuest = {
      id: 'quest1',
      title: 'Slay the Goblins',
      description: 'Clear the goblin camp',
      objectives: [
        {
          id: 'obj1',
          description: 'Kill 5 goblins',
          progress: 0,
          required: 5,
          completed: false
        }
      ],
      rewards: {
        xp: 100,
        gold: 50
      },
      status: 'active'
    };

    it('should start new quests', () => {
      expect(gameState.startQuest(quest)).toBe(true);
      const state = gameState.getPlayerState();
      expect(state.quests.active).toHaveLength(1);
      expect(state.quests.active[0]).toEqual(quest);
    });

    it('should prevent starting duplicate quests', () => {
      gameState.startQuest(quest);
      expect(gameState.startQuest(quest)).toBe(false);
    });

    it('should update quest progress', () => {
      gameState.startQuest(quest);
      gameState.updateQuestProgress(quest.id, 'obj1', 3);
      const state = gameState.getPlayerState();
      expect(state.quests.active[0].objectives[0].progress).toBe(3);
      expect(state.quests.active[0].objectives[0].completed).toBe(false);
    });

    it('should complete quests and award rewards', () => {
      const initialGold = gameState.getPlayerState().inventory.gold;
      const initialXP = gameState.getPlayerState().level.getLevelInfo().currentXP;

      gameState.startQuest(quest);
      gameState.updateQuestProgress(quest.id, 'obj1', 5);

      const state = gameState.getPlayerState();
      expect(state.quests.active).toHaveLength(0);
      expect(state.quests.completed).toContain(quest.id);
      expect(state.inventory.gold).toBe(initialGold + quest.rewards.gold);
      expect(state.level.getLevelInfo().currentXP).toBe(initialXP + quest.rewards.xp);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize the game state', () => {
      // Set up some state
      gameState.updatePlayerPosition(10, 20);
      gameState.addInventoryItem({
        id: 'sword1',
        name: 'Iron Sword',
        type: 'weapon',
        quantity: 1
      });
      gameState.spawnEnemy({
        id: 'enemy1',
        type: 'goblin',
        position: { x: 100, y: 100 },
        health: 50,
        maxHealth: 50,
        level: 1
      });

      // Serialize
      const serialized = gameState.serialize();
      expect(typeof serialized).toBe('string');

      // Create new instance and deserialize
      const newState = new GameState();
      newState.deserialize(serialized);

      // Compare states
      const originalPlayer = gameState.getPlayerState();
      const newPlayer = newState.getPlayerState();
      expect(newPlayer.position).toEqual(originalPlayer.position);
      expect(newPlayer.inventory.items).toEqual(originalPlayer.inventory.items);

      const originalWorld = gameState.getWorldState();
      const newWorld = newState.getWorldState();
      expect(newWorld.enemies).toEqual(originalWorld.enemies);
    });

    it('should handle invalid state data', () => {
      expect(() => {
        gameState.deserialize('invalid json');
      }).toThrow('Failed to deserialize game state');

      expect(() => {
        gameState.deserialize('{}');
      }).toThrow('Invalid state structure');
    });
  });
}); 