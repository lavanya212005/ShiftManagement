import React from 'react';
import './Card.css';

const Card = ({ children, title, className = '', style }) => {
  return (
    <div className={`premium-card ${className}`} style={style}>
      {title && <h3 className="card-title">{title}</h3>}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

export default Card;
