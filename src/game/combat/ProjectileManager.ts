import { Scene } from 'phaser';
import { CombatTarget } from './CombatManager';
import { calculatePhysicalDamage, calculateMagicDamage, calculateHitChance, CombatEntity } from '../../utils/combat';

export interface ProjectileType {
  id: string;
  name: string;
  damage: number;
  speed: number; // pixels per second
  range: number; // maximum range in pixels
  damageType: 'physical' | 'magic';
  size: number; // collision radius
  color: number; // visual color
  piercing: boolean; // can hit multiple targets
  gravity: number; // affected by gravity (0 = no gravity, 1 = full gravity)
  explosionRadius?: number; // AOE explosion on impact
  statusEffects?: string[]; // status effects to apply on hit
}

export interface Projectile {
  id: string;
  type: ProjectileType;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  remainingRange: number;
  sourceId: string; // who fired it
  targetIds: string[]; // targets already hit (for piercing)
  sprite?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
  createdAt: number;
}

export interface ProjectileHitResult {
  projectileId: string;
  targetId: string;
  damage: number;
  hit: boolean;
  critical: boolean;
  statusEffects?: string[];
}

export class ProjectileManager {
  private scene: Scene;
  private projectiles: Map<string, Projectile> = new Map();
  private projectileIdCounter = 0;
  private readonly GRAVITY = 200; // pixels per second squared
  private readonly DEFAULT_PROJECTILE_TYPES: Map<string, ProjectileType> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.initializeDefaultProjectileTypes();
  }

  private initializeDefaultProjectileTypes(): void {
    // Arrow - physical projectile with gravity
    this.DEFAULT_PROJECTILE_TYPES.set('arrow', {
      id: 'arrow',
      name: 'Arrow',
      damage: 25,
      speed: 400,
      range: 300,
      damageType: 'physical',
      size: 3,
      color: 0x8B4513,
      piercing: false,
      gravity: 0.5
    });

    // Magic bolt - straight line, no gravity
    this.DEFAULT_PROJECTILE_TYPES.set('magic_bolt', {
      id: 'magic_bolt',
      name: 'Magic Bolt',
      damage: 30,
      speed: 500,
      range: 400,
      damageType: 'magic',
      size: 4,
      color: 0x00FFFF,
      piercing: false,
      gravity: 0
    });

    // Fireball - explosive magic
    this.DEFAULT_PROJECTILE_TYPES.set('fireball', {
      id: 'fireball',
      name: 'Fireball',
      damage: 40,
      speed: 300,
      range: 350,
      damageType: 'magic',
      size: 6,
      color: 0xFF4500,
      piercing: false,
      gravity: 0.2,
      explosionRadius: 50
    });

    // Piercing arrow - goes through multiple enemies
    this.DEFAULT_PROJECTILE_TYPES.set('piercing_arrow', {
      id: 'piercing_arrow',
      name: 'Piercing Arrow',
      damage: 20,
      speed: 450,
      range: 400,
      damageType: 'physical',
      size: 3,
      color: 0xFFD700,
      piercing: true,
      gravity: 0.3
    });
  }

  // Fire a projectile from source position towards target position
  fireProjectile(
    typeId: string,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    sourceId: string,
    _sourceCombatEntity?: CombatEntity
  ): string | null {
    const projectileType = this.DEFAULT_PROJECTILE_TYPES.get(typeId);
    if (!projectileType) {
      console.error(`Unknown projectile type: ${typeId}`);
      return null;
    }

    // Calculate direction and velocity
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return null;
    }

    // Normalize direction and apply speed
    const velocityX = (dx / distance) * projectileType.speed;
    const velocityY = (dy / distance) * projectileType.speed;

    // Create projectile
    const projectileId = `projectile_${this.projectileIdCounter++}`;
    const projectile: Projectile = {
      id: projectileId,
      type: projectileType,
      x: sourceX,
      y: sourceY,
      velocityX,
      velocityY,
      remainingRange: projectileType.range,
      sourceId,
      targetIds: [],
      createdAt: this.scene.time.now
    };

    // Create visual sprite
    projectile.sprite = this.createProjectileSprite(projectile);

    this.projectiles.set(projectileId, projectile);
    return projectileId;
  }

  // Fire projectile with calculated arc for gravity compensation
  fireProjectileWithArc(
    typeId: string,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    sourceId: string,
    sourceCombatEntity?: CombatEntity
  ): string | null {
    const projectileType = this.DEFAULT_PROJECTILE_TYPES.get(typeId);
    if (!projectileType || projectileType.gravity === 0) {
      // No arc needed for zero gravity projectiles
      return this.fireProjectile(typeId, sourceX, sourceY, targetX, targetY, sourceId, sourceCombatEntity);
    }

    // Calculate projectile arc to hit target accounting for gravity
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return null;
    }

    const gravity = this.GRAVITY * projectileType.gravity;
    const speed = projectileType.speed;

    // Calculate launch angle for projectile motion
    // Using physics: range = (v^2 * sin(2θ)) / g
    // For a given range and speed, solve for angle
    const timeToTarget = distance / (speed * 0.8); // Reduce horizontal speed component
    const requiredVelocityY = (dy / timeToTarget) - (0.5 * gravity * timeToTarget);
    const velocityX = dx / timeToTarget;

    // Create projectile with calculated velocities
    const projectileId = `projectile_${this.projectileIdCounter++}`;
    const projectile: Projectile = {
      id: projectileId,
      type: projectileType,
      x: sourceX,
      y: sourceY,
      velocityX,
      velocityY: requiredVelocityY,
      remainingRange: projectileType.range,
      sourceId,
      targetIds: [],
      createdAt: this.scene.time.now
    };

    projectile.sprite = this.createProjectileSprite(projectile);
    this.projectiles.set(projectileId, projectile);
    return projectileId;
  }

  // Update all projectiles - call this in scene update loop
  update(deltaTime: number, targets: CombatTarget[]): ProjectileHitResult[] {
    const hitResults: ProjectileHitResult[] = [];
    const projectilesToRemove: string[] = [];

    this.projectiles.forEach((projectile) => {
      // Update position
      const deltaSeconds = deltaTime / 1000;
      projectile.x += projectile.velocityX * deltaSeconds;
      projectile.y += projectile.velocityY * deltaSeconds;

      // Apply gravity
      if (projectile.type.gravity > 0) {
        projectile.velocityY += this.GRAVITY * projectile.type.gravity * deltaSeconds;
      }

      // Update remaining range
      const distanceTraveled = Math.sqrt(
        Math.pow(projectile.velocityX * deltaSeconds, 2) +
        Math.pow(projectile.velocityY * deltaSeconds, 2)
      );
      projectile.remainingRange -= distanceTraveled;

      // Update sprite position
      if (projectile.sprite) {
        projectile.sprite.setPosition(projectile.x, projectile.y);
        
        // Rotate sprite to match velocity direction
        const angle = Math.atan2(projectile.velocityY, projectile.velocityX);
        projectile.sprite.setRotation(angle);
      }

      // Check for collisions with targets
      const collisions = this.checkCollisions(projectile, targets);
      hitResults.push(...collisions);

      // Remove projectile if it hit something and isn't piercing
      if (collisions.length > 0 && !projectile.type.piercing) {
        projectilesToRemove.push(projectile.id);
      }

      // Remove projectile if out of range or off screen
      if (projectile.remainingRange <= 0 || this.isOffScreen(projectile)) {
        projectilesToRemove.push(projectile.id);
      }
    });

    // Clean up projectiles
    projectilesToRemove.forEach(id => this.removeProjectile(id));

    return hitResults;
  }

  private createProjectileSprite(projectile: Projectile): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(projectile.type.color);
    
    // Create different shapes based on projectile type
    switch (projectile.type.id) {
      case 'arrow':
      case 'piercing_arrow':
        // Draw arrow shape
        graphics.fillTriangle(0, 0, -8, -2, -8, 2);
        graphics.fillRect(-8, -1, 6, 2);
        break;
      case 'magic_bolt':
        // Draw energy bolt
        graphics.fillCircle(0, 0, projectile.type.size);
        graphics.lineStyle(2, 0xFFFFFF, 0.8);
        graphics.strokeCircle(0, 0, projectile.type.size);
        break;
      case 'fireball':
        // Draw fireball with glow effect
        graphics.fillStyle(0xFF4500);
        graphics.fillCircle(0, 0, projectile.type.size);
        graphics.fillStyle(0xFFFF00, 0.6);
        graphics.fillCircle(0, 0, projectile.type.size * 0.7);
        break;
      default:
        // Default circle
        graphics.fillCircle(0, 0, projectile.type.size);
        break;
    }

    graphics.setPosition(projectile.x, projectile.y);
    return graphics;
  }

  private checkCollisions(projectile: Projectile, targets: CombatTarget[]): ProjectileHitResult[] {
    const results: ProjectileHitResult[] = [];

    for (const target of targets) {
      // Skip if target is the source
      if (target.id === projectile.sourceId) {
        continue;
      }

      // Skip if already hit this target (for piercing projectiles)
      if (projectile.targetIds.includes(target.id)) {
        continue;
      }

      // Check collision
      const distance = Math.sqrt(
        Math.pow(projectile.x - target.x, 2) + Math.pow(projectile.y - target.y, 2)
      );

      if (distance <= projectile.type.size + 16) { // 16px target radius
        // Hit detected
        projectile.targetIds.push(target.id);

        // Calculate damage
        const hitResult = this.calculateProjectileHit(projectile, target);
        results.push(hitResult);

        // Create explosion effect if applicable
        if (projectile.type.explosionRadius) {
          this.createExplosion(projectile.x, projectile.y, projectile.type.explosionRadius);
          
          // Check for additional targets in explosion radius
          const explosionResults = this.checkExplosionTargets(
            projectile.x,
            projectile.y,
            projectile.type.explosionRadius,
            targets,
            projectile
          );
          results.push(...explosionResults);
        }
      }
    }

    return results;
  }

  private calculateProjectileHit(projectile: Projectile, target: CombatTarget): ProjectileHitResult {
    // Create combat entities for damage calculation
    const dummyAttacker: CombatEntity = {
      stats: target.stats, // Use target stats as placeholder
      statusEffects: [],
      name: projectile.sourceId
    };

    const defender: CombatEntity = {
      stats: target.stats,
      statusEffects: [],
      name: target.id
    };

    // Calculate hit chance
    const hitCalculation = calculateHitChance(dummyAttacker, defender);
    
    if (!hitCalculation.isHit) {
      return {
        projectileId: projectile.id,
        targetId: target.id,
        damage: 0,
        hit: false,
        critical: false
      };
    }

    // Calculate damage based on projectile type
    let damageResult;
    if (projectile.type.damageType === 'physical') {
      damageResult = calculatePhysicalDamage(dummyAttacker, defender, projectile.type.damage);
    } else {
      damageResult = calculateMagicDamage(dummyAttacker, defender, projectile.type.damage);
    }

    return {
      projectileId: projectile.id,
      targetId: target.id,
      damage: damageResult.finalDamage,
      hit: true,
      critical: damageResult.isCritical,
      statusEffects: projectile.type.statusEffects
    };
  }

  private checkExplosionTargets(
    explosionX: number,
    explosionY: number,
    radius: number,
    targets: CombatTarget[],
    projectile: Projectile
  ): ProjectileHitResult[] {
    const results: ProjectileHitResult[] = [];

    for (const target of targets) {
      if (target.id === projectile.sourceId || projectile.targetIds.includes(target.id)) {
        continue;
      }

      const distance = Math.sqrt(
        Math.pow(explosionX - target.x, 2) + Math.pow(explosionY - target.y, 2)
      );

      if (distance <= radius) {
        // Calculate reduced damage based on distance from explosion center
        const damageMultiplier = 1 - (distance / radius) * 0.5; // 50% damage reduction at edge
        const explosionDamage = Math.round(projectile.type.damage * 0.7 * damageMultiplier);

        // Create a copy of the projectile with reduced damage for explosion
        const explosionProjectile = { ...projectile };
        explosionProjectile.type = { ...projectile.type, damage: explosionDamage };

        const hitResult = this.calculateProjectileHit(explosionProjectile, target);
        if (hitResult.hit) {
          results.push(hitResult);
          projectile.targetIds.push(target.id); // Mark as hit to avoid double hits
        }
      }
    }

    return results;
  }

  private createExplosion(x: number, y: number, radius: number): void {
    // Create explosion visual effect
    const explosion = this.scene.add.graphics();
    explosion.fillStyle(0xFF4500, 0.8);
    explosion.fillCircle(x, y, radius);
    explosion.fillStyle(0xFFFF00, 0.6);
    explosion.fillCircle(x, y, radius * 0.7);
    explosion.fillStyle(0xFFFFFF, 0.4);
    explosion.fillCircle(x, y, radius * 0.3);

    // Animate explosion
    this.scene.tweens.add({
      targets: explosion,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        explosion.destroy();
      }
    });
  }

  private isOffScreen(projectile: Projectile): boolean {
    const margin = 50;
    return (
      projectile.x < -margin ||
      projectile.x > this.scene.scale.width + margin ||
      projectile.y < -margin ||
      projectile.y > this.scene.scale.height + margin
    );
  }

  private removeProjectile(projectileId: string): void {
    const projectile = this.projectiles.get(projectileId);
    if (projectile) {
      if (projectile.sprite) {
        projectile.sprite.destroy();
      }
      this.projectiles.delete(projectileId);
    }
  }

  // Get all active projectiles
  getActiveProjectiles(): Projectile[] {
    return Array.from(this.projectiles.values());
  }

  // Get projectile by ID
  getProjectile(id: string): Projectile | undefined {
    return this.projectiles.get(id);
  }

  // Remove all projectiles
  clearAllProjectiles(): void {
    this.projectiles.forEach(projectile => {
      if (projectile.sprite) {
        projectile.sprite.destroy();
      }
    });
    this.projectiles.clear();
  }

  // Get available projectile types
  getProjectileTypes(): ProjectileType[] {
    return Array.from(this.DEFAULT_PROJECTILE_TYPES.values());
  }

  // Register custom projectile type
  registerProjectileType(projectileType: ProjectileType): void {
    this.DEFAULT_PROJECTILE_TYPES.set(projectileType.id, projectileType);
  }
}