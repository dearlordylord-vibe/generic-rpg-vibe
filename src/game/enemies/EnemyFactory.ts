import { Scene } from 'phaser';
import { Enemy } from './Enemy';
import { Wraith } from './Wraith';
import { IronGolem } from './IronGolem';
import { CarrionBats } from './CarrionBats';

export type EnemyType = 'wraith' | 'ironGolem' | 'carrionBats';

export interface EnemySpawnConfig {
  type: EnemyType;
  x: number;
  y: number;
  level?: number;
  customStats?: Partial<Record<string, unknown>>;
  isSwarmLeader?: boolean; // For CarrionBats
}

export interface EnemyPool {
  active: Enemy[];
  inactive: Enemy[];
  maxSize: number;
}

export class EnemyFactory {
  private scene: Scene;
  private pools: Map<EnemyType, EnemyPool>;
  private defaultPoolSize: number = 20;

  constructor(scene: Scene) {
    this.scene = scene;
    this.pools = new Map();
    this.initializePools();
  }

  private initializePools(): void {
    const enemyTypes: EnemyType[] = ['wraith', 'ironGolem', 'carrionBats'];
    
    enemyTypes.forEach(type => {
      this.pools.set(type, {
        active: [],
        inactive: [],
        maxSize: this.defaultPoolSize
      });
    });
  }

  public createEnemy(config: EnemySpawnConfig): Enemy | null {
    const pool = this.pools.get(config.type);
    if (!pool) {
      console.warn(`Unknown enemy type: ${config.type}`);
      return null;
    }

    // Try to reuse an inactive enemy from the pool
    let enemy = this.getInactiveEnemy(config.type);
    
    if (!enemy) {
      // Create new enemy if pool is empty
      enemy = this.instantiateEnemy(config);
      if (!enemy) return null;
    } else {
      // Reset the enemy to the new position and stats
      this.resetEnemy(enemy, config);
    }

    // Move from inactive to active pool
    this.activateEnemy(config.type, enemy);
    
    return enemy;
  }

  private getInactiveEnemy(type: EnemyType): Enemy | null {
    const pool = this.pools.get(type);
    if (!pool || pool.inactive.length === 0) return null;
    
    return pool.inactive.pop() || null;
  }

  private instantiateEnemy(config: EnemySpawnConfig): Enemy | null {
    try {
      switch (config.type) {
        case 'wraith':
          return new Wraith(this.scene, config.x, config.y);
        case 'ironGolem':
          return new IronGolem(this.scene, config.x, config.y);
        case 'carrionBats':
          return new CarrionBats(this.scene, config.x, config.y, config.isSwarmLeader);
        default:
          console.warn(`Unknown enemy type: ${config.type}`);
          return null;
      }
    } catch (error) {
      console.error(`Failed to create enemy of type ${config.type}:`, error);
      return null;
    }
  }

  private resetEnemy(enemy: Enemy, config: EnemySpawnConfig): void {
    // Reset position
    enemy.getSprite().setPosition(config.x, config.y);
    
    // Reset state
    enemy.setState('idle');
    enemy.setTarget(null);
    
    // Reset stats to full health/mana
    const stats = enemy.getStats();
    stats.currentHealth = stats.maxHealth;
    stats.currentMana = stats.maxMana;
    
    // Make sprite visible and active
    enemy.getSprite().setVisible(true);
    enemy.getSprite().setActive(true);
    
    // Apply custom stats if provided
    if (config.customStats) {
      Object.assign(stats, config.customStats);
    }
  }

  private activateEnemy(type: EnemyType, enemy: Enemy): void {
    const pool = this.pools.get(type);
    if (!pool) return;

    // Remove from inactive pool
    const inactiveIndex = pool.inactive.indexOf(enemy);
    if (inactiveIndex !== -1) {
      pool.inactive.splice(inactiveIndex, 1);
    }

    // Add to active pool
    pool.active.push(enemy);
  }

  public returnEnemyToPool(enemy: Enemy): void {
    const enemyType = this.getEnemyType(enemy);
    if (!enemyType) return;

    const pool = this.pools.get(enemyType);
    if (!pool) return;

    // Remove from active pool
    const activeIndex = pool.active.indexOf(enemy);
    if (activeIndex === -1) return;
    
    pool.active.splice(activeIndex, 1);

    // Reset enemy state
    this.deactivateEnemy(enemy);

    // Add to inactive pool if there's space
    if (pool.inactive.length < pool.maxSize) {
      pool.inactive.push(enemy);
    } else {
      // Pool is full, destroy the enemy
      enemy.destroy();
    }
  }

  private deactivateEnemy(enemy: Enemy): void {
    // Hide sprite
    enemy.getSprite().setVisible(false);
    enemy.getSprite().setActive(false);
    
    // Stop all behaviors and clear target
    enemy.setState('dead');
    enemy.setTarget(null);
    
    // Stop any physics movement
    if (enemy.getSprite().body) {
      const body = enemy.getSprite().body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
    }
  }

  private getEnemyType(enemy: Enemy): EnemyType | null {
    if (enemy instanceof Wraith) return 'wraith';
    if (enemy instanceof IronGolem) return 'ironGolem';
    if (enemy instanceof CarrionBats) return 'carrionBats';
    return null;
  }

  public createSwarm(config: Omit<EnemySpawnConfig, 'type'> & { type: 'carrionBats' }, swarmSize: number = 5): Enemy[] {
    if (config.type !== 'carrionBats') {
      console.warn('Swarm creation is only supported for CarrionBats');
      return [];
    }

    const swarm: Enemy[] = [];
    const leaderConfig = { ...config, isSwarmLeader: true };
    
    // Create swarm leader
    const leader = this.createEnemy(leaderConfig);
    if (!leader) return [];
    
    swarm.push(leader);

    // Create swarm members
    for (let i = 1; i < swarmSize; i++) {
      const memberConfig: EnemySpawnConfig = {
        ...config,
        x: config.x + (Math.random() - 0.5) * 100,
        y: config.y + (Math.random() - 0.5) * 100,
        isSwarmLeader: false
      };
      
      const member = this.createEnemy(memberConfig);
      if (member && leader instanceof CarrionBats && member instanceof CarrionBats) {
        leader.addSwarmMate(member);
        swarm.push(member);
      }
    }

    return swarm;
  }

  public getActiveEnemies(type?: EnemyType): Enemy[] {
    if (type) {
      const pool = this.pools.get(type);
      return pool ? [...pool.active] : [];
    }

    // Return all active enemies
    const allActive: Enemy[] = [];
    this.pools.forEach(pool => {
      allActive.push(...pool.active);
    });
    return allActive;
  }

  public getPoolStats(): Record<EnemyType, { active: number; inactive: number; total: number }> {
    const stats: Record<string, { active: number; inactive: number; total: number }> = {};
    
    this.pools.forEach((pool, type) => {
      stats[type] = {
        active: pool.active.length,
        inactive: pool.inactive.length,
        total: pool.active.length + pool.inactive.length
      };
    });
    
    return stats as Record<EnemyType, { active: number; inactive: number; total: number }>;
  }

  public clearPool(type?: EnemyType): void {
    if (type) {
      const pool = this.pools.get(type);
      if (pool) {
        // Destroy all enemies in the pool
        [...pool.active, ...pool.inactive].forEach(enemy => enemy.destroy());
        pool.active = [];
        pool.inactive = [];
      }
    } else {
      // Clear all pools
      this.pools.forEach(pool => {
        [...pool.active, ...pool.inactive].forEach(enemy => enemy.destroy());
        pool.active = [];
        pool.inactive = [];
      });
    }
  }

  public setPoolSize(type: EnemyType, maxSize: number): void {
    const pool = this.pools.get(type);
    if (pool) {
      pool.maxSize = maxSize;
      
      // If current inactive pool is larger than new max size, destroy excess enemies
      while (pool.inactive.length > maxSize) {
        const enemy = pool.inactive.pop();
        if (enemy) {
          enemy.destroy();
        }
      }
    }
  }

  public update(deltaTime: number): void {
    // Update all active enemies
    this.pools.forEach(pool => {
      pool.active.forEach(enemy => {
        if (!enemy.isDead()) {
          enemy.update(deltaTime);
        } else {
          // Automatically return dead enemies to pool
          this.returnEnemyToPool(enemy);
        }
      });
    });
  }

  public destroy(): void {
    this.clearPool();
    this.pools.clear();
  }
}