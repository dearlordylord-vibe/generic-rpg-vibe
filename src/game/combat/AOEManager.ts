import Phaser from 'phaser';
import { PlayerStats } from '../models/PlayerStats';

export interface AOEType {
  id: string;
  name: string;
  radius: number;
  baseDamage: number;
  duration: number;
  effectType: 'instant' | 'overtime';
  visualEffect: string;
  damageType: 'physical' | 'magical' | 'fire' | 'ice' | 'lightning';
}

export interface AOEEffect {
  id: string;
  typeId: string;
  centerX: number;
  centerY: number;
  radius: number;
  damage: number;
  duration: number;
  remainingTime: number;
  sourceId: string;
  createdAt: number;
  isActive: boolean;
  sprite?: Phaser.GameObjects.Sprite;
  graphics?: Phaser.GameObjects.Graphics;
}

export interface AOETarget {
  id: string;
  x: number;
  y: number;
  health: number;
  defense: number;
  enemy?: Phaser.GameObjects.Sprite; // Reference to actual enemy sprite
}

export interface AOEResult {
  effectId: string;
  targetsHit: Array<{
    targetId: string;
    damage: number;
    isCritical: boolean;
    distance: number;
  }>;
  centerX: number;
  centerY: number;
  radius: number;
}

export class AOEManager {
  private scene: Phaser.Scene;
  private activeEffects: Map<string, AOEEffect>;
  private aoeTypes: Map<string, AOEType>;
  private nextEffectId: number;
  private combatManager?: any; // Reference to combat manager

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.activeEffects = new Map();
    this.aoeTypes = new Map();
    this.nextEffectId = 1;
    this.initializeAOETypes();
  }

  setCombatManager(combatManager: any): void {
    this.combatManager = combatManager;
  }

  private initializeAOETypes(): void {
    const aoeTypes: AOEType[] = [
      {
        id: 'explosion',
        name: 'Explosion',
        radius: 100,
        baseDamage: 50,
        duration: 0,
        effectType: 'instant',
        visualEffect: 'explosion_sprite',
        damageType: 'fire'
      },
      {
        id: 'magic_circle',
        name: 'Magic Circle',
        radius: 80,
        baseDamage: 30,
        duration: 3000,
        effectType: 'overtime',
        visualEffect: 'magic_circle_sprite',
        damageType: 'magical'
      },
      {
        id: 'shockwave',
        name: 'Shockwave',
        radius: 120,
        baseDamage: 40,
        duration: 500,
        effectType: 'instant',
        visualEffect: 'shockwave_sprite',
        damageType: 'physical'
      },
      {
        id: 'ice_storm',
        name: 'Ice Storm',
        radius: 90,
        baseDamage: 25,
        duration: 4000,
        effectType: 'overtime',
        visualEffect: 'ice_storm_sprite',
        damageType: 'ice'
      },
      {
        id: 'lightning_strike',
        name: 'Lightning Strike',
        radius: 60,
        baseDamage: 70,
        duration: 200,
        effectType: 'instant',
        visualEffect: 'lightning_sprite',
        damageType: 'lightning'
      }
    ];

    aoeTypes.forEach(type => {
      this.aoeTypes.set(type.id, type);
    });
  }

  createAOE(
    typeId: string,
    centerX: number,
    centerY: number,
    sourceId: string,
    playerStats?: PlayerStats
  ): AOEResult | null {
    const aoeType = this.aoeTypes.get(typeId);
    if (!aoeType) {
      console.warn(`AOE type ${typeId} not found`);
      return null;
    }

    const effectId = `aoe_${this.nextEffectId++}`;
    const damage = this.calculateAOEDamage(aoeType.baseDamage, playerStats);

    const effect: AOEEffect = {
      id: effectId,
      typeId,
      centerX,
      centerY,
      radius: aoeType.radius,
      damage,
      duration: aoeType.duration,
      remainingTime: aoeType.duration,
      sourceId,
      createdAt: Date.now(),
      isActive: true
    };

    this.activeEffects.set(effectId, effect);
    this.createVisualEffect(effect, aoeType);

    const result = this.processAOEDamage(effect);
    
    if (aoeType.effectType === 'instant') {
      this.deactivateEffect(effectId);
    }

    return result;
  }

  private calculateAOEDamage(baseDamage: number, playerStats?: PlayerStats): number {
    if (!playerStats) return baseDamage;
    
    const magic = playerStats.getBaseStat('intelligence') || 0;
    const multiplier = 1 + (magic / 100);
    return Math.floor(baseDamage * multiplier);
  }

  private createVisualEffect(effect: AOEEffect, aoeType: AOEType): void {
    if (aoeType.visualEffect.endsWith('_sprite')) {
      const spriteKey = aoeType.visualEffect.replace('_sprite', '');
      try {
        effect.sprite = this.scene.add.sprite(effect.centerX, effect.centerY, spriteKey);
        effect.sprite.setScale(effect.radius / 50);
        effect.sprite.setAlpha(0.8);
        
        if (aoeType.effectType === 'instant') {
          this.scene.tweens.add({
            targets: effect.sprite,
            scaleX: effect.sprite.scaleX * 1.5,
            scaleY: effect.sprite.scaleY * 1.5,
            alpha: 0,
            duration: 500,
            onComplete: () => {
              effect.sprite?.destroy();
            }
          });
        }
      } catch (error) {
        this.createFallbackVisual(effect, aoeType);
      }
    } else {
      this.createFallbackVisual(effect, aoeType);
    }
  }

  private createFallbackVisual(effect: AOEEffect, aoeType: AOEType): void {
    effect.graphics = this.scene.add.graphics();
    
    const color = this.getAOEColor(aoeType.damageType);
    effect.graphics.fillStyle(color, 0.3);
    effect.graphics.fillCircle(effect.centerX, effect.centerY, effect.radius);
    
    effect.graphics.lineStyle(3, color, 0.8);
    effect.graphics.strokeCircle(effect.centerX, effect.centerY, effect.radius);

    if (aoeType.effectType === 'instant') {
      this.scene.tweens.add({
        targets: effect.graphics,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          effect.graphics?.destroy();
        }
      });
    }
  }

  private getAOEColor(damageType: string): number {
    switch (damageType) {
      case 'fire': return 0xff4444;
      case 'ice': return 0x4444ff;
      case 'lightning': return 0xffff44;
      case 'magical': return 0xff44ff;
      case 'physical': return 0x888888;
      default: return 0xffffff;
    }
  }

  private processAOEDamage(effect: AOEEffect): AOEResult {
    const targets = this.getTargetsInArea(effect.centerX, effect.centerY, effect.radius);
    const targetsHit: AOEResult['targetsHit'] = [];

    targets.forEach(target => {
      if (target.id === effect.sourceId) return;

      const distance = Phaser.Math.Distance.Between(
        effect.centerX, effect.centerY,
        target.x, target.y
      );

      if (distance <= effect.radius) {
        const damageMultiplier = Math.max(0.5, 1 - (distance / effect.radius) * 0.5);
        const baseDamage = Math.floor(effect.damage * damageMultiplier);
        const finalDamage = Math.max(1, baseDamage - (target.defense || 0));

        const isCritical = Math.random() < 0.1; // 10% critical chance

        const actualDamage = isCritical ? finalDamage * 2 : finalDamage;
        
        targetsHit.push({
          targetId: target.id,
          damage: actualDamage,
          isCritical,
          distance
        });

        // Apply real damage to the enemy
        if (target.enemy && this.combatManager) {
          this.combatManager.applyDamageToEnemy(target.id, actualDamage);
        }

        this.createDamageNumber(target.x, target.y, actualDamage, isCritical);
      }
    });

    return {
      effectId: effect.id,
      targetsHit,
      centerX: effect.centerX,
      centerY: effect.centerY,
      radius: effect.radius
    };
  }

  private getTargetsInArea(centerX: number, centerY: number, radius: number): AOETarget[] {
    const targets: AOETarget[] = [];

    // Get real enemies from combat manager
    if (this.combatManager) {
      const enemies = this.combatManager.getAllEnemies();
      enemies.forEach((enemy: any) => {
        const distance = Phaser.Math.Distance.Between(centerX, centerY, enemy.x, enemy.y);
        if (distance <= radius) {
          targets.push({
            id: enemy.name || 'enemy',
            x: enemy.x,
            y: enemy.y,
            health: enemy.health,
            defense: enemy.defense || 0,
            enemy: enemy // Store reference to actual enemy
          });
        }
      });
    }

    return targets;
  }

  private createDamageNumber(x: number, y: number, damage: number, isCritical: boolean): void {
    const color = isCritical ? '#ff0000' : '#ffffff';
    const fontSize = isCritical ? '24px' : '18px';
    
    const text = this.scene.add.text(x, y, damage.toString(), {
      fontSize,
      color,
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    });

    text.setOrigin(0.5, 0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
      }
    });
  }

  update(deltaTime: number): void {
    const effectsToRemove: string[] = [];

    this.activeEffects.forEach((effect, effectId) => {
      if (!effect.isActive) return;

      if (effect.duration > 0) {
        effect.remainingTime -= deltaTime;

        if (effect.remainingTime <= 0) {
          this.deactivateEffect(effectId);
          effectsToRemove.push(effectId);
        } else {
          const aoeType = this.aoeTypes.get(effect.typeId);
          if (aoeType && aoeType.effectType === 'overtime') {
            if ((effect.duration - effect.remainingTime) % 1000 < deltaTime) {
              this.processAOEDamage(effect);
            }
          }
        }
      }
    });

    effectsToRemove.forEach(effectId => {
      this.activeEffects.delete(effectId);
    });
  }

  private deactivateEffect(effectId: string): void {
    const effect = this.activeEffects.get(effectId);
    if (!effect) return;

    effect.isActive = false;
    
    if (effect.sprite) {
      effect.sprite.destroy();
    }
    
    if (effect.graphics) {
      effect.graphics.destroy();
    }
  }

  getActiveEffects(): AOEEffect[] {
    return Array.from(this.activeEffects.values()).filter(effect => effect.isActive);
  }

  getAOETypes(): AOEType[] {
    return Array.from(this.aoeTypes.values());
  }

  isPointInAOE(x: number, y: number): boolean {
    return Array.from(this.activeEffects.values()).some(effect => {
      if (!effect.isActive) return false;
      const distance = Phaser.Math.Distance.Between(effect.centerX, effect.centerY, x, y);
      return distance <= effect.radius;
    });
  }

  clearAllEffects(): void {
    this.activeEffects.forEach(effect => {
      this.deactivateEffect(effect.id);
    });
    this.activeEffects.clear();
  }

  destroy(): void {
    this.clearAllEffects();
    this.aoeTypes.clear();
  }
}