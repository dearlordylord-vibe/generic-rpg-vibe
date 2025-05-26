import { Scene } from 'phaser';
import { GameState } from '../models/GameState';
import { CombatManager } from '../combat/CombatManager';
import { ProjectileManager } from '../combat/ProjectileManager';
import { AOEManager } from '../combat/AOEManager';
import { PlayerStats } from '../models/PlayerStats';
import { InventoryManager } from '../models/InventoryManager';
import { FeedbackManager, CombatFeedback } from '../feedback/FeedbackManager';
import { InputHandler } from '../input/InputHandler';

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
  private inputHandler!: InputHandler;
  private currentProjectileType: string = 'arrow';
  private currentAOEType: string = 'explosion';
  private assetsLoaded: boolean = false;
  private animationsCreated: boolean = false;
  private enemyHealthBars: Map<string, Phaser.GameObjects.Container> = new Map();
  private isBlocking: boolean = false;
  private isDodging: boolean = false;
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
    
    this.inputHandler = new InputHandler(this);
    this.setupInputCallbacks();
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
    
    // Add combat combos
    this.setupCombatCombos();
    
    // Add a test enemy
    this.addTestEnemy();
    
    // Add village portal
    this.addVillagePortal();
  }

  private addTestEnemy() {
    // Create multiple enemy types
    this.createEnemyTextures();
    this.spawnInitialEnemies();
    
    // Spawn additional enemies periodically
    this.time.addEvent({
      delay: 10000, // Spawn new enemy every 10 seconds
      callback: this.spawnRandomEnemy,
      callbackScope: this,
      loop: true
    });
  }

  private createEnemyTextures() {
    // Create different colored textures for different enemy types
    const enemyTypes = [
      { key: 'wraith', color: 0x9400d3, size: 28 }, // Purple - Wraith
      { key: 'iron_golem', color: 0x808080, size: 40 }, // Gray - Iron Golem
      { key: 'carrion_bat', color: 0x654321, size: 20 }, // Brown - Carrion Bat
      { key: 'basic_enemy', color: 0xff0000, size: 32 } // Red - Basic enemy
    ];

    enemyTypes.forEach(type => {
      if (!this.textures.exists(type.key)) {
        this.add.graphics()
          .fillStyle(type.color)
          .fillRect(0, 0, type.size, type.size)
          .generateTexture(type.key, type.size, type.size)
          .destroy();
      }
    });
  }

  private spawnInitialEnemies() {
    // Spawn one of each enemy type initially
    this.spawnEnemy('wraith', 550, 250);
    this.spawnEnemy('iron_golem', 650, 350);
    this.spawnEnemy('carrion_bat', 600, 200);
  }

  private spawnRandomEnemy() {
    const enemyTypes = ['wraith', 'iron_golem', 'carrion_bat', 'basic_enemy'];
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    
    // Random position around the edges
    const spawnPositions = [
      { x: 50, y: Math.random() * 600 + 50 },   // Left edge
      { x: 750, y: Math.random() * 600 + 50 },  // Right edge
      { x: Math.random() * 700 + 50, y: 50 },  // Top edge
      { x: Math.random() * 700 + 50, y: 550 }  // Bottom edge
    ];
    const randomPos = spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
    
    this.spawnEnemy(randomType, randomPos.x, randomPos.y);
  }

  private spawnEnemy(type: string, x: number, y: number) {
    const enemyId = `${type}_${Date.now()}_${Math.random()}`;
    const enemySprite = this.add.sprite(x, y, type);
    enemySprite.setOrigin(0.5, 0.5);
    
    // Create enemy stats based on type
    const enemyStats = this.createEnemyStats(type);
    
    this.combatManager.addEnemy(enemyId, x, y, enemyStats, enemySprite);
    this.createEnemyHealthBar(enemyId, x, y, enemyStats.getDerivedStats().maxHealth);
    
    // Add some basic AI movement
    this.addEnemyAI(enemyId, enemySprite, type);
  }

  private createEnemyStats(type: string): PlayerStats {
    const stats = new PlayerStats();
    
    switch (type) {
      case 'wraith':
        stats.addStatPoints(8);
        stats.allocateStatPoint('dexterity');
        stats.allocateStatPoint('dexterity');
        stats.allocateStatPoint('intelligence');
        stats.allocateStatPoint('intelligence');
        break;
      case 'iron_golem':
        stats.addStatPoints(12);
        stats.allocateStatPoint('strength');
        stats.allocateStatPoint('strength');
        stats.allocateStatPoint('vitality');
        stats.allocateStatPoint('vitality');
        stats.allocateStatPoint('vitality');
        break;
      case 'carrion_bat':
        stats.addStatPoints(5);
        stats.allocateStatPoint('dexterity');
        stats.allocateStatPoint('dexterity');
        break;
      default: // basic_enemy
        stats.addStatPoints(5);
        stats.allocateStatPoint('strength');
        stats.allocateStatPoint('vitality');
        break;
    }
    
    return stats;
  }

  private addEnemyAI(enemyId: string, sprite: Phaser.GameObjects.Sprite, type: string) {
    // Simple AI: move toward player periodically
    this.time.addEvent({
      delay: 2000 + Math.random() * 3000, // Random delay between 2-5 seconds
      callback: () => {
        if (!this.cat || !sprite.active) return;
        
        const speed = this.getEnemySpeed(type);
        const angle = Phaser.Math.Angle.Between(sprite.x, sprite.y, this.cat.x, this.cat.y);
        
        // Move toward player
        this.tweens.add({
          targets: sprite,
          x: sprite.x + Math.cos(angle) * speed,
          y: sprite.y + Math.sin(angle) * speed,
          duration: 1000,
          ease: 'Power1'
        });

        // Update health bar position
        this.updateEnemyHealthBar(enemyId, undefined, sprite.x, sprite.y);
      },
      callbackScope: this,
      loop: true
    });
  }

  private getEnemySpeed(type: string): number {
    switch (type) {
      case 'wraith': return 80;      // Fast and agile
      case 'iron_golem': return 30;  // Slow and heavy
      case 'carrion_bat': return 100; // Very fast
      default: return 50;            // Medium speed
    }
  }

  private addVillagePortal() {
    // Create a portal texture
    if (!this.textures.exists('village_portal')) {
      this.add.graphics()
        .fillStyle(0x00ffff)
        .fillCircle(25, 25, 25)
        .fillStyle(0x0088ff)
        .fillCircle(25, 25, 15)
        .generateTexture('village_portal', 50, 50)
        .destroy();
    }

    const portal = this.add.sprite(100, 500, 'village_portal');
    portal.setOrigin(0.5, 0.5);
    portal.setInteractive();
    
    // Add portal animation
    this.tweens.add({
      targets: portal,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add glow effect
    this.tweens.add({
      targets: portal,
      alpha: 0.7,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Power2'
    });

    // Add click handler for village access
    portal.on('pointerdown', () => {
      this.showVillageMenu();
    });

    // Add hover effects
    portal.on('pointerover', () => {
      portal.setTint(0xaaffff);
      this.showTooltip('Village Portal - Click to visit shops', portal.x, portal.y - 40);
    });

    portal.on('pointerout', () => {
      portal.clearTint();
      this.hideTooltip();
    });
  }

  private showVillageMenu() {
    // Create a simple village menu overlay
    const menuBg = this.add.rectangle(400, 300, 400, 300, 0x000000, 0.9);
    menuBg.setDepth(10000);
    
    const menuTitle = this.add.text(400, 200, 'Village', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    menuTitle.setOrigin(0.5, 0.5);
    menuTitle.setDepth(10001);

    // Shop buttons
    const blacksmithBtn = this.add.rectangle(300, 280, 150, 40, 0x4a90e2);
    blacksmithBtn.setInteractive();
    blacksmithBtn.setDepth(10001);
    
    const blacksmithText = this.add.text(300, 280, 'Blacksmith', {
      fontSize: '16px',
      color: '#ffffff'
    });
    blacksmithText.setOrigin(0.5, 0.5);
    blacksmithText.setDepth(10002);

    const apothecaryBtn = this.add.rectangle(500, 280, 150, 40, 0x28a745);
    apothecaryBtn.setInteractive();
    apothecaryBtn.setDepth(10001);
    
    const apothecaryText = this.add.text(500, 280, 'Apothecary', {
      fontSize: '16px',
      color: '#ffffff'
    });
    apothecaryText.setOrigin(0.5, 0.5);
    apothecaryText.setDepth(10002);

    const closeBtn = this.add.rectangle(400, 360, 100, 30, 0xff4444);
    closeBtn.setInteractive();
    closeBtn.setDepth(10001);
    
    const closeText = this.add.text(400, 360, 'Close', {
      fontSize: '14px',
      color: '#ffffff'
    });
    closeText.setOrigin(0.5, 0.5);
    closeText.setDepth(10002);

    // Store references for cleanup
    const menuElements = [menuBg, menuTitle, blacksmithBtn, blacksmithText, apothecaryBtn, apothecaryText, closeBtn, closeText];

    const closeMenu = () => {
      menuElements.forEach(element => element.destroy());
    };

    // Button handlers
    blacksmithBtn.on('pointerdown', () => {
      closeMenu();
      this.showShopMessage('Blacksmith', 'Welcome to the Blacksmith! (Shop system from Task 6 ready for integration)');
    });

    apothecaryBtn.on('pointerdown', () => {
      closeMenu();
      this.showShopMessage('Apothecary', 'Welcome to the Apothecary! (Shop system from Task 6 ready for integration)');
    });

    closeBtn.on('pointerdown', closeMenu);

    // Add hover effects
    [blacksmithBtn, apothecaryBtn, closeBtn].forEach(btn => {
      btn.on('pointerover', () => btn.setAlpha(0.8));
      btn.on('pointerout', () => btn.setAlpha(1));
    });
  }

  private showShopMessage(shopName: string, message: string) {
    const messageText = this.add.text(400, 150, `${shopName}\n\n${message}`, {
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      backgroundColor: '#000000',
      padding: { x: 20, y: 20 }
    });
    messageText.setOrigin(0.5, 0.5);
    messageText.setDepth(10000);

    // Auto-remove after 3 seconds
    this.time.delayedCall(3000, () => {
      messageText.destroy();
    });
  }

  private showTooltip(text: string, x: number, y: number) {
    this.hideTooltip(); // Clean up any existing tooltip
    
    (this as any).currentTooltip = this.add.text(x, y, text, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    });
    (this as any).currentTooltip.setOrigin(0.5, 1);
    (this as any).currentTooltip.setDepth(5000);
  }

  private hideTooltip() {
    if ((this as any).currentTooltip) {
      (this as any).currentTooltip.destroy();
      (this as any).currentTooltip = null;
    }
  }

  private createEnemyHealthBar(enemyId: string, x: number, y: number, maxHealth: number) {
    const container = this.add.container(x, y - 40);
    
    // Background
    const bgWidth = 60;
    const bgHeight = 8;
    const background = this.add.rectangle(0, 0, bgWidth, bgHeight, 0x000000, 0.7);
    
    // Health fill
    const healthFill = this.add.rectangle(-bgWidth/2, 0, bgWidth, bgHeight - 2, 0xff0000);
    healthFill.setOrigin(0, 0.5);
    
    // Border
    const border = this.add.rectangle(0, 0, bgWidth, bgHeight, 0xffffff, 0);
    border.setStrokeStyle(1, 0xffffff, 0.8);
    
    container.add([background, healthFill, border]);
    container.setDepth(1000);
    
    // Store reference with health data
    (container as any).healthFill = healthFill;
    (container as any).maxHealth = maxHealth;
    (container as any).currentHealth = maxHealth;
    (container as any).bgWidth = bgWidth;
    
    this.enemyHealthBars.set(enemyId, container);
  }

  private updateEnemyHealthBar(enemyId: string, currentHealth: number, x?: number, y?: number) {
    const healthBar = this.enemyHealthBars.get(enemyId);
    if (!healthBar) return;
    
    // Update position if provided
    if (x !== undefined && y !== undefined) {
      healthBar.setPosition(x, y - 40);
    }
    
    // Update health fill
    const maxHealth = (healthBar as any).maxHealth;
    const bgWidth = (healthBar as any).bgWidth;
    const healthFill = (healthBar as any).healthFill;
    
    const healthPercent = Math.max(0, currentHealth / maxHealth);
    const newWidth = bgWidth * healthPercent;
    
    healthFill.setSize(newWidth, healthFill.height);
    
    // Change color based on health percentage
    if (healthPercent > 0.6) {
      healthFill.setFillStyle(0x00ff00); // Green
    } else if (healthPercent > 0.3) {
      healthFill.setFillStyle(0xffff00); // Yellow
    } else {
      healthFill.setFillStyle(0xff0000); // Red
    }
    
    // Hide if dead
    if (currentHealth <= 0) {
      healthBar.setVisible(false);
    }
    
    (healthBar as any).currentHealth = currentHealth;
  }

  private createFloatingDamageText(x: number, y: number, damage: number, isCritical: boolean = false) {
    const color = isCritical ? '#ffff00' : '#ffffff';
    const fontSize = isCritical ? '24px' : '18px';
    const prefix = isCritical ? 'CRIT!' : '';
    
    const text = this.add.text(x, y, `${prefix} ${damage}`, {
      fontSize: fontSize,
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    
    text.setOrigin(0.5, 0.5);
    text.setDepth(2000);
    
    // Animate the text
    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      scale: isCritical ? 1.5 : 1.2,
      duration: isCritical ? 1500 : 1000,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
      }
    });
  }

  private setupInputCallbacks() {
    if (!this.inputHandler) return;

    // Movement callback
    this.inputHandler.registerCallback('movement', (data) => {
      const movement = data as { x: number; y: number };
      this.handleMovement(movement);
    });

    // Combat action callbacks
    this.inputHandler.registerCallback('melee', (data) => {
      const position = data as { x: number; y: number } | undefined;
      if (position) {
        this.handleMeleeAttack(position.x, position.y);
      } else {
        // Default melee attack at cat position with some range
        this.handleMeleeAttack(this.cat.x + 50, this.cat.y);
      }
    });

    this.inputHandler.registerCallback('projectile', (data) => {
      const position = data as { x: number; y: number } | undefined;
      if (position) {
        this.handleProjectileAttack(position.x, position.y);
      } else {
        // Default projectile attack forward
        this.handleProjectileAttack(this.cat.x + 100, this.cat.y);
      }
    });

    this.inputHandler.registerCallback('aoe', (data) => {
      const position = data as { x: number; y: number } | undefined;
      if (position) {
        this.handleAOEAttack(position.x, position.y);
      } else {
        // Default AOE at cat position
        this.handleAOEAttack(this.cat.x, this.cat.y);
      }
    });

    this.inputHandler.registerCallback('block', () => {
      this.handleBlock();
    });

    this.inputHandler.registerCallback('dodge', () => {
      this.handleDodge();
    });

    // Projectile selection callbacks
    this.inputHandler.registerCallback('select_projectile1', () => {
      this.currentProjectileType = 'arrow';
      console.log('Selected arrow projectile');
      this.events.emit('hudUpdate', { currentProjectile: this.currentProjectileType });
    });

    this.inputHandler.registerCallback('select_projectile2', () => {
      this.currentProjectileType = 'fireball';
      console.log('Selected fireball projectile');
      this.events.emit('hudUpdate', { currentProjectile: this.currentProjectileType });
    });

    this.inputHandler.registerCallback('select_projectile3', () => {
      this.currentProjectileType = 'ice';
      console.log('Selected ice projectile');
      this.events.emit('hudUpdate', { currentProjectile: this.currentProjectileType });
    });

    this.inputHandler.registerCallback('select_projectile4', () => {
      this.currentProjectileType = 'lightning';
      console.log('Selected lightning projectile');
      this.events.emit('hudUpdate', { currentProjectile: this.currentProjectileType });
    });

    // AOE selection callbacks
    this.inputHandler.registerCallback('select_aoe1', () => {
      this.currentAOEType = 'explosion';
      console.log('Selected explosion AOE');
      this.events.emit('hudUpdate', { currentAOE: this.currentAOEType });
    });

    this.inputHandler.registerCallback('select_aoe2', () => {
      this.currentAOEType = 'freeze';
      console.log('Selected freeze AOE');
      this.events.emit('hudUpdate', { currentAOE: this.currentAOEType });
    });

    this.inputHandler.registerCallback('select_aoe3', () => {
      this.currentAOEType = 'poison';
      console.log('Selected poison AOE');
      this.events.emit('hudUpdate', { currentAOE: this.currentAOEType });
    });

    this.inputHandler.registerCallback('select_aoe4', () => {
      this.currentAOEType = 'heal';
      console.log('Selected heal AOE');
      this.events.emit('hudUpdate', { currentAOE: this.currentAOEType });
    });

    this.inputHandler.registerCallback('select_aoe5', () => {
      this.currentAOEType = 'shield';
      console.log('Selected shield AOE');
      this.events.emit('hudUpdate', { currentAOE: this.currentAOEType });
    });

    // Combo callbacks
    this.inputHandler.registerCallback('combo_heavy_strike', () => {
      this.executeHeavyStrike();
    });

    this.inputHandler.registerCallback('combo_rapid_fire', () => {
      this.executeRapidFire();
    });

    this.inputHandler.registerCallback('combo_defensive_stance', () => {
      this.executeDefensiveStance();
    });
  }

  private setupCombatCombos() {
    if (!this.inputHandler) return;

    // Heavy Strike: Melee -> Melee -> Melee
    this.inputHandler.addCombo({
      id: 'heavy_strike',
      sequence: ['melee', 'melee', 'melee'],
      timeWindow: 1500,
      action: 'combo_heavy_strike'
    });

    // Rapid Fire: Projectile -> Projectile -> Projectile
    this.inputHandler.addCombo({
      id: 'rapid_fire',
      sequence: ['projectile', 'projectile', 'projectile'],
      timeWindow: 2000,
      action: 'combo_rapid_fire'
    });

    // Defensive Stance: Block -> Dodge -> Block
    this.inputHandler.addCombo({
      id: 'defensive_stance',
      sequence: ['block', 'dodge', 'block'],
      timeWindow: 3000,
      action: 'combo_defensive_stance'
    });
  }

  private handleMovement(movement: { x: number; y: number }) {
    if (!this.cat) return;

    const speed = 200;
    const velocity = {
      x: movement.x * speed,
      y: movement.y * speed
    };

    // Apply movement to cat sprite
    if (this.cat.body && 'setVelocity' in this.cat.body) {
      (this.cat.body as Phaser.Physics.Arcade.Body).setVelocity(velocity.x, velocity.y);
    }

    // Update animation based on movement
    if (velocity.x !== 0 || velocity.y !== 0) {
      if (this.cat.anims && this.cat.anims.currentAnim?.key !== 'walk') {
        this.cat.play('walk');
      }
    } else if (this.cat.anims && this.cat.anims.currentAnim?.key !== 'idle') {
      this.cat.play('idle');
    }
  }

  private handleBlock() {
    if (!this.combatManager) return;
    
    const result = this.combatManager.startBlock();
    if (result) {
      console.log('Block action started');
      this.isBlocking = true;
      this.events.emit('hudUpdate', { isBlocking: true });
      this.triggerBlockFeedback();
      
      // Auto-stop blocking after 1 second
      this.time.delayedCall(1000, () => {
        this.isBlocking = false;
        this.events.emit('hudUpdate', { isBlocking: false });
      });
    }
  }

  private handleDodge() {
    if (!this.combatManager) return;
    
    const result = this.combatManager.performDodge();
    if (result) {
      console.log('Dodge action started');
      this.isDodging = true;
      this.events.emit('hudUpdate', { isDodging: true });
      this.triggerDodgeFeedback();
      
      // Auto-stop dodging after 500ms
      this.time.delayedCall(500, () => {
        this.isDodging = false;
        this.events.emit('hudUpdate', { isDodging: false });
      });
    }
  }

  private executeHeavyStrike() {
    console.log('Executing Heavy Strike combo!');
    // Perform enhanced melee attack with increased damage
    if (this.cat) {
      this.handleMeleeAttack(this.cat.x + 50, this.cat.y);
      this.triggerComboFeedback('Heavy Strike');
    }
  }

  private executeRapidFire() {
    console.log('Executing Rapid Fire combo!');
    // Fire multiple projectiles in quick succession
    if (this.cat) {
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(i * 200, () => {
          this.handleProjectileAttack(this.cat.x + 100, this.cat.y + (i - 1) * 20);
        });
      }
      this.triggerComboFeedback('Rapid Fire');
    }
  }

  private executeDefensiveStance() {
    console.log('Executing Defensive Stance combo!');
    // Provide temporary defensive bonuses
    this.triggerComboFeedback('Defensive Stance');
  }

  private triggerBlockFeedback() {
    if (!this.feedbackManager || !this.cat) return;

    const feedback: CombatFeedback = {
      type: 'block',
      position: { x: this.cat.x, y: this.cat.y },
      sourceId: 'player',
      targetId: 'player'
    };
    this.feedbackManager.triggerCombatFeedback(feedback);
  }

  private triggerDodgeFeedback() {
    if (!this.feedbackManager || !this.cat) return;

    const feedback: CombatFeedback = {
      type: 'dodge',
      position: { x: this.cat.x, y: this.cat.y },
      sourceId: 'player',
      targetId: 'player'
    };
    this.feedbackManager.triggerCombatFeedback(feedback);
  }

  private triggerComboFeedback(comboName: string) {
    if (!this.feedbackManager || !this.cat) return;

    const feedback: CombatFeedback = {
      type: 'special',
      position: { x: this.cat.x, y: this.cat.y },
      sourceId: 'player',
      targetId: 'player',
      effect: comboName
    };
    this.feedbackManager.triggerCombatFeedback(feedback);
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
        // Create floating damage text
        this.createFloatingDamageText(enemy.x, enemy.y - 20, hit.damage, hit.isCritical);
        
        // Update enemy health bar (simulated damage for now)
        const currentHealthBar = this.enemyHealthBars.get(hit.targetId);
        if (currentHealthBar) {
          const currentHealth = Math.max(0, (currentHealthBar as any).currentHealth - hit.damage);
          this.updateEnemyHealthBar(hit.targetId, currentHealth, enemy.x, enemy.y);
        }
        
        const hitFeedback: CombatFeedback = {
          type: hit.isCritical ? 'critical' : 'hit',
          damage: hit.damage,
          isCritical: hit.isCritical,
          position: { x: enemy.x, y: enemy.y },
          sourceId: 'player',
          targetId: hit.targetId
        };
        this.feedbackManager.triggerCombatFeedback(hitFeedback);
        if (enemy.sprite) {
          this.triggerEnemyReaction({ sprite: enemy.sprite }, 'hit', hit.isCritical);
        }
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

    // Create floating damage text for hits
    if (result.hit && result.damage) {
      this.createFloatingDamageText(enemy.x, enemy.y - 20, result.damage, result.critical);
      
      // Update enemy health bar
      const currentHealthBar = this.enemyHealthBars.get(result.targetId);
      if (currentHealthBar) {
        const currentHealth = Math.max(0, (currentHealthBar as any).currentHealth - result.damage);
        this.updateEnemyHealthBar(result.targetId, currentHealth, enemy.x, enemy.y);
      }
    }

    // Trigger enhanced feedback through FeedbackManager
    this.feedbackManager.triggerCombatFeedback(feedback);

    // Trigger enemy reaction
    if (result.hit || result.blocked) {
      if (enemy.sprite) {
        this.triggerEnemyReaction({ sprite: enemy.sprite }, result.blocked ? 'blocked' : 'hit', result.critical);
      }
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
      this.handleCursorMovement();
      
      // Update input handler
      if (this.inputHandler) {
        this.inputHandler.update();
      }
      
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
            // Create floating damage text
            this.createFloatingDamageText(enemy.x, enemy.y - 20, hit.damage, hit.critical);
            
            // Update enemy health bar
            const currentHealthBar = this.enemyHealthBars.get(hit.targetId);
            if (currentHealthBar) {
              const currentHealth = Math.max(0, (currentHealthBar as any).currentHealth - hit.damage);
              this.updateEnemyHealthBar(hit.targetId, currentHealth, enemy.x, enemy.y);
            }
            
            const feedback: CombatFeedback = {
              type: 'projectile_hit',
              damage: hit.damage,
              isCritical: hit.critical,
              position: { x: enemy.x, y: enemy.y },
              sourceId: 'player',
              targetId: hit.targetId
            };
            this.feedbackManager.triggerCombatFeedback(feedback);
            if (enemy.sprite) {
              this.triggerEnemyReaction({ sprite: enemy.sprite }, 'hit', hit.critical);
            }
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

  private handleCursorMovement() {
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

  cleanup() {
    // Clean up InputHandler
    if (this.inputHandler) {
      this.inputHandler.destroy();
    }
  }
} 