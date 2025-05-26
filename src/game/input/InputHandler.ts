// Import removed: CombatAction not used in this file

export interface InputConfig {
  melee: Phaser.Input.Keyboard.Key[];
  projectile: Phaser.Input.Keyboard.Key[];
  aoe: Phaser.Input.Keyboard.Key[];
  block: Phaser.Input.Keyboard.Key[];
  dodge: Phaser.Input.Keyboard.Key[];
  movement: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
  };
  projectileSelection: { [key: string]: Phaser.Input.Keyboard.Key };
  aoeSelection: { [key: string]: Phaser.Input.Keyboard.Key };
}

export interface InputCommand {
  action: string;
  timestamp: number;
  data?: unknown;
}

export interface ComboDefinition {
  id: string;
  sequence: string[];
  timeWindow: number;
  action: string;
}

export interface InputState {
  currentAction: string | null;
  actionStartTime: number;
  bufferedInputs: InputCommand[];
  comboProgress: { [comboId: string]: number };
  lastInputTime: number;
}

export class InputHandler {
  private scene: Phaser.Scene;
  private config: InputConfig;
  private state: InputState;
  private combos: ComboDefinition[];
  private maxBufferSize: number = 5;
  private bufferTimeWindow: number = 500;
  private callbacks: Map<string, (data?: unknown) => void>;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.callbacks = new Map();
    this.combos = [];
    this.state = {
      currentAction: null,
      actionStartTime: 0,
      bufferedInputs: [],
      comboProgress: {},
      lastInputTime: 0
    };
    this.config = this.createDefaultConfig();
    this.setupInputHandlers();
  }

  private createDefaultConfig(): InputConfig {
    const keyboard = this.scene.input.keyboard;
    
    return {
      melee: [keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)],
      projectile: [keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL)],
      aoe: [keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ALT)],
      block: [keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)],
      dodge: [keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL)],
      movement: {
        up: [keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP), keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)],
        down: [keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN), keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)],
        left: [keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT), keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)],
        right: [keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT), keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)]
      },
      projectileSelection: {
        'projectile1': keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
        'projectile2': keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
        'projectile3': keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
        'projectile4': keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR)
      },
      aoeSelection: {
        'aoe1': keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
        'aoe2': keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        'aoe3': keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        'aoe4': keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R),
        'aoe5': keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T)
      }
    };
  }

  private setupInputHandlers(): void {
    this.scene.input.keyboard!.on('keydown', this.handleKeyDown.bind(this));
    this.scene.input.on('pointerdown', this.handlePointerDown.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const action = this.mapKeyToAction(event.code);
    if (action) {
      this.processInput(action);
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    let action = '';
    
    switch (pointer.button) {
      case 0: // Left click
        action = 'melee';
        break;
      case 1: // Middle click
        action = 'aoe';
        break;
      case 2: // Right click
        action = 'projectile';
        break;
    }

    if (action) {
      this.processInput(action, { x: pointer.x, y: pointer.y });
    }
  }

  private mapKeyToAction(keyCode: string): string | null {
    const targetKeyCode = Phaser.Input.Keyboard.KeyCodes[keyCode as keyof typeof Phaser.Input.Keyboard.KeyCodes];
    
    for (const [action, keys] of Object.entries(this.config)) {
      if (action === 'movement' || action === 'projectileSelection' || action === 'aoeSelection') {
        continue;
      }
      
      const keyArray = keys as Phaser.Input.Keyboard.Key[];
      if (keyArray.some(key => key.keyCode === targetKeyCode)) {
        return action;
      }
    }

    for (const [selectionAction, selection] of Object.entries(this.config.projectileSelection)) {
      if (selection.keyCode === targetKeyCode) {
        return `select_${selectionAction}`;
      }
    }

    for (const [selectionAction, selection] of Object.entries(this.config.aoeSelection)) {
      if (selection.keyCode === targetKeyCode) {
        return `select_${selectionAction}`;
      }
    }

    return null;
  }

  private processInput(action: string, data?: unknown): void {
    const currentTime = Date.now();
    const command: InputCommand = {
      action,
      timestamp: currentTime,
      data
    };

    this.state.lastInputTime = currentTime;

    if (this.canExecuteImmediately(action)) {
      this.executeCommand(command);
    } else {
      this.bufferInput(command);
    }

    this.updateComboProgress(action, currentTime);
  }

  private canExecuteImmediately(action: string): boolean {
    if (!this.state.currentAction) {
      return true;
    }

    if (this.isPriorityAction(action)) {
      return true;
    }

    if (this.isInterruptibleAction(this.state.currentAction)) {
      return true;
    }

    const actionDuration = this.getActionDuration(this.state.currentAction);
    const timeSinceStart = Date.now() - this.state.actionStartTime;
    
    return timeSinceStart >= actionDuration;
  }

  private isInterruptibleAction(action: string): boolean {
    const interruptibleActions = ['movement', 'block'];
    return interruptibleActions.includes(action);
  }

  private isPriorityAction(action: string): boolean {
    const priorityActions = ['dodge', 'block'];
    return priorityActions.includes(action);
  }

  private getActionDuration(action: string): number {
    const durations: { [key: string]: number } = {
      melee: 300,
      projectile: 200,
      aoe: 500,
      block: 500,
      dodge: 300,
      movement: 0
    };
    return durations[action] || 0;
  }

  private bufferInput(command: InputCommand): void {
    this.state.bufferedInputs.push(command);
    
    if (this.state.bufferedInputs.length > this.maxBufferSize) {
      this.state.bufferedInputs.shift();
    }

    this.cleanExpiredBufferedInputs();
  }

  private cleanExpiredBufferedInputs(): void {
    const currentTime = Date.now();
    this.state.bufferedInputs = this.state.bufferedInputs.filter(
      command => (currentTime - command.timestamp) <= this.bufferTimeWindow
    );
  }

  private executeCommand(command: InputCommand): void {
    this.state.currentAction = command.action;
    this.state.actionStartTime = command.timestamp;

    const callback = this.callbacks.get(command.action);
    if (callback) {
      callback(command.data);
    }
  }

  private updateComboProgress(action: string, _currentTime: number): void {
    for (const combo of this.combos) {
      const currentStep = this.state.comboProgress[combo.id] || 0;
      const expectedAction = combo.sequence[currentStep];

      if (action === expectedAction) {
        this.state.comboProgress[combo.id] = currentStep + 1;

        if (this.state.comboProgress[combo.id] >= combo.sequence.length) {
          this.executeCombo(combo);
          this.state.comboProgress[combo.id] = 0;
        }
      } else {
        this.state.comboProgress[combo.id] = 0;
      }
    }
  }

  private executeCombo(combo: ComboDefinition): void {
    const callback = this.callbacks.get(combo.action);
    if (callback) {
      callback({ comboId: combo.id });
    }
  }

  public update(): void {
    this.processBufferedInputs();
    this.updateMovement();
    this.cleanExpiredComboProgress();
  }

  private processBufferedInputs(): void {
    if (this.state.bufferedInputs.length === 0) {
      return;
    }

    if (!this.state.currentAction || this.isActionComplete()) {
      this.state.currentAction = null; // Clear completed action
      const nextCommand = this.state.bufferedInputs.shift();
      if (nextCommand) {
        this.executeCommand(nextCommand);
      }
    }
  }

  private isActionComplete(): boolean {
    if (!this.state.currentAction) {
      return true;
    }

    const actionDuration = this.getActionDuration(this.state.currentAction);
    const timeSinceStart = Date.now() - this.state.actionStartTime;
    
    return timeSinceStart >= actionDuration;
  }

  private updateMovement(): void {
    const movement = { x: 0, y: 0 };

    if (this.isKeyPressed(this.config.movement.left)) {
      movement.x -= 1;
    }
    if (this.isKeyPressed(this.config.movement.right)) {
      movement.x += 1;
    }
    if (this.isKeyPressed(this.config.movement.up)) {
      movement.y -= 1;
    }
    if (this.isKeyPressed(this.config.movement.down)) {
      movement.y += 1;
    }

    if (movement.x !== 0 || movement.y !== 0) {
      const callback = this.callbacks.get('movement');
      if (callback) {
        callback(movement);
      }
    }
  }

  private isKeyPressed(keys: Phaser.Input.Keyboard.Key[]): boolean {
    return keys.some(key => key.isDown);
  }

  private cleanExpiredComboProgress(): void {
    const currentTime = Date.now();
    for (const combo of this.combos) {
      const timeSinceLastInput = currentTime - this.state.lastInputTime;
      if (timeSinceLastInput > combo.timeWindow) {
        this.state.comboProgress[combo.id] = 0;
      }
    }
  }

  public registerCallback(action: string, callback: (data?: unknown) => void): void {
    this.callbacks.set(action, callback);
  }

  public unregisterCallback(action: string): void {
    this.callbacks.delete(action);
  }

  public addCombo(combo: ComboDefinition): void {
    this.combos.push(combo);
    this.state.comboProgress[combo.id] = 0;
  }

  public removeCombo(comboId: string): void {
    this.combos = this.combos.filter(combo => combo.id !== comboId);
    delete this.state.comboProgress[comboId];
  }

  public getInputState(): InputState {
    return { ...this.state };
  }

  public clearBufferedInputs(): void {
    this.state.bufferedInputs = [];
  }

  public isActionInProgress(): boolean {
    return this.state.currentAction !== null && !this.isActionComplete();
  }

  public getCurrentAction(): string | null {
    return this.state.currentAction;
  }

  public getBufferedInputCount(): number {
    return this.state.bufferedInputs.length;
  }

  public destroy(): void {
    this.scene.input.keyboard!.off('keydown');
    this.scene.input.off('pointerdown');
    this.callbacks.clear();
    this.combos = [];
  }
}