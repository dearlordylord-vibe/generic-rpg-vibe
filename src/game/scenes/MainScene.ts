import { Scene } from 'phaser';
import { GameState } from '../models/GameState';
import { CombatManager } from '../combat/CombatManager';
import { ProjectileManager } from '../combat/ProjectileManager';
import { AOEManager } from '../combat/AOEManager';
import { PlayerStats } from '../models/PlayerStats';
import { InventoryManager } from '../models/InventoryManager';
import { FeedbackManager, CombatFeedback } from '../feedback/FeedbackManager';

interface AnimationConfig {
  start: number;
  end: number;
  frameRate: number;
  duration: number;
}

type AnimationKey = 'idle' | 'walk';

type AnimationConfigs = Record<AnimationKey, AnimationConfig>;

export default class MainScene extends Scene {
  private cat!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private combatManager!: CombatManager;
  private projectileManager!: ProjectileManager;
  private aoeManager!: AOEManager;
  private feedbackManager!: FeedbackManager;
  private currentProjectileType: string = 'arrow';
  private currentAOEType: string = 'explosion';
  private assetsLoaded: boolean = false;
  private animationsCreated: boolean = false;
  private readonly ANIMATION_CONFIG: AnimationConfigs = {
    idle: { start: 0, end: 3, frameRate: 8, duration: 500 },
    walk: { start: 4, end: 7, frameRate: 12, duration: 400 }
  };

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    try {
      // Create a fallback texture first
      this.createFallbackTexture();

      // Load the spritesheet with error handling
      this.loadSpritesheet();
    } catch (error) {
      console.error('Error in preload:', error);
      this.handleAssetLoadingError();
    }
  }

  private createFallbackTexture() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xff0000);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('cat-fallback', 32, 32);
    graphics.destroy();
  }

  private loadSpritesheet() {
    this.load.spritesheet('cat', 'assets/cat_sprite.png', {
      frameWidth: 32,
      frameHeight: 32
    });

    this.load.on('complete', () => {
      console.log('Assets loaded successfully');
      this.assetsLoaded = true;
      this.createAnimations();
    });

    this.load.on('loaderror', (file: { key: string }) => {
      console.error(`Failed to load asset: ${file.key}`);
      this.handleAssetLoadingError();
    });
  }

  private handleAssetLoadingError() {
    if (this.textures.exists('cat-fallback')) {
      this.textures.get('cat-fallback').key = 'cat';
      this.assetsLoaded = true;
      this.createAnimations();
    }
  }

  create() {
    try {
      this.initializeCatSprite();
      this.initializeControls();
      this.initializeCombat();
    } catch (error) {
      console.error('Error in create:', error);
    }
  }

  private initializeCatSprite() {
    this.cat = this.add.sprite(400, 300, 'cat');
    this.setupAnimationRetry();
  }

  private setupAnimationRetry(maxRetries: number = 5, retryCount: number = 0) {
    const tryPlayAnimation = () => {
      if (this.animationsCreated && this.anims.exists('idle')) {
        this.cat.play('idle');
      } else if (retryCount < maxRetries) {
        console.warn(`Animations not ready, retry ${retryCount + 1}/${maxRetries}`);
        if (!this.animationsCreated && this.assetsLoaded) {
          this.createAnimations();
        }
        this.time.delayedCall(100, () => this.setupAnimationRetry(maxRetries, retryCount + 1));
      } else {
        console.error('Failed to initialize animations after maximum retries');
        this.handleAnimationInitializationFailure();
      }
    };

    tryPlayAnimation();
  }

  private handleAnimationInitializationFailure() {
    // Create and play a simple fallback animation
    if (!this.anims.exists('fallback')) {
      this.anims.create({
        key: 'fallback',
        frames: [{ key: 'cat', frame: 0 }],
        frameRate: 1,
        repeat: -1,
        duration: 1000
      });
    }
    this.cat.play('fallback');
  }

  private initializeControls() {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    this.setupKeyboardHandlers();
    this.setupMouseControls();
  }

  private initializeCombat() {
    // Initialize with basic player stats
    const playerStats = new PlayerStats();
    const inventoryManager = new InventoryManager();
    
    this.combatManager = new CombatManager(this, playerStats, inventoryManager);
    this.projectileManager = new ProjectileManager(this);
    this.aoeManager = new AOEManager(this);
    this.feedbackManager = new FeedbackManager(this);
    
    // Add a test enemy
    this.addTestEnemy();
  }

  private addTestEnemy() {
    // Create a test enemy sprite
    const enemySprite = this.add.rectangle(600, 300, 32, 32, 0xff0000);
    enemySprite.setOrigin(0.5, 0.5);
    
    // Create enemy stats
    const enemyStats = new PlayerStats();
    enemyStats.addStatPoints(5);
    enemyStats.allocateStatPoint('strength');
    enemyStats.allocateStatPoint('vitality');
    
    this.combatManager.addEnemy('enemy1', 600, 300, enemyStats, enemySprite as Phaser.GameObjects.Sprite);
  }

  private setupMouseControls() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleMouseClick(pointer.x, pointer.y, pointer.rightButtonDown(), pointer.middleButtonDown());
    });
  }

  private handleMouseClick(x: number, y: number, isRightClick: boolean = false, isMiddleClick: boolean = false) {
    if (!this.combatManager || !this.projectileManager || !this.aoeManager) return;

    if (isMiddleClick) {
      // Middle click for AOE attacks
      this.handleAOEAttack(x, y);
    } else if (isRightClick) {
      // Right click for projectile attacks
      this.handleProjectileAttack(x, y);
    } else {
      // Left click for melee attacks
      this.handleMeleeAttack(x, y);
    }
  }

  private handleMeleeAttack(x: number, y: number) {
    // Check if clicking on an enemy in range
    const result = this.combatManager.performAttack(x, y);
    
    if (result) {
      console.log('Melee attack result:', result);
      this.showAttackFeedback(result);
    } else {
      // No valid target or can't attack
      console.log('No valid melee target or cannot attack');
    }
  }

  private handleProjectileAttack(x: number, y: number) {
    if (!this.cat) return;

    // Fire a projectile towards the target location
    const projectileId = this.projectileManager.fireProjectile(
      this.currentProjectileType,
      this.cat.x,
      this.cat.y,
      x,
      y,
      'player'
    );

    if (projectileId) {
      console.log(`Fired ${this.currentProjectileType}:`, projectileId);
    } else {
      console.log('Failed to fire projectile');
    }
  }

  private handleAOEAttack(x: number, y: number) {
    if (!this.cat) return;

    // Get player stats for damage calculation
    const playerStats = this.combatManager.getPlayerStats();
    
    // Create AOE effect at target location
    const result = this.aoeManager.createAOE(
      this.currentAOEType,
      x,
      y,
      'player',
      playerStats
    );

    if (result) {
      console.log(`Created ${this.currentAOEType} AOE:`, result);
      console.log(`Targets hit: ${result.targetsHit.length}`);
      
      // Show AOE feedback
      this.showAOEFeedback(result);
    } else {
      console.log('Failed to create AOE effect');
    }
  }

  private selectProjectileType(type: string) {
    this.currentProjectileType = type;
    console.log(`Selected projectile type: ${type}`);
    
    // Show visual feedback for projectile selection
    this.showProjectileSelectionFeedback(type);
  }

  private selectAOEType(type: string) {
    this.currentAOEType = type;
    console.log(`Selected AOE type: ${type}`);
    
    // Show visual feedback for AOE selection
    this.showAOESelectionFeedback(type);
  }

  private showProjectileSelectionFeedback(type: string) {
    const text = this.add.text(400, 50, `Projectile: ${type.toUpperCase()}`, {
      fontSize: '20px',
      color: '#00ff00',
      fontStyle: 'bold'
    });

    text.setOrigin(0.5, 0.5);

    // Animate and remove the text
    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
      }
    });
  }

  private showAOESelectionFeedback(type: string) {
    const text = this.add.text(400, 80, `AOE: ${type.toUpperCase()}`, {
      fontSize: '20px',
      color: '#ff8800',
      fontStyle: 'bold'
    });

    text.setOrigin(0.5, 0.5);

    // Animate and remove the text
    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
      }
    });
  }

  private showAOEFeedback(result: { centerX: number; centerY: number; targetsHit: Array<{ targetId: string; damage: number; isCritical: boolean }> }) {
    // Trigger AOE explosion feedback
    const explosionFeedback: CombatFeedback = {
      type: 'explosion',
      position: { x: result.centerX, y: result.centerY },
      sourceId: 'player'
    };
    this.feedbackManager.triggerCombatFeedback(explosionFeedback);

    // Show individual damage feedback for each target hit
    result.targetsHit.forEach((hit) => {
      const enemy = this.combatManager.getEnemyInfo(hit.targetId);
      if (enemy) {
        const hitFeedback: CombatFeedback = {
          type: hit.isCritical ? 'critical' : 'hit',
          damage: hit.damage,
          isCritical: hit.isCritical,
          position: { x: enemy.x, y: enemy.y },
          sourceId: 'player',
          targetId: hit.targetId
        };
        this.feedbackManager.triggerCombatFeedback(hitFeedback);
        this.triggerEnemyReaction(enemy, 'hit', hit.isCritical);
      }
    });
  }

  private showAttackFeedback(result: { hit: boolean; blocked: boolean; dodged: boolean; critical: boolean; damage?: number; targetId: string }) {
    // Find the target enemy to show feedback on
    const enemy = this.combatManager.getEnemyInfo(result.targetId);
    if (!enemy || !enemy.sprite) return;

    // Create feedback object for the FeedbackManager
    let feedbackType: CombatFeedback['type'];
    if (result.hit && !result.blocked) {
      feedbackType = result.critical ? 'critical' : 'hit';
    } else if (result.dodged) {
      feedbackType = 'dodge';
    } else if (result.blocked) {
      feedbackType = 'block';
    } else {
      feedbackType = 'miss';
    }

    const feedback: CombatFeedback = {
      type: feedbackType,
      damage: result.damage,
      isCritical: result.critical,
      position: { x: enemy.x, y: enemy.y },
      sourceId: 'player',
      targetId: result.targetId
    };

    // Trigger enhanced feedback through FeedbackManager
    this.feedbackManager.triggerCombatFeedback(feedback);

    // Trigger enemy reaction
    if (result.hit || result.blocked) {
      this.triggerEnemyReaction(enemy, result.blocked ? 'blocked' : 'hit', result.critical);
    }

    // Log to console as well
    if (result.hit) {
      if (result.critical) {
        console.log('Critical hit!', result.damage, 'damage');
      } else {
        console.log('Hit for', result.damage, 'damage');
      }
    } else if (result.dodged) {
      console.log('Attack dodged!');
    } else if (result.blocked) {
      console.log('Attack blocked!');
    } else {
      console.log('Attack missed!');
    }
  }


  private triggerEnemyReaction(enemy: { sprite: Phaser.GameObjects.Sprite }, reactionType: 'hit' | 'blocked' | 'dodge', isCritical: boolean = false) {
    if (!enemy.sprite) return;

    const originalColor = enemy.sprite.tint || 0xffffff;
    
    switch (reactionType) {
      case 'hit': {
        // Flash red for damage
        const flashColor = isCritical ? 0xff0000 : 0xff8888;
        enemy.sprite.setTint(flashColor);
        
        // Knockback effect
        const knockbackDistance = isCritical ? 15 : 8;
        const knockbackDuration = isCritical ? 200 : 150;
        
        this.tweens.add({
          targets: enemy.sprite,
          x: enemy.sprite.x + (Math.random() - 0.5) * knockbackDistance,
          y: enemy.sprite.y + (Math.random() - 0.5) * knockbackDistance,
          duration: knockbackDuration / 2,
          yoyo: true,
          ease: 'Power2'
        });

        // Reset color after flash
        this.time.delayedCall(100, () => {
          if (enemy.sprite) {
            enemy.sprite.setTint(originalColor);
          }
        });
        break;
      }

      case 'blocked': {
        // Flash blue for block
        enemy.sprite.setTint(0x4444ff);
        
        // Slight recoil
        this.tweens.add({
          targets: enemy.sprite,
          scaleX: 0.9,
          scaleY: 0.9,
          duration: 100,
          yoyo: true,
          ease: 'Power2'
        });

        this.time.delayedCall(150, () => {
          if (enemy.sprite) {
            enemy.sprite.setTint(originalColor);
          }
        });
        break;
      }

      case 'dodge': {
        // Quick sidestep animation
        const dodgeDistance = 20;
        const originalX = enemy.sprite.x;
        
        this.tweens.add({
          targets: enemy.sprite,
          x: originalX + dodgeDistance,
          duration: 100,
          ease: 'Power2',
          yoyo: true
        });
        break;
      }
    }
  }

  private setupKeyboardHandlers() {
    this.spaceKey.on('down', () => {
      this.playAnimationSafely('walk');
    });

    this.spaceKey.on('up', () => {
      this.playAnimationSafely('idle');
    });

    // Add combat controls
    if (this.input.keyboard) {
      // Block with Shift key
      const shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
      shiftKey.on('down', () => {
        if (this.combatManager) {
          this.combatManager.startBlock();
          console.log('Started blocking');
        }
      });

      // Dodge with Ctrl key
      const ctrlKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
      ctrlKey.on('down', () => {
        if (this.combatManager) {
          const success = this.combatManager.performDodge();
          console.log('Dodge attempt:', success ? 'success' : 'failed');
        }
      });

      // Projectile type selection
      const key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
      const key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
      const key3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
      const key4 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);

      key1.on('down', () => this.selectProjectileType('arrow'));
      key2.on('down', () => this.selectProjectileType('magic_bolt'));
      key3.on('down', () => this.selectProjectileType('fireball'));
      key4.on('down', () => this.selectProjectileType('piercing_arrow'));

      // AOE type selection
      const keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
      const keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      const keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      const keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      const keyT = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);

      keyQ.on('down', () => this.selectAOEType('explosion'));
      keyW.on('down', () => this.selectAOEType('magic_circle'));
      keyE.on('down', () => this.selectAOEType('shockwave'));
      keyR.on('down', () => this.selectAOEType('ice_storm'));
      keyT.on('down', () => this.selectAOEType('lightning_strike'));
    }
  }

  private playAnimationSafely(key: AnimationKey) {
    if (this.animationsCreated && this.anims.exists(key)) {
      this.cat.play(key);
    }
  }

  protected createAnimations() {
    try {
      if (!this.assetsLoaded) {
        console.warn('Trying to create animations before assets are loaded');
        return;
      }

      (Object.entries(this.ANIMATION_CONFIG) as [AnimationKey, AnimationConfig][]).forEach(([key, config]) => {
        if (!this.anims.exists(key)) {
          this.createAnimation(key, config);
        }
      });

      this.animationsCreated = true;
    } catch (error) {
      console.error('Error creating animations:', error);
      this.animationsCreated = false;
      this.createFallbackAnimations();
    }
  }

  private createAnimation(key: AnimationKey, config: AnimationConfig) {
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers('cat', { start: config.start, end: config.end }),
      frameRate: config.frameRate,
      repeat: -1,
      duration: config.duration
    });
  }

  private createFallbackAnimations() {
    (Object.keys(this.ANIMATION_CONFIG) as AnimationKey[]).forEach(key => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: [{ key: 'cat', frame: 0 }],
          frameRate: 1,
          repeat: -1,
          duration: 1000
        });
      }
    });
  }

  update() {
    if (!this.cursors || !this.cat || !this.animationsCreated) return;

    try {
      this.handleMovement();
      
      // Update combat manager
      if (this.combatManager) {
        this.combatManager.updatePlayerPosition(this.cat.x, this.cat.y);
        this.combatManager.update();
      }

      // Update projectile manager
      if (this.projectileManager) {
        const deltaTime = this.game.loop.delta;
        const targets = this.combatManager ? this.combatManager.getAllTargets() : [];
        const hitResults = this.projectileManager.update(deltaTime, targets);
        
        // Process projectile hits through feedback system
        hitResults.forEach(hit => {
          const enemy = this.combatManager.getEnemyInfo(hit.targetId);
          if (enemy) {
            const feedback: CombatFeedback = {
              type: 'projectile_hit',
              damage: hit.damage,
              isCritical: hit.critical,
              position: { x: enemy.x, y: enemy.y },
              sourceId: 'player',
              targetId: hit.targetId
            };
            this.feedbackManager.triggerCombatFeedback(feedback);
            this.triggerEnemyReaction(enemy, 'hit', hit.critical);
          }
        });
      }

      // Update AOE manager
      if (this.aoeManager) {
        const deltaTime = this.game.loop.delta;
        this.aoeManager.update(deltaTime);
      }
    } catch (error) {
      console.error('Error in update:', error);
      this.playAnimationSafely('idle');
    }
  }

  private handleMovement() {
    const speed = 4;
    let newAnimation: AnimationKey = 'idle';
    let shouldFlip = this.cat.flipX;

    if (this.cursors.left.isDown) {
      this.cat.x -= speed;
      shouldFlip = true;
      newAnimation = 'walk';
    } else if (this.cursors.right.isDown) {
      this.cat.x += speed;
      shouldFlip = false;
      newAnimation = 'walk';
    } else if (this.cursors.up.isDown) {
      this.cat.y -= speed;
      newAnimation = 'walk';
    } else if (this.cursors.down.isDown) {
      this.cat.y += speed;
      newAnimation = 'walk';
    }

    if (shouldFlip !== this.cat.flipX) {
      this.cat.setFlipX(shouldFlip);
    }

    this.updateAnimation(newAnimation);
  }

  private updateAnimation(newAnimation: AnimationKey) {
    if (!this.anims.exists(newAnimation)) return;

    const anim = this.anims.get(newAnimation);
    if (!anim?.duration) {
      console.warn(`Animation ${newAnimation} has no duration`);
      return;
    }

    if (!this.cat.anims.currentAnim || this.cat.anims.currentAnim.key !== newAnimation) {
      this.cat.play(newAnimation, true);
    }
  }

  updateGameState(newState: GameState) {
    try {
      const playerState = newState.getPlayerState();
      if (this.cat) {
        this.cat.setPosition(playerState.position.x, playerState.position.y);
      }
    } catch (error) {
      console.error('Error in updateGameState:', error);
    }
  }
} 