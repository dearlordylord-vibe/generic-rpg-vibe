import { BehaviorTree, BehaviorNode, IBlackboard, NodeStatus } from './BehaviorTree';
import { SequenceNode, SelectorNode, ParallelNode, RandomSelectorNode, WeightedSelectorNode, ParallelPolicy } from './CompositeNodes';
import { InverterNode, SucceederNode, FailerNode, RepeaterNode, RetryNode, TimeoutNode, CooldownNode, ConditionalNode } from './DecoratorNodes';
import { ActionNode, ConditionNode, WaitNode, SuccessNode, FailureNode, RunningNode, LogNode, SetBlackboardValueNode, ClearBlackboardValueNode } from './LeafNodes';

/**
 * Fluent builder for constructing behavior trees
 */
export class BehaviorTreeBuilder {
  private nodeStack: BehaviorNode[] = [];
  private root: BehaviorNode | null = null;

  /**
   * Create a new sequence node and add it to the current context
   */
  public sequence(): BehaviorTreeBuilder {
    const node = new SequenceNode();
    this.addNode(node);
    return this;
  }

  /**
   * Create a new selector node and add it to the current context
   */
  public selector(): BehaviorTreeBuilder {
    const node = new SelectorNode();
    this.addNode(node);
    return this;
  }

  /**
   * Create a new parallel node and add it to the current context
   */
  public parallel(policy: ParallelPolicy = ParallelPolicy.REQUIRE_ONE): BehaviorTreeBuilder {
    const node = new ParallelNode(policy);
    this.addNode(node);
    return this;
  }

  /**
   * Create a new random selector node and add it to the current context
   */
  public randomSelector(): BehaviorTreeBuilder {
    const node = new RandomSelectorNode();
    this.addNode(node);
    return this;
  }

  /**
   * Create a new weighted selector node and add it to the current context
   */
  public weightedSelector(weights: number[]): BehaviorTreeBuilder {
    const node = new WeightedSelectorNode();
    node.setWeights(weights);
    this.addNode(node);
    return this;
  }

  /**
   * Create an inverter decorator and add it to the current context
   */
  public inverter(): BehaviorTreeBuilder {
    const node = new InverterNode();
    this.addNode(node);
    return this;
  }

  /**
   * Create a succeeder decorator and add it to the current context
   */
  public succeeder(): BehaviorTreeBuilder {
    const node = new SucceederNode();
    this.addNode(node);
    return this;
  }

  /**
   * Create a failer decorator and add it to the current context
   */
  public failer(): BehaviorTreeBuilder {
    const node = new FailerNode();
    this.addNode(node);
    return this;
  }

  /**
   * Create a repeater decorator and add it to the current context
   */
  public repeater(maxRepeats: number = -1): BehaviorTreeBuilder {
    const node = new RepeaterNode(maxRepeats);
    this.addNode(node);
    return this;
  }

  /**
   * Create a retry decorator and add it to the current context
   */
  public retry(maxAttempts: number = 3): BehaviorTreeBuilder {
    const node = new RetryNode(maxAttempts);
    this.addNode(node);
    return this;
  }

  /**
   * Create a timeout decorator and add it to the current context
   */
  public timeout(timeoutMs: number): BehaviorTreeBuilder {
    const node = new TimeoutNode(timeoutMs);
    this.addNode(node);
    return this;
  }

  /**
   * Create a cooldown decorator and add it to the current context
   */
  public cooldown(cooldownMs: number): BehaviorTreeBuilder {
    const node = new CooldownNode(cooldownMs);
    this.addNode(node);
    return this;
  }

  /**
   * Create a conditional decorator and add it to the current context
   */
  public conditional(condition: (blackboard: IBlackboard) => boolean): BehaviorTreeBuilder {
    const node = new ConditionalNode(condition);
    this.addNode(node);
    return this;
  }

  /**
   * Create an action node and add it to the current context
   */
  public action(name: string, action: (blackboard: IBlackboard) => NodeStatus): BehaviorTreeBuilder {
    const node = new ActionNode(name, action);
    this.addNode(node);
    return this;
  }

  /**
   * Create a condition node and add it to the current context
   */
  public condition(name: string, condition: (blackboard: IBlackboard) => boolean): BehaviorTreeBuilder {
    const node = new ConditionNode(name, condition);
    this.addNode(node);
    return this;
  }

  /**
   * Create a wait node and add it to the current context
   */
  public wait(duration: number): BehaviorTreeBuilder {
    const node = new WaitNode(duration);
    this.addNode(node);
    return this;
  }

  /**
   * Create a success node and add it to the current context
   */
  public success(): BehaviorTreeBuilder {
    const node = new SuccessNode();
    this.addNode(node);
    return this;
  }

  /**
   * Create a failure node and add it to the current context
   */
  public failure(): BehaviorTreeBuilder {
    const node = new FailureNode();
    this.addNode(node);
    return this;
  }

  /**
   * Create a running node and add it to the current context
   */
  public running(): BehaviorTreeBuilder {
    const node = new RunningNode();
    this.addNode(node);
    return this;
  }

  /**
   * Create a log node and add it to the current context
   */
  public log(message: string, logLevel: 'info' | 'warn' | 'error' | 'debug' = 'info'): BehaviorTreeBuilder {
    const node = new LogNode(message, logLevel);
    this.addNode(node);
    return this;
  }

  /**
   * Create a set blackboard value node and add it to the current context
   */
  public setBlackboardValue(key: string, value: any | ((blackboard: IBlackboard) => any)): BehaviorTreeBuilder {
    const node = new SetBlackboardValueNode(key, value);
    this.addNode(node);
    return this;
  }

  /**
   * Create a clear blackboard value node and add it to the current context
   */
  public clearBlackboardValue(key: string): BehaviorTreeBuilder {
    const node = new ClearBlackboardValueNode(key);
    this.addNode(node);
    return this;
  }

  /**
   * End the current composite/decorator node and return to its parent
   */
  public end(): BehaviorTreeBuilder {
    if (this.nodeStack.length > 0) {
      this.nodeStack.pop();
    }
    return this;
  }

  /**
   * Build and return the complete behavior tree
   */
  public build(): BehaviorTree {
    if (!this.root) {
      throw new Error('Cannot build tree: no root node defined');
    }
    
    const tree = new BehaviorTree(this.root);
    this.reset();
    return tree;
  }

  /**
   * Reset the builder to start fresh
   */
  public reset(): void {
    this.nodeStack = [];
    this.root = null;
  }

  /**
   * Add a node to the current context
   */
  private addNode(node: BehaviorNode): void {
    if (!this.root) {
      this.root = node;
    }

    if (this.nodeStack.length > 0) {
      const parent = this.nodeStack[this.nodeStack.length - 1];
      parent.addChild(node);
    }

    // If this node can have children, add it to the stack
    if (this.canHaveChildren(node)) {
      this.nodeStack.push(node);
    }
  }

  /**
   * Check if a node can have children (composite or decorator nodes)
   */
  private canHaveChildren(node: BehaviorNode): boolean {
    return !(node instanceof ActionNode ||
             node instanceof ConditionNode ||
             node instanceof WaitNode ||
             node instanceof SuccessNode ||
             node instanceof FailureNode ||
             node instanceof RunningNode ||
             node instanceof LogNode ||
             node instanceof SetBlackboardValueNode ||
             node instanceof ClearBlackboardValueNode);
  }
}

/**
 * Helper function to create a new behavior tree builder
 */
export function createBehaviorTree(): BehaviorTreeBuilder {
  return new BehaviorTreeBuilder();
}