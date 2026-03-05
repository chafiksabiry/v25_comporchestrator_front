import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    id: string;
    name: string;
    [key: string]: any;
}

interface PremiumDropdownProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
    triggerClassName?: string;
}

export function PremiumDropdown({
    options,
    value,
    onChange,
    label,
    placeholder = 'Select an option...',
    className = '',
    triggerClassName = ''
}: PremiumDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionId: string) => {
        onChange(optionId);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {label && (
                <div className="absolute -top-2.5 left-4 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-lg z-10 shadow-lg shadow-blue-500/20 ring-4 ring-white">
                    {label}
                </div>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between appearance-none bg-white border-2 border-gray-100/80 text-gray-900 font-bold py-5 px-8 rounded-[2rem] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)] hover:-translate-y-1 cursor-pointer min-w-[340px] text-xl tracking-tight ${triggerClassName}`}
            >
                <span className={selectedOption ? 'text-gray-900' : 'text-gray-400 font-medium italic'}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <ChevronDown
                    className={`w-7 h-7 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : 'group-hover:translate-y-0.5'}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-4 bg-white/95 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-[0_25px_70px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent p-2">
                        {options.length === 0 ? (
                            <div className="px-6 py-4 text-gray-400 text-sm italic">No options available</div>
                        ) : (
                            options.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelect(option.id)}
                                    className={`w-full flex items-center justify-between px-6 py-4 mb-1 rounded-2xl text-left transition-all duration-200 group ${value === option.id
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900 hover:translate-x-1'
                                        }`}
                                >
                                    <div className="flex flex-col">
                                        <span className={`text-base font-bold ${value === option.id ? 'text-blue-700' : 'text-gray-900'}`}>
                                            {option.name}
                                        </span>
                                        {option.company && (
                                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-0.5">
                                                {option.company}
                                            </span>
                                        )}
                                    </div>
                                    {value === option.id && (
                                        <div className="bg-blue-600 rounded-full p-1 shadow-lg shadow-blue-500/30">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
