import { EnemyType } from './EnemyFactory';
import { SpawnZone, SpawnWave } from './EnemySpawner';

export interface DifficultySettings {
  spawnRateMultiplier: number;
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  maxEnemiesMultiplier: number;
  experienceMultiplier: number;
}

export interface LevelConfiguration {
  level: number;
  name: string;
  description: string;
  zones: SpawnZone[];
  waves: SpawnWave[];
  difficulty: DifficultySettings;
  unlockConditions?: {
    requiredLevel?: number;
    requiredCompletions?: string[]; // Wave IDs that must be completed
    requiredKills?: { [key in EnemyType]?: number };
  };
}

export class SpawnConfiguration {
  private static readonly DIFFICULTY_PRESETS: Record<string, DifficultySettings> = {
    easy: {
      spawnRateMultiplier: 0.7,
      enemyHealthMultiplier: 0.8,
      enemyDamageMultiplier: 0.8,
      maxEnemiesMultiplier: 0.8,
      experienceMultiplier: 1.2
    },
    normal: {
      spawnRateMultiplier: 1.0,
      enemyHealthMultiplier: 1.0,
      enemyDamageMultiplier: 1.0,
      maxEnemiesMultiplier: 1.0,
      experienceMultiplier: 1.0
    },
    hard: {
      spawnRateMultiplier: 1.3,
      enemyHealthMultiplier: 1.2,
      enemyDamageMultiplier: 1.2,
      maxEnemiesMultiplier: 1.2,
      experienceMultiplier: 0.9
    },
    nightmare: {
      spawnRateMultiplier: 1.6,
      enemyHealthMultiplier: 1.5,
      enemyDamageMultiplier: 1.4,
      maxEnemiesMultiplier: 1.5,
      experienceMultiplier: 0.8
    }
  };

  private static readonly LEVEL_CONFIGURATIONS: LevelConfiguration[] = [
    {
      level: 1,
      name: "Abandoned Graveyard",
      description: "A quiet graveyard where wraiths first emerge",
      difficulty: SpawnConfiguration.DIFFICULTY_PRESETS.normal,
      zones: [
        {
          id: "graveyard_main",
          x: 100,
          y: 100,
          width: 600,
          height: 400,
          enemyTypes: ['wraith'],
          spawnRate: 0.3, // 0.3 enemies per second
          maxEnemies: 8,
          level: 1,
          isActive: true
        }
      ],
      waves: [
        {
          id: "graveyard_tutorial",
          enemies: [
            { type: 'wraith', count: 3, delay: 0 },
            { type: 'wraith', count: 2, delay: 5000 }
          ],
          triggerCondition: 'manual',
          isRepeating: false,
          spawnZoneId: "graveyard_main"
        }
      ]
    },
    {
      level: 2,
      name: "Ancient Ruins",
      description: "Crumbling ruins guarded by iron golems",
      difficulty: SpawnConfiguration.DIFFICULTY_PRESETS.normal,
      zones: [
        {
          id: "ruins_courtyard",
          x: 0,
          y: 0,
          width: 800,
          height: 600,
          enemyTypes: ['wraith', 'ironGolem'],
          spawnRate: 0.4,
          maxEnemies: 10,
          level: 2,
          isActive: true
        },
        {
          id: "ruins_entrance",
          x: 350,
          y: 550,
          width: 100,
          height: 50,
          enemyTypes: ['ironGolem'],
          spawnRate: 0.2,
          maxEnemies: 3,
          level: 2,
          isActive: true
        }
      ],
      waves: [
        {
          id: "ruins_defense",
          enemies: [
            { type: 'ironGolem', count: 1, delay: 0 },
            { type: 'wraith', count: 4, delay: 3000 },
            { type: 'ironGolem', count: 2, delay: 8000 }
          ],
          triggerCondition: 'manual',
          isRepeating: false,
          spawnZoneId: "ruins_courtyard"
        }
      ],
      unlockConditions: {
        requiredCompletions: ["graveyard_tutorial"]
      }
    },
    {
      level: 3,
      name: "Carrion Caves",
      description: "Dark caves infested with carrion bats",
      difficulty: SpawnConfiguration.DIFFICULTY_PRESETS.normal,
      zones: [
        {
          id: "cave_entrance",
          x: 50,
          y: 50,
          width: 700,
          height: 500,
          enemyTypes: ['carrionBats', 'wraith'],
          spawnRate: 0.5,
          maxEnemies: 15,
          level: 3,
          isActive: true
        },
        {
          id: "cave_depths",
          x: 200,
          y: 200,
          width: 400,
          height: 200,
          enemyTypes: ['carrionBats'],
          spawnRate: 0.8,
          maxEnemies: 20,
          level: 3,
          isActive: false // Activated by triggers
        }
      ],
      waves: [
        {
          id: "bat_swarm_small",
          enemies: [
            { type: 'carrionBats', count: 5, delay: 0, isSwarmLeader: true }
          ],
          triggerCondition: 'time',
          triggerValue: 30000, // 30 seconds
          isRepeating: true,
          spawnZoneId: "cave_entrance"
        },
        {
          id: "bat_swarm_large",
          enemies: [
            { type: 'carrionBats', count: 8, delay: 0, isSwarmLeader: true },
            { type: 'carrionBats', count: 6, delay: 5000, isSwarmLeader: true }
          ],
          triggerCondition: 'manual',
          isRepeating: false,
          spawnZoneId: "cave_depths"
        }
      ],
      unlockConditions: {
        requiredLevel: 2,
        requiredCompletions: ["ruins_defense"]
      }
    },
    {
      level: 4,
      name: "Chaos Battlefield",
      description: "A battleground where all enemy types clash",
      difficulty: SpawnConfiguration.DIFFICULTY_PRESETS.hard,
      zones: [
        {
          id: "battlefield_center",
          x: 200,
          y: 150,
          width: 400,
          height: 300,
          enemyTypes: ['wraith', 'ironGolem', 'carrionBats'],
          spawnRate: 0.6,
          maxEnemies: 20,
          level: 4,
          isActive: true
        },
        {
          id: "battlefield_north",
          x: 100,
          y: 0,
          width: 600,
          height: 150,
          enemyTypes: ['carrionBats'],
          spawnRate: 0.4,
          maxEnemies: 10,
          level: 4,
          isActive: true
        },
        {
          id: "battlefield_south",
          x: 100,
          y: 450,
          width: 600,
          height: 150,
          enemyTypes: ['ironGolem'],
          spawnRate: 0.3,
          maxEnemies: 6,
          level: 4,
          isActive: true
        }
      ],
      waves: [
        {
          id: "chaos_wave_1",
          enemies: [
            { type: 'wraith', count: 3, delay: 0 },
            { type: 'ironGolem', count: 2, delay: 2000 },
            { type: 'carrionBats', count: 6, delay: 4000, isSwarmLeader: true }
          ],
          triggerCondition: 'enemyCount',
          triggerValue: 5, // Trigger when enemy count drops below 5
          isRepeating: true,
          spawnZoneId: "battlefield_center"
        },
        {
          id: "final_assault",
          enemies: [
            { type: 'ironGolem', count: 3, delay: 0 },
            { type: 'wraith', count: 6, delay: 3000 },
            { type: 'carrionBats', count: 10, delay: 6000, isSwarmLeader: true },
            { type: 'ironGolem', count: 2, delay: 10000 },
            { type: 'wraith', count: 4, delay: 12000 }
          ],
          triggerCondition: 'manual',
          isRepeating: false,
          spawnZoneId: "battlefield_center"
        }
      ],
      unlockConditions: {
        requiredLevel: 3,
        requiredKills: {
          wraith: 20,
          ironGolem: 10,
          carrionBats: 30
        }
      }
    }
  ];

  public static getConfiguration(level: number): LevelConfiguration | null {
    return this.LEVEL_CONFIGURATIONS.find(config => config.level === level) || null;
  }

  public static getAllConfigurations(): LevelConfiguration[] {
    return [...this.LEVEL_CONFIGURATIONS];
  }

  public static getDifficultyPreset(preset: string): DifficultySettings | null {
    return this.DIFFICULTY_PRESETS[preset] || null;
  }

  public static createCustomDifficulty(settings: Partial<DifficultySettings>): DifficultySettings {
    return {
      ...this.DIFFICULTY_PRESETS.normal,
      ...settings
    };
  }

  public static getAvailableLevels(
    playerLevel: number,
    completedWaves: string[],
    killCounts: { [key in EnemyType]?: number }
  ): LevelConfiguration[] {
    return this.LEVEL_CONFIGURATIONS.filter(config => {
      if (!config.unlockConditions) return true;

      // Check level requirement
      if (config.unlockConditions.requiredLevel && playerLevel < config.unlockConditions.requiredLevel) {
        return false;
      }

      // Check completion requirements
      if (config.unlockConditions.requiredCompletions) {
        const hasAllCompletions = config.unlockConditions.requiredCompletions.every(
          waveId => completedWaves.includes(waveId)
        );
        if (!hasAllCompletions) return false;
      }

      // Check kill requirements
      if (config.unlockConditions.requiredKills) {
        const hasAllKills = Object.entries(config.unlockConditions.requiredKills).every(
          ([enemyType, requiredCount]) => {
            const actualCount = killCounts[enemyType as EnemyType] || 0;
            return actualCount >= requiredCount;
          }
        );
        if (!hasAllKills) return false;
      }

      return true;
    });
  }

  public static applyDifficultyToZone(zone: SpawnZone, difficulty: DifficultySettings): SpawnZone {
    return {
      ...zone,
      spawnRate: zone.spawnRate * difficulty.spawnRateMultiplier,
      maxEnemies: Math.ceil(zone.maxEnemies * difficulty.maxEnemiesMultiplier)
    };
  }

  public static applyDifficultyToWave(wave: SpawnWave, difficulty: DifficultySettings): SpawnWave {
    return {
      ...wave,
      enemies: wave.enemies.map(enemy => ({
        ...enemy,
        count: Math.ceil(enemy.count * difficulty.maxEnemiesMultiplier)
      }))
    };
  }

  public static validateConfiguration(config: LevelConfiguration): string[] {
    const errors: string[] = [];

    // Check if zones exist
    if (!config.zones || config.zones.length === 0) {
      errors.push("Configuration must have at least one spawn zone");
    }

    // Check zone validity
    config.zones.forEach((zone, index) => {
      if (!zone.id) {
        errors.push(`Zone ${index} missing ID`);
      }
      if (zone.enemyTypes.length === 0) {
        errors.push(`Zone ${zone.id} has no enemy types`);
      }
      if (zone.spawnRate <= 0) {
        errors.push(`Zone ${zone.id} has invalid spawn rate`);
      }
      if (zone.maxEnemies <= 0) {
        errors.push(`Zone ${zone.id} has invalid max enemies`);
      }
    });

    // Check wave validity
    config.waves.forEach((wave, index) => {
      if (!wave.id) {
        errors.push(`Wave ${index} missing ID`);
      }
      if (wave.enemies.length === 0) {
        errors.push(`Wave ${wave.id} has no enemies`);
      }
      if (wave.spawnZoneId && !config.zones.find(z => z.id === wave.spawnZoneId)) {
        errors.push(`Wave ${wave.id} references non-existent zone ${wave.spawnZoneId}`);
      }
    });

    return errors;
  }

  public static createZonePreset(
    type: 'small' | 'medium' | 'large' | 'boss',
    centerX: number,
    centerY: number,
    enemyTypes: EnemyType[],
    level: number
  ): SpawnZone {
    const presets = {
      small: { width: 200, height: 150, spawnRate: 0.3, maxEnemies: 5 },
      medium: { width: 400, height: 300, spawnRate: 0.5, maxEnemies: 10 },
      large: { width: 600, height: 450, spawnRate: 0.7, maxEnemies: 20 },
      boss: { width: 300, height: 300, spawnRate: 0.2, maxEnemies: 8 }
    };

    const preset = presets[type];
    
    return {
      id: `${type}_zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: centerX - preset.width / 2,
      y: centerY - preset.height / 2,
      width: preset.width,
      height: preset.height,
      enemyTypes,
      spawnRate: preset.spawnRate,
      maxEnemies: preset.maxEnemies,
      level,
      isActive: true
    };
  }
}