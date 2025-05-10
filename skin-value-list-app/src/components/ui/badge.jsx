import React from 'react';
export const Badge = ({ className = '', children }) => (
  <span className={`text-white text-xs px-2 py-1 rounded ${className}`}>{children}</span>
);
