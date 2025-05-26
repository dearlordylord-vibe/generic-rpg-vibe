import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { IInventoryItem } from '../game/models/GameState';

interface InventorySlotProps {
  item: IInventoryItem | null;
  slotIndex: number;
  onItemHover: (item: IInventoryItem | null, event?: React.MouseEvent) => void;
}

const InventorySlot: React.FC<InventorySlotProps> = ({ item, slotIndex, onItemHover }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'item',
    item: item ? { ...item, sourceSlot: slotIndex, sourceType: 'inventory' } : null,
    canDrag: !!item,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'item',
    drop: (draggedItem: { id: string; sourceSlot: number; sourceType: string }) => {
      console.log('Item dropped into slot:', slotIndex, draggedItem);
      // TODO: Handle item swapping/moving logic
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const handleMouseEnter = (event: React.MouseEvent) => {
    if (item) {
      onItemHover(item, event);
    }
  };

  const handleMouseLeave = () => {
    onItemHover(null);
  };

  return (
    <div
      ref={(node) => {
        drag(node);
        drop(node);
      }}
      className={`inventory-slot ${item ? 'inventory-slot--filled' : ''} ${
        isDragging ? 'inventory-slot--dragging' : ''
      } ${isOver ? 'inventory-slot--drop-target' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {item && (
        <div className="inventory-item">
          <div className="inventory-item__icon">
            {/* TODO: Add item icons */}
            <span className="inventory-item__type">{item.type[0].toUpperCase()}</span>
          </div>
          <div className="inventory-item__name">{item.name}</div>
          {item.quantity > 1 && (
            <div className="inventory-item__quantity">{item.quantity}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventorySlot;