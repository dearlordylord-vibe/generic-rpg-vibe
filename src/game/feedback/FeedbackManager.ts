
export interface FeedbackConfig {
  enableAudio: boolean;
  enableScreenShake: boolean;
  enableParticles: boolean;
  audioVolume: number;
  shakeIntensity: number;
  particleCount: number;
}

export interface CombatFeedback {
  type: 'hit' | 'miss' | 'dodge' | 'block' | 'critical' | 'explosion' | 'projectile_hit' | 'special';
  damage?: number;
  isCritical?: boolean;
  position: { x: number; y: number };
  sourceId: string;
  targetId?: string;
  effect?: string; // For special effects like combo names
}

export interface AudioEffect {
  key: string;
  volume?: number;
  rate?: number;
  loop?: boolean;
}

export interface VisualEffect {
  type: 'particle' | 'tween' | 'sprite';
  duration: number;
  intensity: number;
  color?: number;
  scale?: number;
}

export interface CameraEffect {
  type: 'shake' | 'zoom' | 'flash';
  duration: number;
  intensity: number;
}

export class FeedbackManager {
  private scene: Phaser.Scene;
  private config: FeedbackConfig;
  private activeEffects: Map<string, unknown>;
  private audioManager: AudioManager;
  private cameraManager: CameraManager;
  private particleManager: ParticleManager;

  constructor(scene: Phaser.Scene, config: Partial<FeedbackConfig> = {}) {
    this.scene = scene;
    this.config = {
      enableAudio: true,
      enableScreenShake: true,
      enableParticles: true,
      audioVolume: 1.0,
      shakeIntensity: 1.0,
      particleCount: 20,
      ...config
    };
    this.activeEffects = new Map();
    
    this.audioManager = new AudioManager(scene, this.config);
    this.cameraManager = new CameraManager(scene, this.config);
    this.particleManager = new ParticleManager(scene, this.config);
  }

  triggerCombatFeedback(feedback: CombatFeedback): void {
    const effects = this.generateEffectsForFeedback(feedback);
    
    effects.audio.forEach(audio => {
      if (this.config.enableAudio) {
        this.audioManager.playEffect(audio);
      }
    });

    effects.visual.forEach(visual => {
      if (this.config.enableParticles) {
        this.particleManager.createEffect(visual, feedback.position);
      }
    });

    effects.camera.forEach(camera => {
      if (this.config.enableScreenShake || camera.type !== 'shake') {
        this.cameraManager.applyEffect(camera);
      }
    });

    this.createDamageNumber(feedback);
  }

  private generateEffectsForFeedback(feedback: CombatFeedback): {
    audio: AudioEffect[];
    visual: VisualEffect[];
    camera: CameraEffect[];
  } {
    const effects = {
      audio: [] as AudioEffect[],
      visual: [] as VisualEffect[],
      camera: [] as CameraEffect[]
    };

    switch (feedback.type) {
      case 'hit':
        effects.audio.push({ key: 'sword_hit', volume: 0.7 });
        effects.visual.push({ 
          type: 'particle', 
          duration: 300, 
          intensity: feedback.isCritical ? 2.0 : 1.0,
          color: feedback.isCritical ? 0xff4444 : 0xffffff 
        });
        effects.camera.push({ 
          type: 'shake', 
          duration: 150, 
          intensity: feedback.isCritical ? 3.0 : 1.5 
        });
        break;

      case 'miss':
        effects.audio.push({ key: 'whoosh', volume: 0.3 });
        break;

      case 'dodge':
        effects.audio.push({ key: 'dodge', volume: 0.5 });
        effects.visual.push({ 
          type: 'particle', 
          duration: 200, 
          intensity: 0.5,
          color: 0x00ff00 
        });
        break;

      case 'block':
        effects.audio.push({ key: 'shield_block', volume: 0.8 });
        effects.visual.push({ 
          type: 'particle', 
          duration: 400, 
          intensity: 1.5,
          color: 0x4444ff 
        });
        effects.camera.push({ 
          type: 'shake', 
          duration: 100, 
          intensity: 1.0 
        });
        break;

      case 'explosion':
        effects.audio.push({ key: 'explosion', volume: 1.0 });
        effects.visual.push({ 
          type: 'particle', 
          duration: 800, 
          intensity: 3.0,
          color: 0xff8800 
        });
        effects.camera.push({ 
          type: 'shake', 
          duration: 400, 
          intensity: 4.0 
        });
        effects.camera.push({ 
          type: 'flash', 
          duration: 200, 
          intensity: 0.8 
        });
        break;

      case 'projectile_hit':
        effects.audio.push({ key: 'arrow_hit', volume: 0.6 });
        effects.visual.push({ 
          type: 'particle', 
          duration: 250, 
          intensity: 1.2,
          color: 0x888888 
        });
        effects.camera.push({ 
          type: 'shake', 
          duration: 100, 
          intensity: 1.0 
        });
        break;

      case 'special':
        effects.audio.push({ key: 'combo_special', volume: 0.9 });
        effects.visual.push({ 
          type: 'particle', 
          duration: 600, 
          intensity: 2.5,
          color: 0xffaa00 
        });
        effects.camera.push({ 
          type: 'flash', 
          duration: 300, 
          intensity: 1.2 
        });
        // Add special effect text if provided
        if (feedback.effect) {
          this.createSpecialText(feedback);
        }
        break;
    }

    return effects;
  }

  private createDamageNumber(feedback: CombatFeedback): void {
    if (!feedback.damage) return;

    const color = feedback.isCritical ? '#ff4444' : '#ffffff';
    const fontSize = feedback.isCritical ? 24 : 18;
    
    const damageText = this.scene.add.text(
      feedback.position.x,
      feedback.position.y,
      feedback.damage.toString(),
      {
        fontSize: `${fontSize}px`,
        color: color,
        stroke: '#000000',
        strokeThickness: 2
      }
    );

    this.scene.tweens.add({
      targets: damageText,
      y: feedback.position.y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        damageText.destroy();
      }
    });
  }

  private createSpecialText(feedback: CombatFeedback): void {
    if (!feedback.effect) return;

    const specialText = this.scene.add.text(
      feedback.position.x,
      feedback.position.y - 30,
      feedback.effect,
      {
        fontSize: '20px',
        color: '#ffaa00',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold'
      }
    );

    this.scene.tweens.add({
      targets: specialText,
      y: feedback.position.y - 80,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        specialText.destroy();
      }
    });
  }

  setConfig(config: Partial<FeedbackConfig>): void {
    this.config = { ...this.config, ...config };
    this.audioManager.updateConfig(this.config);
    this.cameraManager.updateConfig(this.config);
    this.particleManager.updateConfig(this.config);
  }

  cleanup(): void {
    this.activeEffects.clear();
    this.audioManager.cleanup();
    this.cameraManager.cleanup();
    this.particleManager.cleanup();
  }
}

export class AudioManager {
  private scene: Phaser.Scene;
  private config: FeedbackConfig;
  public sounds: Map<string, Phaser.Sound.BaseSound>;

  constructor(scene: Phaser.Scene, config: FeedbackConfig) {
    this.scene = scene;
    this.config = config;
    this.sounds = new Map();
    this.preloadSounds();
  }

  private preloadSounds(): void {
    if (!this.config.enableAudio) {
      return;
    }
    
    // Note: In a real implementation, these would be loaded in the preload phase
    const soundKeys = [
      'sword_hit', 'whoosh', 'dodge', 'shield_block', 
      'explosion', 'arrow_hit', 'magic_cast', 'enemy_hit'
    ];

    soundKeys.forEach(key => {
      try {
        const sound = this.scene.sound.add(key, { volume: this.config.audioVolume });
        this.sounds.set(key, sound);
      } catch {
        console.warn(`Could not load sound: ${key}`);
      }
    });
  }

  playEffect(effect: AudioEffect): void {
    const sound = this.sounds.get(effect.key);
    if (sound) {
      const volume = (effect.volume || 1.0) * this.config.audioVolume;
      const rate = effect.rate || 1.0;
      
      if (sound.isPlaying && !effect.loop) {
        sound.stop();
      }
      
      sound.play({ volume, rate, loop: effect.loop });
    }
  }

  updateConfig(config: FeedbackConfig): void {
    this.config = config;
    this.sounds.forEach(sound => {
      if (sound.isPlaying) {
        // @ts-expect-error - Phaser sound objects have volume property
        sound.volume = this.config.audioVolume;
      }
    });
  }

  cleanup(): void {
    this.sounds.forEach(sound => {
      if (sound.isPlaying) {
        sound.stop();
      }
    });
    this.sounds.clear();
  }
}

export class CameraManager {
  private scene: Phaser.Scene;
  private config: FeedbackConfig;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private shakeTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, config: FeedbackConfig) {
    this.scene = scene;
    this.config = config;
    this.camera = scene.cameras.main;
  }

  applyEffect(effect: CameraEffect): void {
    switch (effect.type) {
      case 'shake':
        this.applyShake(effect.duration, effect.intensity);
        break;
      case 'zoom':
        this.applyZoom(effect.duration, effect.intensity);
        break;
      case 'flash':
        this.applyFlash(effect.duration, effect.intensity);
        break;
    }
  }

  private applyShake(duration: number, intensity: number): void {
    if (!this.config.enableScreenShake) return;

    const adjustedIntensity = intensity * this.config.shakeIntensity;
    this.camera.shake(duration, adjustedIntensity);
  }

  private applyZoom(duration: number, intensity: number): void {
    const targetZoom = this.camera.zoom * intensity;
    
    this.scene.tweens.add({
      targets: this.camera,
      zoom: targetZoom,
      duration: duration / 2,
      yoyo: true,
      ease: 'Power2'
    });
  }

  private applyFlash(duration: number, intensity: number): void {
    this.camera.flash(duration, 255, 255, 255, false, undefined, intensity);
  }

  updateConfig(config: FeedbackConfig): void {
    this.config = config;
  }

  cleanup(): void {
    if (this.shakeTimer) {
      this.shakeTimer.destroy();
    }
  }
}

export class ParticleManager {
  private scene: Phaser.Scene;
  private config: FeedbackConfig;
  private emitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter>;

  constructor(scene: Phaser.Scene, config: FeedbackConfig) {
    this.scene = scene;
    this.config = config;
    this.emitters = new Map();
  }

  createEffect(effect: VisualEffect, position: { x: number; y: number }): void {
    if (!this.config.enableParticles) return;

    switch (effect.type) {
      case 'particle':
        this.createParticleEffect(effect, position);
        break;
      case 'tween':
        this.createTweenEffect(effect, position);
        break;
      case 'sprite':
        this.createSpriteEffect(effect, position);
        break;
    }
  }

  private createParticleEffect(effect: VisualEffect, position: { x: number; y: number }): void {
    const particleCount = Math.floor(this.config.particleCount * effect.intensity);
    
    // Create simple circle particles (fallback for missing textures)
    const particles: Phaser.GameObjects.Arc[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 50 + Math.random() * 100;
      const radius = 2 + Math.random() * 3;
      
      const particle = this.scene.add.circle(
        position.x,
        position.y,
        radius,
        effect.color || 0xffffff
      );
      
      particles.push(particle);
      
      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;
      
      this.scene.tweens.add({
        targets: particle,
        x: position.x + velocityX,
        y: position.y + velocityY,
        alpha: 0,
        scale: 0.1,
        duration: effect.duration,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  private createTweenEffect(effect: VisualEffect, position: { x: number; y: number }): void {
    const circle = this.scene.add.circle(
      position.x,
      position.y,
      10,
      effect.color || 0xffffff,
      0.8
    );

    this.scene.tweens.add({
      targets: circle,
      scaleX: effect.scale || 3.0,
      scaleY: effect.scale || 3.0,
      alpha: 0,
      duration: effect.duration,
      ease: 'Power2',
      onComplete: () => {
        circle.destroy();
      }
    });
  }

  private createSpriteEffect(_effect: VisualEffect, _position: { x: number; y: number }): void {
    // Placeholder for sprite-based effects when textures are available
    console.log('Sprite effect not implemented yet');
  }

  updateConfig(config: FeedbackConfig): void {
    this.config = config;
  }

  cleanup(): void {
    this.emitters.forEach(emitter => {
      emitter.destroy();
    });
    this.emitters.clear();
  }
}