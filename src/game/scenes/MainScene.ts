import { Scene } from 'phaser';
import { GameState } from '../models/GameState';

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
  }

  private setupKeyboardHandlers() {
    this.spaceKey.on('down', () => {
      this.playAnimationSafely('walk');
    });

    this.spaceKey.on('up', () => {
      this.playAnimationSafely('idle');
    });
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