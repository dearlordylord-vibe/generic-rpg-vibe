import { Scene } from 'phaser';
import { Enemy, IEnemyStats, IEnemyBehavior } from './Enemy';
import { AttackPatternManager, AttackPatternContext } from '../ai/AttackPatterns';

export class IronGolem extends Enemy {
  private isCharging: boolean = false;
  private chargeDuration: number = 1500; // 1.5 seconds charge time
  private tauntRadius: number = 250;
  private slamRadius: number = 120;
  private attackPatternManager: AttackPatternManager;

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 'ironGolem', 0);
    
    // Initialize attack pattern manager
    this.attackPatternManager = new AttackPatternManager();
    
    // Iron Golem-specific settings
    this.detectionRadius = 180;
    this.attackRadius = 60;
    this.retreatThreshold = 0.1; // Very low retreat threshold - golems fight to the death
    this.patrolRadius = 80; // Smaller patrol radius - they don't wander far
    
    // Set up golem-specific visuals
    this.setupGolemVisuals();
  }

  protected getEnemyName(): string {
    return 'Iron Golem';
  }

  protected initializeStats(): IEnemyStats {
    return {
      level: 8,
      maxHealth: 300,
      currentHealth: 300,
      maxMana: 50,
      currentMana: 50,
      physicalDamage: 45,
      magicDamage: 10,
      defense: 35, // Very high defense
      evasion: 2, // Very low evasion - slow and heavy
      criticalChance: 5,
      criticalDamage: 150,
      experienceReward: 250
    };
  }

  protected initializeBehaviors(): void {
    // Taunt behavior - forces enemies to attack the golem
    const tauntBehavior: IEnemyBehavior = {
      id: 'taunt',
      name: 'Taunt',
      cooldown: 8000, // 8 seconds
      lastUsed: 0,
      range: this.tauntRadius,
      canExecute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        const distance = Phaser.Math.Distance.Between(
          this.sprite.x, this.sprite.y,
          target.x, target.y
        );
        return distance <= tauntBehavior.range;
      },
      execute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        this.performTaunt(target);
      }
    };

    // Ground Slam AOE attack
    const groundSlamBehavior: IEnemyBehavior = {
      id: 'groundSlam',
      name: 'Ground Slam',
      cooldown: 6000, // 6 seconds
      lastUsed: 0,
      range: this.attackRadius,
      canExecute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        const distance = Phaser.Math.Distance.Between(
          this.sprite.x, this.sprite.y,
          target.x, target.y
        );
        return distance <= groundSlamBehavior.range && !this.isCharging;
      },
      execute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        this.performGroundSlam(target);
      }
    };

    // Heavy Strike - powerful melee attack
    const heavyStrikeBehavior: IEnemyBehavior = {
      id: 'heavyStrike',
      name: 'Heavy Strike',
      cooldown: 3000, // 3 seconds
      lastUsed: 0,
      range: this.attackRadius * 0.8,
      canExecute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        const distance = Phaser.Math.Distance.Between(
          this.sprite.x, this.sprite.y,
          target.x, target.y
        );
        return distance <= heavyStrikeBehavior.range && !this.isCharging;
      },
      execute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        this.performHeavyStrike(target);
      }
    };

    this.addBehavior(tauntBehavior);
    this.addBehavior(groundSlamBehavior);
    this.addBehavior(heavyStrikeBehavior);
  }

  protected setupGolemVisuals(): void {
    // Set up metallic appearance
    this.sprite.setTint(0x888888); // Metallic gray tint
    this.sprite.setScale(1.2); // Larger than other enemies
    
    // Add subtle glow effect
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.9,
      duration: 3000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  protected playDeathAnimation(): void {
    const sprite = this.getSprite();
    
    // Iron Golem death: mechanical breakdown and explosion
    
    // Stop any existing tweens
    this.scene.tweens.killTweensOf(sprite);
    
    // Screen shake for massive golem collapse
    this.scene.cameras.main.shake(1000, 0.06);
    
    // Sparks and electrical discharge
    for (let i = 0; i < 20; i++) {
      this.scene.time.delayedCall(i * 50, () => {
        const spark = this.scene.add.circle(
          sprite.x + (Math.random() - 0.5) * 50,
          sprite.y + (Math.random() - 0.5) * 50,
          2, 0xffff44, 0.9
        );
        
        this.scene.tweens.add({
          targets: spark,
          x: spark.x + (Math.random() - 0.5) * 60,
          y: spark.y + (Math.random() - 0.5) * 60,
          alpha: 0,
          duration: 400,
          ease: 'Power2.easeOut',
          onComplete: () => spark.destroy()
        });
      });
    }
    
    // Metal fragments scattering
    for (let i = 0; i < 15; i++) {
      this.scene.time.delayedCall(200 + i * 80, () => {
        const fragment = this.scene.add.circle(
          sprite.x + (Math.random() - 0.5) * 30,
          sprite.y + (Math.random() - 0.5) * 30,
          4, 0x666666, 0.8
        );
        
        const angle = Math.random() * Math.PI * 2;
        const force = 80 + Math.random() * 40;
        
        this.scene.tweens.add({
          targets: fragment,
          x: sprite.x + Math.cos(angle) * force,
          y: sprite.y + Math.sin(angle) * force,
          rotation: Math.random() * Math.PI * 4,
          alpha: 0,
          duration: 1200,
          ease: 'Power2.easeOut',
          onComplete: () => fragment.destroy()
        });
      });
    }
    
    // Steam/smoke eruption
    for (let i = 0; i < 12; i++) {
      this.scene.time.delayedCall(300 + i * 100, () => {
        const steam = this.scene.add.circle(
          sprite.x + (Math.random() - 0.5) * 40,
          sprite.y + (Math.random() - 0.5) * 40,
          3, 0xcccccc, 0.6
        );
        
        this.scene.tweens.add({
          targets: steam,
          y: steam.y - 60 - Math.random() * 30,
          x: steam.x + (Math.random() - 0.5) * 40,
          alpha: 0,
          scale: 2.5,
          duration: 2000,
          ease: 'Power1.easeOut',
          onComplete: () => steam.destroy()
        });
      });
    }
    
    // Golem collapse animation
    this.scene.tweens.add({
      targets: sprite,
      scaleY: 0.3, // Collapse vertically
      scaleX: 1.4, // Spread horizontally
      alpha: 0.7,
      rotation: Math.PI * 0.1,
      duration: 800,
      ease: 'Power3.easeIn',
      onComplete: () => {
        // Final explosion effect
        const explosion = this.scene.add.circle(sprite.x, sprite.y, 20, 0xff6600, 0.8);
        this.scene.tweens.add({
          targets: explosion,
          radius: 60,
          alpha: 0,
          duration: 500,
          ease: 'Power3.easeOut',
          onComplete: () => explosion.destroy()
        });
        
        // Final fade
        this.scene.tweens.add({
          targets: sprite,
          alpha: 0,
          duration: 400,
          onComplete: () => sprite.setVisible(false)
        });
      }
    });
    
    // Ground impact crater effect
    this.scene.time.delayedCall(800, () => {
      const crater = this.scene.add.circle(sprite.x, sprite.y, 5, 0x654321, 0);
      crater.setStrokeStyle(4, 0x654321, 0.7);
      
      this.scene.tweens.add({
        targets: crater,
        radius: 45,
        alpha: 0,
        duration: 1000,
        ease: 'Power2.easeOut',
        onComplete: () => crater.destroy()
      });
    });
  }

  private performTaunt(target: Phaser.GameObjects.Sprite): void {
    // Create taunt visual effect
    this.createTauntEffect();
    
    // The taunt effect would need to be handled by the game's combat system
    // to actually force targeting of the golem
    this.emitEvent('attacked', {
      attackType: 'taunt',
      target,
      radius: this.tauntRadius,
      effect: 'forcedTargeting'
    });
  }

  private createTauntEffect(): void {
    // Create expanding ring effect
    const ring = this.scene.add.circle(
      this.sprite.x, this.sprite.y,
      10,
      0xff4444,
      0
    );
    
    ring.setStrokeStyle(4, 0xff4444, 0.8);
    
    this.scene.tweens.add({
      targets: ring,
      radius: this.tauntRadius,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => ring.destroy()
    });

    // Create exclamation effect above golem
    const exclamation = this.scene.add.text(
      this.sprite.x, this.sprite.y - 40,
      '!',
      {
        fontSize: '24px',
        color: '#ff4444',
        fontStyle: 'bold'
      }
    );
    exclamation.setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: exclamation,
      y: exclamation.y - 20,
      alpha: 0,
      scale: 1.5,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => exclamation.destroy()
    });
  }

  private performGroundSlam(target: Phaser.GameObjects.Sprite): void {
    if (this.isCharging) return;
    
    this.isCharging = true;
    
    // Start charge animation
    this.createChargeEffect();
    
    // Slow movement during charge
    if (this.sprite.body) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
    }
    
    // Execute slam after charge time
    this.scene.time.delayedCall(this.chargeDuration, () => {
      this.executeGroundSlam(target);
      this.isCharging = false;
    });
    
    this.emitEvent('attacked', {
      attackType: 'groundSlamCharging',
      target,
      chargeDuration: this.chargeDuration
    });
  }

  private createChargeEffect(): void {
    // Create building energy effect
    const chargeEffect = this.scene.add.circle(
      this.sprite.x, this.sprite.y,
      5,
      0xffaa00,
      0.5
    );
    
    this.scene.tweens.add({
      targets: chargeEffect,
      radius: 25,
      alpha: 0.8,
      duration: this.chargeDuration,
      ease: 'Power2',
      onComplete: () => chargeEffect.destroy()
    });
    
    // Screen shake warning
    this.scene.cameras.main.shake(this.chargeDuration, 0.02);
  }

  private executeGroundSlam(target: Phaser.GameObjects.Sprite): void {
    // Calculate damage
    const slamDamage = this.stats.physicalDamage * 1.8; // 80% damage bonus
    
    // Create slam visual effect
    this.createSlamEffect();
    
    // Screen shake on impact
    this.scene.cameras.main.shake(300, 0.05);
    
    this.emitEvent('attacked', {
      attackType: 'groundSlam',
      target,
      damage: slamDamage,
      radius: this.slamRadius,
      position: { x: this.sprite.x, y: this.sprite.y }
    });
  }

  private createSlamEffect(): void {
    // Create shockwave effect
    const shockwave = this.scene.add.circle(
      this.sprite.x, this.sprite.y,
      10,
      0xaa4400,
      0
    );
    
    shockwave.setStrokeStyle(6, 0xaa4400, 0.9);
    
    this.scene.tweens.add({
      targets: shockwave,
      radius: this.slamRadius,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => shockwave.destroy()
    });

    // Create debris particles
    this.createDebrisParticles();
    
    // Create crack lines radiating from center
    this.createCrackEffect();
  }

  private createDebrisParticles(): void {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const distance = 20 + Math.random() * 40;
      const particle = this.scene.add.rectangle(
        this.sprite.x + Math.cos(angle) * distance,
        this.sprite.y + Math.sin(angle) * distance,
        4 + Math.random() * 4,
        4 + Math.random() * 4,
        0x654321
      );
      
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * (50 + Math.random() * 30),
        y: particle.y + Math.sin(angle) * (50 + Math.random() * 30) + Math.random() * 20,
        alpha: 0,
        rotation: Math.random() * Math.PI * 2,
        duration: 800 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  private createCrackEffect(): void {
    // Create radiating crack lines
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const length = 40 + Math.random() * 30;
      
      const line = this.scene.add.graphics();
      line.lineStyle(2, 0x333333, 0.8);
      line.lineBetween(
        this.sprite.x,
        this.sprite.y,
        this.sprite.x + Math.cos(angle) * length,
        this.sprite.y + Math.sin(angle) * length
      );
      
      line.setAlpha(0);
      
      this.scene.tweens.add({
        targets: line,
        alpha: 0.8,
        duration: 200,
        yoyo: true,
        repeat: 1,
        onComplete: () => line.destroy()
      });
    }
  }

  private performHeavyStrike(target: Phaser.GameObjects.Sprite): void {
    // Calculate damage with chance for critical hit
    let damage = this.stats.physicalDamage * 1.3; // 30% damage bonus
    const isCritical = Math.random() * 100 < this.stats.criticalChance;
    
    if (isCritical) {
      damage = damage * (this.stats.criticalDamage / 100);
    }
    
    // Create strike visual effect
    this.createStrikeEffect(target, isCritical);
    
    this.emitEvent('attacked', {
      attackType: 'heavyStrike',
      target,
      damage,
      isCritical
    });
  }

  private createStrikeEffect(target: Phaser.GameObjects.Sprite, isCritical: boolean): void {
    // Create impact flash
    const impact = this.scene.add.circle(
      target.x, target.y,
      15,
      isCritical ? 0xffff00 : 0xff6600,
      0.8
    );
    
    this.scene.tweens.add({
      targets: impact,
      radius: 30,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => impact.destroy()
    });
    
    // Create strike line from golem to target
    const line = this.scene.add.graphics();
    line.lineStyle(4, isCritical ? 0xffff00 : 0xff6600, 0.9);
    line.lineBetween(
      this.sprite.x, this.sprite.y,
      target.x, target.y
    );
    
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 200,
      onComplete: () => line.destroy()
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

    // Don't execute other behaviors while charging
    if (this.isCharging) {
      return;
    }

    // Try advanced attack patterns first
    const context: AttackPatternContext = {
      enemy: this,
      target: this.target,
      scene: this.scene,
      deltaTime: 16 // Approximate delta time
    };

    const selectedPattern = this.attackPatternManager.selectBestPattern('Iron Golem', context);
    if (selectedPattern) {
      this.attackPatternManager.executePattern(selectedPattern, context);
      return;
    }

    // Prioritize taunt if multiple targets are nearby (would need game logic to detect this)
    if (Math.random() < 0.3) { // 30% chance to taunt
      if (this.executeBehavior('taunt', this.target)) {
        return;
      }
    }

    // Use ground slam for medium distance
    if (distance > this.attackRadius * 0.6 && Math.random() < 0.4) {
      if (this.executeBehavior('groundSlam', this.target)) {
        return;
      }
    }

    // Use heavy strike for close combat
    this.executeBehavior('heavyStrike', this.target);
  }

  protected handleChaseState(): void {
    if (!this.target || this.isDead()) {
      this.setState('idle');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.target.x, this.target.y
    );

    if (distance > this.detectionRadius * 1.5) {
      this.target = null;
      this.setState('idle');
    } else if (distance <= this.attackRadius) {
      this.setState('attack');
    } else {
      // Golems move slower but with purpose
      this.moveTowards(this.target.x, this.target.y, 40); // Slower movement speed
    }
  }

  public takeDamage(amount: number, source?: string): void {
    // Apply damage reduction based on high defense
    const reducedDamage = Math.max(1, amount - this.stats.defense);
    
    super.takeDamage(reducedDamage, source);
    
    // Create sparks effect when taking damage
    this.createSparkEffect();
    
    // Chance to become enraged (increased attack speed) when damaged
    if (this.stats.currentHealth / this.stats.maxHealth < 0.5 && Math.random() < 0.2) {
      this.becomeEnraged();
    }
  }

  private createSparkEffect(): void {
    // Create sparks when hit
    for (let i = 0; i < 6; i++) {
      const spark = this.scene.add.circle(
        this.sprite.x + (Math.random() - 0.5) * 20,
        this.sprite.y + (Math.random() - 0.5) * 20,
        2,
        0xffaa00,
        0.9
      );
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 20;
      
      this.scene.tweens.add({
        targets: spark,
        x: spark.x + Math.cos(angle) * speed,
        y: spark.y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => spark.destroy()
      });
    }
  }

  private becomeEnraged(): void {
    // Temporarily reduce behavior cooldowns
    this.behaviors.forEach(behavior => {
      behavior.cooldown *= 0.7; // 30% faster attacks
    });
    
    // Add red tint to show enrage
    this.sprite.setTint(0xff8888);
    
    // Return to normal after 10 seconds
    this.scene.time.delayedCall(10000, () => {
      this.behaviors.forEach(behavior => {
        behavior.cooldown /= 0.7; // Restore normal cooldowns
      });
      this.sprite.setTint(0x888888); // Return to normal color
    });
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);
    
    // Iron Golems don't regenerate mana - they're purely physical
    // But they do have increased resistance to status effects
  }

  protected detectTarget(): boolean {
    // Golems have good detection but are focused on close threats
    // This would need to be implemented with actual player detection logic
    return false;
  }
}