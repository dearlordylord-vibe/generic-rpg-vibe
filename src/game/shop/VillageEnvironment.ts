import * as Phaser from 'phaser';

export interface VillageBuilding {
  id: string;
  name: string;
  type: 'shop' | 'decoration' | 'functional';
  position: { x: number; y: number };
  size: { width: number; height: number };
  sprite?: string;
  interactable: boolean;
  unlocked: boolean;
  entrancePoint?: { x: number; y: number };
}

export interface VillagePath {
  id: string;
  points: Array<{ x: number; y: number }>;
  width: number;
  type: 'main' | 'side' | 'decorative';
}

export interface VillageDecoration {
  id: string;
  sprite: string;
  position: { x: number; y: number };
  scale?: number;
  animated?: boolean;
  collision?: boolean;
}

export interface VillageLayoutConfiguration {
  size: { width: number; height: number };
  buildings: VillageBuilding[];
  paths: VillagePath[];
  decorations: VillageDecoration[];
  spawnPoint: { x: number; y: number };
  cameraLimits?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export class VillageEnvironment {
  private scene: Phaser.Scene;
  private config: VillageLayoutConfiguration;
  private buildings: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private decorations: Phaser.GameObjects.Group;
  private pathGraphics: Phaser.GameObjects.Graphics;
  private interactionZones: Map<string, Phaser.GameObjects.Zone> = new Map();
  private playerSpawnPoint: { x: number; y: number };

  constructor(scene: Phaser.Scene, config: VillageLayoutConfiguration) {
    this.scene = scene;
    this.config = config;
    this.playerSpawnPoint = config.spawnPoint;
    this.decorations = scene.add.group();
    this.pathGraphics = scene.add.graphics();
  }

  public initialize(): void {
    this.createPaths();
    this.createBuildings();
    this.createDecorations();
    this.setupCameraLimits();
    this.setupInteractionZones();
  }

  private createPaths(): void {
    this.pathGraphics.clear();
    
    this.config.paths.forEach(path => {
      let color: number;
      switch (path.type) {
        case 'main':
          color = 0x8B4513; // Brown
          break;
        case 'side':
          color = 0xA0522D; // Sienna
          break;
        case 'decorative':
          color = 0xDEB887; // Burlywood
          break;
        default:
          color = 0x8B4513;
      }

      this.pathGraphics.fillStyle(color);
      
      if (path.points.length >= 2) {
        // Create path using points
        const pathShape = new Phaser.Geom.Polygon(path.points);
        this.pathGraphics.fillPoints(pathShape.points, true);
      }
    });
  }

  private createBuildings(): void {
    this.config.buildings.forEach(building => {
      // Create building sprite
      const sprite = this.scene.add.sprite(
        building.position.x,
        building.position.y,
        building.sprite || 'building_default'
      );

      sprite.setOrigin(0.5, 1); // Bottom center anchor
      sprite.setDisplaySize(building.size.width, building.size.height);
      
      // Set alpha based on unlock status
      if (!building.unlocked) {
        sprite.setAlpha(0.6);
        sprite.setTint(0x888888);
      }

      // Add name label
      const nameText = this.scene.add.text(
        building.position.x,
        building.position.y - building.size.height - 10,
        building.name,
        {
          fontSize: '16px',
          color: building.unlocked ? '#ffffff' : '#888888',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: { x: 8, y: 4 }
        }
      );
      nameText.setOrigin(0.5);

      this.buildings.set(building.id, sprite);

      // Create collision box
      const body = this.scene.physics.add.staticGroup();
      const collisionBox = body.create(
        building.position.x,
        building.position.y - building.size.height / 2
      ) as Phaser.Physics.Arcade.Sprite;
      
      collisionBox.setSize(building.size.width * 0.8, building.size.height * 0.8);
      collisionBox.setVisible(false);
    });
  }

  private createDecorations(): void {
    this.config.decorations.forEach(decoration => {
      const sprite = this.scene.add.sprite(
        decoration.position.x,
        decoration.position.y,
        decoration.sprite
      );

      if (decoration.scale) {
        sprite.setScale(decoration.scale);
      }

      if (decoration.animated) {
        // Add animation logic here if needed
        sprite.play(`${decoration.sprite}_idle`, true);
      }

      this.decorations.add(sprite);

      // Add collision if specified
      if (decoration.collision) {
        const body = this.scene.physics.add.staticGroup();
        const collisionBox = body.create(
          decoration.position.x,
          decoration.position.y
        ) as Phaser.Physics.Arcade.Sprite;
        
        collisionBox.setSize(sprite.width * 0.8, sprite.height * 0.8);
        collisionBox.setVisible(false);
      }
    });
  }

  private setupCameraLimits(): void {
    if (this.config.cameraLimits) {
      const { minX, maxX, minY, maxY } = this.config.cameraLimits;
      this.scene.cameras.main.setBounds(minX, minY, maxX - minX, maxY - minY);
    } else {
      // Set bounds based on village size
      this.scene.cameras.main.setBounds(
        -100, 
        -100, 
        this.config.size.width + 200, 
        this.config.size.height + 200
      );
    }
  }

  private setupInteractionZones(): void {
    this.config.buildings.forEach(building => {
      if (building.interactable) {
        const zone = this.scene.add.zone(
          building.entrancePoint?.x || building.position.x,
          building.entrancePoint?.y || building.position.y,
          building.size.width + 50,
          50
        );

        zone.setOrigin(0.5);
        this.scene.physics.world.enable(zone);
        (zone.body as Phaser.Physics.Arcade.Body).setSize(zone.width, zone.height);

        // Add visual indicator for interaction
        if (building.unlocked) {
          const indicator = this.scene.add.text(
            zone.x,
            zone.y - 20,
            'Press E to enter',
            {
              fontSize: '12px',
              color: '#ffff00',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: { x: 6, y: 3 }
            }
          );
          indicator.setOrigin(0.5);
          indicator.setVisible(false);

          // Store reference for showing/hiding
          (zone as unknown as { indicator: Phaser.GameObjects.Text }).indicator = indicator;
        }

        this.interactionZones.set(building.id, zone);
      }
    });
  }

  public updateBuildingUnlockStatus(buildingId: string, unlocked: boolean): void {
    const building = this.config.buildings.find(b => b.id === buildingId);
    const sprite = this.buildings.get(buildingId);
    
    if (building && sprite) {
      building.unlocked = unlocked;
      
      if (unlocked) {
        sprite.setAlpha(1);
        sprite.clearTint();
      } else {
        sprite.setAlpha(0.6);
        sprite.setTint(0x888888);
      }

      // Update interaction zone
      const zone = this.interactionZones.get(buildingId);
      const zoneWithIndicator = zone as unknown as { indicator?: Phaser.GameObjects.Text };
      if (zone && zoneWithIndicator.indicator) {
        zoneWithIndicator.indicator.setVisible(unlocked);
      }
    }
  }

  public getPlayerSpawnPoint(): { x: number; y: number } {
    return { ...this.playerSpawnPoint };
  }

  public getBuildingPosition(buildingId: string): { x: number; y: number } | null {
    const building = this.config.buildings.find(b => b.id === buildingId);
    return building ? { ...building.position } : null;
  }

  public getInteractionZone(buildingId: string): Phaser.GameObjects.Zone | undefined {
    return this.interactionZones.get(buildingId);
  }

  public getAllInteractionZones(): Phaser.GameObjects.Zone[] {
    return Array.from(this.interactionZones.values());
  }

  public showInteractionIndicator(buildingId: string): void {
    const zone = this.interactionZones.get(buildingId);
    const zoneWithIndicator = zone as unknown as { indicator?: Phaser.GameObjects.Text };
    if (zone && zoneWithIndicator.indicator) {
      zoneWithIndicator.indicator.setVisible(true);
    }
  }

  public hideInteractionIndicator(buildingId: string): void {
    const zone = this.interactionZones.get(buildingId);
    const zoneWithIndicator = zone as unknown as { indicator?: Phaser.GameObjects.Text };
    if (zone && zoneWithIndicator.indicator) {
      zoneWithIndicator.indicator.setVisible(false);
    }
  }

  public hideAllInteractionIndicators(): void {
    this.interactionZones.forEach((zone) => {
      const zoneWithIndicator = zone as unknown as { indicator?: Phaser.GameObjects.Text };
      if (zoneWithIndicator.indicator) {
        zoneWithIndicator.indicator.setVisible(false);
      }
    });
  }

  public isPlayerNearBuilding(playerX: number, playerY: number, buildingId: string, threshold: number = 80): boolean {
    const building = this.config.buildings.find(b => b.id === buildingId);
    if (!building) return false;

    const distance = Phaser.Math.Distance.Between(
      playerX, 
      playerY, 
      building.entrancePoint?.x || building.position.x,
      building.entrancePoint?.y || building.position.y
    );

    return distance <= threshold;
  }

  public getNearbyBuildings(playerX: number, playerY: number, threshold: number = 100): VillageBuilding[] {
    return this.config.buildings.filter(building => {
      if (!building.interactable || !building.unlocked) return false;
      
      const distance = Phaser.Math.Distance.Between(
        playerX,
        playerY,
        building.entrancePoint?.x || building.position.x,
        building.entrancePoint?.y || building.position.y
      );

      return distance <= threshold;
    });
  }

  public addDynamicDecoration(decoration: VillageDecoration): void {
    const sprite = this.scene.add.sprite(
      decoration.position.x,
      decoration.position.y,
      decoration.sprite
    );

    if (decoration.scale) {
      sprite.setScale(decoration.scale);
    }

    this.decorations.add(sprite);
    
    // Also add to config for persistence
    this.config.decorations.push(decoration);
  }

  public removeDynamicDecoration(decorationId: string): void {
    const decorationIndex = this.config.decorations.findIndex(d => d.id === decorationId);
    if (decorationIndex !== -1) {
      // Remove from config
      this.config.decorations.splice(decorationIndex, 1);
      
      // Remove sprite (simplified - in real implementation you'd track sprites by ID)
      this.decorations.clear(true, true);
      this.createDecorations(); // Recreate all decorations
    }
  }

  public getVillageStats(): {
    totalBuildings: number;
    unlockedBuildings: number;
    interactableBuildings: number;
    decorationCount: number;
    pathCount: number;
  } {
    return {
      totalBuildings: this.config.buildings.length,
      unlockedBuildings: this.config.buildings.filter(b => b.unlocked).length,
      interactableBuildings: this.config.buildings.filter(b => b.interactable).length,
      decorationCount: this.config.decorations.length,
      pathCount: this.config.paths.length
    };
  }

  public destroy(): void {
    this.buildings.clear();
    this.decorations.destroy(true);
    this.pathGraphics.destroy();
    this.interactionZones.clear();
  }
}

// Default village layout configuration
export const DEFAULT_VILLAGE_LAYOUT: VillageLayoutConfiguration = {
  size: { width: 800, height: 600 },
  spawnPoint: { x: 400, y: 500 },
  buildings: [
    {
      id: 'blacksmith',
      name: 'Ironforge Blacksmith',
      type: 'shop',
      position: { x: 200, y: 200 },
      size: { width: 120, height: 150 },
      sprite: 'blacksmith_building',
      interactable: true,
      unlocked: false,
      entrancePoint: { x: 200, y: 200 }
    },
    {
      id: 'apothecary',
      name: 'Mystical Apothecary',
      type: 'shop',
      position: { x: 400, y: 180 },
      size: { width: 100, height: 130 },
      sprite: 'apothecary_building',
      interactable: true,
      unlocked: true,
      entrancePoint: { x: 400, y: 180 }
    },
    {
      id: 'tavern',
      name: 'The Prancing Pony',
      type: 'shop',
      position: { x: 600, y: 220 },
      size: { width: 140, height: 160 },
      sprite: 'tavern_building',
      interactable: true,
      unlocked: true,
      entrancePoint: { x: 600, y: 220 }
    },
    {
      id: 'fountain',
      name: 'Village Fountain',
      type: 'decoration',
      position: { x: 400, y: 350 },
      size: { width: 80, height: 80 },
      sprite: 'fountain',
      interactable: false,
      unlocked: true
    }
  ],
  paths: [
    {
      id: 'main_path',
      points: [
        { x: 300, y: 500 },
        { x: 400, y: 400 },
        { x: 500, y: 500 }
      ],
      width: 40,
      type: 'main'
    },
    {
      id: 'shop_path',
      points: [
        { x: 200, y: 250 },
        { x: 400, y: 230 },
        { x: 600, y: 270 }
      ],
      width: 30,
      type: 'side'
    }
  ],
  decorations: [
    {
      id: 'tree_1',
      sprite: 'oak_tree',
      position: { x: 150, y: 400 },
      scale: 1.2,
      collision: true
    },
    {
      id: 'tree_2',
      sprite: 'oak_tree',
      position: { x: 650, y: 380 },
      scale: 1.0,
      collision: true
    },
    {
      id: 'flowers_1',
      sprite: 'flower_patch',
      position: { x: 300, y: 300 },
      scale: 0.8,
      collision: false
    },
    {
      id: 'lamp_post_1',
      sprite: 'lamp_post',
      position: { x: 350, y: 250 },
      scale: 1.0,
      collision: true,
      animated: true
    }
  ],
  cameraLimits: {
    minX: 0,
    maxX: 800,
    minY: 0,
    maxY: 600
  }
};