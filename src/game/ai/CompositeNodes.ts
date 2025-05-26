import { BehaviorNode, NodeStatus, IBlackboard } from './BehaviorTree';

/**
 * Sequence node - executes children in order until one fails or all succeed
 * Returns SUCCESS if all children succeed, FAILURE if any child fails, RUNNING if any child is running
 */
export class SequenceNode extends BehaviorNode {
  private currentChildIndex: number = 0;

  public tick(blackboard: IBlackboard): NodeStatus {
    while (this.currentChildIndex < this.children.length) {
      const child = this.children[this.currentChildIndex];
      const status = child.tick(blackboard);

      switch (status) {
        case NodeStatus.SUCCESS:
          this.currentChildIndex++;
          break;
        case NodeStatus.FAILURE:
          this.reset();
          return NodeStatus.FAILURE;
        case NodeStatus.RUNNING:
          return NodeStatus.RUNNING;
      }
    }

    this.reset();
    return NodeStatus.SUCCESS;
  }

  protected reset(): void {
    this.currentChildIndex = 0;
  }
}

/**
 * Selector node - executes children in order until one succeeds or all fail
 * Returns SUCCESS if any child succeeds, FAILURE if all children fail, RUNNING if any child is running
 */
export class SelectorNode extends BehaviorNode {
  private currentChildIndex: number = 0;

  public tick(blackboard: IBlackboard): NodeStatus {
    while (this.currentChildIndex < this.children.length) {
      const child = this.children[this.currentChildIndex];
      const status = child.tick(blackboard);

      switch (status) {
        case NodeStatus.SUCCESS:
          this.reset();
          return NodeStatus.SUCCESS;
        case NodeStatus.FAILURE:
          this.currentChildIndex++;
          break;
        case NodeStatus.RUNNING:
          return NodeStatus.RUNNING;
      }
    }

    this.reset();
    return NodeStatus.FAILURE;
  }

  protected reset(): void {
    this.currentChildIndex = 0;
  }
}

/**
 * Parallel node - executes all children simultaneously
 * Policy determines when to return SUCCESS/FAILURE based on children results
 */
export enum ParallelPolicy {
  REQUIRE_ONE = 'REQUIRE_ONE',    // Success when at least one child succeeds
  REQUIRE_ALL = 'REQUIRE_ALL',    // Success when all children succeed
  REQUIRE_MAJORITY = 'REQUIRE_MAJORITY' // Success when majority of children succeed
}

export class ParallelNode extends BehaviorNode {
  private policy: ParallelPolicy;

  constructor(policy: ParallelPolicy = ParallelPolicy.REQUIRE_ONE) {
    super();
    this.policy = policy;
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    if (this.children.length === 0) {
      return NodeStatus.SUCCESS;
    }

    let successCount = 0;
    let failureCount = 0;
    let runningCount = 0;

    // Execute all children
    for (const child of this.children) {
      const status = child.tick(blackboard);
      
      switch (status) {
        case NodeStatus.SUCCESS:
          successCount++;
          break;
        case NodeStatus.FAILURE:
          failureCount++;
          break;
        case NodeStatus.RUNNING:
          runningCount++;
          break;
      }
    }

    // Determine success/failure based on policy
    const requiredSuccesses = this.getRequiredSuccesses();
    const allowedFailures = this.children.length - requiredSuccesses;

    if (successCount >= requiredSuccesses) {
      return NodeStatus.SUCCESS;
    }
    
    if (failureCount > allowedFailures) {
      return NodeStatus.FAILURE;
    }

    return NodeStatus.RUNNING;
  }

  private getRequiredSuccesses(): number {
    switch (this.policy) {
      case ParallelPolicy.REQUIRE_ONE:
        return 1;
      case ParallelPolicy.REQUIRE_ALL:
        return this.children.length;
      case ParallelPolicy.REQUIRE_MAJORITY:
        return Math.ceil(this.children.length / 2);
      default:
        return 1;
    }
  }
}

/**
 * Random Selector - chooses a random child to execute
 * Useful for creating unpredictable behavior
 */
export class RandomSelectorNode extends BehaviorNode {
  private selectedIndex: number = -1;
  private hasSelected: boolean = false;

  public tick(blackboard: IBlackboard): NodeStatus {
    if (this.children.length === 0) {
      return NodeStatus.FAILURE;
    }

    // Select a random child if not already selected
    if (!this.hasSelected) {
      this.selectedIndex = Math.floor(Math.random() * this.children.length);
      this.hasSelected = true;
    }

    const child = this.children[this.selectedIndex];
    const status = child.tick(blackboard);

    if (status !== NodeStatus.RUNNING) {
      this.reset();
    }

    return status;
  }

  protected reset(): void {
    this.selectedIndex = -1;
    this.hasSelected = false;
  }
}

/**
 * Weighted Selector - chooses children based on weights
 * Higher weights have higher probability of being selected
 */
export class WeightedSelectorNode extends BehaviorNode {
  private weights: number[] = [];
  private selectedIndex: number = -1;
  private hasSelected: boolean = false;

  public setWeights(weights: number[]): void {
    if (weights.length !== this.children.length) {
      throw new Error('Weights array length must match children array length');
    }
    this.weights = [...weights];
  }

  public tick(blackboard: IBlackboard): NodeStatus {
    if (this.children.length === 0) {
      return NodeStatus.FAILURE;
    }

    // Select a weighted random child if not already selected
    if (!this.hasSelected) {
      this.selectedIndex = this.selectWeightedIndex();
      this.hasSelected = true;
    }

    const child = this.children[this.selectedIndex];
    const status = child.tick(blackboard);

    if (status !== NodeStatus.RUNNING) {
      this.reset();
    }

    return status;
  }

  private selectWeightedIndex(): number {
    if (this.weights.length === 0) {
      return Math.floor(Math.random() * this.children.length);
    }

    const totalWeight = this.weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < this.weights.length; i++) {
      random -= this.weights[i];
      if (random <= 0) {
        return i;
      }
    }

    return this.weights.length - 1;
  }

  protected reset(): void {
    this.selectedIndex = -1;
    this.hasSelected = false;
  }
}