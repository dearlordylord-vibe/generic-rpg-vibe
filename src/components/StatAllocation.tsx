import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectPlayerStats, updateStats, saveStateSnapshot, undoState, redoState, selectCanUndo, selectCanRedo, selectCurrentStateDescription } from '../store/slices/playerSlice';
import { PlayerStats, IBaseStats } from '../game/models/PlayerStats';
import './StatAllocation.css';

const StatAllocation: React.FC = () => {
  const stats = useSelector(selectPlayerStats);
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);
  const currentStateDescription = useSelector(selectCurrentStateDescription);
  const dispatch = useDispatch();
  const [previewStat, setPreviewStat] = useState<keyof IBaseStats | null>(null);

  if (!stats) {
    return <div>Loading stats...</div>;
  }

  const handleStatIncrease = (stat: keyof IBaseStats) => {
    if (stats.canAllocateStatPoint(stat)) {
      // Save current state before making changes
      dispatch(saveStateSnapshot(`Allocated point to ${stat}`));
      
      const newStats = PlayerStats.deserialize(stats.serialize());
      newStats.allocateStatPoint(stat);
      dispatch(updateStats(newStats));
    }
  };

  const handleUndo = () => {
    if (canUndo) {
      dispatch(undoState());
    } else if (stats.canUndo()) {
      // Fallback to PlayerStats internal undo
      const newStats = PlayerStats.deserialize(stats.serialize());
      newStats.undoLastAllocation();
      dispatch(updateStats(newStats));
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      dispatch(redoState());
    }
  };

  const handleStatHover = (stat: keyof IBaseStats | null) => {
    setPreviewStat(stat);
  };

  const getStatPreview = (stat: keyof IBaseStats) => {
    if (previewStat !== stat) return null;
    return stats.previewStatAllocation(stat);
  };

  const renderStat = (stat: keyof IBaseStats, label: string, description: string) => {
    const preview = getStatPreview(stat);
    const cost = stats.getStatCost(stat);
    const canAllocate = stats.canAllocateStatPoint(stat) && stats.getAvailableStatPoints() >= cost;
    const currentValue = stats.getBaseStat(stat);

    return (
      <div key={stat} className="stat-row">
        <div className="stat-info">
          <div className="stat-name">{label}</div>
          <div className="stat-value">
            {currentValue}
            {preview && (
              <span style={{ color: '#4a90e2' }}>
                {' → ' + preview.getBaseStat(stat)}
              </span>
            )}
          </div>
          <button
            className="allocate-button"
            onClick={() => handleStatIncrease(stat)}
            onMouseEnter={() => handleStatHover(stat)}
            onMouseLeave={() => handleStatHover(null)}
            disabled={!canAllocate}
            data-testid={`increase-${stat}-button`}
            title={canAllocate ? `Cost: ${cost} point${cost > 1 ? 's' : ''}` : 'Cannot allocate more points'}
          >
            +
          </button>
        </div>
        <div className="stat-description">{description}</div>
      </div>
    );
  };

  return (
    <div className="stat-allocation">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ flexGrow: 1, margin: 0 }}>
          Available Points: {stats.getAvailableStatPoints()}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleUndo}
            disabled={!canUndo && !stats.canUndo()}
            title="Undo last allocation"
            data-testid="undo-button"
            style={{
              padding: '8px 12px',
              backgroundColor: (canUndo || stats.canUndo()) ? '#4a90e2' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (canUndo || stats.canUndo()) ? 'pointer' : 'not-allowed',
              opacity: (canUndo || stats.canUndo()) ? 1 : 0.7
            }}
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo last undone action"
            data-testid="redo-button"
            style={{
              padding: '8px 12px',
              backgroundColor: canRedo ? '#28a745' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              opacity: canRedo ? 1 : 0.7
            }}
          >
            Redo
          </button>
        </div>
      </div>
      {currentStateDescription && currentStateDescription !== 'Initial state' && (
        <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginBottom: '10px',
          fontStyle: 'italic'
        }}>
          Last action: {currentStateDescription}
        </div>
      )}

      <div className="stats-list">
        {renderStat(
          'strength',
          'Strength',
          'Affects physical damage and carrying capacity'
        )}
        {renderStat(
          'dexterity',
          'Dexterity',
          'Affects accuracy, evasion, and attack speed'
        )}
        {renderStat(
          'intelligence',
          'Intelligence',
          'Affects magic power and mana pool'
        )}
        {renderStat(
          'vitality',
          'Vitality',
          'Affects health points and stamina'
        )}
        {renderStat(
          'luck',
          'Luck',
          'Affects critical hit chance and item discovery'
        )}
      </div>
    </div>
  );
};

export default StatAllocation; 