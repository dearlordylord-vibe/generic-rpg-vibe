import { useAppSelector } from '../store';
import { selectPlayerStats, selectPlayerLevel } from '../store/slices/playerSlice';
import './PlayerStats.css';

export default function PlayerStats() {
  const stats = useAppSelector(selectPlayerStats);
  const level = useAppSelector(selectPlayerLevel);

  if (!stats || !level) {
    return <div>Loading player stats...</div>;
  }

  const derivedStats = stats.getDerivedStats();

  return (
    <div className="player-stats">
      <div className="level-info">
        <h2>Level {level.getLevelInfo().currentLevel}</h2>
        <div className="xp-bar">
          <div
            className="xp-progress"
            style={{
              width: `${(level.getLevelInfo().currentXP / level.getLevelInfo().xpToNextLevel) * 100}%`
            }}
          />
        </div>
        <p>XP: {level.getLevelInfo().currentXP} / {level.getLevelInfo().xpToNextLevel}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Strength</span>
          <span className="stat-value">{stats.getBaseStat('strength')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Dexterity</span>
          <span className="stat-value">{stats.getBaseStat('dexterity')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Intelligence</span>
          <span className="stat-value">{stats.getBaseStat('intelligence')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Vitality</span>
          <span className="stat-value">{stats.getBaseStat('vitality')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Luck</span>
          <span className="stat-value">{stats.getBaseStat('luck')}</span>
        </div>
      </div>

      <div className="derived-stats">
        <h3>Derived Stats</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Health</span>
            <span className="stat-value">{derivedStats.currentHealth} / {derivedStats.maxHealth}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Mana</span>
            <span className="stat-value">{derivedStats.currentMana} / {derivedStats.maxMana}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Physical Damage</span>
            <span className="stat-value">{derivedStats.physicalDamage}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Magic Damage</span>
            <span className="stat-value">{derivedStats.magicDamage}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Defense</span>
            <span className="stat-value">{derivedStats.defense}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Evasion</span>
            <span className="stat-value">{(derivedStats.evasion).toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Critical Chance</span>
            <span className="stat-value">{(derivedStats.criticalChance).toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Critical Damage</span>
            <span className="stat-value">{(derivedStats.criticalDamage).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
} 