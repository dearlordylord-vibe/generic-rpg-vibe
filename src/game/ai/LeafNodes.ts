import { BehaviorNode, NodeStatus, IBlackboard } from './BehaviorTree';

/**
 * Base leaf node - has no children and performs actual actions
 */
export abstract class LeafNode extends BehaviorNode {
  public addChild(_child: BehaviorNode): void {
    throw new Error('Leaf nodes cannot have children');
  }
}

/**
 * Action node - executes a custom action function
 */
export class ActionNode extends LeafNode {
  private action: (blackboard: IBlackboard) => NodeStatus;
  private name: string;

  constructor(name: string, action: (blackboard: IBlackboard) => NodeStatus) {
    super();
    this.name = name;
    this.action = action;
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    try {
      return this.action(blackboard);
    } catch (error) {
      console.error(`Action node "${this.name}" failed:`, error);
      return NodeStatus.FAILURE;
    }
  }

  public getName(): string {
    return this.name;
  }
}

/**
 * Condition node - checks a condition and returns SUCCESS/FAILURE
 */
export class ConditionNode extends LeafNode {
  private condition: (blackboard: IBlackboard) => boolean;
  private name: string;

  constructor(name: string, condition: (blackboard: IBlackboard) => boolean) {
    super();
    this.name = name;
    this.condition = condition;
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    try {
      return this.condition(blackboard) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
    } catch (error) {
      console.error(`Condition node "${this.name}" failed:`, error);
      return NodeStatus.FAILURE;
    }
  }

  public getName(): string {
    return this.name;
  }
}

/**
 * Wait node - waits for a specified duration
 */
export class WaitNode extends LeafNode {
  private duration: number;
  private startTime: number = 0;
  private isWaiting: boolean = false;

  constructor(duration: number) {
    super();
    this.duration = duration;
  }

  public tick(_blackboard: IBlackboard): NodeStatus {
    const currentTime = Date.now();

    if (!this.isWaiting) {
      this.startTime = currentTime;
      this.isWaiting = true;
    }

    if (currentTime - this.startTime >= this.duration) {
      this.reset();
      return NodeStatus.SUCCESS;
    }

    return NodeStatus.RUNNING;
  }

  protected reset(): void {
    this.startTime = 0;
    this.isWaiting = false;
  }
}

/**
 * Success node - always returns SUCCESS
 */
export class SuccessNode extends LeafNode {
  public tick(_blackboard: IBlackboard): NodeStatus {
    return NodeStatus.SUCCESS;
  }
}

/**
 * Failure node - always returns FAILURE
 */
export class FailureNode extends LeafNode {
  public tick(_blackboard: IBlackboard): NodeStatus {
    return NodeStatus.FAILURE;
  }
}

/**
 * Running node - always returns RUNNING
 */
export class RunningNode extends LeafNode {
  public tick(_blackboard: IBlackboard): NodeStatus {
    return NodeStatus.RUNNING;
  }
}

/**
 * Log node - logs a message and returns SUCCESS
 */
export class LogNode extends LeafNode {
  private message: string;
  private logLevel: 'info' | 'warn' | 'error' | 'debug';

  constructor(message: string, logLevel: 'info' | 'warn' | 'error' | 'debug' = 'info') {
    super();
    this.message = message;
    this.logLevel = logLevel;
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    const logMessage = this.interpolateMessage(blackboard);
    
    switch (this.logLevel) {
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
    }

    return NodeStatus.SUCCESS;
  }

  private interpolateMessage(blackboard: IBlackboard): string {
    let message = this.message;
    
    // Simple variable interpolation using {variableName} syntax
    const matches = message.match(/\{([^}]+)\}/g);
    if (matches) {
      for (const match of matches) {
        const variableName = match.slice(1, -1); // Remove { and }
        const value = blackboard[variableName] ?? 'undefined';
        message = message.replace(match, String(value));
      }
    }

    return message;
  }
}

/**
 * Set Blackboard Value node - sets a value in the blackboard
 */
export class SetBlackboardValueNode extends LeafNode {
  private key: string;
  private value: any;
  private valueFunction: ((blackboard: IBlackboard) => any) | null = null;

  constructor(key: string, value: any | ((blackboard: IBlackboard) => any)) {
    super();
    this.key = key;
    
    if (typeof value === 'function') {
      this.valueFunction = value;
    } else {
      this.value = value;
    }
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    try {
      const valueToSet = this.valueFunction ? this.valueFunction(blackboard) : this.value;
      blackboard[this.key] = valueToSet;
      return NodeStatus.SUCCESS;
    } catch (error) {
      console.error(`Failed to set blackboard value for key "${this.key}":`, error);
      return NodeStatus.FAILURE;
    }
  }
}

/**
 * Clear Blackboard Value node - removes a value from the blackboard
 */
export class ClearBlackboardValueNode extends LeafNode {
  private key: string;

  constructor(key: string) {
    super();
    this.key = key;
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    delete blackboard[this.key];
    return NodeStatus.SUCCESS;
  }
}