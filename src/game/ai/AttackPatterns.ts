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
          const scene = blackboard.scene as Phaser.Scene;
          
          // Calculate position behind target
          const targetAngle = Phaser.Math.Angle.Between(target.x, target.y, enemy.getSprite().x, enemy.getSprite().y);
          const behindX = target.x + Math.cos(targetAngle) * 50;
          const behindY = target.y + Math.sin(targetAngle) * 50;
          
          // Enhanced phase-out effect at current position
          const phaseOutParticles = [];
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 20;
            const particle = scene.add.circle(
              enemy.getSprite().x + Math.cos(angle) * radius,
              enemy.getSprite().y + Math.sin(angle) * radius,
              3, 0x9966ff, 0.8
            );
            phaseOutParticles.push(particle);
            
            // Spiral inward effect
            scene.tweens.add({
              targets: particle,
              x: enemy.getSprite().x,
              y: enemy.getSprite().y,
              alpha: 0,
              scale: 0.1,
              duration: 300,
              ease: 'Power2.easeIn',
              onComplete: () => particle.destroy()
            });
          }
          
          // Fade enemy sprite during teleport
          scene.tweens.add({
            targets: enemy.getSprite(),
            alpha: 0.3,
            duration: 150,
            yoyo: true,
            ease: 'Power2'
          });
          
          // Phase effect and teleport
          enemy.getSprite().setPosition(behindX, behindY);
          enemy.getStats().currentMana -= 15;
          
          // Enhanced phase-in effect at new position
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 30;
            const particle = scene.add.circle(
              behindX, behindY,
              2, 0x9966ff, 0.9
            );
            
            // Spiral outward effect
            scene.tweens.add({
              targets: particle,
              x: behindX + Math.cos(angle) * radius,
              y: behindY + Math.sin(angle) * radius,
              alpha: 0,
              scale: 1.5,
              duration: 400,
              ease: 'Power2.easeOut',
              onComplete: () => particle.destroy()
            });
          }
          
          // Dark energy burst at teleport destination
          const energyBurst = scene.add.circle(behindX, behindY, 5, 0x330066, 0.6);
          scene.tweens.add({
            targets: energyBurst,
            radius: 25,
            alpha: 0,
            duration: 600,
            ease: 'Power3.easeOut',
            onComplete: () => energyBurst.destroy()
          });
          
          blackboard.phaseStrikeReady = true;
          return NodeStatus.SUCCESS;
        })
        .wait(300) // Brief delay for positioning
        .action('executeLifeDrainStrike', (blackboard: IBlackboard) => {
          const enemy = blackboard.enemy as Enemy;
          const target = blackboard.target as Phaser.GameObjects.Sprite;
          const scene = blackboard.scene as Phaser.Scene;
          
          const damage = enemy.getStats().magicDamage * 2; // Double damage
          const healAmount = Math.floor(damage * 0.6); // 60% heal
          
          // Create life drain beam effect
          const drainBeam = scene.add.graphics();
          const beamWidth = 8;
          const pulseCount = 5;
          
          for (let i = 0; i < pulseCount; i++) {
            scene.time.delayedCall(i * 100, () => {
              drainBeam.clear();
              drainBeam.lineStyle(beamWidth - (i * 1.5), 0x66ff66, 0.8 - (i * 0.1));
              drainBeam.lineBetween(
                target.x, target.y,
                enemy.getSprite().x, enemy.getSprite().y
              );
              
              // Life essence particles flowing from target to enemy
              for (let j = 0; j < 3; j++) {
                const essence = scene.add.circle(
                  target.x + (Math.random() - 0.5) * 20,
                  target.y + (Math.random() - 0.5) * 20,
                  2, 0x66ff66, 0.9
                );
                
                scene.tweens.add({
                  targets: essence,
                  x: enemy.getSprite().x + (Math.random() - 0.5) * 10,
                  y: enemy.getSprite().y + (Math.random() - 0.5) * 10,
                  alpha: 0,
                  duration: 800,
                  ease: 'Power2.easeIn',
                  onComplete: () => essence.destroy()
                });
              }
            });
          }
          
          // Clean up beam after effect
          scene.time.delayedCall(600, () => {
            drainBeam.destroy();
          });
          
          // Healing particles around enemy
          for (let i = 0; i < 8; i++) {
            const healParticle = scene.add.circle(
              enemy.getSprite().x + (Math.random() - 0.5) * 30,
              enemy.getSprite().y + (Math.random() - 0.5) * 30,
              3, 0x44ff44, 0.7
            );
            
            scene.tweens.add({
              targets: healParticle,
              y: healParticle.y - 40,
              alpha: 0,
              scale: 1.5,
              duration: 1200,
              ease: 'Power2.easeOut',
              onComplete: () => healParticle.destroy()
            });
          }
          
          // Dark magic aura around enemy during drain
          const drainAura = scene.add.circle(
            enemy.getSprite().x, enemy.getSprite().y,
            15, 0x9966ff, 0.3
          );
          scene.tweens.add({
            targets: drainAura,
            radius: 35,
            alpha: 0,
            duration: 800,
            ease: 'Sine.easeInOut',
            onComplete: () => drainAura.destroy()
          });
          
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
              
              // Create spirit projectile with enhanced visuals
              const projectile = scene.add.circle(
                enemy.getSprite().x, enemy.getSprite().y,
                8, 0x9999ff, 0.9
              );
              projectile.setStrokeStyle(2, 0xccccff, 0.8);
              
              // Add pulsing glow effect
              scene.tweens.add({
                targets: projectile,
                scaleX: 1.3,
                scaleY: 1.3,
                duration: 300,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
              });
              
              // Create spiral trail particles
              const trailParticles: Phaser.GameObjects.Arc[] = [];
              for (let i = 0; i < 6; i++) {
                const trailParticle = scene.add.circle(
                  enemy.getSprite().x, enemy.getSprite().y,
                  3, 0x6666cc, 0.6
                );
                trailParticles.push(trailParticle);
                
                scene.time.delayedCall(i * 100, () => {
                  scene.tweens.add({
                    targets: trailParticle,
                    x: projectile.x,
                    y: projectile.y,
                    alpha: 0,
                    scale: 0.3,
                    duration: 500,
                    ease: 'Power2.easeOut',
                    onComplete: () => trailParticle.destroy()
                  });
                });
              }
              
              // Enhanced homing projectile movement
              scene.tweens.add({
                targets: projectile,
                x: target.x + (Math.random() - 0.5) * 40,
                y: target.y + (Math.random() - 0.5) * 40,
                duration: 800,
                ease: 'Power2.easeIn',
                onComplete: () => {
                  // Enhanced impact effect with multiple layers
                  const impact = scene.add.circle(projectile.x, projectile.y, 15, 0x9999ff, 0.6);
                  scene.tweens.add({
                    targets: impact,
                    radius: 30,
                    alpha: 0,
                    duration: 400,
                    onComplete: () => impact.destroy()
                  });
                  
                  // Spirit explosion particles
                  for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const spiritSpark = scene.add.circle(
                      projectile.x, projectile.y,
                      2, 0xaaaaff, 0.8
                    );
                    
                    scene.tweens.add({
                      targets: spiritSpark,
                      x: projectile.x + Math.cos(angle) * 25,
                      y: projectile.y + Math.sin(angle) * 25,
                      alpha: 0,
                      duration: 350,
                      ease: 'Power2.easeOut',
                      onComplete: () => spiritSpark.destroy()
                    });
                  }
                  
                  // Screen flash for impact
                  scene.cameras.main.flash(100, 150, 150, 255, false, undefined, 0.3);
                  
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
          
          // Enhanced charging animation with multiple layers
          const chargeEffect = scene.add.circle(
            enemy.getSprite().x, enemy.getSprite().y,
            10, 0xaa4400, 0.3
          );
          
          // Inner core energy
          const energyCore = scene.add.circle(
            enemy.getSprite().x, enemy.getSprite().y,
            5, 0xff6600, 0.6
          );
          
          // Pulsating charge effect
          scene.tweens.add({
            targets: chargeEffect,
            radius: 60,
            alpha: 0.8,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => chargeEffect.destroy()
          });
          
          // Inner energy pulses
          scene.tweens.add({
            targets: energyCore,
            radius: 25,
            alpha: 1.0,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 1,
            onComplete: () => energyCore.destroy()
          });
          
          // Ground cracks appearing during charge
          for (let i = 0; i < 6; i++) {
            scene.time.delayedCall(300 + i * 200, () => {
              const angle = (i / 6) * Math.PI * 2;
              const crackLength = 40 + Math.random() * 20;
              const crack = scene.add.graphics();
              crack.lineStyle(3, 0x654321, 0.8);
              crack.lineBetween(
                enemy.getSprite().x + Math.cos(angle) * 20,
                enemy.getSprite().y + Math.sin(angle) * 20,
                enemy.getSprite().x + Math.cos(angle) * crackLength,
                enemy.getSprite().y + Math.sin(angle) * crackLength
              );
              
              // Fade out cracks over time
              scene.tweens.add({
                targets: crack,
                alpha: 0,
                duration: 3000,
                onComplete: () => crack.destroy()
              });
            });
          }
          
          // Dust particles rising during charge
          for (let i = 0; i < 20; i++) {
            scene.time.delayedCall(500 + i * 100, () => {
              const dustParticle = scene.add.circle(
                enemy.getSprite().x + (Math.random() - 0.5) * 80,
                enemy.getSprite().y + (Math.random() - 0.5) * 80,
                2, 0x8B4513, 0.6
              );
              
              scene.tweens.add({
                targets: dustParticle,
                y: dustParticle.y - 60,
                alpha: 0,
                scale: 1.5,
                duration: 2000,
                ease: 'Power1.easeOut',
                onComplete: () => dustParticle.destroy()
              });
            });
          }
          
          // Progressive screen shake warning
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
          
          // Enhanced multiple shockwaves with varying effects
          for (let i = 0; i < 3; i++) {
            scene.time.delayedCall(i * 200, () => {
              const shockwave = scene.add.circle(
                enemy.getSprite().x, enemy.getSprite().y,
                20 + (i * 30), 0xaa4400, 0
              );
              
              shockwave.setStrokeStyle(8 - (i * 2), 0xaa4400, 0.9 - (i * 0.2));
              
              scene.tweens.add({
                targets: shockwave,
                radius: 150 + (i * 50),
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => shockwave.destroy()
              });
              
              // Ground upheaval effects for each wave
              const upheavalCount = 8 + (i * 4);
              for (let j = 0; j < upheavalCount; j++) {
                scene.time.delayedCall(j * 50, () => {
                  const angle = (j / upheavalCount) * Math.PI * 2;
                  const distance = 60 + (i * 40) + Math.random() * 30;
                  const upheavalX = enemy.getSprite().x + Math.cos(angle) * distance;
                  const upheavalY = enemy.getSprite().y + Math.sin(angle) * distance;
                  
                  // Rock debris effect
                  const debris = scene.add.circle(upheavalX, upheavalY, 4, 0x654321, 0.9);
                  scene.tweens.add({
                    targets: debris,
                    y: upheavalY - 30 - Math.random() * 20,
                    x: upheavalX + (Math.random() - 0.5) * 20,
                    alpha: 0,
                    scale: 0.3,
                    duration: 1000 + Math.random() * 500,
                    ease: 'Power2.easeOut',
                    onComplete: () => debris.destroy()
                  });
                  
                  // Dust burst at upheaval point
                  for (let k = 0; k < 5; k++) {
                    const dustAngle = Math.random() * Math.PI * 2;
                    const dustParticle = scene.add.circle(
                      upheavalX, upheavalY,
                      1, 0x8B4513, 0.7
                    );
                    
                    scene.tweens.add({
                      targets: dustParticle,
                      x: upheavalX + Math.cos(dustAngle) * (20 + Math.random() * 15),
                      y: upheavalY + Math.sin(dustAngle) * (20 + Math.random() * 15) - 15,
                      alpha: 0,
                      duration: 800,
                      ease: 'Power1.easeOut',
                      onComplete: () => dustParticle.destroy()
                    });
                  }
                });
              }
            });
          }
          
          // Massive central eruption
          scene.time.delayedCall(100, () => {
            const centralBurst = scene.add.circle(
              enemy.getSprite().x, enemy.getSprite().y,
              15, 0xff6600, 0.8
            );
            
            scene.tweens.add({
              targets: centralBurst,
              radius: 40,
              alpha: 0,
              duration: 600,
              ease: 'Power3.easeOut',
              onComplete: () => centralBurst.destroy()
            });
            
            // Large boulder fragments
            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2;
              const boulder = scene.add.circle(
                enemy.getSprite().x, enemy.getSprite().y,
                6, 0x555555, 0.9
              );
              
              scene.tweens.add({
                targets: boulder,
                x: enemy.getSprite().x + Math.cos(angle) * (80 + Math.random() * 40),
                y: enemy.getSprite().y + Math.sin(angle) * (80 + Math.random() * 40) - 50,
                rotation: Math.random() * Math.PI * 2,
                alpha: 0,
                duration: 1500,
                ease: 'Power2.easeOut',
                onComplete: () => boulder.destroy()
              });
            }
          });
          
          // Progressive screen shake with multiple impacts
          scene.cameras.main.shake(500, 0.08);
          scene.time.delayedCall(200, () => scene.cameras.main.shake(300, 0.06));
          scene.time.delayedCall(400, () => scene.cameras.main.shake(200, 0.04));
          
          // Screen flash for the impact
          scene.cameras.main.flash(200, 139, 69, 19, false, undefined, 0.4);
          
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
              // Enhanced poison cloud with layered effects
              const cloud = scene.add.circle(pos.x, pos.y, 5, 0x90EE90, 0.4);
              const innerCloud = scene.add.circle(pos.x, pos.y, 3, 0x32CD32, 0.6);
              
              // Enhanced swirling particles with different types
              for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2;
                const radius = 15 + Math.random() * 10;
                
                // Main poison particles
                const particle = scene.add.circle(
                  pos.x + Math.cos(angle) * radius,
                  pos.y + Math.sin(angle) * radius,
                  2, 0x90EE90, 0.7
                );
                
                // Spiral motion with varying speeds
                const spiralSpeed = 1 + Math.random() * 0.5;
                scene.tweens.add({
                  targets: particle,
                  x: pos.x + Math.cos(angle + Math.PI * spiralSpeed) * 45,
                  y: pos.y + Math.sin(angle + Math.PI * spiralSpeed) * 45,
                  alpha: 0,
                  scale: 0.3,
                  duration: 3000 + Math.random() * 1000,
                  ease: 'Power1',
                  onComplete: () => particle.destroy()
                });
                
                // Secondary toxic vapors
                if (i % 3 === 0) {
                  const vapor = scene.add.circle(
                    pos.x + (Math.random() - 0.5) * 20,
                    pos.y + (Math.random() - 0.5) * 20,
                    1, 0x228B22, 0.5
                  );
                  
                  scene.tweens.add({
                    targets: vapor,
                    y: vapor.y - 30 - Math.random() * 20,
                    x: vapor.x + (Math.random() - 0.5) * 30,
                    alpha: 0,
                    scale: 2,
                    duration: 2000,
                    ease: 'Power1.easeOut',
                    onComplete: () => vapor.destroy()
                  });
                }
              }
              
              // Pulsating cloud effects
              scene.tweens.add({
                targets: cloud,
                radius: 35,
                alpha: 0.6,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                  // Continuous pulsing while active
                  scene.tweens.add({
                    targets: cloud,
                    radius: 40,
                    alpha: 0.4,
                    duration: 1000,
                    yoyo: true,
                    repeat: 2,
                    ease: 'Sine.easeInOut'
                  });
                  
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
              
              // Inner cloud effect
              scene.tweens.add({
                targets: innerCloud,
                radius: 20,
                alpha: 0.8,
                duration: 400,
                ease: 'Power2',
                onComplete: () => {
                  scene.tweens.add({
                    targets: innerCloud,
                    radius: 25,
                    alpha: 0.3,
                    duration: 800,
                    yoyo: true,
                    repeat: 3,
                    ease: 'Sine.easeInOut'
                  });
                  
                  scene.time.delayedCall(3000, () => {
                    scene.tweens.add({
                      targets: innerCloud,
                      alpha: 0,
                      duration: 1000,
                      onComplete: () => innerCloud.destroy()
                    });
                  });
                }
              });
              
              // Bubbling poison effect at cloud base
              for (let i = 0; i < 8; i++) {
                scene.time.delayedCall(i * 200, () => {
                  const bubble = scene.add.circle(
                    pos.x + (Math.random() - 0.5) * 30,
                    pos.y + (Math.random() - 0.5) * 30,
                    3, 0x98FB98, 0.6
                  );
                  
                  scene.tweens.add({
                    targets: bubble,
                    y: bubble.y - 20,
                    alpha: 0,
                    scale: 1.5,
                    duration: 1000,
                    ease: 'Power1.easeOut',
                    onComplete: () => bubble.destroy()
                  });
                });
              }
              
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
                  // Enhanced bat silhouette creation
                  const angle = (attack / attacksPerWave) * Math.PI * 2 + (wave * 0.5);
                  const startRadius = 150 + Math.random() * 50;
                  const startX = target.x + Math.cos(angle) * startRadius;
                  const startY = target.y + Math.sin(angle) * startRadius;
                  
                  // Create bat with fallback to circle if sprite not available
                  let attackBat: Phaser.GameObjects.GameObject;
                  try {
                    attackBat = scene.add.sprite(startX, startY, 'carrionBat');
                    (attackBat as Phaser.GameObjects.Sprite).setTint(0x654321);
                    (attackBat as Phaser.GameObjects.Sprite).setAlpha(0.8);
                    (attackBat as Phaser.GameObjects.Sprite).setScale(0.6 + Math.random() * 0.3);
                  } catch {
                    // Fallback to circle bat silhouette
                    attackBat = scene.add.circle(startX, startY, 8, 0x654321, 0.8);
                  }
                  
                  // Wing flutter trail effect
                  const trailParticles: Phaser.GameObjects.Arc[] = [];
                  for (let i = 0; i < 5; i++) {
                    const trailParticle = scene.add.circle(
                      startX + (Math.random() - 0.5) * 20,
                      startY + (Math.random() - 0.5) * 20,
                      2, 0x8B4513, 0.6
                    );
                    trailParticles.push(trailParticle);
                    
                    scene.tweens.add({
                      targets: trailParticle,
                      alpha: 0,
                      scale: 0.3,
                      duration: 800 + Math.random() * 400,
                      ease: 'Power1.easeOut',
                      onComplete: () => trailParticle.destroy()
                    });
                  }
                  
                  // Enhanced dive attack with swooping motion
                  const swoopMidX = (startX + target.x) / 2 + (Math.random() - 0.5) * 60;
                  const swoopMidY = (startY + target.y) / 2 - 40 - Math.random() * 20;
                  
                  // Wing beating effect during dive
                  const wingBeatTween = scene.tweens.add({
                    targets: attackBat,
                    scaleX: 0.8,
                    scaleY: 1.2,
                    duration: 100,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                  });
                  
                  // Swooping dive path
                  scene.tweens.add({
                    targets: attackBat,
                    x: swoopMidX,
                    y: swoopMidY,
                    duration: 200,
                    ease: 'Power1.easeOut',
                    onComplete: () => {
                      scene.tweens.add({
                        targets: attackBat,
                        x: target.x + (Math.random() - 0.5) * 30,
                        y: target.y + (Math.random() - 0.5) * 30,
                        duration: 200,
                        ease: 'Power2.easeIn',
                        onComplete: () => {
                          wingBeatTween.destroy();
                          
                          // Enhanced impact effect with multiple layers
                          const batX = (attackBat as Phaser.GameObjects.GameObject & { x: number }).x;
                          const batY = (attackBat as Phaser.GameObjects.GameObject & { y: number }).y;
                          const impact = scene.add.circle(
                            batX, batY, 
                            8, 0x654321, 0.7
                          );
                          scene.tweens.add({
                            targets: impact,
                            radius: 20,
                            alpha: 0,
                            duration: 300,
                            onComplete: () => impact.destroy()
                          });
                          
                          // Feather particles on impact
                          for (let i = 0; i < 6; i++) {
                            const feather = scene.add.circle(
                              batX + (Math.random() - 0.5) * 15,
                              batY + (Math.random() - 0.5) * 15,
                              1, 0x8B4513, 0.8
                            );
                            
                            scene.tweens.add({
                              targets: feather,
                              x: feather.x + (Math.random() - 0.5) * 40,
                              y: feather.y + (Math.random() - 0.5) * 40,
                              rotation: Math.random() * Math.PI * 2,
                              alpha: 0,
                              duration: 800,
                              ease: 'Power1.easeOut',
                              onComplete: () => feather.destroy()
                            });
                          }
                          
                          // Air distortion effect
                          const airRing = scene.add.circle(
                            batX, batY,
                            5, 0x888888, 0
                          );
                          airRing.setStrokeStyle(2, 0x888888, 0.4);
                          
                          scene.tweens.add({
                            targets: airRing,
                            radius: 25,
                            alpha: 0,
                            duration: 400,
                            ease: 'Power2.easeOut',
                            onComplete: () => airRing.destroy()
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