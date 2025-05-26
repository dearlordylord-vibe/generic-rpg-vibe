import { Scene } from 'phaser';
import { Wraith } from '../../enemies/Wraith';
import { EnemyBehaviorTree, EnemyBehaviorTreeFactory } from '../EnemyBehaviorTree';
import { createBehaviorTree } from '../BehaviorTreeBuilder';
import { NodeStatus } from '../BehaviorTree';

/**
 * Example of how to extend the Wraith enemy to use behavior trees
 * This demonstrates the integration between the existing enemy system and the new behavior tree system
 */
export class WraithWithBehaviorTree extends Wraith {
  
  protected initializeBehaviorTree(): void {
    // Create a custom behavior tree for the Wraith
    const behaviorTree = createBehaviorTree()
      .selector()
        // Highest priority: Handle death
        .condition('IsDead', (bb) => bb.enemy.isDead())
        
        // High priority: Flee behavior when health is very low
        .sequence()
          .condition('VeryLowHealth', (bb) => bb.healthPercentage <= 0.2)
          .condition('HasTarget', (bb) => bb.hasTarget)
          .action('Flee', (bb) => {
            const behaviors = bb.enemy.getBehaviors();
            const fleeBehavior = behaviors.get('flee');
            if (fleeBehavior && bb.target) {
              return bb.enemy.executeBehavior('flee', bb.target) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
            }
            return NodeStatus.FAILURE;
          })
        .end()
        
        // Medium priority: Combat behavior with tactical decisions
        .sequence()
          .condition('HasTarget', (bb) => bb.hasTarget)
          .selector()
            // Phase behavior for positioning advantage
            .sequence()
              .condition('ShouldPhase', (bb) => {
                return bb.targetDistance > bb.attackRadius * 0.8 && 
                       bb.targetDistance < bb.detectionRadius &&
                       Math.random() < 0.4; // 40% chance to phase
              })
              .cooldown(5000) // 5 second cooldown
              .action('Phase', (bb) => {
                const behaviors = bb.enemy.getBehaviors();
                const phaseBehavior = behaviors.get('phase');
                if (phaseBehavior && bb.target) {
                  return bb.enemy.executeBehavior('phase', bb.target) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
                }
                return NodeStatus.FAILURE;
              })
            .end()
            
            // Life drain attack when in range
            .sequence()
              .condition('InAttackRange', (bb) => bb.targetDistance <= bb.attackRadius)
              .condition('HasMana', (bb) => bb.enemy.getStats().currentMana >= 20)
              .cooldown(4000) // 4 second cooldown
              .action('LifeDrain', (bb) => {
                const behaviors = bb.enemy.getBehaviors();
                const lifeDrainBehavior = behaviors.get('lifeDrain');
                if (lifeDrainBehavior && bb.target) {
                  return bb.enemy.executeBehavior('lifeDrain', bb.target) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
                }
                return NodeStatus.FAILURE;
              })
            .end()
            
            // Chase behavior with enhanced detection
            .sequence()
              .condition('InDetectionRange', (bb) => bb.targetDistance <= bb.detectionRadius * 1.5)
              .action('Chase', (bb) => {
                bb.enemy.setState('chase');
                return NodeStatus.SUCCESS;
              })
            .end()
          .end()
        .end()
        
        // Low priority: Enhanced patrol behavior
        .selector()
          // Random chance to start patrolling
          .sequence()
            .condition('ShouldStartPatrol', (_bb) => Math.random() < 0.03) // 3% chance per frame
            .action('StartPatrol', (bb) => {
              bb.enemy.setState('patrol');
              return NodeStatus.SUCCESS;
            })
          .end()
          
          // Default to idle with some ethereal movement
          .action('EtherealIdle', (bb) => {
            bb.enemy.setState('idle');
            // Could add some floating movement here
            return NodeStatus.SUCCESS;
          })
        .end()
      .end()
      .build();

    // Create the enemy behavior tree wrapper
    const enemyBehaviorTree = new EnemyBehaviorTree(this, behaviorTree);
    
    // Set up initial blackboard values specific to Wraith
    const blackboard = enemyBehaviorTree.getBlackboard();
    blackboard.isEthereal = true;
    blackboard.canPhase = true;
    blackboard.phaseStamina = 100;
    
    // Enable the behavior tree
    this.setBehaviorTree(enemyBehaviorTree);
    this.enableBehaviorTree();
  }

  /**
   * Override the standard update to add wraith-specific behavior tree logic
   */
  public update(deltaTime: number): void {
    // Update behavior tree blackboard with wraith-specific data
    if (this.isBehaviorTreeEnabled()) {
      const blackboard = this.getBehaviorTree()!.getBlackboard();
      
      // Update wraith-specific blackboard values
      blackboard.mana = this.stats.currentMana;
      blackboard.maxMana = this.stats.maxMana;
      blackboard.manaPercentage = this.stats.currentMana / this.stats.maxMana;
      
      // Track phasing state (simplified)
      blackboard.isPhasing = this.sprite.alpha < 0.8;
    }
    
    // Call parent update (which will use behavior tree if enabled)
    super.update(deltaTime);
  }
}

/**
 * Factory function to create a Wraith with behavior tree enabled
 */
export function createWraithWithBehaviorTree(scene: Scene, x: number, y: number): WraithWithBehaviorTree {
  return new WraithWithBehaviorTree(scene, x, y);
}

/**
 * Example of how to create a Wraith using the pre-built AI templates
 */
export function createWraithWithAdvancedAI(scene: Scene, x: number, y: number): Wraith {
  const wraith = new Wraith(scene, x, y);
  
  // Use the pre-built advanced AI template
  const behaviorTree = EnemyBehaviorTreeFactory.createAdvancedAI();
  const enemyBehaviorTree = new EnemyBehaviorTree(wraith, behaviorTree);
  
  wraith.setBehaviorTree(enemyBehaviorTree);
  wraith.enableBehaviorTree();
  
  return wraith;
}