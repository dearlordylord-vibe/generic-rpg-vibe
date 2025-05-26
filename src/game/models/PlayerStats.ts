// Base stats that can be directly modified
export interface IBaseStats {
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
  luck: number;
}

// Stats that are derived from base stats
export interface IDerivedStats {
  maxHealth: number;
  currentHealth: number;
  maxMana: number;
  currentMana: number;
  physicalDamage: number;
  magicDamage: number;
  defense: number;
  evasion: number;
  criticalChance: number;
  criticalDamage: number;
}

// Stat modifiers (buffs/debuffs)
export interface IStatModifier {
  stat: keyof IBaseStats;
  value: number;
  duration: number; // in milliseconds, -1 for permanent
  source: string;
  id?: string; // Unique identifier for the modifier
  expiresAt?: number; // When the modifier expires
}

// Events that can be emitted by PlayerStats
export type PlayerStatsEventType = 
  | 'statChanged'
  | 'healthChanged'
  | 'manaChanged'
  | 'modifierAdded'
  | 'modifierRemoved'
  | 'modifierExpired'
  | 'died'
  | 'revived';

export interface PlayerStatsEvent {
  type: PlayerStatsEventType;
  data: any;
}

export type PlayerStatsEventListener = (event: PlayerStatsEvent) => void;

export class PlayerStats {
  private baseStats: IBaseStats;
  private derivedStats: IDerivedStats;
  private modifiers: Map<string, IStatModifier>;
  private lastUpdate: number;
  private eventListeners: Set<PlayerStatsEventListener>;
  private statPoints: number;
  private statHistory: Array<{ stat: keyof IBaseStats; oldValue: number; cost: number }>;
  
  private static readonly MIN_STAT_VALUE = 1;
  private static readonly MAX_STAT_VALUE = 100;
  private static readonly INITIAL_STAT_POINTS = 0;
  private static readonly HISTORY_SIZE = 10;
  private static readonly BASE_STAT_COST = 1;
  private static readonly COST_INCREASE_THRESHOLD = 50;
  private static readonly ADDITIONAL_COST_PER_LEVEL = 1;

  constructor(initialStats?: Partial<IBaseStats>) {
    this.baseStats = {
      strength: 10,
      dexterity: 10,
      intelligence: 10,
      vitality: 10,
      luck: 10,
      ...initialStats,
    };
    this.modifiers = new Map();
    this.lastUpdate = Date.now();
    this.eventListeners = new Set();
    this.statPoints = PlayerStats.INITIAL_STAT_POINTS;
    this.derivedStats = this.calculateDerivedStats();
    this.statHistory = [];
  }

  private calculateDerivedStats(): IDerivedStats {
    const effectiveStats = this.getEffectiveBaseStats();
    const oldDerived = this.derivedStats;
    
    const newDerived: IDerivedStats = {
      maxHealth: 100 + (effectiveStats.vitality * 10),
      currentHealth: oldDerived?.currentHealth ?? (100 + (effectiveStats.vitality * 10)),
      maxMana: 50 + (effectiveStats.intelligence * 5),
      currentMana: oldDerived?.currentMana ?? (50 + (effectiveStats.intelligence * 5)),
      physicalDamage: effectiveStats.strength * 2,
      magicDamage: effectiveStats.intelligence * 2,
      defense: effectiveStats.vitality + (effectiveStats.strength * 0.5),
      evasion: effectiveStats.dexterity * 1.5,
      criticalChance: (effectiveStats.luck * 0.5) + (effectiveStats.dexterity * 0.2),
      criticalDamage: 150 + (effectiveStats.luck * 2),
    };

    // Ensure current values don't exceed new maximums
    newDerived.currentHealth = Math.min(newDerived.currentHealth, newDerived.maxHealth);
    newDerived.currentMana = Math.min(newDerived.currentMana, newDerived.maxMana);

    return newDerived;
  }

  private getEffectiveBaseStats(): IBaseStats {
    const effective = { ...this.baseStats };
    
    // Apply all active modifiers
    for (const modifier of this.modifiers.values()) {
      effective[modifier.stat] += modifier.value;
    }

    // Ensure no stat goes below 1
    Object.keys(effective).forEach((key) => {
      effective[key as keyof IBaseStats] = Math.max(PlayerStats.MIN_STAT_VALUE, effective[key as keyof IBaseStats]);
    });

    return effective;
  }

  private validateStatValue(value: number): boolean {
    return value >= PlayerStats.MIN_STAT_VALUE && value <= PlayerStats.MAX_STAT_VALUE;
  }

  private emitEvent(type: PlayerStatsEventType, data: any) {
    const event: PlayerStatsEvent = { type, data };
    this.eventListeners.forEach(listener => listener(event));
  }

  // Event handling
  public addEventListener(listener: PlayerStatsEventListener): void {
    this.eventListeners.add(listener);
  }

  public removeEventListener(listener: PlayerStatsEventListener): void {
    this.eventListeners.delete(listener);
  }

  // Stat points management
  public addStatPoints(points: number): void {
    if (points < 0) throw new Error('Cannot add negative stat points');
    this.statPoints += points;
  }

  public getAvailableStatPoints(): number {
    return this.statPoints;
  }

  private calculateStatCost(stat: keyof IBaseStats): number {
    const currentValue = this.baseStats[stat];
    if (currentValue >= PlayerStats.COST_INCREASE_THRESHOLD) {
      return PlayerStats.BASE_STAT_COST + Math.floor((currentValue - PlayerStats.COST_INCREASE_THRESHOLD) / 10) * PlayerStats.ADDITIONAL_COST_PER_LEVEL;
    }
    return PlayerStats.BASE_STAT_COST;
  }

  public getStatCost(stat: keyof IBaseStats): number {
    return this.calculateStatCost(stat);
  }

  public canAllocateStatPoint(stat: keyof IBaseStats): boolean {
    const cost = this.calculateStatCost(stat);
    return this.statPoints >= cost && this.baseStats[stat] < PlayerStats.MAX_STAT_VALUE;
  }

  public previewStatAllocation(stat: keyof IBaseStats): PlayerStats | null {
    if (!this.canAllocateStatPoint(stat)) return null;
    
    const preview = PlayerStats.deserialize(this.serialize());
    preview.allocateStatPoint(stat);
    return preview;
  }

  public allocateStatPoint(stat: keyof IBaseStats): boolean {
    if (!this.canAllocateStatPoint(stat)) return false;

    const cost = this.calculateStatCost(stat);
    const oldValue = this.baseStats[stat];
    
    this.baseStats[stat]++;
    this.statPoints -= cost;
    this.derivedStats = this.calculateDerivedStats();
    
    // Add to history
    this.statHistory.unshift({ stat, oldValue, cost });
    if (this.statHistory.length > PlayerStats.HISTORY_SIZE) {
      this.statHistory.pop();
    }
    
    this.emitEvent('statChanged', { stat, value: this.baseStats[stat] });
    return true;
  }

  public undoLastAllocation(): boolean {
    if (this.statHistory.length === 0) return false;

    const lastChange = this.statHistory[0];
    this.baseStats[lastChange.stat] = lastChange.oldValue;
    this.statPoints += lastChange.cost;
    this.derivedStats = this.calculateDerivedStats();
    this.statHistory.shift();

    this.emitEvent('statChanged', { stat: lastChange.stat, value: lastChange.oldValue });
    return true;
  }

  public canUndo(): boolean {
    return this.statHistory.length > 0;
  }

  // Public methods
  public update(): void {
    const now = Date.now();
    const expired: string[] = [];

    // Check for expired modifiers
    this.modifiers.forEach((mod, id) => {
      if (mod.expiresAt && mod.expiresAt > 0 && now >= mod.expiresAt) {
        expired.push(id);
        this.emitEvent('modifierExpired', { modifier: mod });
      }
    });

    // Remove expired modifiers
    expired.forEach(id => this.modifiers.delete(id));

    if (expired.length > 0) {
      this.derivedStats = this.calculateDerivedStats();
    }

    this.lastUpdate = now;
  }

  public addModifier(modifier: IStatModifier): string {
    const id = modifier.id ?? `${modifier.source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const expiresAt = modifier.duration > 0 ? now + modifier.duration : -1;
    const fullModifier = { ...modifier, id, expiresAt };
    
    this.modifiers.set(id, fullModifier);
    this.derivedStats = this.calculateDerivedStats();
    this.emitEvent('modifierAdded', { modifier: fullModifier });
    return id;
  }

  public removeModifier(id: string): boolean {
    const modifier = this.modifiers.get(id);
    if (!modifier) return false;

    const removed = this.modifiers.delete(id);
    if (removed) {
      this.derivedStats = this.calculateDerivedStats();
      this.emitEvent('modifierRemoved', { modifier });
    }
    return removed;
  }

  public modifyHealth(amount: number): void {
    const oldHealth = this.derivedStats.currentHealth;
    this.derivedStats.currentHealth = Math.min(
      this.derivedStats.maxHealth,
      Math.max(0, this.derivedStats.currentHealth + amount)
    );

    if (oldHealth !== this.derivedStats.currentHealth) {
      this.emitEvent('healthChanged', {
        oldValue: oldHealth,
        newValue: this.derivedStats.currentHealth,
        change: amount
      });

      // Check for death or revival
      if (oldHealth > 0 && this.derivedStats.currentHealth <= 0) {
        this.emitEvent('died', null);
      } else if (oldHealth <= 0 && this.derivedStats.currentHealth > 0) {
        this.emitEvent('revived', null);
      }
    }
  }

  public modifyMana(amount: number): void {
    const oldMana = this.derivedStats.currentMana;
    this.derivedStats.currentMana = Math.min(
      this.derivedStats.maxMana,
      Math.max(0, this.derivedStats.currentMana + amount)
    );

    if (oldMana !== this.derivedStats.currentMana) {
      this.emitEvent('manaChanged', {
        oldValue: oldMana,
        newValue: this.derivedStats.currentMana,
        change: amount
      });
    }
  }

  public isDead(): boolean {
    return this.derivedStats.currentHealth <= 0;
  }

  // Getters and Setters
  public getBaseStat(stat: keyof IBaseStats): number {
    return this.baseStats[stat];
  }

  public setBaseStat(stat: keyof IBaseStats, value: number): boolean {
    if (!this.validateStatValue(value)) return false;
    
    const oldValue = this.baseStats[stat];
    this.baseStats[stat] = value;
    this.derivedStats = this.calculateDerivedStats();
    
    this.emitEvent('statChanged', {
      stat,
      oldValue,
      newValue: value
    });
    
    return true;
  }

  public getDerivedStat(stat: keyof IDerivedStats): number {
    return this.derivedStats[stat];
  }

  public getActiveModifiers(): IStatModifier[] {
    return Array.from(this.modifiers.values());
  }

  // Debug/Testing helper
  public getDebugInfo() {
    return {
      base: { ...this.baseStats },
      derived: { ...this.derivedStats },
      modifiers: Array.from(this.modifiers.values()),
      statPoints: this.statPoints,
      lastUpdate: this.lastUpdate
    };
  }

  public serialize(): string {
    return JSON.stringify({
      baseStats: this.baseStats,
      derivedStats: this.derivedStats,
      modifiers: Array.from(this.modifiers.entries()),
      statPoints: this.statPoints,
      lastUpdate: this.lastUpdate,
      statHistory: this.statHistory
    });
  }

  public static deserialize(data: string): PlayerStats {
    try {
      const parsed = JSON.parse(data);
      const stats = new PlayerStats(parsed.baseStats);
      stats.derivedStats = parsed.derivedStats;
      stats.modifiers = new Map(parsed.modifiers);
      stats.statPoints = parsed.statPoints;
      stats.lastUpdate = parsed.lastUpdate;
      stats.statHistory = parsed.statHistory || [];
      return stats;
    } catch (error) {
      throw new Error(`Failed to deserialize PlayerStats: ${(error as Error).message}`);
    }
  }

  public getDerivedStats(): IDerivedStats {
    return { ...this.derivedStats };
  }
} 