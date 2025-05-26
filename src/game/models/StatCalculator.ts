import { PlayerStats, IBaseStats, IDerivedStats } from './PlayerStats';
import { InventoryManager, EquippedItems } from './InventoryManager';

export interface FinalStats extends IBaseStats {
  bonusStrength: number;
  bonusDexterity: number;
  bonusIntelligence: number;
  bonusVitality: number;
  bonusLuck: number;
  totalStrength: number;
  totalDexterity: number;
  totalIntelligence: number;
  totalVitality: number;
  totalLuck: number;
}

export interface EquipmentBonuses {
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
  luck: number;
}

export interface StatBreakdown {
  baseStat: number;
  equipmentBonus: number;
  equipmentMultiplier: number;
  finalValue: number;
}

export interface DetailedStatCalculation {
  strength: StatBreakdown;
  dexterity: StatBreakdown;
  intelligence: StatBreakdown;
  vitality: StatBreakdown;
  luck: StatBreakdown;
  derivedStats: IDerivedStats;
  equipmentContributions: { [equipmentId: string]: EquipmentBonuses };
}

export class StatCalculator {
  private playerStats: PlayerStats;
  private inventoryManager: InventoryManager;

  constructor(playerStats: PlayerStats, inventoryManager: InventoryManager) {
    this.playerStats = playerStats;
    this.inventoryManager = inventoryManager;
  }

  // Calculate equipment bonuses from all equipped items
  public calculateEquipmentBonuses(): EquipmentBonuses {
    const equippedItems = this.inventoryManager.getAllEquippedItems();
    const bonuses: EquipmentBonuses = {
      strength: 0,
      dexterity: 0,
      intelligence: 0,
      vitality: 0,
      luck: 0
    };

    for (const equipment of Object.values(equippedItems)) {
      if (equipment) {
        const equipmentStats = equipment.getStats();
        if (equipmentStats.bonuses) {
          bonuses.strength += equipmentStats.bonuses.strength || 0;
          bonuses.dexterity += equipmentStats.bonuses.dexterity || 0;
          bonuses.intelligence += equipmentStats.bonuses.intelligence || 0;
          bonuses.vitality += equipmentStats.bonuses.vitality || 0;
          bonuses.luck += equipmentStats.bonuses.luck || 0;
        }
      }
    }

    return bonuses;
  }

  // Calculate equipment multipliers from all equipped items
  public calculateEquipmentMultipliers(): EquipmentBonuses {
    const equippedItems = this.inventoryManager.getAllEquippedItems();
    const multipliers: EquipmentBonuses = {
      strength: 1,
      dexterity: 1,
      intelligence: 1,
      vitality: 1,
      luck: 1
    };

    for (const equipment of Object.values(equippedItems)) {
      if (equipment) {
        const equipmentStats = equipment.getStats();
        if (equipmentStats.multipliers) {
          multipliers.strength *= equipmentStats.multipliers.strength || 1;
          multipliers.dexterity *= equipmentStats.multipliers.dexterity || 1;
          multipliers.intelligence *= equipmentStats.multipliers.intelligence || 1;
          multipliers.vitality *= equipmentStats.multipliers.vitality || 1;
          multipliers.luck *= equipmentStats.multipliers.luck || 1;
        }
      }
    }

    return multipliers;
  }

  // Calculate final stats including equipment bonuses and multipliers
  public calculateFinalStats(): FinalStats {
    const baseStats = {
      strength: this.playerStats.getBaseStat('strength'),
      dexterity: this.playerStats.getBaseStat('dexterity'),
      intelligence: this.playerStats.getBaseStat('intelligence'),
      vitality: this.playerStats.getBaseStat('vitality'),
      luck: this.playerStats.getBaseStat('luck')
    };
    const bonuses = this.calculateEquipmentBonuses();
    const multipliers = this.calculateEquipmentMultipliers();

    const finalStats: FinalStats = {
      // Base stats (unchanged)
      strength: baseStats.strength,
      dexterity: baseStats.dexterity,
      intelligence: baseStats.intelligence,
      vitality: baseStats.vitality,
      luck: baseStats.luck,

      // Equipment bonuses
      bonusStrength: bonuses.strength,
      bonusDexterity: bonuses.dexterity,
      bonusIntelligence: bonuses.intelligence,
      bonusVitality: bonuses.vitality,
      bonusLuck: bonuses.luck,

      // Total stats (base + bonus) * multipliers
      totalStrength: Math.floor((baseStats.strength + bonuses.strength) * multipliers.strength),
      totalDexterity: Math.floor((baseStats.dexterity + bonuses.dexterity) * multipliers.dexterity),
      totalIntelligence: Math.floor((baseStats.intelligence + bonuses.intelligence) * multipliers.intelligence),
      totalVitality: Math.floor((baseStats.vitality + bonuses.vitality) * multipliers.vitality),
      totalLuck: Math.floor((baseStats.luck + bonuses.luck) * multipliers.luck)
    };

    return finalStats;
  }

  // Get detailed breakdown of stat calculations
  public getDetailedCalculation(): DetailedStatCalculation {
    const baseStats = {
      strength: this.playerStats.getBaseStat('strength'),
      dexterity: this.playerStats.getBaseStat('dexterity'),
      intelligence: this.playerStats.getBaseStat('intelligence'),
      vitality: this.playerStats.getBaseStat('vitality'),
      luck: this.playerStats.getBaseStat('luck')
    };
    const bonuses = this.calculateEquipmentBonuses();
    const multipliers = this.calculateEquipmentMultipliers();
    const equippedItems = this.inventoryManager.getAllEquippedItems();

    // Create stat breakdowns
    const createBreakdown = (stat: keyof IBaseStats): StatBreakdown => ({
      baseStat: baseStats[stat],
      equipmentBonus: bonuses[stat],
      equipmentMultiplier: multipliers[stat],
      finalValue: Math.floor((baseStats[stat] + bonuses[stat]) * multipliers[stat])
    });

    const detailed: DetailedStatCalculation = {
      strength: createBreakdown('strength'),
      dexterity: createBreakdown('dexterity'),
      intelligence: createBreakdown('intelligence'),
      vitality: createBreakdown('vitality'),
      luck: createBreakdown('luck'),
      derivedStats: this.calculateDerivedStatsWithEquipment(),
      equipmentContributions: this.getEquipmentContributions()
    };

    return detailed;
  }

  // Calculate derived stats using equipment bonuses
  public calculateDerivedStatsWithEquipment(): IDerivedStats {
    const finalStats = this.calculateFinalStats();
    
    // Use the same formulas as PlayerStats but with equipment-modified stats
    const derivedStats: IDerivedStats = {
      maxHealth: 100 + (finalStats.totalVitality * 10),
      currentHealth: this.playerStats.getDerivedStat('currentHealth'),
      maxMana: 50 + (finalStats.totalIntelligence * 5),
      currentMana: this.playerStats.getDerivedStat('currentMana'),
      physicalDamage: finalStats.totalStrength * 2,
      magicDamage: finalStats.totalIntelligence * 2,
      defense: finalStats.totalVitality + (finalStats.totalStrength * 0.5),
      evasion: finalStats.totalDexterity * 1.5,
      criticalChance: (finalStats.totalLuck * 0.5) + (finalStats.totalDexterity * 0.2),
      criticalDamage: 150 + (finalStats.totalLuck * 2),
    };

    // Ensure current values don't exceed new maximums
    derivedStats.currentHealth = Math.min(derivedStats.currentHealth, derivedStats.maxHealth);
    derivedStats.currentMana = Math.min(derivedStats.currentMana, derivedStats.maxMana);

    return derivedStats;
  }

  // Get contribution of each equipped item
  public getEquipmentContributions(): { [equipmentId: string]: EquipmentBonuses } {
    const contributions: { [equipmentId: string]: EquipmentBonuses } = {};
    const equippedItems = this.inventoryManager.getAllEquippedItems();

    for (const equipment of Object.values(equippedItems)) {
      if (equipment) {
        const equipmentStats = equipment.getStats();
        contributions[equipment.getId()] = {
          strength: equipmentStats.bonuses?.strength || 0,
          dexterity: equipmentStats.bonuses?.dexterity || 0,
          intelligence: equipmentStats.bonuses?.intelligence || 0,
          vitality: equipmentStats.bonuses?.vitality || 0,
          luck: equipmentStats.bonuses?.luck || 0
        };
      }
    }

    return contributions;
  }

  // Simulate stat changes when equipping/unequipping items
  public simulateEquipmentChange(equipmentId: string, action: 'equip' | 'unequip'): FinalStats {
    // Create a temporary copy of the inventory state
    const currentEquipped = this.inventoryManager.getAllEquippedItems();
    
    if (action === 'equip') {
      const item = this.inventoryManager.getItem(equipmentId);
      if (!item) {
        throw new Error(`Equipment with ID ${equipmentId} not found in inventory`);
      }
      
      // Temporarily simulate equipping
      const slot = item.equipment.getSlot();
      const tempEquipped = { ...currentEquipped };
      tempEquipped[slot] = item.equipment;
      
      return this.calculateFinalStatsFromEquipped(tempEquipped);
    } else {
      // Find equipped item to simulate unequipping
      const itemToUnequip = Object.values(currentEquipped).find(eq => eq?.getId() === equipmentId);
      if (!itemToUnequip) {
        throw new Error(`Equipment with ID ${equipmentId} is not equipped`);
      }
      
      const slot = itemToUnequip.getSlot();
      const tempEquipped = { ...currentEquipped };
      delete tempEquipped[slot];
      
      return this.calculateFinalStatsFromEquipped(tempEquipped);
    }
  }

  // Helper method to calculate stats from a specific equipment set
  private calculateFinalStatsFromEquipped(equippedItems: EquippedItems): FinalStats {
    const baseStats = {
      strength: this.playerStats.getBaseStat('strength'),
      dexterity: this.playerStats.getBaseStat('dexterity'),
      intelligence: this.playerStats.getBaseStat('intelligence'),
      vitality: this.playerStats.getBaseStat('vitality'),
      luck: this.playerStats.getBaseStat('luck')
    };
    
    // Calculate bonuses from the provided equipment set
    const bonuses: EquipmentBonuses = {
      strength: 0,
      dexterity: 0,
      intelligence: 0,
      vitality: 0,
      luck: 0
    };

    const multipliers: EquipmentBonuses = {
      strength: 1,
      dexterity: 1,
      intelligence: 1,
      vitality: 1,
      luck: 1
    };

    for (const equipment of Object.values(equippedItems)) {
      if (equipment) {
        const equipmentStats = equipment.getStats();
        if (equipmentStats.bonuses) {
          bonuses.strength += equipmentStats.bonuses.strength || 0;
          bonuses.dexterity += equipmentStats.bonuses.dexterity || 0;
          bonuses.intelligence += equipmentStats.bonuses.intelligence || 0;
          bonuses.vitality += equipmentStats.bonuses.vitality || 0;
          bonuses.luck += equipmentStats.bonuses.luck || 0;
        }
        if (equipmentStats.multipliers) {
          multipliers.strength *= equipmentStats.multipliers.strength || 1;
          multipliers.dexterity *= equipmentStats.multipliers.dexterity || 1;
          multipliers.intelligence *= equipmentStats.multipliers.intelligence || 1;
          multipliers.vitality *= equipmentStats.multipliers.vitality || 1;
          multipliers.luck *= equipmentStats.multipliers.luck || 1;
        }
      }
    }

    const finalStats: FinalStats = {
      strength: baseStats.strength,
      dexterity: baseStats.dexterity,
      intelligence: baseStats.intelligence,
      vitality: baseStats.vitality,
      luck: baseStats.luck,

      bonusStrength: bonuses.strength,
      bonusDexterity: bonuses.dexterity,
      bonusIntelligence: bonuses.intelligence,
      bonusVitality: bonuses.vitality,
      bonusLuck: bonuses.luck,

      totalStrength: Math.floor((baseStats.strength + bonuses.strength) * multipliers.strength),
      totalDexterity: Math.floor((baseStats.dexterity + bonuses.dexterity) * multipliers.dexterity),
      totalIntelligence: Math.floor((baseStats.intelligence + bonuses.intelligence) * multipliers.intelligence),
      totalVitality: Math.floor((baseStats.vitality + bonuses.vitality) * multipliers.vitality),
      totalLuck: Math.floor((baseStats.luck + bonuses.luck) * multipliers.luck)
    };

    return finalStats;
  }

  // Utility methods for checking stat changes
  public getStatIncrease(equipmentId: string): Partial<EquipmentBonuses> {
    const currentStats = this.calculateFinalStats();
    const simulatedStats = this.simulateEquipmentChange(equipmentId, 'equip');
    
    return {
      strength: simulatedStats.totalStrength - currentStats.totalStrength,
      dexterity: simulatedStats.totalDexterity - currentStats.totalDexterity,
      intelligence: simulatedStats.totalIntelligence - currentStats.totalIntelligence,
      vitality: simulatedStats.totalVitality - currentStats.totalVitality,
      luck: simulatedStats.totalLuck - currentStats.totalLuck
    };
  }

  public getStatDecrease(equipmentId: string): Partial<EquipmentBonuses> {
    const currentStats = this.calculateFinalStats();
    const simulatedStats = this.simulateEquipmentChange(equipmentId, 'unequip');
    
    return {
      strength: currentStats.totalStrength - simulatedStats.totalStrength,
      dexterity: currentStats.totalDexterity - simulatedStats.totalDexterity,
      intelligence: currentStats.totalIntelligence - simulatedStats.totalIntelligence,
      vitality: currentStats.totalVitality - simulatedStats.totalVitality,
      luck: currentStats.totalLuck - simulatedStats.totalLuck
    };
  }

  // Update the player stats instance with equipment bonuses via modifiers
  public applyEquipmentModifiers(): void {
    // Remove existing equipment modifiers
    this.removeEquipmentModifiers();
    
    // Add new equipment modifiers
    const bonuses = this.calculateEquipmentBonuses();
    const equipmentContributions = this.getEquipmentContributions();
    
    for (const [equipmentId, contribution] of Object.entries(equipmentContributions)) {
      if (contribution.strength > 0) {
        this.playerStats.addModifier({
          stat: 'strength',
          value: contribution.strength,
          duration: -1, // Permanent while equipped
          source: `equipment_${equipmentId}`,
          id: `eq_str_${equipmentId}`
        });
      }
      if (contribution.dexterity > 0) {
        this.playerStats.addModifier({
          stat: 'dexterity',
          value: contribution.dexterity,
          duration: -1,
          source: `equipment_${equipmentId}`,
          id: `eq_dex_${equipmentId}`
        });
      }
      if (contribution.intelligence > 0) {
        this.playerStats.addModifier({
          stat: 'intelligence',
          value: contribution.intelligence,
          duration: -1,
          source: `equipment_${equipmentId}`,
          id: `eq_int_${equipmentId}`
        });
      }
      if (contribution.vitality > 0) {
        this.playerStats.addModifier({
          stat: 'vitality',
          value: contribution.vitality,
          duration: -1,
          source: `equipment_${equipmentId}`,
          id: `eq_vit_${equipmentId}`
        });
      }
      if (contribution.luck > 0) {
        this.playerStats.addModifier({
          stat: 'luck',
          value: contribution.luck,
          duration: -1,
          source: `equipment_${equipmentId}`,
          id: `eq_lck_${equipmentId}`
        });
      }
    }
  }

  public removeEquipmentModifiers(): void {
    const allModifiers = this.playerStats.getActiveModifiers();
    for (const modifier of allModifiers) {
      if (modifier.source.startsWith('equipment_')) {
        if (modifier.id) {
          this.playerStats.removeModifier(modifier.id);
        }
      }
    }
  }

  // Refresh modifiers when equipment changes
  public refreshEquipmentModifiers(): void {
    this.applyEquipmentModifiers();
  }
}