import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// import { Scene } from 'phaser';
import MainScene from '../MainScene';
import { GameState } from '../../models/GameState';

// Mock Scene class
vi.mock('phaser', () => {
  return {
    Scene: class {
      add = {
        graphics: vi.fn().mockReturnValue({
          fillStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          generateTexture: vi.fn(),
          destroy: vi.fn()
        }),
        sprite: vi.fn()
      };
      anims = {
        create: vi.fn(),
        generateFrameNumbers: vi.fn().mockReturnValue([]),
        exists: vi.fn().mockReturnValue(true),
        get: vi.fn().mockReturnValue({
          duration: 1000,
          key: 'idle'
        })
      };
      input = {
        keyboard: {
          createCursorKeys: vi.fn(),
          addKey: vi.fn().mockReturnValue({
            on: vi.fn()
          })
        }
      };
      time = {
        delayedCall: vi.fn()
      };
      textures = {
        exists: vi.fn().mockReturnValue(true),
        get: vi.fn().mockReturnValue({ key: 'cat' })
      };
      load = {
        spritesheet: vi.fn(),
        on: vi.fn(),
        emit: vi.fn()
      };
    },
    Input: {
      Keyboard: {
        KeyCodes: {
          SPACE: 32
        }
      }
    }
  };
});

describe('MainScene', () => {
  let scene: MainScene;
  let consoleSpy: any;
  let mockSprite: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    scene = new MainScene();
    
    mockSprite = {
      setFlipX: vi.fn(),
      setPosition: vi.fn(),
      flipX: false,
      anims: {
        currentAnim: { key: 'idle' },
        isPlaying: false,
        play: vi.fn(),
        chain: vi.fn()
      }
    };

    Object.defineProperty(mockSprite, 'x', {
      value: 400,
      writable: true,
      enumerable: true
    });
    
    Object.defineProperty(mockSprite, 'y', {
      value: 300,
      writable: true,
      enumerable: true
    });
    
    (scene as any).add.sprite = vi.fn().mockReturnValue(mockSprite);
    
    Object.defineProperty(scene, 'cat', { 
      value: mockSprite,
      configurable: true,
      writable: true,
      enumerable: true
    });
    
    Object.defineProperty(scene, 'animationsCreated', { 
      value: true,
      configurable: true,
      writable: true 
    });
    
    Object.defineProperty(scene, 'assetsLoaded', { 
      value: true,
      configurable: true,
      writable: true 
    });
    
    scene.create();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('Game State Updates', () => {
    it('should update player position from game state', () => {
      const newState = new GameState();
      newState.updatePlayerPosition(100, 200);

      scene.updateGameState(newState);

      expect(mockSprite.setPosition).toHaveBeenCalledWith(100, 200);
    });

    it('should handle missing player position gracefully', () => {
      const newState = new GameState();
      scene.updateGameState(newState);
      expect(mockSprite.setPosition).toHaveBeenCalledWith(0, 0);
    });

    it('should handle game state update errors', () => {
      Object.defineProperty(scene, 'cat', { value: null });
      const newState = new GameState();
      newState.updatePlayerPosition(100, 200);

      expect(() => scene.updateGameState(newState)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
}); 