import { Scene } from 'phaser';
import { EnemyFactory, EnemyType, EnemySpawnConfig } from './EnemyFactory';
import { Enemy } from './Enemy';

export interface SpawnZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  enemyTypes: EnemyType[];
  spawnRate: number; // Enemies per second
  maxEnemies: number;
  level: number;
  isActive: boolean;
}

export interface SpawnWave {
  id: string;
  enemies: Array<{
    type: EnemyType;
    count: number;
    delay: number; // Delay before spawning this enemy type
    isSwarmLeader?: boolean;
  }>;
  triggerCondition?: 'time' | 'playerPosition' | 'enemyCount' | 'manual';
  triggerValue?: number;
  isRepeating: boolean;
  spawnZoneId?: string;
}

export interface SpawnEvent {
  type: 'enemySpawned' | 'waveStarted' | 'waveCompleted' | 'zoneActivated' | 'zoneDeactivated';
  data: unknown;
}

export type SpawnEventListener = (event: SpawnEvent) => void;

export class EnemySpawner {
  private scene: Scene;
  private factory: EnemyFactory;
  private spawnZones: Map<string, SpawnZone>;
  private spawnWaves: Map<string, SpawnWave>;
  private activeWaves: Map<string, { startTime: number; completed: boolean }>;
  private eventListeners: Set<SpawnEventListener>;
  private lastSpawnTimes: Map<string, number>;
  private spawnedEnemies: Set<Enemy>;

  constructor(scene: Scene, factory: EnemyFactory) {
    this.scene = scene;
    this.factory = factory;
    this.spawnZones = new Map();
    this.spawnWaves = new Map();
    this.activeWaves = new Map();
    this.eventListeners = new Set();
    this.lastSpawnTimes = new Map();
    this.spawnedEnemies = new Set();
  }

  // Zone Management
  public addSpawnZone(zone: SpawnZone): void {
    this.spawnZones.set(zone.id, zone);
    this.lastSpawnTimes.set(zone.id, 0);
  }

  public removeSpawnZone(zoneId: string): void {
    this.spawnZones.delete(zoneId);
    this.lastSpawnTimes.delete(zoneId);
  }

  public activateZone(zoneId: string): void {
    const zone = this.spawnZones.get(zoneId);
    if (zone) {
      zone.isActive = true;
      this.emitEvent('zoneActivated', { zoneId, zone });
    }
  }

  public deactivateZone(zoneId: string): void {
    const zone = this.spawnZones.get(zoneId);
    if (zone) {
      zone.isActive = false;
      this.emitEvent('zoneDeactivated', { zoneId, zone });
    }
  }

  // Wave Management
  public addSpawnWave(wave: SpawnWave): void {
    this.spawnWaves.set(wave.id, wave);
  }

  public removeSpawnWave(waveId: string): void {
    this.spawnWaves.delete(waveId);
    this.activeWaves.delete(waveId);
  }

  public startWave(waveId: string, spawnZoneId?: string): boolean {
    const wave = this.spawnWaves.get(waveId);
    if (!wave || this.activeWaves.has(waveId)) {
      return false;
    }

    this.activeWaves.set(waveId, {
      startTime: Date.now(),
      completed: false
    });

    this.executeWave(wave, spawnZoneId);
    this.emitEvent('waveStarted', { waveId, wave });
    return true;
  }

  private executeWave(wave: SpawnWave, spawnZoneId?: string): void {
    const targetZoneId = spawnZoneId || wave.spawnZoneId;
    const spawnZone = targetZoneId ? this.spawnZones.get(targetZoneId) || null : null;

    let totalDelay = 0;

    wave.enemies.forEach(enemyGroup => {
      totalDelay += enemyGroup.delay;

      this.scene.time.delayedCall(totalDelay, () => {
        this.spawnEnemyGroup(enemyGroup, spawnZone);
      });
    });

    // Mark wave as completed after all enemies are spawned
    this.scene.time.delayedCall(totalDelay + 1000, () => {
      const waveData = this.activeWaves.get(wave.id);
      if (waveData) {
        waveData.completed = true;
        this.emitEvent('waveCompleted', { waveId: wave.id, wave });

        if (wave.isRepeating) {
          // Restart the wave after a delay
          this.scene.time.delayedCall(5000, () => {
            this.activeWaves.delete(wave.id);
            this.startWave(wave.id, spawnZoneId);
          });
        } else {
          this.activeWaves.delete(wave.id);
        }
      }
    });
  }

  private spawnEnemyGroup(
    enemyGroup: SpawnWave['enemies'][0],
    spawnZone: SpawnZone | null
  ): void {
    for (let i = 0; i < enemyGroup.count; i++) {
      const delay = i * 200; // 200ms between each enemy in the group
      
      this.scene.time.delayedCall(delay, () => {
        const spawnPosition = this.getSpawnPosition(spawnZone);
        
        if (enemyGroup.type === 'carrionBats' && enemyGroup.count > 1) {
          // Create a swarm for carrion bats
          const swarm = this.factory.createSwarm({
            type: 'carrionBats',
            x: spawnPosition.x,
            y: spawnPosition.y,
            isSwarmLeader: enemyGroup.isSwarmLeader ?? true
          }, enemyGroup.count);
          
          swarm.forEach(enemy => {
            this.spawnedEnemies.add(enemy);
            this.emitEvent('enemySpawned', {
              enemy,
              type: enemyGroup.type,
              position: spawnPosition,
              isSwarm: true
            });
          });
        } else {
          // Create individual enemy
          const config: EnemySpawnConfig = {
            type: enemyGroup.type,
            x: spawnPosition.x,
            y: spawnPosition.y,
            level: spawnZone?.level || 1,
            isSwarmLeader: enemyGroup.isSwarmLeader
          };

          const enemy = this.factory.createEnemy(config);
          if (enemy) {
            this.spawnedEnemies.add(enemy);
            this.emitEvent('enemySpawned', {
              enemy,
              type: enemyGroup.type,
              position: spawnPosition
            });
          }
        }
      });
    }
  }

  private getSpawnPosition(spawnZone: SpawnZone | null): { x: number; y: number } {
    if (!spawnZone) {
      // Default random position on screen edges
      const edge = Math.floor(Math.random() * 4);
      const screenWidth = this.scene.scale.width;
      const screenHeight = this.scene.scale.height;

      switch (edge) {
        case 0: // Top
          return { x: Math.random() * screenWidth, y: -50 };
        case 1: // Right
          return { x: screenWidth + 50, y: Math.random() * screenHeight };
        case 2: // Bottom
          return { x: Math.random() * screenWidth, y: screenHeight + 50 };
        case 3: // Left
          return { x: -50, y: Math.random() * screenHeight };
        default:
          return { x: screenWidth / 2, y: screenHeight / 2 };
      }
    }

    // Random position within the spawn zone
    return {
      x: spawnZone.x + Math.random() * spawnZone.width,
      y: spawnZone.y + Math.random() * spawnZone.height
    };
  }

  // Continuous Spawning
  public update(_deltaTime: number): void {
    const currentTime = Date.now();

    // Check active spawn zones for continuous spawning
    this.spawnZones.forEach((zone, zoneId) => {
      if (!zone.isActive) return;

      const lastSpawnTime = this.lastSpawnTimes.get(zoneId) || 0;
      const spawnInterval = 1000 / zone.spawnRate; // Convert rate to interval

      if (currentTime - lastSpawnTime >= spawnInterval) {
        this.trySpawnInZone(zone);
        this.lastSpawnTimes.set(zoneId, currentTime);
      }
    });

    // Check wave trigger conditions
    this.checkWaveTriggers();

    // Clean up destroyed enemies
    this.cleanupDestroyedEnemies();
  }

  private trySpawnInZone(zone: SpawnZone): void {
    const activeEnemiesInZone = this.getActiveEnemiesInZone(zone);
    
    if (activeEnemiesInZone >= zone.maxEnemies) {
      return; // Zone is at capacity
    }

    const enemyType = zone.enemyTypes[Math.floor(Math.random() * zone.enemyTypes.length)];
    const spawnPosition = this.getSpawnPosition(zone);

    const config: EnemySpawnConfig = {
      type: enemyType,
      x: spawnPosition.x,
      y: spawnPosition.y,
      level: zone.level
    };

    const enemy = this.factory.createEnemy(config);
    if (enemy) {
      this.spawnedEnemies.add(enemy);
      this.emitEvent('enemySpawned', {
        enemy,
        type: enemyType,
        position: spawnPosition,
        zoneId: zone.id
      });
    }
  }

  private getActiveEnemiesInZone(zone: SpawnZone): number {
    let count = 0;
    this.spawnedEnemies.forEach(enemy => {
      if (!enemy.isDead()) {
        const pos = enemy.getPosition();
        if (pos.x >= zone.x && pos.x <= zone.x + zone.width &&
            pos.y >= zone.y && pos.y <= zone.y + zone.height) {
          count++;
        }
      }
    });
    return count;
  }

  private checkWaveTriggers(): void {
    // Implementation for checking wave trigger conditions
    // This would depend on game-specific logic
  }

  private cleanupDestroyedEnemies(): void {
    const toRemove: Enemy[] = [];
    this.spawnedEnemies.forEach(enemy => {
      if (enemy.isDead()) {
        toRemove.push(enemy);
      }
    });
    
    toRemove.forEach(enemy => {
      this.spawnedEnemies.delete(enemy);
      this.factory.returnEnemyToPool(enemy);
    });
  }

  // Event System
  public addEventListener(listener: SpawnEventListener): void {
    this.eventListeners.add(listener);
  }

  public removeEventListener(listener: SpawnEventListener): void {
    this.eventListeners.delete(listener);
  }

  private emitEvent(type: SpawnEvent['type'], data: unknown): void {
    const event: SpawnEvent = { type, data };
    this.eventListeners.forEach(listener => listener(event));
  }

  // Utility Methods
  public getActiveWaves(): string[] {
    return Array.from(this.activeWaves.keys());
  }

  public getActiveZones(): string[] {
    return Array.from(this.spawnZones.entries())
      .filter(([, zone]) => zone.isActive)
      .map(([id]) => id);
  }

  public getSpawnedEnemyCount(): number {
    return Array.from(this.spawnedEnemies).filter(enemy => !enemy.isDead()).length;
  }

  public getSpawnedEnemiesByType(type: EnemyType): Enemy[] {
    return Array.from(this.spawnedEnemies).filter(enemy => {
      if (enemy.isDead()) return false;
      
      // This would need proper type checking based on enemy instances
      const enemyName = enemy.getName().toLowerCase();
      switch (type) {
        case 'wraith':
          return enemyName.includes('wraith');
        case 'ironGolem':
          return enemyName.includes('golem');
        case 'carrionBats':
          return enemyName.includes('bat');
        default:
          return false;
      }
    });
  }

  public clearAllEnemies(): void {
    this.spawnedEnemies.forEach(enemy => {
      this.factory.returnEnemyToPool(enemy);
    });
    this.spawnedEnemies.clear();
  }

  public stopAllWaves(): void {
    this.activeWaves.clear();
  }

  public destroy(): void {
    this.clearAllEnemies();
    this.stopAllWaves();
    this.spawnZones.clear();
    this.spawnWaves.clear();
    this.eventListeners.clear();
    this.lastSpawnTimes.clear();
  }
}