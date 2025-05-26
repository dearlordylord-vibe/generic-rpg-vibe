import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { saveState, loadState } from '../store/slices/gameSlice';
import { initializePlayer, addXP, clearLevelUpMessage, selectLevelUpMessage } from '../store/slices/playerSlice';
import { config as gameConfig } from '../game/config';
import PlayerStats from './PlayerStats';
import StatAllocation from './StatAllocation';
import Inventory from './Inventory';
import './Game.css';

export default function Game() {
  const gameRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const levelUpMessage = useAppSelector(selectLevelUpMessage);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  useEffect(() => {
    // Initialize game state and player on first load
    dispatch(loadState());
    dispatch(initializePlayer());
  }, [dispatch]);

  useEffect(() => {
    if (!gameRef.current) return;

    // Initialize Phaser game
    const game = new Phaser.Game({
      ...gameConfig,
      parent: gameRef.current
    });

    // Auto-save game state every 5 minutes
    const saveInterval = setInterval(() => {
      dispatch(saveState());
    }, 5 * 60 * 1000);

    return () => {
      game.destroy(true);
      clearInterval(saveInterval);
    };
  }, [dispatch]);

  const handleSaveGame = () => {
    dispatch(saveState());
  };

  const handleAddXP = () => {
    dispatch(addXP(150)); // Add enough XP to test leveling
  };

  const dismissLevelUp = () => {
    dispatch(clearLevelUpMessage());
  };

  return (
    <div className="game-container">
      <div className="game-canvas" ref={gameRef} />
      <div className="game-ui">
        <PlayerStats />
        <StatAllocation />
        <div className="game-controls">
          <button className="save-button" onClick={handleSaveGame}>
            Save Game
          </button>
          <button className="xp-button" onClick={handleAddXP}>
            Add XP (Test)
          </button>
          <button className="inventory-button" onClick={() => setIsInventoryOpen(true)}>
            Inventory (I)
          </button>
        </div>
        {levelUpMessage && (
          <div className="level-up-notification">
            <p>{levelUpMessage}</p>
            <button onClick={dismissLevelUp}>OK</button>
          </div>
        )}
      </div>
      <Inventory 
        isOpen={isInventoryOpen} 
        onClose={() => setIsInventoryOpen(false)} 
      />
    </div>
  );
} 