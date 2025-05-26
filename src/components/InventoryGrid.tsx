import React from 'react';
import { useDrop } from 'react-dnd';
import InventorySlot from './InventorySlot';
import { IInventoryItem } from '../game/models/GameState';

interface InventoryGridProps {
  items: IInventoryItem[];
  maxSlots: number;
  onItemHover: (item: IInventoryItem | null, event?: React.MouseEvent) => void;
}

const InventoryGrid: React.FC<InventoryGridProps> = ({ items, maxSlots, onItemHover }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'item',
    drop: (draggedItem: { id: string; sourceSlot: number; sourceType: string }, monitor) => {
      if (!monitor.didDrop()) {
        // Handle dropping item into empty inventory slot
        console.log('Item dropped into inventory:', draggedItem);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), []);

  // Create grid with items positioned correctly
  const grid = Array(maxSlots).fill(null);
  items.forEach((item, index) => {
    grid[index] = item;
  });

  const rows = Math.ceil(maxSlots / 8); // 8 items per row

  return (
    <div 
      ref={drop as any}
      className={`inventory-grid ${isOver ? 'inventory-grid--drop-target' : ''}`}
    >
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="inventory-row">
          {Array.from({ length: 8 }, (_, colIndex) => {
            const slotIndex = rowIndex * 8 + colIndex;
            if (slotIndex >= maxSlots) return null;
            
            const item = grid[slotIndex];
            return (
              <InventorySlot
                key={slotIndex}
                item={item}
                slotIndex={slotIndex}
                onItemHover={onItemHover}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default InventoryGrid;