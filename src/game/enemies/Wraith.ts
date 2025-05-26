import { Scene } from 'phaser';
import { Enemy, IEnemyStats, IEnemyBehavior } from './Enemy';
import { AttackPatternManager, AttackPatternContext } from '../ai/AttackPatterns';

export class Wraith extends Enemy {
  private phaseDuration: number = 2000; // 2 seconds
  private isPhasing: boolean = false;
  private attackPatternManager: AttackPatternManager;

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 'wraith', 0);
    
    // Initialize attack pattern manager
    this.attackPatternManager = new AttackPatternManager();
    
    // Wraith-specific settings
    this.detectionRadius = 200;
    this.attackRadius = 80;
    this.retreatThreshold = 0.5; // Retreats at 50% health
    this.patrolRadius = 150;
    
    // Set up wraith-specific visuals
    this.setupWraithVisuals();
  }

  protected getEnemyName(): string {
    return 'Wraith';
  }

  protected initializeStats(): IEnemyStats {
    return {
      level: 5,
      maxHealth: 120,
      currentHealth: 120,
      maxMana: 80,
      currentMana: 80,
      physicalDamage: 25,
      magicDamage: 35,
      defense: 8,
      evasion: 25, // High evasion for ethereal nature
      criticalChance: 15,
      criticalDamage: 180,
      experienceReward: 150
    };
  }

  protected initializeBehaviors(): void {
    // Life Drain Attack
    const lifeDrainBehavior: IEnemyBehavior = {
      id: 'lifeDrain',
      name: 'Life Drain',
      cooldown: 4000, // 4 seconds
      lastUsed: 0,
      range: this.attackRadius,
      canExecute: (enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        const distance = Phaser.Math.Distance.Between(
          enemy.getSprite().x, enemy.getSprite().y,
          target.x, target.y
        );
        return distance <= lifeDrainBehavior.range && enemy.getStats().currentMana >= 20;
      },
      execute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        this.performLifeDrain(target);
      }
    };

    // Teleport/Phase behavior
    const phaseBehavior: IEnemyBehavior = {
      id: 'phase',
      name: 'Phase',
      cooldown: 5000, // 5 seconds
      lastUsed: 0,
      range: 300, // Can phase from anywhere
      canExecute: (enemy: Enemy, _target: Phaser.GameObjects.Sprite) => {
        return !this.isPhasing && enemy.getStats().currentMana >= 15;
      },
      execute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        this.performPhase(target);
      }
    };

    // Flee behavior (enhanced retreat)
    const fleeBehavior: IEnemyBehavior = {
      id: 'flee',
      name: 'Flee',
      cooldown: 2000, // 2 seconds
      lastUsed: 0,
      range: 150,
      canExecute: (enemy: Enemy, _target: Phaser.GameObjects.Sprite) => {
        const healthPercent = enemy.getStats().currentHealth / enemy.getStats().maxHealth;
        return healthPercent < 0.3; // Use when health is below 30%
      },
      execute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        this.performFlee(target);
      }
    };

    this.addBehavior(lifeDrainBehavior);
    this.addBehavior(phaseBehavior);
    this.addBehavior(fleeBehavior);
  }

  protected setupWraithVisuals(): void {
    // Set up ethereal appearance
    this.sprite.setAlpha(0.8);
    this.sprite.setTint(0x9999ff); // Pale blue tint
    
    // Add floating animation
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 10,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  protected playDeathAnimation(): void {
    const sprite = this.getSprite();
    
    // Wraith-specific death: ethereal dissolution
    
    // Stop any existing tweens
    this.scene.tweens.killTweensOf(sprite);
    
    // Expanding ethereal ring
    const etherealRing = this.scene.add.circle(sprite.x, sprite.y, 10, 0x9966ff, 0);
    etherealRing.setStrokeStyle(3, 0x9966ff, 0.8);
    
    this.scene.tweens.add({
      targets: etherealRing,
      radius: 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2.easeOut',
      onComplete: () => etherealRing.destroy()
    });
    
    // Spirit essence escaping upward
    for (let i = 0; i < 15; i++) {
      this.scene.time.delayedCall(i * 80, () => {
        const essence = this.scene.add.circle(
          sprite.x + (Math.random() - 0.5) * 30,
          sprite.y + (Math.random() - 0.5) * 30,
          2, 0xccccff, 0.9
        );
        
        this.scene.tweens.add({
          targets: essence,
          y: essence.y - 80 - Math.random() * 40,
          x: essence.x + (Math.random() - 0.5) * 20,
          alpha: 0,
          scale: 0.3,
          duration: 1500,
          ease: 'Power1.easeOut',
          onComplete: () => essence.destroy()
        });
      });
    }
    
    // Wraith sprite phase-out effect
    this.scene.tweens.add({
      targets: sprite,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      rotation: Math.PI * 0.5,
      duration: 1200,
      ease: 'Power2.easeOut',
      onComplete: () => {
        sprite.setVisible(false);
      }
    });
    
    // Ethereal whisper effect (visual representation)
    const whisperEffect = this.scene.add.graphics();
    whisperEffect.lineStyle(2, 0x9966ff, 0.6);
    
    // Create swirling whisper lines
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      this.scene.time.delayedCall(i * 100, () => {
        whisperEffect.clear();
        const startX = sprite.x + Math.cos(angle) * 20;
        const startY = sprite.y + Math.sin(angle) * 20;
        
        whisperEffect.beginPath();
        whisperEffect.arc(startX, startY, 15, angle, angle + Math.PI);
        whisperEffect.strokePath();
        
        this.scene.tweens.add({
          targets: whisperEffect,
          alpha: 0,
          duration: 800,
          onComplete: () => {
            if (i === 4) { // Last whisper
              whisperEffect.destroy();
            }
          }
        });
      });
    }
  }

  private performLifeDrain(target: Phaser.GameObjects.Sprite): void {
    // Consume mana
    this.stats.currentMana = Math.max(0, this.stats.currentMana - 20);
    
    // Calculate drain amount based on magic damage
    const drainAmount = this.stats.magicDamage + Math.floor(Math.random() * 10);
    
    // Heal self for portion of damage dealt
    const healAmount = Math.floor(drainAmount * 0.5);
    this.heal(healAmount);
    
    // Create visual effect
    this.createLifeDrainEffect(target);
    
    // Emit attack event
    this.emitEvent('attacked', {
      attackType: 'lifeDrain',
      target,
      damage: drainAmount,
      heal: healAmount
    });
  }

  private createLifeDrainEffect(target: Phaser.GameObjects.Sprite): void {
    // Create a line effect from target to wraith
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, 0xff0000, 0.8);
    graphics.lineBetween(
      target.x, target.y,
      this.sprite.x, this.sprite.y
    );
    
    // Add pulsing effect
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 800,
      ease: 'Power2',
      onComplete: () => graphics.destroy()
    });
    
    // Create healing particles around wraith
    this.createHealingParticles();
  }

  private createHealingParticles(): void {
    // Create simple particle effect for healing
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.circle(
        this.sprite.x + (Math.random() - 0.5) * 40,
        this.sprite.y + (Math.random() - 0.5) * 40,
        3,
        0x00ff00,
        0.8
      );
      
      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 30,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  private performPhase(target: Phaser.GameObjects.Sprite): void {
    if (this.isPhasing) return;
    
    // Consume mana
    this.stats.currentMana = Math.max(0, this.stats.currentMana - 15);
    
    this.isPhasing = true;
    
    // Make wraith semi-transparent and immune to damage
    this.sprite.setAlpha(0.3);
    
    // Calculate teleport position near target
    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 40; // 60-100 pixels from target
    const teleportX = target.x + Math.cos(angle) * distance;
    const teleportY = target.y + Math.sin(angle) * distance;
    
    // Ensure teleport position is within world bounds
    const clampedX = Phaser.Math.Clamp(teleportX, 50, this.scene.scale.width - 50);
    const clampedY = Phaser.Math.Clamp(teleportY, 50, this.scene.scale.height - 50);
    
    // Create phase-out effect
    this.createPhaseEffect(this.sprite.x, this.sprite.y, false);
    
    // Teleport after brief delay
    this.scene.time.delayedCall(300, () => {
      this.sprite.setPosition(clampedX, clampedY);
      this.createPhaseEffect(clampedX, clampedY, true);
    });
    
    // End phasing after duration
    this.scene.time.delayedCall(this.phaseDuration, () => {
      this.isPhasing = false;
      this.sprite.setAlpha(0.8);
    });
    
    this.emitEvent('attacked', {
      attackType: 'phase',
      target,
      newPosition: { x: clampedX, y: clampedY }
    });
  }

  private createPhaseEffect(x: number, y: number, isPhaseIn: boolean): void {
    // Create swirling particle effect
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 30;
      const particle = this.scene.add.circle(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        4,
        0x9999ff,
        0.8
      );
      
      this.scene.tweens.add({
        targets: particle,
        x: isPhaseIn ? x : x + Math.cos(angle) * radius * 2,
        y: isPhaseIn ? y : y + Math.sin(angle) * radius * 2,
        alpha: isPhaseIn ? 0.8 : 0,
        scale: isPhaseIn ? 1 : 0.1,
        duration: 500,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  private performFlee(target: Phaser.GameObjects.Sprite): void {
    // Enhanced flee behavior with teleportation
    if (this.stats.currentMana >= 10) {
      // Teleport away if we have mana
      const fleeAngle = Phaser.Math.Angle.Between(
        target.x, target.y,
        this.sprite.x, this.sprite.y
      );
      
      const fleeDistance = 150 + Math.random() * 100;
      const fleeX = this.sprite.x + Math.cos(fleeAngle) * fleeDistance;
      const fleeY = this.sprite.y + Math.sin(fleeAngle) * fleeDistance;
      
      const clampedX = Phaser.Math.Clamp(fleeX, 50, this.scene.scale.width - 50);
      const clampedY = Phaser.Math.Clamp(fleeY, 50, this.scene.scale.height - 50);
      
      this.stats.currentMana = Math.max(0, this.stats.currentMana - 10);
      this.createPhaseEffect(this.sprite.x, this.sprite.y, false);
      
      this.scene.time.delayedCall(200, () => {
        this.sprite.setPosition(clampedX, clampedY);
        this.createPhaseEffect(clampedX, clampedY, true);
      });
    } else {
      // Regular flee movement if no mana
      const fleeAngle = Phaser.Math.Angle.Between(
        target.x, target.y,
        this.sprite.x, this.sprite.y
      );
      
      const fleeX = this.sprite.x + Math.cos(fleeAngle) * 80;
      const fleeY = this.sprite.y + Math.sin(fleeAngle) * 80;
      this.moveTowards(fleeX, fleeY, 100);
    }
    
    this.emitEvent('attacked', {
      attackType: 'flee',
      target
    });
  }

  protected handleAttackState(): void {
    if (!this.target) {
      this.setState('idle');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.target.x, this.target.y
    );

    if (distance > this.attackRadius * 1.5) {
      this.setState('chase');
      return;
    }

    // Try advanced attack patterns first
    const context: AttackPatternContext = {
      enemy: this,
      target: this.target,
      scene: this.scene,
      deltaTime: 16 // Approximate delta time
    };

    const selectedPattern = this.attackPatternManager.selectBestPattern('Wraith', context);
    if (selectedPattern) {
      this.attackPatternManager.executePattern(selectedPattern, context);
      return;
    }

    // Prioritize flee behavior if health is low
    const healthPercent = this.stats.currentHealth / this.stats.maxHealth;
    if (healthPercent < 0.3) {
      if (this.executeBehavior('flee', this.target)) {
        return;
      }
    }

    // Try phase behavior for positioning
    if (distance > this.attackRadius * 0.8 && Math.random() < 0.3) {
      if (this.executeBehavior('phase', this.target)) {
        return;
      }
    }

    // Use life drain as primary attack
    this.executeBehavior('lifeDrain', this.target);
  }

  public takeDamage(amount: number, source?: string): void {
    // Reduce damage while phasing
    if (this.isPhasing) {
      amount = Math.floor(amount * 0.3); // 70% damage reduction while phasing
    }
    
    super.takeDamage(amount, source);
    
    // Chance to automatically phase when taking damage
    if (!this.isPhasing && Math.random() < 0.25 && this.target) {
      this.executeBehavior('phase', this.target);
    }
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);
    
    // Regenerate mana slowly
    if (this.stats.currentMana < this.stats.maxMana) {
      this.stats.currentMana = Math.min(
        this.stats.maxMana,
        this.stats.currentMana + 0.5 * (deltaTime / 1000)
      );
    }
  }

  protected detectTarget(): boolean {
    // Enhanced detection for wraith - can sense through walls/obstacles
    // This would need to be implemented with actual player detection logic
    // For now, return false as in base class
    return false;
  }
}