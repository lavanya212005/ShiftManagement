import React from 'react';
import './Button.css';

const Button = ({ children, onClick, variant = 'primary', type = 'button', className = '', style }) => {
  return (
    <button type={type} onClick={onClick} className={`premium-button ${variant} ${className}`} style={style}>
      {children}
    </button>
  );
};

export default Button;
