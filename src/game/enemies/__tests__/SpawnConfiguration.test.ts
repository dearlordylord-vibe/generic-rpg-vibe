import { describe, it, expect } from 'vitest';
import { SpawnConfiguration, LevelConfiguration, DifficultySettings } from '../SpawnConfiguration';
import { SpawnZone, SpawnWave } from '../EnemySpawner';

describe('SpawnConfiguration', () => {
  describe('Configuration Retrieval', () => {
    it('should get configuration by level', () => {
      const config = SpawnConfiguration.getConfiguration(1);
      
      expect(config).toBeTruthy();
      expect(config!.level).toBe(1);
      expect(config!.name).toBe("Abandoned Graveyard");
    });

    it('should return null for non-existent level', () => {
      const config = SpawnConfiguration.getConfiguration(999);
      
      expect(config).toBeNull();
    });

    it('should get all configurations', () => {
      const configs = SpawnConfiguration.getAllConfigurations();
      
      expect(configs).toHaveLength(4);
      expect(configs[0].level).toBe(1);
      expect(configs[3].level).toBe(4);
    });
  });

  describe('Difficulty Presets', () => {
    it('should get difficulty preset', () => {
      const easyDifficulty = SpawnConfiguration.getDifficultyPreset('easy');
      
      expect(easyDifficulty).toBeTruthy();
      expect(easyDifficulty!.spawnRateMultiplier).toBe(0.7);
      expect(easyDifficulty!.enemyHealthMultiplier).toBe(0.8);
    });

    it('should return null for unknown preset', () => {
      const unknownDifficulty = SpawnConfiguration.getDifficultyPreset('unknown');
      
      expect(unknownDifficulty).toBeNull();
    });

    it('should create custom difficulty', () => {
      const customDifficulty = SpawnConfiguration.createCustomDifficulty({
        spawnRateMultiplier: 1.5,
        enemyDamageMultiplier: 1.3
      });
      
      expect(customDifficulty.spawnRateMultiplier).toBe(1.5);
      expect(customDifficulty.enemyDamageMultiplier).toBe(1.3);
      expect(customDifficulty.enemyHealthMultiplier).toBe(1.0); // Default value
    });
  });

  describe('Level Unlocking', () => {
    it('should return available levels based on requirements', () => {
      const availableLevels = SpawnConfiguration.getAvailableLevels(
        1, // Player level
        [], // No completed waves
        {} // No kills
      );
      
      // Only level 1 should be available (no unlock conditions)
      expect(availableLevels).toHaveLength(1);
      expect(availableLevels[0].level).toBe(1);
    });

    it('should unlock level 2 with completed tutorial', () => {
      const availableLevels = SpawnConfiguration.getAvailableLevels(
        2,
        ['graveyard_tutorial'], // Completed tutorial
        {}
      );
      
      expect(availableLevels).toHaveLength(2);
      expect(availableLevels.some(config => config.level === 2)).toBe(true);
    });

    it('should unlock level 3 with level and completion requirements', () => {
      const availableLevels = SpawnConfiguration.getAvailableLevels(
        3,
        ['graveyard_tutorial', 'ruins_defense'],
        {}
      );
      
      expect(availableLevels).toHaveLength(3);
      expect(availableLevels.some(config => config.level === 3)).toBe(true);
    });

    it('should unlock level 4 with kill requirements', () => {
      const availableLevels = SpawnConfiguration.getAvailableLevels(
        4,
        ['graveyard_tutorial', 'ruins_defense', 'bat_swarm_small'],
        {
          wraith: 25,
          ironGolem: 15,
          carrionBats: 35
        }
      );
      
      expect(availableLevels).toHaveLength(4);
      expect(availableLevels.some(config => config.level === 4)).toBe(true);
    });

    it('should not unlock level with insufficient kills', () => {
      const availableLevels = SpawnConfiguration.getAvailableLevels(
        4,
        ['graveyard_tutorial', 'ruins_defense', 'bat_swarm_small'],
        {
          wraith: 5, // Not enough
          ironGolem: 2, // Not enough
          carrionBats: 10 // Not enough
        }
      );
      
      expect(availableLevels.some(config => config.level === 4)).toBe(false);
    });
  });

  describe('Difficulty Application', () => {
    it('should apply difficulty to spawn zone', () => {
      const originalZone: SpawnZone = {
        id: 'test_zone',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        enemyTypes: ['wraith'],
        spawnRate: 1.0,
        maxEnemies: 10,
        level: 1,
        isActive: true
      };

      const hardDifficulty: DifficultySettings = {
        spawnRateMultiplier: 1.5,
        enemyHealthMultiplier: 1.2,
        enemyDamageMultiplier: 1.2,
        maxEnemiesMultiplier: 1.3,
        experienceMultiplier: 0.9
      };

      const modifiedZone = SpawnConfiguration.applyDifficultyToZone(originalZone, hardDifficulty);
      
      expect(modifiedZone.spawnRate).toBe(1.5);
      expect(modifiedZone.maxEnemies).toBe(13); // Math.ceil(10 * 1.3)
      expect(modifiedZone.id).toBe(originalZone.id); // Other properties unchanged
    });

    it('should apply difficulty to spawn wave', () => {
      const originalWave: SpawnWave = {
        id: 'test_wave',
        enemies: [
          { type: 'wraith', count: 3, delay: 0 },
          { type: 'ironGolem', count: 2, delay: 1000 }
        ],
        triggerCondition: 'manual',
        isRepeating: false
      };

      const hardDifficulty: DifficultySettings = {
        spawnRateMultiplier: 1.5,
        enemyHealthMultiplier: 1.2,
        enemyDamageMultiplier: 1.2,
        maxEnemiesMultiplier: 1.5,
        experienceMultiplier: 0.9
      };

      const modifiedWave = SpawnConfiguration.applyDifficultyToWave(originalWave, hardDifficulty);
      
      expect(modifiedWave.enemies[0].count).toBe(5); // Math.ceil(3 * 1.5)
      expect(modifiedWave.enemies[1].count).toBe(3); // Math.ceil(2 * 1.5)
      expect(modifiedWave.id).toBe(originalWave.id); // Other properties unchanged
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const validConfig: LevelConfiguration = {
        level: 1,
        name: "Test Level",
        description: "Test description",
        difficulty: SpawnConfiguration.getDifficultyPreset('normal')!,
        zones: [
          {
            id: 'test_zone',
            x: 100,
            y: 100,
            width: 200,
            height: 200,
            enemyTypes: ['wraith'],
            spawnRate: 1.0,
            maxEnemies: 10,
            level: 1,
            isActive: true
          }
        ],
        waves: [
          {
            id: 'test_wave',
            enemies: [{ type: 'wraith', count: 1, delay: 0 }],
            triggerCondition: 'manual',
            isRepeating: false,
            spawnZoneId: 'test_zone'
          }
        ]
      };

      const errors = SpawnConfiguration.validateConfiguration(validConfig);
      
      expect(errors).toHaveLength(0);
    });

    it('should detect missing zones', () => {
      const invalidConfig: LevelConfiguration = {
        level: 1,
        name: "Test Level",
        description: "Test description",
        difficulty: SpawnConfiguration.getDifficultyPreset('normal')!,
        zones: [],
        waves: []
      };

      const errors = SpawnConfiguration.validateConfiguration(invalidConfig);
      
      expect(errors).toContain("Configuration must have at least one spawn zone");
    });

    it('should detect zone validation errors', () => {
      const invalidConfig: LevelConfiguration = {
        level: 1,
        name: "Test Level",
        description: "Test description",
        difficulty: SpawnConfiguration.getDifficultyPreset('normal')!,
        zones: [
          {
            id: '',
            x: 100,
            y: 100,
            width: 200,
            height: 200,
            enemyTypes: [],
            spawnRate: -1,
            maxEnemies: 0,
            level: 1,
            isActive: true
          }
        ],
        waves: []
      };

      const errors = SpawnConfiguration.validateConfiguration(invalidConfig);
      
      expect(errors).toContain("Zone 0 missing ID");
      expect(errors).toContain("Zone  has no enemy types");
      expect(errors).toContain("Zone  has invalid spawn rate");
      expect(errors).toContain("Zone  has invalid max enemies");
    });

    it('should detect wave validation errors', () => {
      const invalidConfig: LevelConfiguration = {
        level: 1,
        name: "Test Level",
        description: "Test description",
        difficulty: SpawnConfiguration.getDifficultyPreset('normal')!,
        zones: [
          {
            id: 'test_zone',
            x: 100,
            y: 100,
            width: 200,
            height: 200,
            enemyTypes: ['wraith'],
            spawnRate: 1.0,
            maxEnemies: 10,
            level: 1,
            isActive: true
          }
        ],
        waves: [
          {
            id: '',
            enemies: [],
            triggerCondition: 'manual',
            isRepeating: false,
            spawnZoneId: 'nonexistent_zone'
          }
        ]
      };

      const errors = SpawnConfiguration.validateConfiguration(invalidConfig);
      
      expect(errors).toContain("Wave 0 missing ID");
      expect(errors).toContain("Wave  has no enemies");
      expect(errors).toContain("Wave  references non-existent zone nonexistent_zone");
    });
  });

  describe('Zone Presets', () => {
    it('should create small zone preset', () => {
      const zone = SpawnConfiguration.createZonePreset(
        'small',
        400, // centerX
        300, // centerY
        ['wraith'],
        2
      );

      expect(zone.width).toBe(200);
      expect(zone.height).toBe(150);
      expect(zone.x).toBe(300); // centerX - width/2
      expect(zone.y).toBe(225); // centerY - height/2
      expect(zone.enemyTypes).toEqual(['wraith']);
      expect(zone.level).toBe(2);
      expect(zone.maxEnemies).toBe(5);
      expect(zone.spawnRate).toBe(0.3);
    });

    it('should create large zone preset', () => {
      const zone = SpawnConfiguration.createZonePreset(
        'large',
        400,
        300,
        ['wraith', 'ironGolem'],
        3
      );

      expect(zone.width).toBe(600);
      expect(zone.height).toBe(450);
      expect(zone.maxEnemies).toBe(20);
      expect(zone.spawnRate).toBe(0.7);
    });

    it('should create boss zone preset', () => {
      const zone = SpawnConfiguration.createZonePreset(
        'boss',
        400,
        300,
        ['ironGolem'],
        4
      );

      expect(zone.width).toBe(300);
      expect(zone.height).toBe(300);
      expect(zone.maxEnemies).toBe(8);
      expect(zone.spawnRate).toBe(0.2);
    });

    it('should generate unique IDs for presets', () => {
      const zone1 = SpawnConfiguration.createZonePreset('small', 100, 100, ['wraith'], 1);
      const zone2 = SpawnConfiguration.createZonePreset('small', 100, 100, ['wraith'], 1);

      expect(zone1.id).not.toBe(zone2.id);
    });
  });

  describe('Level Configurations Content', () => {
    it('should have correct level 1 configuration', () => {
      const level1 = SpawnConfiguration.getConfiguration(1);
      
      expect(level1!.name).toBe("Abandoned Graveyard");
      expect(level1!.zones).toHaveLength(1);
      expect(level1!.zones[0].enemyTypes).toEqual(['wraith']);
      expect(level1!.waves).toHaveLength(1);
      expect(level1!.unlockConditions).toBeUndefined();
    });

    it('should have correct level 4 configuration', () => {
      const level4 = SpawnConfiguration.getConfiguration(4);
      
      expect(level4!.name).toBe("Chaos Battlefield");
      expect(level4!.zones).toHaveLength(3);
      expect(level4!.difficulty).toEqual(SpawnConfiguration.getDifficultyPreset('hard'));
      expect(level4!.unlockConditions?.requiredKills).toBeDefined();
    });
  });
});