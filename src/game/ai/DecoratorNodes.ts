import { BehaviorNode, NodeStatus, IBlackboard } from './BehaviorTree';

/**
 * Base decorator node - has exactly one child
 */
export abstract class DecoratorNode extends BehaviorNode {
  protected child: BehaviorNode | null = null;

  public addChild(child: BehaviorNode): void {
    if (this.child) {
      throw new Error('Decorator nodes can only have one child');
    }
    super.addChild(child);
    this.child = child;
  }

  public removeChild(child: BehaviorNode): void {
    super.removeChild(child);
    if (this.child === child) {
      this.child = null;
    }
  }
}

/**
 * Inverter decorator - inverts the result of its child
 * SUCCESS becomes FAILURE, FAILURE becomes SUCCESS, RUNNING stays RUNNING
 */
export class InverterNode extends DecoratorNode {
  public tick(blackboard: IBlackboard): NodeStatus {
    if (!this.child) {
      return NodeStatus.FAILURE;
    }

    const status = this.child.tick(blackboard);

    switch (status) {
      case NodeStatus.SUCCESS:
        return NodeStatus.FAILURE;
      case NodeStatus.FAILURE:
        return NodeStatus.SUCCESS;
      case NodeStatus.RUNNING:
        return NodeStatus.RUNNING;
      default:
        return NodeStatus.FAILURE;
    }
  }
}

/**
 * Succeeder decorator - always returns SUCCESS regardless of child result
 */
export class SucceederNode extends DecoratorNode {
  public tick(blackboard: IBlackboard): NodeStatus {
    if (!this.child) {
      return NodeStatus.SUCCESS;
    }

    this.child.tick(blackboard);
    return NodeStatus.SUCCESS;
  }
}

/**
 * Failer decorator - always returns FAILURE regardless of child result
 */
export class FailerNode extends DecoratorNode {
  public tick(blackboard: IBlackboard): NodeStatus {
    if (!this.child) {
      return NodeStatus.FAILURE;
    }

    this.child.tick(blackboard);
    return NodeStatus.FAILURE;
  }
}

/**
 * Repeater decorator - repeats its child a specified number of times or infinitely
 */
export class RepeaterNode extends DecoratorNode {
  private maxRepeats: number;
  private currentRepeats: number = 0;
  private isInfinite: boolean = false;

  constructor(maxRepeats: number = -1) {
    super();
    if (maxRepeats < 0) {
      this.isInfinite = true;
      this.maxRepeats = 0;
    } else {
      this.maxRepeats = maxRepeats;
    }
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    if (!this.child) {
      return NodeStatus.FAILURE;
    }

    while (this.isInfinite || this.currentRepeats < this.maxRepeats) {
      const status = this.child.tick(blackboard);

      if (status === NodeStatus.RUNNING) {
        return NodeStatus.RUNNING;
      }

      this.currentRepeats++;

      if (!this.isInfinite && this.currentRepeats >= this.maxRepeats) {
        this.reset();
        return NodeStatus.SUCCESS;
      }

      // For infinite repeaters, continue the loop
      // For finite repeaters, continue until max repeats reached
    }

    this.reset();
    return NodeStatus.SUCCESS;
  }

  protected reset(): void {
    this.currentRepeats = 0;
  }
}

/**
 * Retry decorator - retries its child until it succeeds or max attempts reached
 */
export class RetryNode extends DecoratorNode {
  private maxAttempts: number;
  private currentAttempts: number = 0;

  constructor(maxAttempts: number = 3) {
    super();
    this.maxAttempts = Math.max(1, maxAttempts);
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    if (!this.child) {
      return NodeStatus.FAILURE;
    }

    while (this.currentAttempts < this.maxAttempts) {
      const status = this.child.tick(blackboard);

      if (status === NodeStatus.SUCCESS) {
        this.reset();
        return NodeStatus.SUCCESS;
      }

      if (status === NodeStatus.RUNNING) {
        return NodeStatus.RUNNING;
      }

      // Child failed, try again
      this.currentAttempts++;
    }

    // All attempts exhausted
    this.reset();
    return NodeStatus.FAILURE;
  }

  protected reset(): void {
    this.currentAttempts = 0;
  }
}

/**
 * Timeout decorator - fails if child takes longer than specified time
 */
export class TimeoutNode extends DecoratorNode {
  private timeoutMs: number;
  private startTime: number = 0;
  private isRunning: boolean = false;

  constructor(timeoutMs: number) {
    super();
    this.timeoutMs = timeoutMs;
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    if (!this.child) {
      return NodeStatus.FAILURE;
    }

    const currentTime = Date.now();

    if (!this.isRunning) {
      this.startTime = currentTime;
      this.isRunning = true;
    }

    // Check for timeout
    if (currentTime - this.startTime > this.timeoutMs) {
      this.reset();
      return NodeStatus.FAILURE;
    }

    const status = this.child.tick(blackboard);

    if (status !== NodeStatus.RUNNING) {
      this.reset();
    }

    return status;
  }

  protected reset(): void {
    this.startTime = 0;
    this.isRunning = false;
  }
}

/**
 * Cooldown decorator - prevents child from running too frequently
 */
export class CooldownNode extends DecoratorNode {
  private cooldownMs: number;
  private lastExecutionTime: number = 0;

  constructor(cooldownMs: number) {
    super();
    this.cooldownMs = cooldownMs;
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    if (!this.child) {
      return NodeStatus.FAILURE;
    }

    const currentTime = Date.now();

    if (currentTime - this.lastExecutionTime < this.cooldownMs) {
      return NodeStatus.FAILURE;
    }

    const status = this.child.tick(blackboard);

    if (status !== NodeStatus.RUNNING) {
      this.lastExecutionTime = currentTime;
    }

    return status;
  }
}

/**
 * Condition decorator - only executes child if condition is met
 */
export class ConditionalNode extends DecoratorNode {
  private condition: (blackboard: IBlackboard) => boolean;

  constructor(condition: (blackboard: IBlackboard) => boolean) {
    super();
    this.condition = condition;
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    if (!this.child) {
      return NodeStatus.FAILURE;
    }

    if (!this.condition(blackboard)) {
      return NodeStatus.FAILURE;
    }

    return this.child.tick(blackboard);
  }
}