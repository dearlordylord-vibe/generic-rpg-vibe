import { Enemy } from '../enemies/Enemy';
import { BehaviorTree, IBlackboard, NodeStatus } from './BehaviorTree';
import { createBehaviorTree } from './BehaviorTreeBuilder';

/**
 * Integration layer between behavior trees and the Enemy system
 * Provides common blackboard keys and utility functions for enemy AI
 */
export class EnemyBehaviorTree {
  private enemy: Enemy;
  private behaviorTree: BehaviorTree;
  private lastUpdateTime: number = 0;

  constructor(enemy: Enemy, behaviorTree: BehaviorTree) {
    this.enemy = enemy;
    this.behaviorTree = behaviorTree;
    this.initializeBlackboard();
  }

  /**
   * Update the behavior tree for this enemy
   */
  public update(deltaTime: number): void {
    const currentTime = Date.now();
    this.lastUpdateTime = currentTime;

    // Update blackboard with current enemy state
    this.updateBlackboard(deltaTime);

    // Execute the behavior tree
    const result = this.behaviorTree.tick();

    // Handle the result if needed
    this.handleTreeResult(result);
  }

  /**
   * Get the behavior tree instance
   */
  public getBehaviorTree(): BehaviorTree {
    return this.behaviorTree;
  }

  /**
   * Get the blackboard for direct access
   */
  public getBlackboard(): IBlackboard {
    return this.behaviorTree.getBlackboard();
  }

  /**
   * Initialize the blackboard with default values
   */
  private initializeBlackboard(): void {
    const blackboard = this.behaviorTree.getBlackboard();
    
    // Enemy reference
    blackboard.enemy = this.enemy;
    
    // Time tracking
    blackboard.lastUpdateTime = 0;
    blackboard.deltaTime = 0;
    
    // Target information
    blackboard.target = null;
    blackboard.targetDistance = Infinity;
    blackboard.targetAngle = 0;
    blackboard.hasTarget = false;
    
    // Position information
    blackboard.position = this.enemy.getPosition();
    blackboard.spawnPosition = this.enemy.getPosition(); // Will be overridden if enemy has spawn position
    
    // State information
    blackboard.currentState = this.enemy.getState();
    blackboard.previousState = this.enemy.getState();
    
    // Health information
    blackboard.health = this.enemy.getStats().currentHealth;
    blackboard.maxHealth = this.enemy.getStats().maxHealth;
    blackboard.healthPercentage = 1.0;
    
    // Combat information
    blackboard.canAttack = false;
    blackboard.lastAttackTime = 0;
    blackboard.timeSinceLastAttack = 0;
    
    // Movement information
    blackboard.isMoving = false;
    blackboard.movementSpeed = 0;
    
    // Detection information
    blackboard.detectionRadius = this.enemy.getDetectionRadius();
    blackboard.attackRadius = this.enemy.getAttackRadius();
    blackboard.retreatThreshold = this.enemy.getRetreatThreshold();
  }

  /**
   * Update blackboard with current enemy state
   */
  private updateBlackboard(deltaTime: number): void {
    const blackboard = this.behaviorTree.getBlackboard();
    const stats = this.enemy.getStats();
    const position = this.enemy.getPosition();
    const target = this.enemy.getTarget();

    // Time information
    blackboard.deltaTime = deltaTime;
    blackboard.lastUpdateTime = this.lastUpdateTime;

    // Position information
    blackboard.position = position;

    // State information
    blackboard.previousState = blackboard.currentState;
    blackboard.currentState = this.enemy.getState();

    // Health information
    blackboard.health = stats.currentHealth;
    blackboard.maxHealth = stats.maxHealth;
    blackboard.healthPercentage = stats.currentHealth / stats.maxHealth;

    // Target information
    if (target) {
      blackboard.target = target;
      blackboard.hasTarget = true;
      blackboard.targetDistance = Phaser.Math.Distance.Between(
        position.x, position.y,
        target.x, target.y
      );
      blackboard.targetAngle = Phaser.Math.Angle.Between(
        position.x, position.y,
        target.x, target.y
      );
    } else {
      blackboard.target = null;
      blackboard.hasTarget = false;
      blackboard.targetDistance = Infinity;
      blackboard.targetAngle = 0;
    }

    // Combat information
    blackboard.canAttack = blackboard.hasTarget && blackboard.targetDistance <= blackboard.attackRadius;
    
    // Update time since last attack (this would need to be tracked by the enemy)
    // For now, we'll use a simple approximation
    if (blackboard.lastAttackTime > 0) {
      blackboard.timeSinceLastAttack = Date.now() - blackboard.lastAttackTime;
    }
  }

  /**
   * Handle the result of the behavior tree execution
   */
  private handleTreeResult(result: NodeStatus): void {
    // This can be used for debugging or special handling
    if (result === NodeStatus.FAILURE) {
      // Could log errors or fall back to default behavior
      console.warn(`Behavior tree failed for enemy ${this.enemy.getName()}`);
    }
  }
}

/**
 * Factory functions for creating common enemy behavior trees
 */
export class EnemyBehaviorTreeFactory {
  
  /**
   * Create a basic patrol and attack behavior tree
   */
  public static createBasicAI(): BehaviorTree {
    return createBehaviorTree()
      .selector()
        // High priority: Handle death
        .condition('IsDead', (bb) => bb.enemy.isDead())
        
        // Medium priority: Combat behavior
        .sequence()
          .condition('HasTarget', (bb) => bb.hasTarget)
          .selector()
            // Attack if in range
            .sequence()
              .condition('InAttackRange', (bb) => bb.targetDistance <= bb.attackRadius)
              .action('Attack', (bb) => {
                // Use existing enemy attack logic
                bb.enemy.setState('attack');
                return NodeStatus.SUCCESS;
              })
            .end()
            
            // Chase if target detected
            .sequence()
              .condition('InDetectionRange', (bb) => bb.targetDistance <= bb.detectionRadius)
              .action('Chase', (bb) => {
                bb.enemy.setState('chase');
                return NodeStatus.SUCCESS;
              })
            .end()
          .end()
        .end()
        
        // Low priority: Patrol behavior
        .action('Patrol', (bb) => {
          bb.enemy.setState('patrol');
          return NodeStatus.SUCCESS;
        })
      .end()
      .build();
  }

  /**
   * Create a more advanced AI with retreat behavior
   */
  public static createAdvancedAI(): BehaviorTree {
    return createBehaviorTree()
      .selector()
        // Highest priority: Handle death
        .condition('IsDead', (bb) => bb.enemy.isDead())
        
        // High priority: Retreat if health is low
        .sequence()
          .condition('LowHealth', (bb) => bb.healthPercentage <= bb.retreatThreshold)
          .condition('HasTarget', (bb) => bb.hasTarget)
          .action('Retreat', (bb) => {
            bb.enemy.setState('retreat');
            return NodeStatus.SUCCESS;
          })
        .end()
        
        // Medium priority: Combat behavior
        .sequence()
          .condition('HasTarget', (bb) => bb.hasTarget)
          .selector()
            // Attack if in range and enough time has passed
            .sequence()
              .condition('InAttackRange', (bb) => bb.targetDistance <= bb.attackRadius)
              .condition('CanAttack', (bb) => bb.canAttack)
              .action('Attack', (bb) => {
                bb.enemy.setState('attack');
                bb.lastAttackTime = Date.now();
                return NodeStatus.SUCCESS;
              })
            .end()
            
            // Chase if target detected
            .sequence()
              .condition('InDetectionRange', (bb) => bb.targetDistance <= bb.detectionRadius * 1.5)
              .action('Chase', (bb) => {
                bb.enemy.setState('chase');
                return NodeStatus.SUCCESS;
              })
            .end()
          .end()
        .end()
        
        // Low priority: Idle and patrol behavior
        .selector()
          // Random chance to patrol
          .sequence()
            .condition('ShouldPatrol', (_bb) => Math.random() < 0.02) // 2% chance per frame
            .action('StartPatrol', (bb) => {
              bb.enemy.setState('patrol');
              return NodeStatus.SUCCESS;
            })
          .end()
          
          // Default to idle
          .action('Idle', (bb) => {
            bb.enemy.setState('idle');
            return NodeStatus.SUCCESS;
          })
        .end()
      .end()
      .build();
  }

  /**
   * Create a swarm AI for group enemies like Carrion Bats
   */
  public static createSwarmAI(): BehaviorTree {
    return createBehaviorTree()
      .selector()
        // Handle death
        .condition('IsDead', (bb) => bb.enemy.isDead())
        
        // Swarm leader behavior
        .sequence()
          .condition('IsSwarmLeader', (bb) => bb.isSwarmLeader)
          .selector()
            // Rally swarm if under threat
            .sequence()
              .condition('UnderThreat', (bb) => bb.hasTarget && bb.healthPercentage < 0.6)
              .cooldown(10000) // 10 second cooldown
              .action('RallySwarm', (bb) => {
                // Execute swarm rally behavior if available
                const behaviors = bb.enemy.getBehaviors();
                const rallyBehavior = behaviors.get('swarmRally');
                if (rallyBehavior && bb.target) {
                  return bb.enemy.executeBehavior('swarmRally', bb.target) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
                }
                return NodeStatus.FAILURE;
              })
            .end()
            
            // Normal combat behavior
            .sequence()
              .condition('HasTarget', (bb) => bb.hasTarget)
              .condition('InDetectionRange', (bb) => bb.targetDistance <= bb.detectionRadius)
              .action('AttackTarget', (bb) => {
                bb.enemy.setState('attack');
                return NodeStatus.SUCCESS;
              })
            .end()
          .end()
        .end()
        
        // Regular swarm member behavior
        .sequence()
          .condition('HasTarget', (bb) => bb.hasTarget)
          .selector()
            // Attack if close
            .sequence()
              .condition('InAttackRange', (bb) => bb.targetDistance <= bb.attackRadius)
              .action('Attack', (bb) => {
                bb.enemy.setState('attack');
                return NodeStatus.SUCCESS;
              })
            .end()
            
            // Chase if detected
            .action('Chase', (bb) => {
              bb.enemy.setState('chase');
              return NodeStatus.SUCCESS;
            })
          .end()
        .end()
        
        // Default patrol
        .action('Patrol', (bb) => {
          bb.enemy.setState('patrol');
          return NodeStatus.SUCCESS;
        })
      .end()
      .build();
  }

  /**
   * Create a defensive AI for tank-like enemies
   */
  public static createDefensiveAI(): BehaviorTree {
    return createBehaviorTree()
      .selector()
        // Handle death
        .condition('IsDead', (bb) => bb.enemy.isDead())
        
        // Taunt behavior for tank enemies
        .sequence()
          .condition('HasTarget', (bb) => bb.hasTarget)
          .condition('ShouldTaunt', (_bb) => Math.random() < 0.1) // 10% chance
          .cooldown(8000) // 8 second cooldown
          .action('Taunt', (bb) => {
            const behaviors = bb.enemy.getBehaviors();
            const tauntBehavior = behaviors.get('taunt');
            if (tauntBehavior && bb.target) {
              return bb.enemy.executeBehavior('taunt', bb.target) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
            }
            return NodeStatus.FAILURE;
          })
        .end()
        
        // Normal combat
        .sequence()
          .condition('HasTarget', (bb) => bb.hasTarget)
          .selector()
            // Ground slam for medium range
            .sequence()
              .condition('MediumRange', (bb) => bb.targetDistance > bb.attackRadius * 0.6 && bb.targetDistance <= bb.attackRadius * 1.2)
              .cooldown(6000) // 6 second cooldown
              .action('GroundSlam', (bb) => {
                const behaviors = bb.enemy.getBehaviors();
                const slamBehavior = behaviors.get('groundSlam');
                if (slamBehavior && bb.target) {
                  return bb.enemy.executeBehavior('groundSlam', bb.target) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
                }
                return NodeStatus.FAILURE;
              })
            .end()
            
            // Heavy strike for close range
            .sequence()
              .condition('CloseRange', (bb) => bb.targetDistance <= bb.attackRadius)
              .action('HeavyStrike', (bb) => {
                const behaviors = bb.enemy.getBehaviors();
                const strikeBehavior = behaviors.get('heavyStrike');
                if (strikeBehavior && bb.target) {
                  return bb.enemy.executeBehavior('heavyStrike', bb.target) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
                }
                return NodeStatus.FAILURE;
              })
            .end()
            
            // Chase if out of range
            .action('Chase', (bb) => {
              bb.enemy.setState('chase');
              return NodeStatus.SUCCESS;
            })
          .end()
        .end()
        
        // Patrol
        .action('Patrol', (bb) => {
          bb.enemy.setState('patrol');
          return NodeStatus.SUCCESS;
        })
      .end()
      .build();
  }
}