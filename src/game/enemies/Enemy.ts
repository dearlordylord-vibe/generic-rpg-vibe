import { Scene } from 'phaser';
import { IDerivedStats, IStatModifier } from '../models/PlayerStats';
import { EnemyBehaviorTree } from '../ai/EnemyBehaviorTree';

export interface IEnemyStats extends IDerivedStats {
  level: number;
  experienceReward: number;
}

export interface IEnemyBehavior {
  id: string;
  name: string;
  cooldown: number;
  lastUsed: number;
  range: number;
  canExecute(enemy: Enemy, target: Phaser.GameObjects.Sprite): boolean;
  execute(enemy: Enemy, target: Phaser.GameObjects.Sprite): void;
}

export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'retreat' | 'dead';

export type EnemyEventType = 
  | 'died'
  | 'attacked'
  | 'damaged'
  | 'stateChanged'
  | 'behaviorExecuted';

export interface EnemyEvent {
  type: EnemyEventType;
  data: unknown;
}

export type EnemyEventListener = (event: EnemyEvent) => void;

export abstract class Enemy {
  protected id: string;
  protected name: string;
  protected sprite: Phaser.GameObjects.Sprite;
  protected scene: Scene;
  protected stats: IEnemyStats;
  protected modifiers: Map<string, IStatModifier>;
  protected behaviors: Map<string, IEnemyBehavior>;
  protected state: EnemyState;
  protected target: Phaser.GameObjects.Sprite | null;
  protected eventListeners: Set<EnemyEventListener>;
  protected lastUpdate: number;
  protected spawnPosition: { x: number; y: number };
  protected patrolRadius: number;
  protected detectionRadius: number;
  protected attackRadius: number;
  protected retreatThreshold: number; // Health percentage to retreat
  protected behaviorTree: EnemyBehaviorTree | null = null;
  protected useBehaviorTree: boolean = false;

  constructor(
    scene: Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    this.scene = scene;
    this.id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = this.getEnemyName();
    this.sprite = scene.add.sprite(x, y, texture, frame);
    this.spawnPosition = { x, y };
    this.state = 'idle';
    this.target = null;
    this.modifiers = new Map();
    this.behaviors = new Map();
    this.eventListeners = new Set();
    this.lastUpdate = Date.now();
    
    // Default radii - can be overridden by subclasses
    this.patrolRadius = 100;
    this.detectionRadius = 150;
    this.attackRadius = 50;
    this.retreatThreshold = 0.2; // 20% health

    // Initialize stats and behaviors
    this.stats = this.initializeStats();
    this.initializeBehaviors();
    this.setupPhysics();
    this.initializeBehaviorTree();
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract getEnemyName(): string;
  protected abstract initializeStats(): IEnemyStats;
  protected abstract initializeBehaviors(): void;
  
  // Virtual methods that can be overridden
  protected initializeBehaviorTree(): void {
    // Override in subclasses to set up behavior tree
    // By default, behavior trees are disabled
  }
  protected setupPhysics(): void {
    if (this.scene.physics) {
      this.scene.physics.add.existing(this.sprite);
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setCollideWorldBounds(true);
      }
    }
  }

  protected emitEvent(type: EnemyEventType, data: unknown): void {
    const event: EnemyEvent = { type, data };
    this.eventListeners.forEach(listener => listener(event));
  }

  // Event handling
  public addEventListener(listener: EnemyEventListener): void {
    this.eventListeners.add(listener);
  }

  public removeEventListener(listener: EnemyEventListener): void {
    this.eventListeners.delete(listener);
  }

  // Modifier system
  public addModifier(modifier: IStatModifier): string {
    const id = modifier.id ?? `${modifier.source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const expiresAt = modifier.duration > 0 ? now + modifier.duration : -1;
    const fullModifier = { ...modifier, id, expiresAt };
    
    this.modifiers.set(id, fullModifier);
    this.recalculateStats();
    return id;
  }

  public removeModifier(id: string): boolean {
    const removed = this.modifiers.delete(id);
    if (removed) {
      this.recalculateStats();
    }
    return removed;
  }

  protected recalculateStats(): void {
    // Apply modifiers to base stats - to be implemented based on specific needs
    // This is a simplified version
  }

  // Behavior system
  public addBehavior(behavior: IEnemyBehavior): void {
    this.behaviors.set(behavior.id, behavior);
  }

  public removeBehavior(behaviorId: string): boolean {
    return this.behaviors.delete(behaviorId);
  }

  protected executeBehavior(behaviorId: string, target: Phaser.GameObjects.Sprite): boolean {
    const behavior = this.behaviors.get(behaviorId);
    if (!behavior) return false;

    const now = Date.now();
    if (now - behavior.lastUsed < behavior.cooldown) return false;

    if (behavior.canExecute(this, target)) {
      behavior.lastUsed = now;
      behavior.execute(this, target);
      this.emitEvent('behaviorExecuted', { behavior: behavior.id, target });
      return true;
    }
    return false;
  }

  // Behavior Tree management
  public setBehaviorTree(behaviorTree: EnemyBehaviorTree): void {
    this.behaviorTree = behaviorTree;
    this.useBehaviorTree = true;
  }

  public enableBehaviorTree(): void {
    this.useBehaviorTree = true;
  }

  public disableBehaviorTree(): void {
    this.useBehaviorTree = false;
  }

  public getBehaviorTree(): EnemyBehaviorTree | null {
    return this.behaviorTree;
  }

  public isBehaviorTreeEnabled(): boolean {
    return this.useBehaviorTree && this.behaviorTree !== null;
  }

  // State management
  public setState(newState: EnemyState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.emitEvent('stateChanged', { oldState, newState });
    }
  }

  public getState(): EnemyState {
    return this.state;
  }

  // Combat methods
  public takeDamage(amount: number, source?: string): void {
    const oldHealth = this.stats.currentHealth;
    this.stats.currentHealth = Math.max(0, this.stats.currentHealth - amount);
    
    this.emitEvent('damaged', {
      amount,
      oldHealth,
      newHealth: this.stats.currentHealth,
      source
    });

    if (this.stats.currentHealth <= 0 && oldHealth > 0) {
      this.die();
    } else if (this.stats.currentHealth / this.stats.maxHealth <= this.retreatThreshold) {
      this.setState('retreat');
    }
  }

  public heal(amount: number): void {
    this.stats.currentHealth = Math.min(this.stats.maxHealth, this.stats.currentHealth + amount);
  }

  public isDead(): boolean {
    return this.stats.currentHealth <= 0 || this.state === 'dead';
  }

  protected die(): void {
    this.setState('dead');
    this.target = null;
    this.emitEvent('died', { enemy: this, experienceReward: this.stats.experienceReward });
  }

  // AI/Update methods
  public update(_deltaTime: number): void {
    if (this.isDead()) return;

    this.updateModifiers();
    
    // Use behavior tree if enabled, otherwise fall back to manual AI
    if (this.isBehaviorTreeEnabled()) {
      this.behaviorTree!.update(_deltaTime);
    } else {
      this.updateAI(_deltaTime);
    }
    
    this.lastUpdate = Date.now();
  }

  protected updateModifiers(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.modifiers.forEach((mod, id) => {
      if (mod.expiresAt && mod.expiresAt > 0 && now >= mod.expiresAt) {
        expired.push(id);
      }
    });

    expired.forEach(id => this.removeModifier(id));
  }

  protected updateAI(_deltaTime: number): void {
    switch (this.state) {
      case 'idle':
        this.handleIdleState();
        break;
      case 'patrol':
        this.handlePatrolState();
        break;
      case 'chase':
        this.handleChaseState();
        break;
      case 'attack':
        this.handleAttackState();
        break;
      case 'retreat':
        this.handleRetreatState();
        break;
    }
  }

  protected handleIdleState(): void {
    // Look for targets
    if (this.detectTarget()) {
      this.setState('chase');
    } else {
      // Randomly start patrolling
      if (Math.random() < 0.01) { // 1% chance per frame
        this.setState('patrol');
      }
    }
  }

  protected handlePatrolState(): void {
    if (this.detectTarget()) {
      this.setState('chase');
      return;
    }

    // Simple patrol logic - move randomly within patrol radius
    const distanceFromSpawn = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.spawnPosition.x, this.spawnPosition.y
    );

    if (distanceFromSpawn > this.patrolRadius) {
      // Return to spawn area
      this.moveTowards(this.spawnPosition.x, this.spawnPosition.y, 30);
    } else if (Math.random() < 0.02) { // 2% chance to change direction
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.patrolRadius * 0.5;
      const targetX = this.spawnPosition.x + Math.cos(angle) * distance;
      const targetY = this.spawnPosition.y + Math.sin(angle) * distance;
      this.moveTowards(targetX, targetY, 30);
    }
  }

  protected handleChaseState(): void {
    if (!this.target || this.isDead()) {
      this.setState('idle');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.target.x, this.target.y
    );

    if (distance > this.detectionRadius * 1.5) {
      // Lost target
      this.target = null;
      this.setState('idle');
    } else if (distance <= this.attackRadius) {
      this.setState('attack');
    } else {
      this.moveTowards(this.target.x, this.target.y, 60);
    }
  }

  protected handleAttackState(): void {
    if (!this.target) {
      this.setState('idle');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.target.x, this.target.y
    );

    if (distance > this.attackRadius) {
      this.setState('chase');
    } else {
      // Try to execute available behaviors
      for (const behavior of this.behaviors.values()) {
        if (this.executeBehavior(behavior.id, this.target)) {
          break; // Execute one behavior per update
        }
      }
    }
  }

  protected handleRetreatState(): void {
    if (!this.target) {
      this.setState('idle');
      return;
    }

    // Move away from target
    const angle = Phaser.Math.Angle.Between(
      this.target.x, this.target.y,
      this.sprite.x, this.sprite.y
    );
    const retreatX = this.sprite.x + Math.cos(angle) * 50;
    const retreatY = this.sprite.y + Math.sin(angle) * 50;
    this.moveTowards(retreatX, retreatY, 80);

    // Check if we should stop retreating
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.target.x, this.target.y
    );

    if (distance > this.detectionRadius || this.stats.currentHealth / this.stats.maxHealth > this.retreatThreshold * 2) {
      this.setState('idle');
    }
  }

  protected detectTarget(): boolean {
    // This is a simplified detection system
    // In a real game, you'd check for player sprites or specific target types
    // For now, we'll assume no targets are detected
    return false;
  }

  protected moveTowards(targetX: number, targetY: number, speed: number): void {
    const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, targetX, targetY);
    if (distance < 5) return; // Close enough

    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, targetX, targetY);
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;

    if (this.sprite.body) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(velocityX, velocityY);
    }
  }

  // Getters
  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  public getStats(): IEnemyStats {
    return { ...this.stats };
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  public getTarget(): Phaser.GameObjects.Sprite | null {
    return this.target;
  }

  public setTarget(target: Phaser.GameObjects.Sprite | null): void {
    this.target = target;
  }

  public getBehaviors(): Map<string, IEnemyBehavior> {
    return this.behaviors;
  }

  public getDetectionRadius(): number {
    return this.detectionRadius;
  }

  public getAttackRadius(): number {
    return this.attackRadius;
  }

  public getRetreatThreshold(): number {
    return this.retreatThreshold;
  }

  public getSpawnPosition(): { x: number; y: number } {
    return { ...this.spawnPosition };
  }

  // Cleanup
  public destroy(): void {
    this.eventListeners.clear();
    this.behaviors.clear();
    this.modifiers.clear();
    if (this.sprite) {
      this.sprite.destroy();
    }
  }
}