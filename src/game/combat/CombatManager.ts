import { Scene } from 'phaser';
import { PlayerStats } from '../models/PlayerStats';
import { calculatePhysicalDamage, calculateHitChance, CombatEntity } from '../../utils/combat';
import { InventoryManager } from '../models/InventoryManager';

export interface CombatTarget {
  id: string;
  x: number;
  y: number;
  stats: PlayerStats;
  currentHealth: number;
  maxHealth: number;
  sprite?: Phaser.GameObjects.Sprite;
}

export interface AttackResult {
  hit: boolean;
  damage: number;
  critical: boolean;
  targetId: string;
  dodged: boolean;
  blocked: boolean;
}

export interface CombatAction {
  type: 'strike' | 'block' | 'dodge' | 'parry' | 'counterattack';
  timestamp: number;
  duration: number;
  cooldown: number;
}

export class CombatManager {
  private scene: Scene;
  private player: CombatTarget;
  private enemies: Map<string, CombatTarget> = new Map();
  private currentAction: CombatAction | null = null;
  private actionQueue: CombatAction[] = [];
  private readonly MELEE_RANGE = 80; // 2.5m in pixels (assuming 32px = 1m)
  private readonly ATTACK_COOLDOWN = 1000; // 1 second
  private readonly BLOCK_DURATION = 500; // 0.5 seconds
  private readonly DODGE_DURATION = 300; // 0.3 seconds
  private lastAttackTime = 0;

  constructor(scene: Scene, playerStats: PlayerStats, _inventoryManager: InventoryManager) {
    this.scene = scene;
    
    // For now, just use the base player stats directly
    // TODO: Integrate enhanced stats properly when equipment bonuses are implemented
    this.player = {
      id: 'player',
      x: 400,
      y: 300,
      stats: playerStats,
      currentHealth: playerStats.getDerivedStats().maxHealth,
      maxHealth: playerStats.getDerivedStats().maxHealth
    };
  }

  // Add enemy to combat
  addEnemy(id: string, x: number, y: number, stats: PlayerStats, sprite?: Phaser.GameObjects.Sprite): void {
    const enemy: CombatTarget = {
      id,
      x,
      y,
      stats,
      currentHealth: stats.getDerivedStats().maxHealth,
      maxHealth: stats.getDerivedStats().maxHealth,
      sprite
    };
    this.enemies.set(id, enemy);
  }

  // Remove enemy from combat
  removeEnemy(id: string): void {
    this.enemies.delete(id);
  }

  // Update player position
  updatePlayerPosition(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
  }

  // Update enemy position
  updateEnemyPosition(id: string, x: number, y: number): void {
    const enemy = this.enemies.get(id);
    if (enemy) {
      enemy.x = x;
      enemy.y = y;
    }
  }

  // Check if target is within melee range
  isInMeleeRange(targetX: number, targetY: number): boolean {
    const distance = Math.sqrt(
      Math.pow(this.player.x - targetX, 2) + Math.pow(this.player.y - targetY, 2)
    );
    return distance <= this.MELEE_RANGE;
  }

  // Get all enemies within melee range
  getEnemiesInRange(): CombatTarget[] {
    return Array.from(this.enemies.values()).filter(enemy =>
      this.isInMeleeRange(enemy.x, enemy.y)
    );
  }

  // Check if player can attack
  canAttack(): boolean {
    const now = this.scene.time.now;
    return (
      !this.currentAction ||
      this.currentAction.type !== 'block'
    ) && (now - this.lastAttackTime >= this.ATTACK_COOLDOWN);
  }

  // Perform melee attack
  performAttack(targetX: number, targetY: number): AttackResult | null {
    if (!this.canAttack()) {
      return null;
    }

    // Find target at position
    const target = Array.from(this.enemies.values()).find(enemy => {
      const distance = Math.sqrt(
        Math.pow(targetX - enemy.x, 2) + Math.pow(targetY - enemy.y, 2)
      );
      return distance <= 16; // 16px tolerance for targeting
    });

    if (!target || !this.isInMeleeRange(target.x, target.y)) {
      return null;
    }

    this.lastAttackTime = this.scene.time.now;

    // Start attack action
    this.currentAction = {
      type: 'strike',
      timestamp: this.scene.time.now,
      duration: 300,
      cooldown: this.ATTACK_COOLDOWN
    };

    // Calculate attack result
    const result = this.calculateAttackResult(this.player, target);
    
    // Apply damage if hit
    if (result.hit && !result.dodged && !result.blocked) {
      this.applyDamage(target, result.damage);
    }

    // End action after duration
    this.scene.time.delayedCall(this.currentAction.duration, () => {
      this.currentAction = null;
    });

    return result;
  }

  // Start blocking
  startBlock(): boolean {
    if (this.currentAction && this.currentAction.type === 'strike') {
      return false; // Can't block while attacking
    }

    this.currentAction = {
      type: 'block',
      timestamp: this.scene.time.now,
      duration: this.BLOCK_DURATION,
      cooldown: 0
    };

    // End block after duration
    this.scene.time.delayedCall(this.BLOCK_DURATION, () => {
      if (this.currentAction?.type === 'block') {
        this.currentAction = null;
      }
    });

    return true;
  }

  // Perform dodge
  performDodge(): boolean {
    if (this.currentAction) {
      return false; // Can't dodge during other actions
    }

    this.currentAction = {
      type: 'dodge',
      timestamp: this.scene.time.now,
      duration: this.DODGE_DURATION,
      cooldown: 2000 // 2 second cooldown
    };

    // End dodge after duration
    this.scene.time.delayedCall(this.DODGE_DURATION, () => {
      this.currentAction = null;
    });

    return true;
  }

  // Calculate attack result using combat utilities
  private calculateAttackResult(attacker: CombatTarget, target: CombatTarget): AttackResult {
    // Check if target is dodging
    const targetDodging = this.isTargetDodging(target);
    
    // Check if target is blocking
    const targetBlocking = this.isTargetBlocking(target);

    // Create combat entities
    const attackerEntity: CombatEntity = {
      stats: attacker.stats,
      statusEffects: [],
      name: attacker.id
    };
    
    const defenderEntity: CombatEntity = {
      stats: target.stats,
      statusEffects: [],
      name: target.id
    };

    // Calculate hit chance
    const hitCalculation = calculateHitChance(attackerEntity, defenderEntity);
    const hit = hitCalculation.isHit && !targetDodging;

    if (!hit) {
      return {
        hit: false,
        damage: 0,
        critical: false,
        targetId: target.id,
        dodged: targetDodging,
        blocked: false
      };
    }

    // Check for block
    if (targetBlocking) {
      return {
        hit: true,
        damage: 0,
        critical: false,
        targetId: target.id,
        dodged: false,
        blocked: true
      };
    }

    // Calculate damage
    const damageResult = calculatePhysicalDamage(attackerEntity, defenderEntity, 0);

    return {
      hit: true,
      damage: damageResult.finalDamage,
      critical: damageResult.isCritical,
      targetId: target.id,
      dodged: false,
      blocked: false
    };
  }

  // Check if target is currently dodging
  private isTargetDodging(_target: CombatTarget): boolean {
    // For now, just return false since we don't track enemy actions
    // In a full implementation, we'd track enemy actions too
    return false;
  }

  // Check if target is currently blocking
  private isTargetBlocking(_target: CombatTarget): boolean {
    // For now, just return false since we don't track enemy actions
    // In a full implementation, we'd track enemy actions too
    return false;
  }

  // Apply damage to target
  private applyDamage(target: CombatTarget, damage: number): void {
    target.currentHealth = Math.max(0, target.currentHealth - damage);
    
    // Remove enemy if dead
    if (target.currentHealth <= 0) {
      this.removeEnemy(target.id);
    }
  }

  // Get current action
  getCurrentAction(): CombatAction | null {
    return this.currentAction;
  }

  // Check if currently blocking
  isBlocking(): boolean {
    return this.currentAction?.type === 'block';
  }

  // Check if currently dodging
  isDodging(): boolean {
    return this.currentAction?.type === 'dodge';
  }

  // Check if currently attacking
  isAttacking(): boolean {
    return this.currentAction?.type === 'strike' && 
           (this.scene.time.now - this.currentAction.timestamp) < this.currentAction.duration;
  }

  // Get player combat info
  getPlayerInfo(): CombatTarget {
    return { ...this.player };
  }

  // Get enemy info
  getEnemyInfo(id: string): CombatTarget | undefined {
    const enemy = this.enemies.get(id);
    return enemy ? { ...enemy } : undefined;
  }

  // Get all enemies
  getAllEnemies(): CombatTarget[] {
    return Array.from(this.enemies.values()).map(enemy => ({ ...enemy }));
  }

  // Get all targets (player + enemies) for projectile collision detection
  getAllTargets(): CombatTarget[] {
    const targets: CombatTarget[] = [];
    targets.push({ ...this.player });
    targets.push(...this.getAllEnemies());
    return targets;
  }

  // Update combat state (call in scene update)
  update(): void {
    // Process action queue
    this.processActionQueue();
    
    // Update any ongoing actions
    this.updateCurrentAction();
  }

  private processActionQueue(): void {
    if (this.actionQueue.length > 0 && !this.currentAction) {
      const nextAction = this.actionQueue.shift();
      if (nextAction) {
        this.currentAction = nextAction;
      }
    }
  }

  private updateCurrentAction(): void {
    if (this.currentAction) {
      const elapsed = this.scene.time.now - this.currentAction.timestamp;
      if (elapsed >= this.currentAction.duration) {
        this.currentAction = null;
      }
    }
  }

  // Queue an action for later execution
  queueAction(action: CombatAction): void {
    this.actionQueue.push(action);
  }

  // Clear action queue
  clearActionQueue(): void {
    this.actionQueue = [];
  }
}