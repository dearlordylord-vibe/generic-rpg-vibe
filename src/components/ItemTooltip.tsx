import React from 'react';
import { IInventoryItem } from '../game/models/GameState';

interface ItemTooltipProps {
  item: IInventoryItem;
  position: { x: number; y: number };
}

const ItemTooltip: React.FC<ItemTooltipProps> = ({ item, position }) => {
  return (
    <div 
      className="item-tooltip"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="item-tooltip__header">
        <div className="item-tooltip__name">{item.name}</div>
        <div className="item-tooltip__type">{item.type}</div>
      </div>
      
      {item.stats && Object.keys(item.stats).length > 0 && (
        <div className="item-tooltip__stats">
          <div className="item-tooltip__section-title">Stats:</div>
          {Object.entries(item.stats).map(([stat, value]) => (
            <div key={stat} className="item-tooltip__stat">
              {stat}: {value > 0 ? '+' : ''}{value}
            </div>
          ))}
        </div>
      )}
      
      {item.quantity > 1 && (
        <div className="item-tooltip__quantity">
          Quantity: {item.quantity}
        </div>
      )}
    </div>
  );
};

export default ItemTooltip;