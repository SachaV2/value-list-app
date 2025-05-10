import React from 'react';
export const Button = ({ className = '', children, ...props }) => (
  <button className={`bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded ${className}`} {...props}>
    {children}
  </button>
);
