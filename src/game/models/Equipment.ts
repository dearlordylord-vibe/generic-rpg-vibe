import { PlayerStats, IBaseStats } from './PlayerStats';
import { PlayerLevel } from './PlayerLevel';

export enum EquipmentSlot {
  HEAD = 'head',
  BODY = 'body',
  PAWS = 'paws',
  TAIL = 'tail',
  ACCESSORY = 'accessory',
  WEAPON = 'weapon',
  CHEST = 'chest'
}

export enum EquipmentType {
  ARMOR = 'armor',
  WEAPON = 'weapon',
  ACCESSORY = 'accessory'
}

export interface EquipmentRequirements {
  level?: number;
  stats?: Partial<Record<keyof IBaseStats, number>>;
}

export interface EquipmentStats {
  bonuses?: {
    strength?: number;
    dexterity?: number;
    intelligence?: number;
    vitality?: number;
    luck?: number;
  };
  multipliers?: {
    strength?: number;
    dexterity?: number;
    intelligence?: number;
    vitality?: number;
    luck?: number;
  };
}

export interface SerializedEquipment {
  id: string;
  name: string;
  slot: EquipmentSlot;
  type: EquipmentType;
  requirements: EquipmentRequirements;
  stats: EquipmentStats;
  description: string;
  rarity: number;
}

export class Equipment {
  public id: string;
  public name: string;
  public slot: EquipmentSlot;
  public type: EquipmentType;
  public requirements: EquipmentRequirements;
  public stats: EquipmentStats;
  private description: string;
  private rarity: number;

  constructor(
    id: string = '',
    name: string = '',
    type: EquipmentType = EquipmentType.ACCESSORY,
    slot: EquipmentSlot = EquipmentSlot.ACCESSORY,
    requirements: EquipmentRequirements = {},
    stats: EquipmentStats = {},
    description: string = '',
    rarity: number = 1
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.slot = slot;
    this.requirements = requirements;
    this.stats = stats;
    this.description = description;
    this.rarity = Math.max(1, Math.min(5, rarity)); // Clamp between 1 and 5
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getType(): EquipmentType {
    return this.type;
  }

  public getSlot(): EquipmentSlot {
    return this.slot;
  }

  public getRequirements(): EquipmentRequirements {
    return this.requirements;
  }

  public getStats(): EquipmentStats {
    return this.stats;
  }

  public getDescription(): string {
    return this.description;
  }

  public getRarity(): number {
    return this.rarity;
  }

  public serialize(): string {
    const data: SerializedEquipment = {
      id: this.id,
      name: this.name,
      slot: this.slot,
      type: this.type,
      requirements: this.requirements,
      stats: this.stats,
      description: this.description,
      rarity: this.rarity
    };
    return JSON.stringify(data);
  }

  public static deserialize(data: string): Equipment {
    try {
      const parsed: SerializedEquipment = JSON.parse(data);
      
      // Validate required fields
      if (!parsed.id || !parsed.name || !parsed.slot || !parsed.type) {
        throw new Error('Failed to deserialize equipment data: missing required fields');
      }

      return new Equipment(
        parsed.id,
        parsed.name,
        parsed.type,
        parsed.slot,
        parsed.requirements,
        parsed.stats,
        parsed.description,
        parsed.rarity
      );
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to deserialize equipment data: invalid JSON');
      }
      throw error;
    }
  }

  public canEquip(playerStats: PlayerStats, playerLevel: PlayerLevel): boolean {
    // Check level requirement
    if (this.requirements.level) {
      const currentLevel = playerLevel.getLevelInfo().currentLevel;
      if (currentLevel < this.requirements.level) {
        return false;
      }
    }

    // Check stat requirements
    if (this.requirements.stats) {
      for (const [stat, requiredValue] of Object.entries(this.requirements.stats)) {
        const currentValue = playerStats.getBaseStat(stat as keyof IBaseStats);
        if (requiredValue && currentValue < requiredValue) {
          return false;
        }
      }
    }

    return true;
  }
} 