import { BehaviorTree, IBlackboard, NodeStatus } from './BehaviorTree';
import { createBehaviorTree } from './BehaviorTreeBuilder';
import { Enemy } from '../enemies/Enemy';
import { CarrionBats } from '../enemies/CarrionBats';

export interface AttackPatternContext {
  enemy: Enemy;
  target: Phaser.GameObjects.Sprite;
  scene: Phaser.Scene;
  deltaTime: number;
}

export interface AttackPattern {
  name: string;
  behaviorTree: BehaviorTree;
  execute(context: AttackPatternContext): NodeStatus;
  canExecute(context: AttackPatternContext): boolean;
  priority: number;
  cooldown: number;
  lastUsed: number;
}

/**
 * Wraith Attack Patterns - Ethereal, evasive, life-draining
 */
export class WraithAttackPatterns {
  static createPhaseStrikePattern(): AttackPattern {
    const tree = createBehaviorTree()
      .sequence()
        .condition('hasTarget', (blackboard: IBlackboard) => !!blackboard.target)
        .condition('hasMana', (blackboard: IBlackboard) => blackboard.enemy.getStats().currentMana >= 25)
        .condition('inRange', (blackboard: IBlackboard) => {
          const distance = Phaser.Math.Distance.Between(
            blackboard.enemy.getSprite().x, blackboard.enemy.getSprite().y,
            blackboard.target.x, blackboard.target.y
          );
          return distance <= 200;
        })
        .action('teleportBehindTarget', (blackboard: IBlackboard) => {
          const enemy = blackboard.enemy as Enemy;
          const target = blackboard.target as Phaser.GameObjects.Sprite;
          
          // Calculate position behind target
          const targetAngle = Phaser.Math.Angle.Between(target.x, target.y, enemy.getSprite().x, enemy.getSprite().y);
          const behindX = target.x + Math.cos(targetAngle) * 50;
          const behindY = target.y + Math.sin(targetAngle) * 50;
          
          // Phase effect and teleport
          enemy.getSprite().setPosition(behindX, behindY);
          enemy.getStats().currentMana -= 15;
          
          blackboard.phaseStrikeReady = true;
          return NodeStatus.SUCCESS;
        })
        .wait(300) // Brief delay for positioning
        .action('executeLifeDrainStrike', (blackboard: IBlackboard) => {
          const enemy = blackboard.enemy as Enemy;
          const target = blackboard.target as Phaser.GameObjects.Sprite;
          
          const damage = enemy.getStats().magicDamage * 2; // Double damage
          const healAmount = Math.floor(damage * 0.6); // 60% heal
          
          enemy.heal(healAmount);
          enemy.getStats().currentMana -= 10;
          
          // Emit attack event (access protected method via type assertion)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (enemy as any).emitEvent('attacked', {
            attackType: 'phaseStrike',
            target,
            damage,
            heal: healAmount
          });
          
          return NodeStatus.SUCCESS;
        })
      .end()
      .build();

    return {
      name: 'PhaseStrike',
      behaviorTree: tree,
      execute: (context: AttackPatternContext) => {
        tree.setBlackboardValue('enemy', context.enemy);
        tree.setBlackboardValue('target', context.target);
        tree.setBlackboardValue('scene', context.scene);
        return tree.tick();
      },
      canExecute: (context: AttackPatternContext) => {
        const distance = Phaser.Math.Distance.Between(
          context.enemy.getSprite().x, context.enemy.getSprite().y,
          context.target.x, context.target.y
        );
        return distance <= 200 && context.enemy.getStats().currentMana >= 25;
      },
      priority: 8,
      cooldown: 6000,
      lastUsed: 0
    };
  }

  static createSpiritBarragePattern(): AttackPattern {
    const tree = createBehaviorTree()
      .sequence()
        .condition('hasTarget', (blackboard: IBlackboard) => !!blackboard.target)
        .condition('hasMana', (blackboard: IBlackboard) => blackboard.enemy.getStats().currentMana >= 40)
        .action('channelSpiritEnergy', (blackboard: IBlackboard) => {
          blackboard.barrageCount = 0;
          blackboard.maxBarrages = 5;
          return NodeStatus.SUCCESS;
        })
        .repeater(5)
          .sequence()
            .action('createSpiritProjectile', (blackboard: IBlackboard) => {
              const enemy = blackboard.enemy as Enemy;
              const target = blackboard.target as Phaser.GameObjects.Sprite;
              const scene = blackboard.scene as Phaser.Scene;
              
              // Create spirit projectile with homing capability
              const projectile = scene.add.circle(
                enemy.getSprite().x, enemy.getSprite().y,
                8, 0x9999ff, 0.8
              );
              
              // Homing projectile movement
              scene.tweens.add({
                targets: projectile,
                x: target.x + (Math.random() - 0.5) * 40,
                y: target.y + (Math.random() - 0.5) * 40,
                duration: 800,
                ease: 'Power2.easeIn',
                onComplete: () => {
                  // Impact effect
                  const impact = scene.add.circle(projectile.x, projectile.y, 15, 0x9999ff, 0.6);
                  scene.tweens.add({
                    targets: impact,
                    radius: 25,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => impact.destroy()
                  });
                  
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (enemy as any).emitEvent('attacked', {
                    attackType: 'spiritProjectile',
                    target,
                    damage: enemy.getStats().magicDamage * 0.7,
                    position: { x: projectile.x, y: projectile.y }
                  });
                  
                  projectile.destroy();
                }
              });
              
              blackboard.barrageCount++;
              return NodeStatus.SUCCESS;
            })
            .wait(200) // 200ms between projectiles
          .end()
        .end()
        .action('consumeMana', (blackboard: IBlackboard) => {
          const enemy = blackboard.enemy as Enemy;
          enemy.getStats().currentMana -= 40;
          return NodeStatus.SUCCESS;
        })
      .end()
      .build();

    return {
      name: 'SpiritBarrage',
      behaviorTree: tree,
      execute: (context: AttackPatternContext) => {
        tree.setBlackboardValue('enemy', context.enemy);
        tree.setBlackboardValue('target', context.target);
        tree.setBlackboardValue('scene', context.scene);
        return tree.tick();
      },
      canExecute: (context: AttackPatternContext) => {
        return context.enemy.getStats().currentMana >= 40;
      },
      priority: 6,
      cooldown: 10000,
      lastUsed: 0
    };
  }
}

/**
 * Iron Golem Attack Patterns - Heavy, defensive, area control
 */
export class IronGolemAttackPatterns {
  static createEarthquakePattern(): AttackPattern {
    const tree = createBehaviorTree()
      .sequence()
        .condition('hasTarget', (blackboard: IBlackboard) => !!blackboard.target)
        .action('chargeEarthquake', (blackboard: IBlackboard) => {
          const enemy = blackboard.enemy as Enemy;
          const scene = blackboard.scene as Phaser.Scene;
          
          // Start charging animation
          const chargeEffect = scene.add.circle(
            enemy.getSprite().x, enemy.getSprite().y,
            10, 0xaa4400, 0.3
          );
          
          scene.tweens.add({
            targets: chargeEffect,
            radius: 60,
            alpha: 0.8,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => chargeEffect.destroy()
          });
          
          // Screen shake warning
          scene.cameras.main.shake(2000, 0.02);
          
          blackboard.chargeEffect = chargeEffect;
          blackboard.chargeStartTime = Date.now();
          return NodeStatus.RUNNING;
        })
        .wait(2000) // 2 second charge time
        .action('executeEarthquake', (blackboard: IBlackboard) => {
          const enemy = blackboard.enemy as Enemy;
          const target = blackboard.target as Phaser.GameObjects.Sprite;
          const scene = blackboard.scene as Phaser.Scene;
          
          // Create multiple shockwaves
          for (let i = 0; i < 3; i++) {
            scene.time.delayedCall(i * 200, () => {
              const shockwave = scene.add.circle(
                enemy.getSprite().x, enemy.getSprite().y,
                20 + (i * 30), 0xaa4400, 0
              );
              
              shockwave.setStrokeStyle(8, 0xaa4400, 0.9);
              
              scene.tweens.add({
                targets: shockwave,
                radius: 150 + (i * 50),
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => shockwave.destroy()
              });
            });
          }
          
          // Major screen shake
          scene.cameras.main.shake(500, 0.08);
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (enemy as any).emitEvent('attacked', {
            attackType: 'earthquake',
            target,
            damage: enemy.getStats().physicalDamage * 2.5,
            radius: 200,
            waves: 3
          });
          
          return NodeStatus.SUCCESS;
        })
      .end()
      .build();

    return {
      name: 'Earthquake',
      behaviorTree: tree,
      execute: (context: AttackPatternContext) => {
        tree.setBlackboardValue('enemy', context.enemy);
        tree.setBlackboardValue('target', context.target);
        tree.setBlackboardValue('scene', context.scene);
        return tree.tick();
      },
      canExecute: (context: AttackPatternContext) => {
        const distance = Phaser.Math.Distance.Between(
          context.enemy.getSprite().x, context.enemy.getSprite().y,
          context.target.x, context.target.y
        );
        return distance <= 300;
      },
      priority: 9,
      cooldown: 15000,
      lastUsed: 0
    };
  }

  static createMeteorStrikePattern(): AttackPattern {
    const tree = createBehaviorTree()
      .sequence()
        .condition('hasTarget', (blackboard: IBlackboard) => !!blackboard.target)
        .action('summonMeteors', (blackboard: IBlackboard) => {
          const enemy = blackboard.enemy as Enemy;
          const target = blackboard.target as Phaser.GameObjects.Sprite;
          const scene = blackboard.scene as Phaser.Scene;
          
          const meteorCount = 4;
          blackboard.meteorsCreated = 0;
          
          for (let i = 0; i < meteorCount; i++) {
            scene.time.delayedCall(i * 800, () => {
              // Predict target movement
              const targetX = target.x + (Math.random() - 0.5) * 100;
              const targetY = target.y + (Math.random() - 0.5) * 100;
              
              // Warning indicator
              const warning = scene.add.circle(targetX, targetY, 30, 0xff4444, 0.3);
              warning.setStrokeStyle(3, 0xff4444, 0.8);
              
              scene.tweens.add({
                targets: warning,
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 0.6,
                duration: 1500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                  // Create meteor impact
                  const meteor = scene.add.circle(targetX, targetY - 300, 15, 0xff6600, 1);
                  
                  scene.tweens.add({
                    targets: meteor,
                    y: targetY,
                    duration: 500,
                    ease: 'Power3.easeIn',
                    onComplete: () => {
                      // Impact explosion
                      const explosion = scene.add.circle(targetX, targetY, 20, 0xff6600, 0.8);
                      scene.tweens.add({
                        targets: explosion,
                        radius: 50,
                        alpha: 0,
                        duration: 400,
                        onComplete: () => explosion.destroy()
                      });
                      
                      // Debris
                      for (let j = 0; j < 8; j++) {
                        const debris = scene.add.circle(
                          targetX, targetY,
                          3, 0x654321, 0.8
                        );
                        const angle = (j / 8) * Math.PI * 2;
                        scene.tweens.add({
                          targets: debris,
                          x: targetX + Math.cos(angle) * 40,
                          y: targetY + Math.sin(angle) * 40,
                          alpha: 0,
                          duration: 600,
                          onComplete: () => debris.destroy()
                        });
                      }
                      
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (enemy as any).emitEvent('attacked', {
                        attackType: 'meteorStrike',
                        target,
                        damage: enemy.getStats().physicalDamage * 1.8,
                        position: { x: targetX, y: targetY },
                        radius: 50
                      });
                      
                      meteor.destroy();
                    }
                  });
                  
                  warning.destroy();
                }
              });
            });
          }
          
          return NodeStatus.SUCCESS;
        })
      .end()
      .build();

    return {
      name: 'MeteorStrike',
      behaviorTree: tree,
      execute: (context: AttackPatternContext) => {
        tree.setBlackboardValue('enemy', context.enemy);
        tree.setBlackboardValue('target', context.target);
        tree.setBlackboardValue('scene', context.scene);
        return tree.tick();
      },
      canExecute: (context: AttackPatternContext) => {
        const healthPercent = context.enemy.getStats().currentHealth / context.enemy.getStats().maxHealth;
        return healthPercent <= 0.5; // Only when health is low
      },
      priority: 10,
      cooldown: 20000,
      lastUsed: 0
    };
  }
}

/**
 * Carrion Bats Attack Patterns - Swarm tactics, aerial superiority, poison
 */
export class CarrionBatsAttackPatterns {
  static createVenomStormPattern(): AttackPattern {
    const tree = createBehaviorTree()
      .sequence()
        .condition('hasTarget', (blackboard: IBlackboard) => !!blackboard.target)
        .condition('hasMana', (blackboard: IBlackboard) => blackboard.enemy.getStats().currentMana >= 30)
        .action('createVenomStorm', (blackboard: IBlackboard) => {
          const enemy = blackboard.enemy as Enemy;
          const target = blackboard.target as Phaser.GameObjects.Sprite;
          const scene = blackboard.scene as Phaser.Scene;
          
          // Create multiple poison clouds in a pattern
          const cloudPositions = [
            { x: target.x, y: target.y },
            { x: target.x + 60, y: target.y },
            { x: target.x - 60, y: target.y },
            { x: target.x, y: target.y + 60 },
            { x: target.x, y: target.y - 60 }
          ];
          
          cloudPositions.forEach((pos, index) => {
            scene.time.delayedCall(index * 300, () => {
              // Poison cloud with swirling effect
              const cloud = scene.add.circle(pos.x, pos.y, 5, 0x90EE90, 0.4);
              
              // Swirling particles
              for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2;
                const particle = scene.add.circle(
                  pos.x + Math.cos(angle) * 20,
                  pos.y + Math.sin(angle) * 20,
                  2, 0x90EE90, 0.6
                );
                
                scene.tweens.add({
                  targets: particle,
                  x: pos.x + Math.cos(angle + Math.PI) * 40,
                  y: pos.y + Math.sin(angle + Math.PI) * 40,
                  alpha: 0,
                  duration: 3000,
                  ease: 'Power1',
                  onComplete: () => particle.destroy()
                });
              }
              
              scene.tweens.add({
                targets: cloud,
                radius: 35,
                alpha: 0.6,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                  scene.time.delayedCall(2500, () => {
                    scene.tweens.add({
                      targets: cloud,
                      alpha: 0,
                      radius: 15,
                      duration: 1000,
                      onComplete: () => cloud.destroy()
                    });
                  });
                }
              });
              
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (enemy as any).emitEvent('attacked', {
                attackType: 'venomStorm',
                target,
                damage: enemy.getStats().magicDamage * 0.4,
                position: pos,
                duration: 4000,
                tickRate: 500
              });
            });
          });
          
          enemy.getStats().currentMana -= 30;
          return NodeStatus.SUCCESS;
        })
      .end()
      .build();

    return {
      name: 'VenomStorm',
      behaviorTree: tree,
      execute: (context: AttackPatternContext) => {
        tree.setBlackboardValue('enemy', context.enemy);
        tree.setBlackboardValue('target', context.target);
        tree.setBlackboardValue('scene', context.scene);
        return tree.tick();
      },
      canExecute: (context: AttackPatternContext) => {
        return context.enemy.getStats().currentMana >= 30;
      },
      priority: 7,
      cooldown: 12000,
      lastUsed: 0
    };
  }

  static createSwarmBlitzPattern(): AttackPattern {
    const tree = createBehaviorTree()
      .sequence()
        .condition('hasTarget', (blackboard: IBlackboard) => !!blackboard.target)
        .condition('isSwarmLeader', (blackboard: IBlackboard) => {
          const enemy = blackboard.enemy as CarrionBats;
          return enemy.getIsSwarmLeader && enemy.getIsSwarmLeader();
        })
        .action('coordinateSwarmAttack', (blackboard: IBlackboard) => {
          const enemy = blackboard.enemy as Enemy;
          const target = blackboard.target as Phaser.GameObjects.Sprite;
          const scene = blackboard.scene as Phaser.Scene;
          
          // Create coordinated attack pattern
          const attackWaves = 3;
          const attacksPerWave = 4;
          
          for (let wave = 0; wave < attackWaves; wave++) {
            scene.time.delayedCall(wave * 1000, () => {
              for (let attack = 0; attack < attacksPerWave; attack++) {
                scene.time.delayedCall(attack * 150, () => {
                  // Create bat silhouette for attack
                  const angle = (attack / attacksPerWave) * Math.PI * 2 + (wave * 0.5);
                  const startRadius = 150;
                  const startX = target.x + Math.cos(angle) * startRadius;
                  const startY = target.y + Math.sin(angle) * startRadius;
                  
                  const attackBat = scene.add.sprite(startX, startY, 'carrionBat');
                  attackBat.setTint(0x654321);
                  attackBat.setAlpha(0.8);
                  attackBat.setScale(0.6);
                  
                  // Dive attack
                  scene.tweens.add({
                    targets: attackBat,
                    x: target.x + (Math.random() - 0.5) * 30,
                    y: target.y + (Math.random() - 0.5) * 30,
                    duration: 400,
                    ease: 'Power2.easeIn',
                    onComplete: () => {
                      // Impact effect
                      const impact = scene.add.circle(attackBat.x, attackBat.y, 8, 0x654321, 0.7);
                      scene.tweens.add({
                        targets: impact,
                        radius: 20,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => impact.destroy()
                      });
                      
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (enemy as any).emitEvent('attacked', {
                        attackType: 'swarmBlitz',
                        target,
                        damage: enemy.getStats().physicalDamage * 0.6,
                        wave: wave + 1,
                        attackIndex: attack + 1
                      });
                      
                      attackBat.destroy();
                    }
                  });
                });
              }
            });
          }
          
          return NodeStatus.SUCCESS;
        })
      .end()
      .build();

    return {
      name: 'SwarmBlitz',
      behaviorTree: tree,
      execute: (context: AttackPatternContext) => {
        tree.setBlackboardValue('enemy', context.enemy);
        tree.setBlackboardValue('target', context.target);
        tree.setBlackboardValue('scene', context.scene);
        return tree.tick();
      },
      canExecute: (context: AttackPatternContext) => {
        // Only for swarm leaders with low health
        const healthPercent = context.enemy.getStats().currentHealth / context.enemy.getStats().maxHealth;
        const carrionBat = context.enemy as CarrionBats;
        const isLeader = carrionBat.getIsSwarmLeader && carrionBat.getIsSwarmLeader();
        return isLeader && healthPercent <= 0.4;
      },
      priority: 9,
      cooldown: 18000,
      lastUsed: 0
    };
  }
}

/**
 * Attack Pattern Manager - Handles pattern selection and execution
 */
export class AttackPatternManager {
  private patterns: Map<string, AttackPattern[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Register Wraith patterns
    this.patterns.set('Wraith', [
      WraithAttackPatterns.createPhaseStrikePattern(),
      WraithAttackPatterns.createSpiritBarragePattern()
    ]);

    // Register Iron Golem patterns
    this.patterns.set('Iron Golem', [
      IronGolemAttackPatterns.createEarthquakePattern(),
      IronGolemAttackPatterns.createMeteorStrikePattern()
    ]);

    // Register Carrion Bats patterns
    this.patterns.set('Carrion Bat', [
      CarrionBatsAttackPatterns.createVenomStormPattern(),
      CarrionBatsAttackPatterns.createSwarmBlitzPattern()
    ]);
  }

  public getAvailablePatterns(enemyType: string): AttackPattern[] {
    return this.patterns.get(enemyType) || [];
  }

  public selectBestPattern(enemyType: string, context: AttackPatternContext): AttackPattern | null {
    const patterns = this.getAvailablePatterns(enemyType);
    const currentTime = Date.now();
    
    // Filter patterns that can execute and are off cooldown
    const availablePatterns = patterns.filter(pattern => {
      const timeSinceLastUse = currentTime - pattern.lastUsed;
      return pattern.canExecute(context) && timeSinceLastUse >= pattern.cooldown;
    });

    if (availablePatterns.length === 0) {
      return null;
    }

    // Select highest priority pattern
    availablePatterns.sort((a, b) => b.priority - a.priority);
    return availablePatterns[0];
  }

  public executePattern(pattern: AttackPattern, context: AttackPatternContext): NodeStatus {
    pattern.lastUsed = Date.now();
    return pattern.execute(context);
  }
}