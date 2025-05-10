import React from 'react';
export const Card = ({ className = '', ...props }) => (
  <div className={`bg-white rounded-xl border ${className}`} {...props} />
);
export const CardContent = ({ className = '', ...props }) => (
  <div className={className} {...props} />
);
