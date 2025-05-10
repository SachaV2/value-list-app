import React from 'react';
export const Input = React.forwardRef(({ className = '', ...props }, ref) => (
  <input ref={ref} className={`border rounded px-2 py-1 outline-none focus:ring ${className}`} {...props} />
));
