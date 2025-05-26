import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { InputHandler, ComboDefinition } from '../InputHandler';

// Mock Phaser globally
global.Phaser = {
  Input: {
    Keyboard: {
      KeyCodes: {
        SPACE: 32,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        UP: 38,
        DOWN: 40,
        LEFT: 37,
        RIGHT: 39,
        W: 87,
        A: 65,
        S: 83,
        D: 68,
        ONE: 49,
        TWO: 50,
        THREE: 51,
        FOUR: 52,
        Q: 81,
        E: 69,
        R: 82,
        T: 84
      }
    }
  }
} as typeof Phaser;

// Mock Phaser objects
const mockKey = {
  isDown: false,
  keyCode: 32 // Default to SPACE
};

const mockKeyboard = {
  addKey: vi.fn((keyCode: number) => ({ ...mockKey, keyCode })),
  on: vi.fn(),
  off: vi.fn()
};

const mockInput = {
  keyboard: mockKeyboard,
  on: vi.fn(),
  off: vi.fn()
};

const mockScene = {
  input: mockInput,
  time: {
    delayedCall: vi.fn()
  }
} as unknown as Phaser.Scene;

describe('InputHandler', () => {
  let inputHandler: InputHandler;
  let mockCallback: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    inputHandler = new InputHandler(mockScene);
    mockCallback = vi.fn();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      expect(inputHandler).toBeDefined();
      expect(inputHandler.getCurrentAction()).toBeNull();
      expect(inputHandler.getBufferedInputCount()).toBe(0);
    });

    it('should setup input handlers on creation', () => {
      expect(mockKeyboard.on).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockInput.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    });
  });

  describe('Callback Registration', () => {
    it('should register action callbacks', () => {
      inputHandler.registerCallback('melee', mockCallback);
      
      // Simulate action execution
      inputHandler['processInput']('melee');
      
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should unregister action callbacks', () => {
      inputHandler.registerCallback('melee', mockCallback);
      inputHandler.unregisterCallback('melee');
      
      // Simulate action execution
      inputHandler['processInput']('melee');
      
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should pass data to callbacks', () => {
      const testData = { x: 100, y: 200 };
      inputHandler.registerCallback('melee', mockCallback);
      
      inputHandler['processInput']('melee', testData);
      
      expect(mockCallback).toHaveBeenCalledWith(testData);
    });
  });

  describe('Input Processing', () => {
    it('should execute actions immediately when no current action', () => {
      inputHandler.registerCallback('melee', mockCallback);
      
      inputHandler['processInput']('melee');
      
      expect(inputHandler.getCurrentAction()).toBe('melee');
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should buffer inputs when action is in progress', () => {
      inputHandler.registerCallback('melee', mockCallback);
      inputHandler.registerCallback('projectile', mockCallback);
      
      // First action executes immediately
      inputHandler['processInput']('melee');
      expect(inputHandler.getCurrentAction()).toBe('melee');
      expect(inputHandler.getBufferedInputCount()).toBe(0);
      
      // Second action gets buffered
      inputHandler['processInput']('projectile');
      expect(inputHandler.getBufferedInputCount()).toBe(1);
    });

    it('should allow priority actions to interrupt', () => {
      inputHandler.registerCallback('melee', mockCallback);
      inputHandler.registerCallback('dodge', mockCallback);
      
      // Start melee action
      inputHandler['processInput']('melee');
      expect(inputHandler.getCurrentAction()).toBe('melee');
      
      // Dodge should interrupt melee
      inputHandler['processInput']('dodge');
      expect(inputHandler.getCurrentAction()).toBe('dodge');
    });

    it('should respect input buffer size limit', () => {
      inputHandler.registerCallback('melee', mockCallback);
      inputHandler.registerCallback('projectile', mockCallback);
      
      // Start an action to force buffering
      inputHandler['processInput']('melee');
      
      // Add more inputs than buffer limit (5)
      for (let i = 0; i < 7; i++) {
        inputHandler['processInput']('projectile');
      }
      
      expect(inputHandler.getBufferedInputCount()).toBe(5);
    });
  });

  describe('Action Duration and Timing', () => {
    it('should track action start time', () => {
      inputHandler.registerCallback('melee', mockCallback);
      
      const beforeTime = Date.now();
      inputHandler['processInput']('melee');
      const afterTime = Date.now();
      
      const state = inputHandler.getInputState();
      expect(state.actionStartTime).toBeGreaterThanOrEqual(beforeTime);
      expect(state.actionStartTime).toBeLessThanOrEqual(afterTime);
    });

    it('should determine when actions are complete based on duration', () => {
      inputHandler.registerCallback('melee', mockCallback);
      
      inputHandler['processInput']('melee');
      
      // Immediately after starting, action should not be complete
      expect(inputHandler['isActionComplete']()).toBe(false);
      
      // Mock the passage of time beyond action duration
      inputHandler['state'].actionStartTime = Date.now() - 400; // Melee duration is 300ms
      
      expect(inputHandler['isActionComplete']()).toBe(true);
    });
  });

  describe('Combo System', () => {
    let heavyStrikeCombo: ComboDefinition;
    let comboCallback: Mock;

    beforeEach(() => {
      heavyStrikeCombo = {
        id: 'heavy_strike',
        sequence: ['melee', 'melee', 'melee'],
        timeWindow: 1500,
        action: 'combo_heavy_strike'
      };
      comboCallback = vi.fn();
      
      inputHandler.addCombo(heavyStrikeCombo);
      inputHandler.registerCallback('combo_heavy_strike', comboCallback);
      inputHandler.registerCallback('melee', mockCallback);
    });

    it('should add combos to the system', () => {
      const combos = inputHandler['combos'];
      expect(combos).toHaveLength(1);
      expect(combos[0]).toEqual(heavyStrikeCombo);
    });

    it('should track combo progress', () => {
      inputHandler['processInput']('melee');
      
      const state = inputHandler.getInputState();
      expect(state.comboProgress['heavy_strike']).toBe(1);
    });

    it('should execute combo when sequence is complete', () => {
      // Complete the combo sequence
      inputHandler['processInput']('melee');
      inputHandler['processInput']('melee');
      inputHandler['processInput']('melee');
      
      expect(comboCallback).toHaveBeenCalledWith({ comboId: 'heavy_strike' });
    });

    it('should reset combo progress on wrong input', () => {
      inputHandler['processInput']('melee');
      inputHandler['processInput']('projectile'); // Wrong input
      
      const state = inputHandler.getInputState();
      expect(state.comboProgress['heavy_strike']).toBe(0);
    });

    it('should remove combos', () => {
      inputHandler.removeCombo('heavy_strike');
      
      const combos = inputHandler['combos'];
      expect(combos).toHaveLength(0);
      
      const state = inputHandler.getInputState();
      expect(state.comboProgress['heavy_strike']).toBeUndefined();
    });
  });

  describe('Key Mapping', () => {
    it('should map keyboard keys to actions', () => {
      const spaceKeyCode = 'SPACE';
      const action = inputHandler['mapKeyToAction'](spaceKeyCode);
      
      expect(action).toBe('melee');
    });

    it('should map projectile selection keys', () => {
      const oneKeyCode = 'ONE';
      const action = inputHandler['mapKeyToAction'](oneKeyCode);
      
      expect(action).toBe('select_projectile1');
    });

    it('should map AOE selection keys', () => {
      const qKeyCode = 'Q';
      const action = inputHandler['mapKeyToAction'](qKeyCode);
      
      expect(action).toBe('select_aoe1');
    });

    it('should return null for unmapped keys', () => {
      const unmappedKey = 'Z';
      const action = inputHandler['mapKeyToAction'](unmappedKey);
      
      expect(action).toBeNull();
    });
  });

  describe('Movement Handling', () => {
    beforeEach(() => {
      inputHandler.registerCallback('movement', mockCallback);
    });

    it('should detect movement when keys are pressed', () => {
      // Mock key press states for movement keys
      const leftKey = { isDown: true, keyCode: 37 };
      inputHandler['config'].movement.left = [leftKey as Phaser.Input.Keyboard.Key];
      
      inputHandler['updateMovement']();
      
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number)
      }));
    });

    it('should calculate correct movement vectors', () => {
      const leftKey = { isDown: true, keyCode: 37 };
      const upKey = { isDown: true, keyCode: 38 };
      
      inputHandler['config'].movement.left = [leftKey as Phaser.Input.Keyboard.Key];
      inputHandler['config'].movement.up = [upKey as Phaser.Input.Keyboard.Key];
      inputHandler['config'].movement.right = [];
      inputHandler['config'].movement.down = [];
      
      inputHandler['updateMovement']();
      
      expect(mockCallback).toHaveBeenCalledWith({ x: -1, y: -1 });
    });
  });

  describe('Update Loop', () => {
    it('should process buffered inputs in update', () => {
      inputHandler.registerCallback('melee', mockCallback);
      inputHandler.registerCallback('projectile', mockCallback);
      
      // Start action and buffer another
      inputHandler['processInput']('melee');
      inputHandler['processInput']('projectile');
      
      expect(inputHandler.getBufferedInputCount()).toBe(1);
      
      // Mock action completion by setting start time in the past
      inputHandler['state'].actionStartTime = Date.now() - 400; // Melee duration is 300ms
      
      inputHandler.update();
      
      expect(inputHandler.getBufferedInputCount()).toBe(0);
      expect(inputHandler.getCurrentAction()).toBe('projectile');
    });

    it('should clean expired buffered inputs', () => {
      inputHandler.registerCallback('melee', mockCallback);
      inputHandler.registerCallback('projectile', mockCallback);
      
      // Start action and buffer another
      inputHandler['processInput']('melee');
      inputHandler['processInput']('projectile');
      
      // Mock expired buffer time
      const state = inputHandler.getInputState();
      state.bufferedInputs[0].timestamp = Date.now() - 600; // Older than 500ms window
      
      inputHandler['cleanExpiredBufferedInputs']();
      
      expect(inputHandler.getBufferedInputCount()).toBe(0);
    });

    it('should clean expired combo progress', () => {
      const combo: ComboDefinition = {
        id: 'test_combo',
        sequence: ['melee', 'projectile'],
        timeWindow: 1000,
        action: 'test_action'
      };
      
      inputHandler.addCombo(combo);
      inputHandler['processInput']('melee');
      
      // Advance time beyond combo window
      inputHandler['state'].lastInputTime = Date.now() - 1100;
      
      inputHandler['cleanExpiredComboProgress']();
      
      expect(inputHandler['state'].comboProgress['test_combo']).toBe(0);
    });
  });

  describe('State Management', () => {
    it('should provide input state snapshot', () => {
      const state = inputHandler.getInputState();
      
      expect(state).toHaveProperty('currentAction');
      expect(state).toHaveProperty('actionStartTime');
      expect(state).toHaveProperty('bufferedInputs');
      expect(state).toHaveProperty('comboProgress');
      expect(state).toHaveProperty('lastInputTime');
    });

    it('should clear buffered inputs', () => {
      inputHandler.registerCallback('melee', mockCallback);
      inputHandler.registerCallback('projectile', mockCallback);
      
      // Buffer some inputs
      inputHandler['processInput']('melee');
      inputHandler['processInput']('projectile');
      
      expect(inputHandler.getBufferedInputCount()).toBe(1);
      
      inputHandler.clearBufferedInputs();
      
      expect(inputHandler.getBufferedInputCount()).toBe(0);
    });

    it('should check if action is in progress', () => {
      expect(inputHandler.isActionInProgress()).toBe(false);
      
      inputHandler.registerCallback('melee', mockCallback);
      inputHandler['processInput']('melee');
      
      expect(inputHandler.isActionInProgress()).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      inputHandler.destroy();
      
      expect(mockKeyboard.off).toHaveBeenCalledWith('keydown');
      expect(mockInput.off).toHaveBeenCalledWith('pointerdown');
      
      const callbacks = inputHandler['callbacks'];
      expect(callbacks.size).toBe(0);
      
      const combos = inputHandler['combos'];
      expect(combos).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing callback gracefully', () => {
      expect(() => {
        inputHandler['processInput']('unmapped_action');
      }).not.toThrow();
    });

    it('should handle invalid key codes gracefully', () => {
      const result = inputHandler['mapKeyToAction']('InvalidKey');
      expect(result).toBeNull();
    });

    it('should handle empty movement gracefully', () => {
      inputHandler.registerCallback('movement', mockCallback);
      
      // All movement keys are up
      mockKey.isDown = false;
      
      inputHandler['updateMovement']();
      
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle update without buffered inputs', () => {
      expect(() => {
        inputHandler.update();
      }).not.toThrow();
    });
  });
});