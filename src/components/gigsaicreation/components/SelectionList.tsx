import React from 'react';
import { Check } from 'lucide-react';

interface SelectionOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectionListProps {
  options: (SelectionOption | string)[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'grid' | 'flow';
}

export function SelectionList({
  options,
  selected,
  onChange,
  multiple = true,
  className = '',
  size = 'md',
  layout = 'grid'
}: SelectionListProps) {
  const handleSelect = (option: SelectionOption | string) => {
    const value = typeof option === 'string' ? option : option.value;
    const currentSelected = selected || [];
    if (multiple) {
      const newSelected = currentSelected.includes(value)
        ? currentSelected.filter(item => item !== value)
        : [...currentSelected, value];
      onChange(newSelected);
    } else {
      onChange([value]);
    }
  };

  const sizeClasses = {
    sm: 'p-1.5 text-sm',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base'
  };

  const layoutClasses = {
    grid: 'grid grid-cols-2 gap-2',
    flow: 'flex flex-wrap gap-2'
  };

  const getOptionValue = (option: SelectionOption | string): string => 
    typeof option === 'string' ? option : option.value;

  const getOptionLabel = (option: SelectionOption | string): string => 
    typeof option === 'string' ? option : option.label;

  const getOptionDescription = (option: SelectionOption | string): string | undefined => 
    typeof option === 'string' ? undefined : option.description;

  return (
    <div className={`${layoutClasses[layout]} ${className}`}>
      {options.map((option) => {
        const value = getOptionValue(option);
        const label = getOptionLabel(option);
        const description = getOptionDescription(option);
        
        return (
          <button
            key={value}
            onClick={() => handleSelect(option)}
            className={`flex items-center gap-2 rounded-lg transition-colors ${sizeClasses[size]} ${
              selected?.includes(value)
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className={`w-4 h-4 rounded flex items-center justify-center ${
              selected?.includes(value) ? 'bg-blue-600' : 'border border-gray-300'
            }`}>
              {selected?.includes(value) && <Check className="w-3 h-3 text-white" />}
            </div>
            <div className="flex flex-col">
              <span className="truncate">{label}</span>
              {description && (
                <span className="text-xs text-gray-500 truncate">{description}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}