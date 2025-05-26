import React from 'react';
import { useDrop } from 'react-dnd';
import { useAppSelector, useAppDispatch } from '../store';
import { selectGameState, equipItem, unequipItem } from '../store/slices/gameSlice';
import { IInventoryItem } from '../game/models/GameState';
import { EquipmentSlot as EquipmentSlotEnum } from '../game/models/Equipment';

interface EquipmentSlotsProps {
  onItemHover: (item: IInventoryItem | null, event?: React.MouseEvent) => void;
}

const EQUIPMENT_SLOTS = [
  { id: EquipmentSlotEnum.HEAD, name: 'Head', position: { top: '10px', left: '50%', transform: 'translateX(-50%)' } },
  { id: EquipmentSlotEnum.WEAPON, name: 'Weapon', position: { top: '60px', left: '10px' } },
  { id: EquipmentSlotEnum.BODY, name: 'Body', position: { top: '60px', left: '50%', transform: 'translateX(-50%)' } },
  { id: EquipmentSlotEnum.ACCESSORY, name: 'Accessory', position: { top: '60px', right: '10px' } },
  { id: EquipmentSlotEnum.PAWS, name: 'Paws', position: { top: '110px', left: '50%', transform: 'translateX(-50%)' } },
  { id: EquipmentSlotEnum.TAIL, name: 'Tail', position: { bottom: '10px', left: '50%', transform: 'translateX(-50%)' } },
  { id: EquipmentSlotEnum.CHEST, name: 'Chest', position: { top: '110px', right: '10px' } },
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
  slotId: EquipmentSlotEnum;
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
  const dispatch = useAppDispatch();
  const gameState = useAppSelector(selectGameState);
  
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'item',
    drop: (draggedItem: { id: string; sourceSlot: number; sourceType: string }) => {
      if (draggedItem.sourceType === 'inventory') {
        // Equipment from inventory
        dispatch(equipItem({ equipmentId: draggedItem.id }));
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [slotId, dispatch]);

  // Get equipped item from game state
  const equippedItem = gameState?.getEquippedItem(slotId);

  // Convert Equipment to IInventoryItem for tooltip compatibility
  const tooltipItem: IInventoryItem | null = equippedItem ? {
    id: equippedItem.getId(),
    name: equippedItem.getName(),
    type: equippedItem.getType() as 'weapon' | 'armor' | 'consumable' | 'quest',
    quantity: 1,
    stats: equippedItem.getStats().bonuses
  } : null;

  const handleMouseEnter = (event: React.MouseEvent) => {
    if (tooltipItem) {
      onItemHover(tooltipItem, event);
    }
  };

  const handleMouseLeave = () => {
    onItemHover(null);
  };

  const handleClick = () => {
    if (equippedItem) {
      dispatch(unequipItem({ slot: slotId }));
    }
  };

  return (
    <div
      ref={drop as any}
      className={`equipment-slot ${isOver ? 'equipment-slot--drop-target' : ''} ${equippedItem ? 'equipment-slot--equipped' : ''}`}
      style={position}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title={`${slotName}${equippedItem ? ` - ${equippedItem.getName()}` : ''}`}
    >
      {equippedItem ? (
        <div className="equipment-slot__item">
          <span className="equipment-slot__type">{equippedItem.getType().charAt(0).toUpperCase()}</span>
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