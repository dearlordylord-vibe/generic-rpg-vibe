import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { saveState, loadState, addTestItems } from '../store/slices/gameSlice';
import { initializePlayer, addXP, clearLevelUpMessage, selectLevelUpMessage, selectPlayerStats } from '../store/slices/playerSlice';
import { config as gameConfig } from '../game/config';
import PlayerStats from './PlayerStats';
import StatAllocation from './StatAllocation';
import Inventory from './Inventory';
import GameHUD from './GameHUD';
import HotBar from './HotBar';
import './Game.css';

export default function Game() {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const dispatch = useAppDispatch();
  const levelUpMessage = useAppSelector(selectLevelUpMessage);
  const playerStats = useAppSelector(selectPlayerStats);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [hudState, setHudState] = useState({
    currentProjectile: 'arrow',
    currentAOE: 'explosion',
    playerHealth: 100,
    maxHealth: 100,
    playerMana: 50,
    maxMana: 50,
    isBlocking: false,
    isDodging: false
  });

  useEffect(() => {
    // Initialize game state and player on first load
    dispatch(loadState());
    dispatch(initializePlayer());
  }, [dispatch]);

  // Update HUD with player stats
  useEffect(() => {
    if (playerStats) {
      const derivedStats = playerStats.getDerivedStats();
      setHudState(prev => ({
        ...prev,
        playerHealth: derivedStats.currentHealth,
        maxHealth: derivedStats.maxHealth,
        playerMana: derivedStats.currentMana,
        maxMana: derivedStats.maxMana
      }));
    }
  }, [playerStats]);

  useEffect(() => {
    if (!gameRef.current) return;

    // Initialize Phaser game
    const game = new Phaser.Game({
      ...gameConfig,
      parent: gameRef.current
    });
    
    gameInstanceRef.current = game;

    // Set up HUD state communication
    const mainScene = game.scene.getScene('MainScene') as any;
    if (mainScene) {
      // Pass player stats to the scene
      if (playerStats) {
        mainScene.setPlayerStats(playerStats);
      }
      
      // Listen for HUD updates from the scene
      mainScene.events.on('hudUpdate', (data: any) => {
        setHudState(prev => ({ ...prev, ...data }));
      });
    }

    // Auto-save game state every 5 minutes
    const saveInterval = setInterval(() => {
      dispatch(saveState());
    }, 5 * 60 * 1000);

    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
      clearInterval(saveInterval);
    };
  }, [dispatch]);

  const handleSaveGame = () => {
    dispatch(saveState());
  };

  const handleAddXP = () => {
    dispatch(addXP(150)); // Add enough XP to test leveling
  };

  const handleAddTestItems = () => {
    dispatch(addTestItems());
  };

  const dismissLevelUp = () => {
    dispatch(clearLevelUpMessage());
  };

  return (
    <div className="game-container">
      <GameHUD {...hudState} />
      <HotBar />
      <div 
        className="game-canvas" 
        ref={gameRef} 
        onContextMenu={(e) => e.preventDefault()}
      />
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
          <button className="test-items-button" onClick={handleAddTestItems}>
            Add Test Items
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