import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../store';
import { saveState, loadState } from '../store/slices/gameSlice';
import { initializePlayer } from '../store/slices/playerSlice';
import { config as gameConfig } from '../game/config';
import PlayerStats from './PlayerStats';
import StatAllocation from './StatAllocation';
import './Game.css';

export default function Game() {
  const gameRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();

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

  return (
    <div className="game-container">
      <div className="game-canvas" ref={gameRef} />
      <div className="game-ui">
        <PlayerStats />
        <StatAllocation />
        <button className="save-button" onClick={handleSaveGame}>
          Save Game
        </button>
      </div>
    </div>
  );
} 