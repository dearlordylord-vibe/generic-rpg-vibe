import { describe, it, expect, beforeEach } from 'vitest';
import { BehaviorTree, NodeStatus } from '../BehaviorTree';
import { SequenceNode, SelectorNode } from '../CompositeNodes';
import { ActionNode, ConditionNode } from '../LeafNodes';
import { createBehaviorTree } from '../BehaviorTreeBuilder';

describe('BehaviorTree', () => {
  let tree: BehaviorTree;

  beforeEach(() => {
    tree = new BehaviorTree();
  });

  it('should create empty tree', () => {
    expect(tree.getRoot()).toBeNull();
  });

  it('should execute simple action tree', () => {
    let executed = false;
    const action = new ActionNode('test', () => {
      executed = true;
      return NodeStatus.SUCCESS;
    });
    
    tree.setRoot(action);
    const result = tree.tick();
    
    expect(result).toBe(NodeStatus.SUCCESS);
    expect(executed).toBe(true);
  });

  it('should handle sequence node correctly', () => {
    const results: string[] = [];
    
    const sequence = new SequenceNode();
    sequence.addChild(new ActionNode('first', () => {
      results.push('first');
      return NodeStatus.SUCCESS;
    }));
    sequence.addChild(new ActionNode('second', () => {
      results.push('second');
      return NodeStatus.SUCCESS;
    }));
    
    tree.setRoot(sequence);
    const result = tree.tick();
    
    expect(result).toBe(NodeStatus.SUCCESS);
    expect(results).toEqual(['first', 'second']);
  });

  it('should handle selector node correctly', () => {
    const results: string[] = [];
    
    const selector = new SelectorNode();
    selector.addChild(new ActionNode('first', () => {
      results.push('first');
      return NodeStatus.FAILURE;
    }));
    selector.addChild(new ActionNode('second', () => {
      results.push('second');
      return NodeStatus.SUCCESS;
    }));
    selector.addChild(new ActionNode('third', () => {
      results.push('third');
      return NodeStatus.SUCCESS;
    }));
    
    tree.setRoot(selector);
    const result = tree.tick();
    
    expect(result).toBe(NodeStatus.SUCCESS);
    expect(results).toEqual(['first', 'second']); // Third should not execute
  });

  it('should use blackboard for data sharing', () => {
    tree.setBlackboardValue('testValue', 42);
    
    const condition = new ConditionNode('check', (bb) => bb.testValue === 42);
    tree.setRoot(condition);
    
    const result = tree.tick();
    expect(result).toBe(NodeStatus.SUCCESS);
  });

  it('should build tree with fluent builder', () => {
    let actionExecuted = false;
    
    const builtTree = createBehaviorTree()
      .sequence()
        .condition('check', (bb) => bb.hasTarget === true)
        .action('attack', () => {
          actionExecuted = true;
          return NodeStatus.SUCCESS;
        })
      .end()
      .build();
    
    builtTree.setBlackboardValue('hasTarget', true);
    const result = builtTree.tick();
    
    expect(result).toBe(NodeStatus.SUCCESS);
    expect(actionExecuted).toBe(true);
  });

  it('should handle complex nested tree', () => {
    const results: string[] = [];
    
    const complexTree = createBehaviorTree()
      .selector()
        // First branch - should fail
        .sequence()
          .condition('impossible', () => false)
          .action('shouldNotRun', () => {
            results.push('shouldNotRun');
            return NodeStatus.SUCCESS;
          })
        .end()
        
        // Second branch - should succeed
        .sequence()
          .condition('possible', () => true)
          .action('shouldRun', () => {
            results.push('shouldRun');
            return NodeStatus.SUCCESS;
          })
        .end()
      .end()
      .build();
    
    const result = complexTree.tick();
    
    expect(result).toBe(NodeStatus.SUCCESS);
    expect(results).toEqual(['shouldRun']);
  });
});

describe('BehaviorTreeBuilder', () => {
  it('should build complex AI tree', () => {
    const aiTree = createBehaviorTree()
      .selector()
        // High priority: handle death
        .condition('isDead', (bb) => bb.health <= 0)
        
        // Medium priority: combat
        .sequence()
          .condition('hasTarget', (bb) => bb.hasTarget)
          .selector()
            // Attack if in range
            .sequence()
              .condition('inRange', (bb) => bb.distance <= bb.attackRange)
              .action('attack', () => NodeStatus.SUCCESS)
            .end()
            
            // Chase if detected
            .action('chase', () => NodeStatus.SUCCESS)
          .end()
        .end()
        
        // Low priority: patrol
        .action('patrol', () => NodeStatus.SUCCESS)
      .end()
      .build();
    
    // Test death condition
    aiTree.setBlackboardValue('health', 0);
    expect(aiTree.tick()).toBe(NodeStatus.SUCCESS);
    
    // Test combat with target in range
    aiTree.setBlackboardValue('health', 100);
    aiTree.setBlackboardValue('hasTarget', true);
    aiTree.setBlackboardValue('distance', 30);
    aiTree.setBlackboardValue('attackRange', 50);
    expect(aiTree.tick()).toBe(NodeStatus.SUCCESS);
    
    // Test chase when target out of range
    aiTree.setBlackboardValue('distance', 100);
    expect(aiTree.tick()).toBe(NodeStatus.SUCCESS);
    
    // Test patrol when no target
    aiTree.setBlackboardValue('hasTarget', false);
    expect(aiTree.tick()).toBe(NodeStatus.SUCCESS);
  });
});