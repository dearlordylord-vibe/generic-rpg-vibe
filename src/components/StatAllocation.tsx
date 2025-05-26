import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectPlayerStats, updateStats } from '../store/slices/playerSlice';
import { PlayerStats, IBaseStats } from '../game/models/PlayerStats';
import { Button, Typography, Box, Tooltip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UndoIcon from '@mui/icons-material/Undo';
import InfoIcon from '@mui/icons-material/Info';
import './StatAllocation.css';

const StatAllocation: React.FC = () => {
  const stats = useSelector(selectPlayerStats);
  const dispatch = useDispatch();
  const [previewStat, setPreviewStat] = useState<keyof IBaseStats | null>(null);

  if (!stats) {
    return <Typography>Loading stats...</Typography>;
  }

  const handleStatIncrease = (stat: keyof IBaseStats) => {
    if (stats.canAllocateStatPoint(stat)) {
      const newStats = PlayerStats.deserialize(stats.serialize());
      newStats.allocateStatPoint(stat);
      dispatch(updateStats(newStats));
    }
  };

  const handleUndo = () => {
    if (stats.canUndo()) {
      const newStats = PlayerStats.deserialize(stats.serialize());
      newStats.undoLastAllocation();
      dispatch(updateStats(newStats));
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
      <Box key={stat} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Tooltip title={description} arrow>
          <IconButton size="small" sx={{ mr: 1 }}>
            <InfoIcon />
          </IconButton>
        </Tooltip>
        <Typography sx={{ minWidth: 120 }}>{label}:</Typography>
        <Typography sx={{ minWidth: 40, textAlign: 'right' }}>
          {currentValue}
          {preview && (
            <Typography component="span" color="primary">
              {' → ' + preview.getBaseStat(stat)}
            </Typography>
          )}
        </Typography>
        <Box sx={{ ml: 2 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleStatIncrease(stat)}
            onMouseEnter={() => handleStatHover(stat)}
            onMouseLeave={() => handleStatHover(null)}
            disabled={!canAllocate}
            disableRipple
            data-testid={`increase-${stat}-button`}
            title={canAllocate ? `Cost: ${cost} point${cost > 1 ? 's' : ''}` : 'Cannot allocate more points'}
            sx={{
              minWidth: 'unset',
              padding: '4px',
              '&.Mui-disabled': {
                backgroundColor: 'transparent',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                color: 'rgba(0, 0, 0, 0.26)',
                pointerEvents: 'none',
                cursor: 'not-allowed'
              }
            }}
          >
            <AddIcon />
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Available Points: {stats.getAvailableStatPoints()}
        </Typography>
        <IconButton
          onClick={handleUndo}
          disabled={!stats.canUndo()}
          color="primary"
          title="Undo last allocation"
          data-testid="undo-button"
        >
          <UndoIcon />
        </IconButton>
      </Box>

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
    </Box>
  );
};

export default StatAllocation; 