import React from 'react';

interface ToggleProps {
  id: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ 
  id, 
  name, 
  checked, 
  onChange, 
  label, 
  disabled = false 
}) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        id={id}
        name={name}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex h-5 w-9 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
          ${checked 
            ? 'bg-gray-600' 
            : 'bg-gray-200'
          }
          ${disabled 
            ? 'cursor-not-allowed opacity-50' 
            : 'cursor-pointer'
          }
        `}
      >
        <span
          className={`
            inline-block h-3 w-3 transform rounded-full bg-white
            ${checked ? 'translate-x-5' : 'translate-x-1'}
          `}
        />
      </button>
      <label 
        htmlFor={id} 
        className={`text-sm text-gray-700 ${!disabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        onClick={() => !disabled && onChange(!checked)}
      >
        {label}
      </label>
    </div>
  );
};

export default Toggle; 