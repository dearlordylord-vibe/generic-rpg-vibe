import { Scene } from 'phaser';
import { Enemy, IEnemyStats, IEnemyBehavior } from './Enemy';
import { AttackPatternManager, AttackPatternContext } from '../ai/AttackPatterns';

interface SwarmMate {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  enemy: CarrionBats;
}

export class CarrionBats extends Enemy {
  private swarmMates: SwarmMate[] = [];
  private swarmRadius: number = 80;
  private flightHeight: number = 0;
  private baseY: number = 0;
  private diveBombCooldown: number = 4000; // 4 seconds
  private poisonCloudDuration: number = 5000; // 5 seconds
  private isSwarmLeader: boolean = false;
  private attackPatternManager: AttackPatternManager;

  constructor(scene: Scene, x: number, y: number, isLeader: boolean = false) {
    super(scene, x, y, 'carrionBat', 0);
    
    // Initialize attack pattern manager
    this.attackPatternManager = new AttackPatternManager();
    
    this.isSwarmLeader = isLeader;
    this.baseY = y;
    this.flightHeight = 20 + Math.random() * 30; // Varying flight heights
    
    // Carrion Bats-specific settings
    this.detectionRadius = 200;
    this.attackRadius = 40;
    this.retreatThreshold = 0.4; // Retreat at 40% health
    this.patrolRadius = 120;
    
    // Set up bat-specific visuals
    this.setupBatVisuals();
  }

  protected getEnemyName(): string {
    return this.isSwarmLeader ? 'Carrion Bat Swarm Leader' : 'Carrion Bat';
  }

  public getIsSwarmLeader(): boolean {
    return this.isSwarmLeader;
  }

  public getSwarmMatesCount(): number {
    return this.swarmMates.length;
  }

  protected initializeStats(): IEnemyStats {
    const baseStats = {
      level: 3,
      maxHealth: 60,
      currentHealth: 60,
      maxMana: 30,
      currentMana: 30,
      physicalDamage: 15,
      magicDamage: 20,
      defense: 5,
      evasion: 30, // High evasion due to flight
      criticalChance: 20,
      criticalDamage: 160,
      experienceReward: 80
    };

    // Leaders are slightly stronger
    if (this.isSwarmLeader) {
      baseStats.maxHealth *= 1.5;
      baseStats.currentHealth *= 1.5;
      baseStats.physicalDamage *= 1.3;
      baseStats.magicDamage *= 1.3;
      baseStats.experienceReward *= 1.8;
    }

    return baseStats;
  }

  protected initializeBehaviors(): void {
    // Dive Bomb attack
    const diveBombBehavior: IEnemyBehavior = {
      id: 'diveBomb',
      name: 'Dive Bomb',
      cooldown: this.diveBombCooldown,
      lastUsed: 0,
      range: this.attackRadius * 2,
      canExecute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        const distance = Phaser.Math.Distance.Between(
          this.sprite.x, this.sprite.y,
          target.x, target.y
        );
        return distance <= diveBombBehavior.range;
      },
      execute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        this.performDiveBomb(target);
      }
    };

    // Poison Cloud - creates DoT area
    const poisonCloudBehavior: IEnemyBehavior = {
      id: 'poisonCloud',
      name: 'Poison Cloud',
      cooldown: 8000, // 8 seconds
      lastUsed: 0,
      range: this.attackRadius,
      canExecute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        const distance = Phaser.Math.Distance.Between(
          this.sprite.x, this.sprite.y,
          target.x, target.y
        );
        return distance <= poisonCloudBehavior.range && this.stats.currentMana >= 15;
      },
      execute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        this.performPoisonCloud(target);
      }
    };

    // Swarm Rally - calls other bats to attack
    const swarmRallyBehavior: IEnemyBehavior = {
      id: 'swarmRally',
      name: 'Swarm Rally',
      cooldown: 10000, // 10 seconds
      lastUsed: 0,
      range: this.swarmRadius * 2,
      canExecute: (_enemy: Enemy, _target: Phaser.GameObjects.Sprite) => {
        return this.isSwarmLeader && this.swarmMates.length > 0;
      },
      execute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        this.performSwarmRally(target);
      }
    };

    // Quick Strike - fast melee attack
    const quickStrikeBehavior: IEnemyBehavior = {
      id: 'quickStrike',
      name: 'Quick Strike',
      cooldown: 2000, // 2 seconds
      lastUsed: 0,
      range: this.attackRadius,
      canExecute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        const distance = Phaser.Math.Distance.Between(
          this.sprite.x, this.sprite.y,
          target.x, target.y
        );
        return distance <= quickStrikeBehavior.range;
      },
      execute: (_enemy: Enemy, target: Phaser.GameObjects.Sprite) => {
        this.performQuickStrike(target);
      }
    };

    this.addBehavior(diveBombBehavior);
    this.addBehavior(poisonCloudBehavior);
    if (this.isSwarmLeader) {
      this.addBehavior(swarmRallyBehavior);
    }
    this.addBehavior(quickStrikeBehavior);
  }

  protected setupBatVisuals(): void {
    // Set up bat appearance
    this.sprite.setTint(this.isSwarmLeader ? 0x8B4513 : 0x654321); // Brown tint
    this.sprite.setScale(this.isSwarmLeader ? 1.2 : 0.8);
    
    // Add flight animation
    this.createFlightAnimation();
    
    // Set initial flight position
    this.sprite.y = this.baseY - this.flightHeight;
  }

  private createFlightAnimation(): void {
    // Wing flapping animation (simulated with scale changes)
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.sprite.scaleX * 1.1,
      duration: 200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    // Floating motion
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 10,
      duration: 1500 + Math.random() * 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  public addSwarmMate(bat: CarrionBats): void {
    if (this.isSwarmLeader && bat !== this) {
      this.swarmMates.push({
        id: bat.getId(),
        sprite: bat.getSprite(),
        enemy: bat
      });
      
      // Set this bat as the follower's leader
      bat.setSwarmLeader(this);
    }
  }

  public removeSwarmMate(batId: string): void {
    this.swarmMates = this.swarmMates.filter(mate => mate.id !== batId);
  }

  private setSwarmLeader(leader: CarrionBats): void {
    // Non-leader bats follow the leader
    if (!this.isSwarmLeader) {
      this.target = leader.getSprite();
    }
  }

  private performDiveBomb(target: Phaser.GameObjects.Sprite): void {
    // Start dive animation
    const startY = this.sprite.y;
    const targetY = target.y;
    
    // Create dive trail effect
    this.createDiveTrail();
    
    // Dive down quickly
    this.scene.tweens.add({
      targets: this.sprite,
      y: targetY,
      duration: 400,
      ease: 'Power2.easeIn',
      onComplete: () => {
        // Execute attack
        const damage = this.stats.physicalDamage * 1.5; // 50% bonus damage
        
        // Create impact effect
        this.createImpactEffect(target);
        
        // Quick return to flight height
        this.scene.tweens.add({
          targets: this.sprite,
          y: startY,
          duration: 300,
          ease: 'Power2.easeOut'
        });
        
        this.emitEvent('attacked', {
          attackType: 'diveBomb',
          target,
          damage
        });
      }
    });
  }

  private createDiveTrail(): void {
    // Create streak effect during dive
    const trail = this.scene.add.graphics();
    trail.lineStyle(3, 0x654321, 0.6);
    
    const startY = this.sprite.y;
    
    this.scene.tweens.add({
      targets: { progress: 0 },
      progress: 1,
      duration: 400,
      onUpdate: (tween) => {
        const progress = tween.getValue();
        if (progress !== null && this.target) {
          const currentY = startY + (this.target.y - startY) * progress;
        
          trail.clear();
          trail.lineStyle(3, 0x654321, 0.6 * (1 - progress));
          trail.lineBetween(
            this.sprite.x, startY,
            this.sprite.x, currentY
          );
        }
      },
      onComplete: () => trail.destroy()
    });
  }

  private createImpactEffect(target: Phaser.GameObjects.Sprite): void {
    // Create dust cloud on impact
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const particle = this.scene.add.circle(
        target.x + Math.cos(angle) * 10,
        target.y + Math.sin(angle) * 10,
        3,
        0x8B7355,
        0.7
      );
      
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * 25,
        y: particle.y + Math.sin(angle) * 25,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  private performPoisonCloud(target: Phaser.GameObjects.Sprite): void {
    // Consume mana
    this.stats.currentMana = Math.max(0, this.stats.currentMana - 15);
    
    // Create poison cloud at target location
    this.createPoisonCloud(target.x, target.y);
    
    this.emitEvent('attacked', {
      attackType: 'poisonCloud',
      target,
      position: { x: target.x, y: target.y },
      duration: this.poisonCloudDuration,
      damage: this.stats.magicDamage * 0.3, // DoT damage per tick
      tickRate: 1000 // Damage every second
    });
  }

  private createPoisonCloud(x: number, y: number): void {
    // Create main poison cloud
    const cloud = this.scene.add.circle(x, y, 5, 0x90EE90, 0.4);
    
    this.scene.tweens.add({
      targets: cloud,
      radius: 45,
      alpha: 0.6,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // Maintain cloud for duration
        this.scene.time.delayedCall(this.poisonCloudDuration - 1000, () => {
          this.scene.tweens.add({
            targets: cloud,
            alpha: 0,
            radius: 20,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => cloud.destroy()
          });
        });
      }
    });
    
    // Create poison particles
    this.createPoisonParticles(x, y);
  }

  private createPoisonParticles(x: number, y: number): void {
    // Create floating poison particles
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 40;
      const particle = this.scene.add.circle(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        2 + Math.random() * 2,
        0x90EE90,
        0.6
      );
      
      // Floating motion
      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 20 - Math.random() * 20,
        alpha: 0,
        duration: this.poisonCloudDuration,
        ease: 'Power1',
        onComplete: () => particle.destroy()
      });
    }
  }

  private performSwarmRally(target: Phaser.GameObjects.Sprite): void {
    if (!this.isSwarmLeader) return;
    
    // Rally all swarm mates to attack target
    this.swarmMates.forEach(mate => {
      if (!mate.enemy.isDead()) {
        mate.enemy.setTarget(target);
        mate.enemy.setState('chase');
        
        // Create rally line effect
        this.createRallyEffect(mate.sprite);
      }
    });
    
    this.emitEvent('attacked', {
      attackType: 'swarmRally',
      target,
      swarmSize: this.swarmMates.length
    });
  }

  private createRallyEffect(swarmMate: Phaser.GameObjects.Sprite): void {
    // Create connection line from leader to swarm mate
    const line = this.scene.add.graphics();
    line.lineStyle(2, 0xFFD700, 0.7);
    line.lineBetween(
      this.sprite.x, this.sprite.y,
      swarmMate.x, swarmMate.y
    );
    
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => line.destroy()
    });
  }

  private performQuickStrike(target: Phaser.GameObjects.Sprite): void {
    // Fast melee attack with chance to apply minor poison
    const damage = this.stats.physicalDamage;
    const poisonChance = 0.3; // 30% chance to apply poison
    
    // Create quick strike effect
    this.createQuickStrikeEffect(target);
    
    this.emitEvent('attacked', {
      attackType: 'quickStrike',
      target,
      damage,
      applyPoison: Math.random() < poisonChance
    });
  }

  private createQuickStrikeEffect(target: Phaser.GameObjects.Sprite): void {
    // Create quick slash effect
    const slash = this.scene.add.graphics();
    slash.lineStyle(4, 0xFF6B6B, 0.8);
    
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      target.x, target.y
    );
    
    const length = 20;
    slash.lineBetween(
      target.x - Math.cos(angle) * length,
      target.y - Math.sin(angle) * length,
      target.x + Math.cos(angle) * length,
      target.y + Math.sin(angle) * length
    );
    
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      rotation: slash.rotation + 0.5,
      duration: 200,
      ease: 'Power2',
      onComplete: () => slash.destroy()
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

    if (distance > this.attackRadius * 2) {
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

    const selectedPattern = this.attackPatternManager.selectBestPattern('Carrion Bat', context);
    if (selectedPattern) {
      this.attackPatternManager.executePattern(selectedPattern, context);
      return;
    }

    // Leaders prioritize swarm rally
    if (this.isSwarmLeader && this.swarmMates.length > 1 && Math.random() < 0.4) {
      if (this.executeBehavior('swarmRally', this.target)) {
        return;
      }
    }

    // Use dive bomb for medium distance
    if (distance > this.attackRadius && Math.random() < 0.6) {
      if (this.executeBehavior('diveBomb', this.target)) {
        return;
      }
    }

    // Use poison cloud occasionally
    if (Math.random() < 0.3) {
      if (this.executeBehavior('poisonCloud', this.target)) {
        return;
      }
    }

    // Default to quick strike
    this.executeBehavior('quickStrike', this.target);
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
    } else if (distance <= this.attackRadius * 1.5) {
      this.setState('attack');
    } else {
      // Bats move quickly but with some erratic flight patterns
      const speed = 70 + Math.random() * 20;
      this.moveTowards(this.target.x, this.target.y, speed);
      
      // Add some flight variation
      if (Math.random() < 0.1) {
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 20;
        this.moveTowards(this.target.x + offsetX, this.target.y + offsetY, speed);
      }
    }
  }

  public takeDamage(amount: number, source?: string): void {
    // Bats have chance to dodge due to flight
    if (Math.random() * 100 < this.stats.evasion) {
      // Dodge - create dodge effect
      this.createDodgeEffect();
      this.emitEvent('attacked', {
        attackType: 'dodge',
        source
      });
      return;
    }
    
    super.takeDamage(amount, source);
    
    // Call for help if health is low and this is a leader
    if (this.isSwarmLeader && this.stats.currentHealth / this.stats.maxHealth < 0.4) {
      this.callForBackup();
    }
  }

  private createDodgeEffect(): void {
    // Create quick movement blur
    const blur = this.scene.add.sprite(this.sprite.x, this.sprite.y, this.sprite.texture);
    blur.setTint(0xFFFFFF);
    blur.setAlpha(0.5);
    
    this.scene.tweens.add({
      targets: blur,
      alpha: 0,
      x: blur.x + (Math.random() - 0.5) * 30,
      y: blur.y + (Math.random() - 0.5) * 20,
      duration: 300,
      ease: 'Power2',
      onComplete: () => blur.destroy()
    });
  }

  private callForBackup(): void {
    // Rally swarm for defensive formation
    this.swarmMates.forEach(mate => {
      if (!mate.enemy.isDead()) {
        mate.enemy.setState('chase');
      }
    });
  }

  public update(deltaTime: number): void {
    super.update(deltaTime);
    
    // Regenerate mana slowly
    if (this.stats.currentMana < this.stats.maxMana) {
      this.stats.currentMana = Math.min(
        this.stats.maxMana,
        this.stats.currentMana + 0.3 * (deltaTime / 1000)
      );
    }
    
    // Maintain swarm formation if not in combat
    if (!this.isSwarmLeader && this.state === 'patrol' || this.state === 'idle') {
      this.maintainSwarmFormation();
    }
  }

  private maintainSwarmFormation(): void {
    // Simple swarm behavior - move towards center of nearby swarm mates
    if (this.swarmMates.length === 0) return;
    
    let centerX = 0;
    let centerY = 0;
    let count = 0;
    
    this.swarmMates.forEach(mate => {
      const distance = Phaser.Math.Distance.Between(
        this.sprite.x, this.sprite.y,
        mate.sprite.x, mate.sprite.y
      );
      
      if (distance < this.swarmRadius) {
        centerX += mate.sprite.x;
        centerY += mate.sprite.y;
        count++;
      }
    });
    
    if (count > 0) {
      centerX /= count;
      centerY /= count;
      
      // Move towards formation center slowly
      this.moveTowards(centerX, centerY, 20);
    }
  }

  protected detectTarget(): boolean {
    // Bats have good aerial vision
    // This would need to be implemented with actual player detection logic
    return false;
  }

  public destroy(): void {
    // Remove from swarm before destroying
    if (this.isSwarmLeader) {
      this.swarmMates.forEach(mate => {
        mate.enemy.removeSwarmMate(this.id);
      });
    }
    
    super.destroy();
  }
}