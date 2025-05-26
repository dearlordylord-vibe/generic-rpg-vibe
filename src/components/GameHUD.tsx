import React from 'react';
import './GameHUD.css';

interface GameHUDProps {
  currentProjectile: string;
  currentAOE: string;
  playerHealth: number;
  maxHealth: number;
  playerMana: number;
  maxMana: number;
  isBlocking: boolean;
  isDodging: boolean;
}

const GameHUD: React.FC<GameHUDProps> = ({
  currentProjectile,
  currentAOE,
  playerHealth,
  maxHealth,
  playerMana,
  maxMana,
  isBlocking,
  isDodging
}) => {
  return (
    <div className="game-hud">
      {/* Health and Mana bars */}
      <div className="hud-vitals">
        <div className="vital-bar health-bar">
          <div className="vital-label">HP</div>
          <div className="vital-progress">
            <div 
              className="vital-fill health-fill"
              style={{ width: `${(playerHealth / maxHealth) * 100}%` }}
            />
          </div>
          <div className="vital-text">{playerHealth}/{maxHealth}</div>
        </div>
        
        <div className="vital-bar mana-bar">
          <div className="vital-label">MP</div>
          <div className="vital-progress">
            <div 
              className="vital-fill mana-fill"
              style={{ width: `${(playerMana / maxMana) * 100}%` }}
            />
          </div>
          <div className="vital-text">{playerMana}/{maxMana}</div>
        </div>
      </div>

      {/* Combat state indicators */}
      <div className="combat-states">
        {isBlocking && (
          <div className="combat-state blocking">
            🛡️ BLOCKING
          </div>
        )}
        {isDodging && (
          <div className="combat-state dodging">
            💨 DODGING
          </div>
        )}
      </div>

      {/* Weapon/Spell selection */}
      <div className="hud-selection">
        <div className="selection-group">
          <div className="selection-label">Projectile (1-4)</div>
          <div className="selection-item projectile-selection">
            {getProjectileIcon(currentProjectile)} {currentProjectile.toUpperCase()}
          </div>
        </div>
        
        <div className="selection-group">
          <div className="selection-label">AOE (Q-T)</div>
          <div className="selection-item aoe-selection">
            {getAOEIcon(currentAOE)} {currentAOE.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Controls help */}
      <div className="hud-controls">
        <div className="control-hint">Left Click: Melee</div>
        <div className="control-hint">Right Click: Projectile</div>
        <div className="control-hint">Middle Click: AOE</div>
        <div className="control-hint">Shift: Block | Ctrl: Dodge</div>
      </div>
    </div>
  );
};

function getProjectileIcon(type: string): string {
  switch (type) {
    case 'arrow': return '🏹';
    case 'fireball': return '🔥';
    case 'ice': return '❄️';
    case 'lightning': return '⚡';
    case 'magic_bolt': return '✨';
    case 'piercing_arrow': return '🎯';
    default: return '🏹';
  }
}

function getAOEIcon(type: string): string {
  switch (type) {
    case 'explosion': return '💥';
    case 'freeze': return '🧊';
    case 'poison': return '☠️';
    case 'heal': return '💚';
    case 'shield': return '🛡️';
    case 'magic_circle': return '🔮';
    case 'shockwave': return '🌊';
    case 'ice_storm': return '🌨️';
    case 'lightning_strike': return '⚡';
    default: return '💥';
  }
}

export default GameHUD;