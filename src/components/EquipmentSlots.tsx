import React from 'react';
import { useDrop } from 'react-dnd';
import { IInventoryItem } from '../game/models/GameState';

interface EquipmentSlotsProps {
  onItemHover: (item: IInventoryItem | null, event?: React.MouseEvent) => void;
}

const EQUIPMENT_SLOTS = [
  { id: 'head', name: 'Head', position: { top: '10px', left: '50%', transform: 'translateX(-50%)' } },
  { id: 'weapon', name: 'Weapon', position: { top: '60px', left: '10px' } },
  { id: 'body', name: 'Body', position: { top: '60px', left: '50%', transform: 'translateX(-50%)' } },
  { id: 'accessory', name: 'Accessory', position: { top: '60px', right: '10px' } },
  { id: 'paws', name: 'Paws', position: { top: '110px', left: '50%', transform: 'translateX(-50%)' } },
  { id: 'tail', name: 'Tail', position: { bottom: '10px', left: '50%', transform: 'translateX(-50%)' } },
];

const EquipmentSlots: React.FC<EquipmentSlotsProps> = ({ onItemHover }) => {
  return (
    <div className="equipment-slots">
      <h3>Equipment</h3>
      <div className="equipment-slots__container">
        {EQUIPMENT_SLOTS.map((slot) => (
          <EquipmentSlot
            key={slot.id}
            slotId={slot.id}
            slotName={slot.name}
            position={slot.position}
            onItemHover={onItemHover}
          />
        ))}
      </div>
    </div>
  );
};

interface EquipmentSlotProps {
  slotId: string;
  slotName: string;
  position: React.CSSProperties;
  onItemHover: (item: IInventoryItem | null, event?: React.MouseEvent) => void;
}

const EquipmentSlot: React.FC<EquipmentSlotProps> = ({ 
  slotId, 
  slotName, 
  position, 
  onItemHover 
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'item',
    drop: (draggedItem: { id: string; sourceSlot: number; sourceType: string }) => {
      console.log('Item dropped into equipment slot:', slotId, draggedItem);
      // TODO: Handle equipment logic
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [slotId]);

  // TODO: Get equipped item from state
  const equippedItem: IInventoryItem | null = null;

  const handleMouseEnter = (event: React.MouseEvent) => {
    if (equippedItem) {
      onItemHover(equippedItem, event);
    }
  };

  const handleMouseLeave = () => {
    onItemHover(null);
  };

  return (
    <div
      ref={drop as any}
      className={`equipment-slot ${isOver ? 'equipment-slot--drop-target' : ''}`}
      style={position}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={slotName}
    >
      {equippedItem ? (
        <div className="equipment-slot__item">
          <span className="equipment-slot__type">{(equippedItem as IInventoryItem).type.charAt(0).toUpperCase()}</span>
        </div>
      ) : (
        <div className="equipment-slot__placeholder">
          {slotName[0]}
        </div>
      )}
    </div>
  );
};

export default EquipmentSlots;