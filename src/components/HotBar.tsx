import React from 'react';
import { useAppSelector } from '../store';
import { selectGameState } from '../store/slices/gameSlice';
import './HotBar.css';

const HotBar: React.FC = () => {
  const gameState = useAppSelector(selectGameState);

  if (!gameState) return null;

  const playerState = gameState.getPlayerState();
  const inventoryItems = playerState.inventoryManager.getAllItems();
  
  // Get first 8 items for hotbar
  const hotbarItems = inventoryItems.slice(0, 8);

  const handleItemClick = (index: number) => {
    const item = hotbarItems[index];
    if (item) {
      console.log(`Selected item: ${item.equipment.getName()}`);
      // TODO: Implement item usage/equipping
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    const key = parseInt(e.key);
    if (key >= 1 && key <= 8) {
      handleItemClick(key - 1);
    }
  };

  return (
    <div className="hotbar" onKeyDown={handleKeyPress} tabIndex={0}>
      {Array.from({ length: 8 }, (_, index) => {
        const item = hotbarItems[index];
        const keyBind = index + 1;
        
        return (
          <div
            key={index}
            className={`hotbar-slot ${item ? 'has-item' : 'empty'}`}
            onClick={() => handleItemClick(index)}
            title={item ? `${item.equipment.getName()} (${keyBind})` : `Empty Slot (${keyBind})`}
          >
            <div className="hotbar-keybind">{keyBind}</div>
            {item && (
              <>
                <div className="hotbar-item">
                  {getItemIcon(item.equipment.getType())}
                </div>
                {item.quantity > 1 && (
                  <div className="hotbar-quantity">{item.quantity}</div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

function getItemIcon(type: string): string {
  switch (type) {
    case 'weapon': return '⚔️';
    case 'armor': return '🛡️';
    case 'consumable': return '🧪';
    case 'quest': return '📜';
    default: return '❓';
  }
}

export default HotBar;