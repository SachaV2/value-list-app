import React from 'react';
export const Select = ({ value, onValueChange, children, className='' }) => {
  const handleChange = (e) => onValueChange && onValueChange(e.target.value);
  const options = [];
  React.Children.forEach(children, (child) => {
    if (child?.type?.displayName === 'SelectItem') options.push(child);
  });
  return (
    <select value={value} onChange={handleChange} className={`border rounded px-2 py-1 ${className}`}>
      {options}
    </select>
  );
};
const SelectItemComp = ({ value, children }) => <option value={value}>{children}</option>;
SelectItemComp.displayName = 'SelectItem';
export const SelectItem = SelectItemComp;
export const SelectTrigger = ({ children }) => <>{children}</>;
export const SelectContent = ({ children }) => <>{children}</>;
export const SelectValue = ({ children }) => <>{children}</>;
