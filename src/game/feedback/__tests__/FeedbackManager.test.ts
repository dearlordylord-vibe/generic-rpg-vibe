import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FeedbackManager, CombatFeedback, AudioManager, CameraManager, ParticleManager } from '../FeedbackManager';

// Mock Phaser
const mockScene = {
  add: {
    text: vi.fn().mockReturnValue({
      setOrigin: vi.fn(),
      destroy: vi.fn()
    }),
    circle: vi.fn().mockReturnValue({
      destroy: vi.fn()
    }),
    graphics: vi.fn().mockReturnValue({
      fillStyle: vi.fn(),
      fillRect: vi.fn(),
      generateTexture: vi.fn(),
      destroy: vi.fn()
    })
  },
  tweens: {
    add: vi.fn()
  },
  time: {
    now: 1000
  },
  sound: {
    add: vi.fn().mockReturnValue({
      play: vi.fn(),
      stop: vi.fn(),
      isPlaying: false,
      volume: 1.0
    })
  },
  cameras: {
    main: {
      scrollX: 0,
      scrollY: 0,
      zoom: 1,
      shake: vi.fn(),
      flash: vi.fn()
    }
  }
};

describe('FeedbackManager', () => {
  let feedbackManager: FeedbackManager;

  beforeEach(() => {
    vi.clearAllMocks();
    feedbackManager = new FeedbackManager(mockScene as Phaser.Scene);
  });

  afterEach(() => {
    feedbackManager.cleanup();
  });

  describe('Combat Feedback', () => {
    it('should trigger hit feedback with visual and audio effects', () => {
      const feedback: CombatFeedback = {
        type: 'hit',
        damage: 25,
        isCritical: false,
        position: { x: 100, y: 100 },
        sourceId: 'player',
        targetId: 'enemy1'
      };

      feedbackManager.triggerCombatFeedback(feedback);

      // Should create damage text
      expect(mockScene.add.text).toHaveBeenCalledWith(
        100, 100, '25',
        expect.objectContaining({
          fontSize: '18px',
          color: '#ffffff'
        })
      );

      // Should trigger tween animation
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should trigger critical hit feedback with enhanced effects', () => {
      const feedback: CombatFeedback = {
        type: 'critical',
        damage: 45,
        isCritical: true,
        position: { x: 150, y: 150 },
        sourceId: 'player',
        targetId: 'enemy2'
      };

      feedbackManager.triggerCombatFeedback(feedback);

      // Should create larger damage text for critical
      expect(mockScene.add.text).toHaveBeenCalledWith(
        150, 150, '45',
        expect.objectContaining({
          fontSize: '24px',
          color: '#ff4444'
        })
      );
    });

    it('should trigger explosion feedback with enhanced visual effects', () => {
      const feedback: CombatFeedback = {
        type: 'explosion',
        position: { x: 200, y: 200 },
        sourceId: 'player'
      };

      feedbackManager.triggerCombatFeedback(feedback);

      // Should create multiple visual effects for explosion
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should trigger miss feedback without damage numbers', () => {
      const feedback: CombatFeedback = {
        type: 'miss',
        position: { x: 75, y: 75 },
        sourceId: 'player',
        targetId: 'enemy3'
      };

      feedbackManager.triggerCombatFeedback(feedback);

      // Should not create damage text for miss
      expect(mockScene.add.text).not.toHaveBeenCalled();
    });

    it('should trigger dodge feedback with appropriate effects', () => {
      const feedback: CombatFeedback = {
        type: 'dodge',
        position: { x: 125, y: 125 },
        sourceId: 'player',
        targetId: 'enemy4'
      };

      feedbackManager.triggerCombatFeedback(feedback);

      // Should trigger visual effects for dodge
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should trigger block feedback with shield effects', () => {
      const feedback: CombatFeedback = {
        type: 'block',
        position: { x: 175, y: 175 },
        sourceId: 'player',
        targetId: 'enemy5'
      };

      feedbackManager.triggerCombatFeedback(feedback);

      // Should trigger visual effects for block
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should trigger projectile hit feedback', () => {
      const feedback: CombatFeedback = {
        type: 'projectile_hit',
        damage: 30,
        isCritical: false,
        position: { x: 250, y: 250 },
        sourceId: 'player',
        targetId: 'enemy6'
      };

      feedbackManager.triggerCombatFeedback(feedback);

      // Should create damage text and effects
      expect(mockScene.add.text).toHaveBeenCalledWith(
        250, 250, '30',
        expect.objectContaining({
          fontSize: '18px'
        })
      );
    });
  });

  describe('Configuration', () => {
    it('should allow disabling audio effects', () => {
      // Create a new feedback manager with audio disabled
      const noAudioFeedback = new FeedbackManager(mockScene as Phaser.Scene, { enableAudio: false });

      const feedback: CombatFeedback = {
        type: 'hit',
        damage: 25,
        position: { x: 100, y: 100 },
        sourceId: 'player'
      };

      // Clear mock calls from initialization
      vi.clearAllMocks();

      noAudioFeedback.triggerCombatFeedback(feedback);

      // No new sound calls should be made during feedback
      expect(mockScene.sound.add).not.toHaveBeenCalled();
      
      noAudioFeedback.cleanup();
    });

    it('should allow disabling screen shake', () => {
      feedbackManager.setConfig({ enableScreenShake: false });

      const feedback: CombatFeedback = {
        type: 'hit',
        damage: 25,
        position: { x: 100, y: 100 },
        sourceId: 'player'
      };

      feedbackManager.triggerCombatFeedback(feedback);

      // Camera shake should not be triggered when disabled
      expect(mockScene.cameras.main.shake).not.toHaveBeenCalled();
    });

    it('should allow disabling particle effects', () => {
      feedbackManager.setConfig({ enableParticles: false });

      const feedback: CombatFeedback = {
        type: 'hit',
        damage: 25,
        position: { x: 100, y: 100 },
        sourceId: 'player'
      };

      feedbackManager.triggerCombatFeedback(feedback);

      // Should still create damage text but fewer particle effects
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('should adjust effect intensity based on configuration', () => {
      feedbackManager.setConfig({ 
        shakeIntensity: 2.0,
        particleCount: 40
      });

      const feedback: CombatFeedback = {
        type: 'explosion',
        position: { x: 100, y: 100 },
        sourceId: 'player'
      };

      feedbackManager.triggerCombatFeedback(feedback);

      // Should apply intensity multipliers
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });
  });

  describe('AudioManager', () => {
    let audioManager: AudioManager;

    beforeEach(() => {
      audioManager = new AudioManager(mockScene as Phaser.Scene, {
        enableAudio: true,
        enableScreenShake: true,
        enableParticles: true,
        audioVolume: 1.0,
        shakeIntensity: 1.0,
        particleCount: 20
      });
    });

    afterEach(() => {
      audioManager.cleanup();
    });

    it('should play sound effects with correct volume', () => {
      const mockSound = {
        play: vi.fn(),
        stop: vi.fn(),
        isPlaying: false,
        volume: 1.0
      } as Phaser.Sound.BaseSound;
      
      // Mock the sounds map to return our mock sound
      audioManager.sounds.set('sword_hit', mockSound);
      
      audioManager.playEffect({ key: 'sword_hit', volume: 0.7 });

      expect(mockSound.play).toHaveBeenCalledWith({
        volume: 0.7,
        rate: 1.0,
        loop: undefined
      });
    });
  });

  describe('CameraManager', () => {
    let cameraManager: CameraManager;

    beforeEach(() => {
      cameraManager = new CameraManager(mockScene as Phaser.Scene, {
        enableAudio: true,
        enableScreenShake: true,
        enableParticles: true,
        audioVolume: 1.0,
        shakeIntensity: 1.0,
        particleCount: 20
      });
    });

    afterEach(() => {
      cameraManager.cleanup();
    });

    it('should apply screen shake effects', () => {
      cameraManager.applyEffect({
        type: 'shake',
        duration: 200,
        intensity: 2.0
      });

      expect(mockScene.cameras.main.shake).toHaveBeenCalledWith(200, 2.0);
    });

    it('should apply flash effects', () => {
      cameraManager.applyEffect({
        type: 'flash',
        duration: 300,
        intensity: 0.8
      });

      expect(mockScene.cameras.main.flash).toHaveBeenCalledWith(
        300, 255, 255, 255, false, undefined, 0.8
      );
    });

    it('should respect screen shake configuration', () => {
      cameraManager.updateConfig({
        enableAudio: true,
        enableScreenShake: false,
        enableParticles: true,
        audioVolume: 1.0,
        shakeIntensity: 1.0,
        particleCount: 20
      });

      cameraManager.applyEffect({
        type: 'shake',
        duration: 200,
        intensity: 2.0
      });

      expect(mockScene.cameras.main.shake).not.toHaveBeenCalled();
    });
  });

  describe('ParticleManager', () => {
    let particleManager: ParticleManager;

    beforeEach(() => {
      particleManager = new ParticleManager(mockScene as Phaser.Scene, {
        enableAudio: true,
        enableScreenShake: true,
        enableParticles: true,
        audioVolume: 1.0,
        shakeIntensity: 1.0,
        particleCount: 20
      });
    });

    afterEach(() => {
      particleManager.cleanup();
    });

    it('should create particle effects at specified position', () => {
      particleManager.createEffect({
        type: 'particle',
        duration: 300,
        intensity: 1.5,
        color: 0xff0000
      }, { x: 100, y: 150 });

      // Should create multiple particle circles
      expect(mockScene.add.circle).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should create tween effects', () => {
      particleManager.createEffect({
        type: 'tween',
        duration: 400,
        intensity: 2.0,
        scale: 3.0
      }, { x: 200, y: 250 });

      expect(mockScene.add.circle).toHaveBeenCalledWith(200, 250, 10, 0xffffff, 0.8);
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('should respect particle configuration', () => {
      particleManager.updateConfig({
        enableAudio: true,
        enableScreenShake: true,
        enableParticles: false,
        audioVolume: 1.0,
        shakeIntensity: 1.0,
        particleCount: 20
      });

      particleManager.createEffect({
        type: 'particle',
        duration: 300,
        intensity: 1.0
      }, { x: 100, y: 100 });

      expect(mockScene.add.circle).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up all resources on cleanup', () => {
      const feedback: CombatFeedback = {
        type: 'hit',
        damage: 25,
        position: { x: 100, y: 100 },
        sourceId: 'player'
      };

      feedbackManager.triggerCombatFeedback(feedback);
      feedbackManager.cleanup();

      // Cleanup should not throw errors
      expect(() => feedbackManager.cleanup()).not.toThrow();
    });
  });
});