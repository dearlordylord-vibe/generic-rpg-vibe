import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAppSelector } from '../store';
import { selectGameState } from '../store/slices/gameSlice';
import InventoryGrid from './InventoryGrid';
import EquipmentSlots from './EquipmentSlots';
import ItemTooltip from './ItemTooltip';
import { IInventoryItem } from '../game/models/GameState';
import './Inventory.css';

interface InventoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ isOpen, onClose }) => {
  const gameState = useAppSelector(selectGameState);
  const [hoveredItem, setHoveredItem] = useState<IInventoryItem | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  if (!isOpen || !gameState) {
    return null;
  }

  const playerState = gameState.getPlayerState();
  const inventory = playerState.inventory;

  const handleItemHover = (item: IInventoryItem | null, event?: React.MouseEvent) => {
    setHoveredItem(item);
    if (event && item) {
      setTooltipPosition({ x: event.clientX + 10, y: event.clientY + 10 });
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="inventory-overlay" onClick={onClose}>
        <div className="inventory-container" onClick={(e) => e.stopPropagation()}>
          <div className="inventory-header">
            <h2>Inventory</h2>
            <button className="inventory-close" onClick={onClose}>×</button>
          </div>
          
          <div className="inventory-content">
            <div className="inventory-left">
              <EquipmentSlots onItemHover={handleItemHover} />
            </div>
            
            <div className="inventory-right">
              <div className="inventory-info">
                <span>Gold: {inventory.gold}</span>
                <span>Slots: {inventory.items.length}/{inventory.maxSlots}</span>
              </div>
              <InventoryGrid 
                items={inventory.items}
                maxSlots={inventory.maxSlots}
                onItemHover={handleItemHover}
              />
            </div>
          </div>

          {hoveredItem && (
            <ItemTooltip 
              item={hoveredItem}
              position={tooltipPosition}
            />
          )}
        </div>
      </div>
    </DndProvider>
  );
};

export default Inventory;