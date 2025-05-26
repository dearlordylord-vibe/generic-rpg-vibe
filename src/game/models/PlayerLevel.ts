// Experience and level-related interfaces
export interface ILevelRequirements {
  xpRequired: number;  // XP needed to reach this level
  statPoints: number;  // Stat points awarded at this level
}

export interface ILevelConfig {
  baseXP: number;      // Base XP required for level 2
  xpScale: number;     // How much XP requirements scale per level
  baseStatPoints: number;  // Base stat points awarded per level
  bonusStatPointLevels: number[];  // Levels that award bonus stat points
  bonusStatPointAmount: number;    // Amount of bonus stat points awarded
  maxLevel: number;    // Maximum achievable level
}

export interface ILevelInfo {
  currentLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXPForCurrentLevel: number;
  progress: number;  // 0-1 progress to next level
}

// Events that can be emitted by PlayerLevel
export type PlayerLevelEventType = 
  | 'xpGained'
  | 'levelUp'
  | 'maxLevelReached';

export interface PlayerLevelEvent {
  type: PlayerLevelEventType;
  data: any;
}

export type PlayerLevelEventListener = (event: PlayerLevelEvent) => void;

export class PlayerLevel {
  private currentXP: number;
  private eventListeners: Set<PlayerLevelEventListener>;
  private readonly config: ILevelConfig;

  // Default configuration for leveling system
  private static readonly DEFAULT_CONFIG: ILevelConfig = {
    baseXP: 100,         // 100 XP needed for level 2
    xpScale: 1.5,        // Each level requires 50% more XP than the previous
    baseStatPoints: 3,   // 3 stat points per level
    bonusStatPointLevels: [5, 10, 15, 20, 25, 30], // Bonus points at milestone levels
    bonusStatPointAmount: 2,  // 2 extra stat points at milestone levels
    maxLevel: 30,        // Maximum level cap
  };

  constructor(config: Partial<ILevelConfig> = {}) {
    this.config = { ...PlayerLevel.DEFAULT_CONFIG, ...config };
    this.currentXP = 0;
    this.eventListeners = new Set();
  }

  // Event handling
  public addEventListener(listener: PlayerLevelEventListener): void {
    this.eventListeners.add(listener);
  }

  public removeEventListener(listener: PlayerLevelEventListener): void {
    this.eventListeners.delete(listener);
  }

  private emitEvent(type: PlayerLevelEventType, data: any) {
    const event: PlayerLevelEvent = { type, data };
    this.eventListeners.forEach(listener => listener(event));
  }

  // XP calculation methods
  private calculateXPForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(
      this.config.baseXP * Math.pow(this.config.xpScale, level - 2)
    );
  }

  private calculateTotalXPForLevel(level: number): number {
    let total = 0;
    for (let i = 1; i < level; i++) {
      total += this.calculateXPForLevel(i + 1);
    }
    return total;
  }

  // Level calculation methods
  private calculateCurrentLevel(): number {
    let level = 1;
    let xpForNextLevel = this.calculateXPForLevel(level + 1);
    let totalXP = 0;

    while (level < this.config.maxLevel && this.currentXP >= (totalXP + xpForNextLevel)) {
      totalXP += xpForNextLevel;
      level++;
      xpForNextLevel = this.calculateXPForLevel(level + 1);
    }

    return level;
  }

  // Stat point calculation
  private calculateStatPointsForLevel(level: number): number {
    let points = this.config.baseStatPoints;
    if (this.config.bonusStatPointLevels.includes(level)) {
      points += this.config.bonusStatPointAmount;
    }
    return points;
  }

  // Public methods
  public addXP(amount: number): void {
    if (amount <= 0) throw new Error('XP amount must be positive');
    
    const oldLevel = this.calculateCurrentLevel();
    const oldXP = this.currentXP;
    
    this.currentXP += amount;
    
    // Emit XP gained event
    this.emitEvent('xpGained', {
      amount,
      oldXP,
      newXP: this.currentXP
    });

    // Check for level up
    const newLevel = this.calculateCurrentLevel();
    if (newLevel > oldLevel) {
      // Calculate stat points awarded
      let totalStatPoints = 0;
      for (let level = oldLevel + 1; level <= newLevel; level++) {
        totalStatPoints += this.calculateStatPointsForLevel(level);
      }

      this.emitEvent('levelUp', {
        oldLevel,
        newLevel,
        statPointsAwarded: totalStatPoints
      });

      if (newLevel === this.config.maxLevel) {
        this.emitEvent('maxLevelReached', null);
      }
    }
  }

  public getLevelInfo(): ILevelInfo {
    const currentLevel = this.calculateCurrentLevel();
    const totalXPForCurrentLevel = this.calculateTotalXPForLevel(currentLevel);
    const totalXPForNextLevel = this.calculateTotalXPForLevel(currentLevel + 1);
    const xpToNextLevel = totalXPForNextLevel - this.currentXP;
    const progress = (this.currentXP - totalXPForCurrentLevel) / 
                    (totalXPForNextLevel - totalXPForCurrentLevel);

    return {
      currentLevel,
      currentXP: this.currentXP,
      xpToNextLevel,
      totalXPForCurrentLevel,
      progress
    };
  }

  public getConfig(): ILevelConfig {
    return { ...this.config };
  }

  public serialize(): string {
    return JSON.stringify({
      currentXP: this.currentXP,
      config: this.config,
      levelInfo: this.getLevelInfo()
    });
  }

  public static deserialize(data: string): PlayerLevel {
    try {
      const parsed = JSON.parse(data);
      const level = new PlayerLevel(parsed.config);
      level.currentXP = parsed.currentXP;
      return level;
    } catch (error: unknown) {
      throw new Error(`Failed to deserialize PlayerLevel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Debug/Testing helper
  public getDebugInfo() {
    return {
      currentXP: this.currentXP,
      levelInfo: this.getLevelInfo(),
      config: this.getConfig()
    };
  }
} 