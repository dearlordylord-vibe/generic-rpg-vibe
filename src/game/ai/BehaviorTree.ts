export enum NodeStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  RUNNING = 'RUNNING'
}

export interface IBlackboard {
  [key: string]: any;
}

export abstract class BehaviorNode {
  protected children: BehaviorNode[] = [];
  protected parent: BehaviorNode | null = null;

  public abstract tick(blackboard: IBlackboard): NodeStatus;

  public addChild(child: BehaviorNode): void {
    child.parent = this;
    this.children.push(child);
  }

  public removeChild(child: BehaviorNode): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }

  public getChildren(): BehaviorNode[] {
    return [...this.children];
  }

  public getParent(): BehaviorNode | null {
    return this.parent;
  }

  protected reset(): void {
    // Override in child classes if needed
  }
}

export class BehaviorTree {
  private root: BehaviorNode | null = null;
  private blackboard: IBlackboard = {};

  constructor(root?: BehaviorNode) {
    if (root) {
      this.root = root;
    }
  }

  public setRoot(root: BehaviorNode): void {
    this.root = root;
  }

  public getRoot(): BehaviorNode | null {
    return this.root;
  }

  public tick(): NodeStatus {
    if (!this.root) {
      return NodeStatus.FAILURE;
    }
    
    return this.root.tick(this.blackboard);
  }

  public getBlackboard(): IBlackboard {
    return this.blackboard;
  }

  public setBlackboardValue(key: string, value: any): void {
    this.blackboard[key] = value;
  }

  public getBlackboardValue<T>(key: string, defaultValue?: T): T {
    return this.blackboard[key] ?? defaultValue;
  }

  public hasBlackboardValue(key: string): boolean {
    return key in this.blackboard;
  }

  public clearBlackboard(): void {
    this.blackboard = {};
  }
}