import { PlayerStats, IDerivedStats, IBaseStats } from '../game/models/PlayerStats';

// Combat result types
export interface CombatResult {
  damage: number;
  isCritical: boolean;
  isHit: boolean;
  statusEffects?: StatusEffect[];
  combatLog: string[];
}

export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  stat: keyof IBaseStats | keyof IDerivedStats;
  value: number;
  duration: number; // in milliseconds
  source: string;
  description: string;
}

export interface CombatEntity {
  stats: PlayerStats;
  statusEffects: StatusEffect[];
  name: string;
}

export interface DamageCalculation {
  baseDamage: number;
  finalDamage: number;
  damageReduction: number;
  isCritical: boolean;
  criticalMultiplier: number;
}

export interface HitCalculation {
  hitChance: number;
  roll: number;
  isHit: boolean;
  isCritical: boolean;
  criticalChance: number;
}

// Combat configuration
export const COMBAT_CONFIG = {
  BASE_HIT_CHANCE: 85,
  DEFENSE_REDUCTION_FACTOR: 0.5,
  CRITICAL_DAMAGE_BASE: 150,
  MIN_DAMAGE: 1,
  MAX_DAMAGE_VARIANCE: 0.1, // ±10% variance
  EVASION_TO_DODGE_RATIO: 0.8,
  STATUS_EFFECT_BASE_DURATION: 5000, // 5 seconds
} as const;

/**
 * Calculate physical damage between attacker and defender
 */
export function calculatePhysicalDamage(
  attacker: CombatEntity,
  defender: CombatEntity,
  weaponDamage: number = 0
): DamageCalculation {
  const attackerStats = attacker.stats.getDerivedStats();
  const defenderStats = defender.stats.getDerivedStats();
  
  const baseDamage = attackerStats.physicalDamage + weaponDamage;
  const damageReduction = Math.max(0, defenderStats.defense * COMBAT_CONFIG.DEFENSE_REDUCTION_FACTOR);
  
  // Apply damage variance (±10%)
  const variance = (Math.random() - 0.5) * 2 * COMBAT_CONFIG.MAX_DAMAGE_VARIANCE;
  const varianceDamage = baseDamage * (1 + variance);
  
  let finalDamage = Math.max(COMBAT_CONFIG.MIN_DAMAGE, varianceDamage - damageReduction);
  
  // Check for critical hit
  const isCritical = rollCriticalHit(attacker);
  let criticalMultiplier = 1;
  
  if (isCritical) {
    criticalMultiplier = attackerStats.criticalDamage / 100;
    finalDamage *= criticalMultiplier;
  }
  
  return {
    baseDamage,
    finalDamage: Math.round(finalDamage),
    damageReduction,
    isCritical,
    criticalMultiplier
  };
}

/**
 * Calculate magic damage between attacker and defender
 */
export function calculateMagicDamage(
  attacker: CombatEntity,
  defender: CombatEntity,
  spellPower: number = 0
): DamageCalculation {
  const attackerStats = attacker.stats.getDerivedStats();
  const defenderStats = defender.stats.getDerivedStats();
  
  const baseDamage = attackerStats.magicDamage + spellPower;
  // Magic damage reduction is typically lower than physical
  const damageReduction = Math.max(0, defenderStats.defense * COMBAT_CONFIG.DEFENSE_REDUCTION_FACTOR * 0.7);
  
  // Apply damage variance
  const variance = (Math.random() - 0.5) * 2 * COMBAT_CONFIG.MAX_DAMAGE_VARIANCE;
  const varianceDamage = baseDamage * (1 + variance);
  
  let finalDamage = Math.max(COMBAT_CONFIG.MIN_DAMAGE, varianceDamage - damageReduction);
  
  // Check for critical hit
  const isCritical = rollCriticalHit(attacker);
  let criticalMultiplier = 1;
  
  if (isCritical) {
    criticalMultiplier = attackerStats.criticalDamage / 100;
    finalDamage *= criticalMultiplier;
  }
  
  return {
    baseDamage,
    finalDamage: Math.round(finalDamage),
    damageReduction,
    isCritical,
    criticalMultiplier
  };
}

/**
 * Calculate hit chance and determine if attack hits
 */
export function calculateHitChance(
  attacker: CombatEntity,
  defender: CombatEntity
): HitCalculation {
  const attackerStats = attacker.stats.getDerivedStats();
  const defenderStats = defender.stats.getDerivedStats();
  
  // Base hit chance modified by defender's evasion
  const dodgeChance = defenderStats.evasion * COMBAT_CONFIG.EVASION_TO_DODGE_RATIO;
  const hitChance = Math.max(5, Math.min(95, COMBAT_CONFIG.BASE_HIT_CHANCE - dodgeChance));
  
  const roll = Math.random() * 100;
  const isHit = roll <= hitChance;
  
  // Critical chance calculation
  const criticalChance = Math.min(50, attackerStats.criticalChance);
  const isCritical = isHit && (Math.random() * 100 <= criticalChance);
  
  return {
    hitChance,
    roll,
    isHit,
    isCritical,
    criticalChance
  };
}

/**
 * Roll for critical hit
 */
export function rollCriticalHit(entity: CombatEntity): boolean {
  const stats = entity.stats.getDerivedStats();
  const criticalChance = Math.min(50, stats.criticalChance);
  return Math.random() * 100 <= criticalChance;
}

/**
 * Perform a complete attack sequence
 */
export function performAttack(
  attacker: CombatEntity,
  defender: CombatEntity,
  attackType: 'physical' | 'magic' = 'physical',
  weaponDamage: number = 0
): CombatResult {
  const combatLog: string[] = [];
  
  // Calculate hit chance
  const hitCalc = calculateHitChance(attacker, defender);
  combatLog.push(`${attacker.name} attacks ${defender.name} (Hit chance: ${hitCalc.hitChance.toFixed(1)}%, Roll: ${hitCalc.roll.toFixed(1)})`);
  
  if (!hitCalc.isHit) {
    combatLog.push(`${defender.name} evaded the attack!`);
    return {
      damage: 0,
      isCritical: false,
      isHit: false,
      combatLog
    };
  }
  
  // Calculate damage
  const damageCalc = attackType === 'physical' 
    ? calculatePhysicalDamage(attacker, defender, weaponDamage)
    : calculateMagicDamage(attacker, defender, weaponDamage);
  
  if (damageCalc.isCritical) {
    combatLog.push(`Critical hit! ${damageCalc.criticalMultiplier.toFixed(1)}x damage multiplier`);
  }
  
  combatLog.push(`${attacker.name} deals ${damageCalc.finalDamage} ${attackType} damage to ${defender.name}`);
  
  return {
    damage: damageCalc.finalDamage,
    isCritical: damageCalc.isCritical,
    isHit: true,
    combatLog
  };
}

/**
 * Apply status effect to entity
 */
export function applyStatusEffect(
  entity: CombatEntity,
  effect: StatusEffect
): boolean {
  // Check if effect already exists
  const existingIndex = entity.statusEffects.findIndex(e => e.id === effect.id);
  
  if (existingIndex !== -1) {
    // Refresh duration if effect already exists
    entity.statusEffects[existingIndex] = { ...effect };
    return true;
  }
  
  entity.statusEffects.push({ ...effect });
  return true;
}

/**
 * Remove expired status effects
 */
export function updateStatusEffects(entity: CombatEntity): StatusEffect[] {
  const now = Date.now();
  const expired: StatusEffect[] = [];
  
  entity.statusEffects = entity.statusEffects.filter(effect => {
    if (effect.duration > 0 && effect.duration <= now) {
      expired.push(effect);
      return false;
    }
    return true;
  });
  
  return expired;
}

/**
 * Calculate derived combat stats
 */
export function calculateCombatStats(entity: CombatEntity): {
  dps: number;
  effectiveHealth: number;
  damageReduction: number;
  dodgeChance: number;
  criticalRate: number;
} {
  const stats = entity.stats.getDerivedStats();
  
  // Estimate DPS based on physical damage and critical chance
  const critMultiplier = 1 + (stats.criticalChance / 100) * (stats.criticalDamage / 100 - 1);
  const dps = stats.physicalDamage * critMultiplier;
  
  // Effective health considers defense
  const damageReduction = stats.defense * COMBAT_CONFIG.DEFENSE_REDUCTION_FACTOR;
  const effectiveHealth = stats.maxHealth * (1 + damageReduction / 100);
  
  const dodgeChance = Math.min(75, stats.evasion * COMBAT_CONFIG.EVASION_TO_DODGE_RATIO);
  const criticalRate = Math.min(50, stats.criticalChance);
  
  return {
    dps: Math.round(dps),
    effectiveHealth: Math.round(effectiveHealth),
    damageReduction: Math.round(damageReduction),
    dodgeChance: Math.round(dodgeChance * 100) / 100,
    criticalRate: Math.round(criticalRate * 100) / 100
  };
}

/**
 * Generate combat log entry
 */
export function generateCombatLogEntry(
  attacker: string,
  defender: string,
  action: string,
  result: string,
  timestamp?: Date
): string {
  const time = timestamp ? timestamp.toLocaleTimeString() : new Date().toLocaleTimeString();
  return `[${time}] ${attacker} ${action} ${defender}: ${result}`;
}

/**
 * Create a status effect
 */
export function createStatusEffect(
  name: string,
  type: 'buff' | 'debuff',
  stat: keyof IBaseStats | keyof IDerivedStats,
  value: number,
  duration: number,
  source: string,
  description: string
): StatusEffect {
  return {
    id: `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random()}`,
    name,
    type,
    stat,
    value,
    duration: duration > 0 ? Date.now() + duration : -1,
    source,
    description
  };
}

/**
 * Calculate total stat modifier from all status effects
 */
export function calculateStatModifiers(
  entity: CombatEntity,
  stat: keyof IBaseStats | keyof IDerivedStats
): number {
  return entity.statusEffects
    .filter(effect => effect.stat === stat)
    .reduce((total, effect) => total + effect.value, 0);
}