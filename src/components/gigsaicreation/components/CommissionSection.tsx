import React, { useState, useEffect } from "react";
import { InfoText } from './InfoText';
import { predefinedOptions } from '../lib/guidance';
import { fetchAllCurrencies, fetchCurrencyById, Currency } from "../lib/api";
import {
  DollarSign, Target, AlertCircle, Coins,
  Star, ArrowLeft, ArrowRight, Loader2, Search, X, ChevronDown
} from 'lucide-react';
import { GigData } from '../types';

interface CommissionSectionProps {
  data: GigData;
  onChange: (data: GigData) => void;
  errors: { [key: string]: string[] };
  warnings: { [key: string]: string[] };
  onNext?: () => void;
  onPrevious?: () => void;
}

export function CommissionSection({ data, onChange, errors, warnings, onNext, onPrevious }: CommissionSectionProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch all currencies on component mount
  useEffect(() => {
    const loadCurrencies = async () => {
      setCurrenciesLoading(true);
      try {
        const fetchedCurrencies = await fetchAllCurrencies();
        setCurrencies(fetchedCurrencies);
        console.log('💰 COMMISSION - Loaded currencies:', fetchedCurrencies.length);
      } catch (error) {
        console.error('❌ Error loading currencies:', error);
      } finally {
        setCurrenciesLoading(false);
      }
    };

    loadCurrencies();
  }, []);

  // Fetch selected currency details when currency ID changes
  useEffect(() => {
    const loadSelectedCurrency = async () => {
      // Handle both string ID and object with $oid (for backward compatibility)
      const currencyId = typeof data?.commission?.currency === 'object' && (data?.commission?.currency as any)?.$oid
        ? (data?.commission?.currency as any).$oid
        : data?.commission?.currency;

      if (currencyId && currencies.length > 0) {
        // First try to find in loaded currencies by ID
        let foundCurrency = currencies.find(c => c._id === currencyId);

        // If not found by ID, and currencyId looks like a code (e.g. "EUR"), try finding by code
        if (!foundCurrency && typeof currencyId === 'string' && currencyId.length === 3) {
          foundCurrency = currencies.find(c => c.code === currencyId);
        }

        if (foundCurrency) {
          setSelectedCurrency(foundCurrency);
          console.log('💰 COMMISSION - Selected currency from list:', foundCurrency);
        } else {
          // If not found, fetch by ID ONLY if it looks like a valid Mongo ID (24 hex chars)
          // This prevents sending "EUR" to the ID endpoint which causes 400 error
          if (typeof currencyId === 'string' && /^[0-9a-fA-F]{24}$/.test(currencyId)) {
            try {
              const fetchedCurrency = await fetchCurrencyById(currencyId);
              if (fetchedCurrency) {
                setSelectedCurrency(fetchedCurrency);
                console.log('💰 COMMISSION - Selected currency from API:', fetchedCurrency);
              }
            } catch (error) {
              console.error('❌ Error fetching selected currency:', error);
            }
          } else {
            console.warn('⚠️ Invalid currency ID format, skipping fetch:', currencyId);
          }
        }
      } else {
        setSelectedCurrency(null);
      }
    };

    loadSelectedCurrency();
  }, [data?.commission?.currency, currencies]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const filteredCurrencies = React.useMemo(() => {
    if (!searchTerm.trim()) return currencies;
    const term = searchTerm.toLowerCase();
    return currencies.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term)
    );
  }, [currencies, searchTerm]);

  const getCurrencySymbol = () => {
    return selectedCurrency?.symbol || '€';
  };

  // Log Commission Section data
  useEffect(() => {
  }, [data.commission, data.seniority, errors, warnings]);

  const handleCommissionPerCallChange = (value: string | number) => {
    onChange({
      ...data,
      commission: {
        ...data.commission,
        commission_per_call: typeof value === 'string' ? parseFloat(value) || 0 : value,
      },
    });
  };

  const handleMinimumVolumeChange = (field: string, value: string | number) => {
    onChange({
      ...data,
      commission: {
        ...data.commission,
        minimumVolume: {
          ...data.commission?.minimumVolume,
          [field]: value.toString(), // Store as string
        },
      },
    });
  };

  const handleTransactionChange = (value: string | number) => {
    onChange({
      ...data,
      commission: {
        ...data.commission,
        transactionCommission: typeof value === 'string' ? parseFloat(value) || 0 : value,
      },
    });
  };

  const handleBonusChange = (value: string | number) => {
    onChange({
      ...data,
      commission: {
        ...data.commission,
        bonusAmount: value.toString(), // Store as string
      },
    });
  };

  // Add new unit type if it doesn't exist
  useEffect(() => {
    if (data?.commission?.minimumVolume?.unit && !predefinedOptions.commission.minimumVolumeUnits.includes(data.commission.minimumVolume.unit)) {
      predefinedOptions.commission.minimumVolumeUnits.push(data.commission.minimumVolume.unit);
    }
  }, [data?.commission?.minimumVolume?.unit]);

  // Add new period type if it doesn't exist
  useEffect(() => {
    if (data?.commission?.minimumVolume?.period && !predefinedOptions.commission.minimumVolumePeriods?.includes(data.commission.minimumVolume.period)) {
      if (!predefinedOptions.commission.minimumVolumePeriods) {
        predefinedOptions.commission.minimumVolumePeriods = [];
      }
      predefinedOptions.commission.minimumVolumePeriods.push(data.commission.minimumVolume.period);
    }
  }, [data?.commission?.minimumVolume?.period]);

  console.log('💰 COMMISSION SECTION - Rendering CommissionSection component');
  console.log('💰 COMMISSION SECTION - data.commission:', data.commission);
  console.log('💰 COMMISSION SECTION - currency:', data?.commission?.currency);
  console.log('💰 COMMISSION SECTION - commission_per_call:', data?.commission?.commission_per_call);

  return (
    <div className="w-full bg-white p-0">

      <div className="space-y-8">
        <InfoText>
          Define the complete commission structure including base rate, transaction commission,
          and performance bonus. All components will be displayed together.
        </InfoText>

        {/* Commission Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Currency Card */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-harx-100 hover:border-harx-200 group">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-harx rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-gray-900">Currency</h3>
                <p className="text-sm text-gray-500">Base currency for payments</p>
              </div>
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => !currenciesLoading && setIsDropdownOpen(!isDropdownOpen)}
                disabled={currenciesLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-harx-50 to-harx-alt-50 border-2 border-harx-200 rounded-xl text-harx-900 font-semibold focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <div className="flex items-center overflow-hidden">
                  {selectedCurrency ? (
                    <span className="truncate">
                      {selectedCurrency.name} ({selectedCurrency.code}) {selectedCurrency.symbol}
                    </span>
                  ) : (
                    <span className="text-harx-300 font-normal">Select currency...</span>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-harx-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-harx-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search currency..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-harx-400 focus:border-transparent"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {filteredCurrencies.length > 0 ? (
                      filteredCurrencies.map((currency) => (
                        <button
                          key={currency._id}
                          type="button"
                          onClick={() => {
                            onChange({
                              ...data,
                              commission: {
                                ...data.commission,
                                currency: currency._id
                              }
                            });
                            setIsDropdownOpen(false);
                            setSearchTerm("");
                          }}
                          className={`w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors flex items-center justify-between group
                            ${data?.commission?.currency === currency._id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'}
                          `}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col">
                              <span className="truncate">{currency.name}</span>
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider">{currency.code}</span>
                            </div>
                            <span className="font-bold text-harx-500 group-hover:scale-110 transition-transform ml-2">
                              {currency.symbol}
                            </span>
                          </div>
                          {data?.commission?.currency === currency._id && (
                            <div className="w-2 h-2 rounded-full bg-harx-500 ml-2" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <p className="text-gray-400 text-sm">No currencies found matching "{searchTerm}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {currenciesLoading && (
              <div className="mt-2 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-harx-500" />
                <span className="ml-2 text-sm text-harx-600">Loading...</span>
              </div>
            )}
          </div>

          {/* Per call compensation Card */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-harx-200 group">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-gray-900">Per call compensation</h3>
                <p className="text-sm text-gray-500">Amount per completed call</p>
              </div>
            </div>

            <div className="relative">
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-harx-600 font-bold text-lg">
                {getCurrencySymbol()}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={data?.commission?.commission_per_call || ''}
                onChange={e => handleCommissionPerCallChange(e.target.value)}
                placeholder="100"
                className="w-full pl-4 pr-12 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-harx-200 rounded-xl text-harx-900 font-bold text-2xl text-center focus:outline-none focus:ring-3 focus:ring-harx-300 focus:border-harx-400 transition-all"
              />
            </div>
          </div>

          {/* Transaction Commission Card */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-harx-alt-100 hover:border-harx-alt-200 group">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-harx rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-gray-900">Transaction Commission</h3>
                <p className="text-sm text-gray-500">Commission per transaction</p>
              </div>
            </div>

            <div className="relative">
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-harx-alt-600 font-bold text-lg">
                {getCurrencySymbol()}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={data?.commission?.transactionCommission || ''}
                onChange={e => handleTransactionChange(e.target.value)}
                placeholder="50"
                className="w-full pl-4 pr-12 py-4 bg-gradient-to-r from-harx-alt-50 to-harx-alt-100 border-2 border-harx-alt-200 rounded-xl text-harx-alt-900 font-bold text-2xl text-center focus:outline-none focus:ring-3 focus:ring-harx-alt-300 focus:border-harx-alt-400 transition-all"
              />
            </div>
          </div>

          {/* Bonus & Incentives Card */}
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-amber-100 hover:border-harx-200 group">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-gray-900">Bonus & Incentives</h3>
                <p className="text-sm text-gray-500">Performance bonus amount</p>
              </div>
            </div>

            <div className="relative">
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-600 font-bold text-lg">
                {getCurrencySymbol()}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={data?.commission?.bonusAmount || ''}
                onChange={e => handleBonusChange(e.target.value)}
                placeholder="150"
                className="w-full pl-4 pr-12 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-harx-200 rounded-xl text-harx-900 font-bold text-2xl text-center focus:outline-none focus:ring-3 focus:ring-amber-300 focus:border-amber-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Minimum Volume Requirements Section */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-gray-900">Minimum Volume Requirements</h3>
              <p className="text-sm text-gray-500">Set minimum performance thresholds</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={data?.commission?.minimumVolume?.amount || ''}
                onChange={e => handleMinimumVolumeChange('amount', e.target.value)}
                placeholder="100"
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-harx-200 rounded-xl text-harx-900 font-semibold text-center focus:outline-none focus:ring-3 focus:ring-orange-300 focus:border-orange-400 transition-all"
              />
            </div>

            <select
              value={data?.commission?.minimumVolume?.period || ''}
              onChange={e => handleMinimumVolumeChange('period', e.target.value)}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-harx-200 rounded-xl text-harx-900 font-semibold focus:outline-none focus:ring-3 focus:ring-orange-300 focus:border-orange-400 transition-all"
            >
              <option value="">Select Period</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
        </div>

        {/* Additional Details Section */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-gray-900">Additional Details</h3>
              <p className="text-sm text-gray-500">Terms, conditions and special notes</p>
            </div>
          </div>

          <textarea
            value={data?.commission?.additionalDetails || ''}
            onChange={e => onChange({
              ...data,
              commission: {
                ...data.commission,
                additionalDetails: e.target.value
              }
            })}
            placeholder="Commission details, payment terms, conditions, or special notes..."
            rows={4}
            className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-3 focus:ring-gray-300 focus:border-gray-400 transition-all resize-none"
          />
        </div>

        {/* Validation Messages */}
        {((errors?.commission && errors.commission.length > 0) || (warnings?.commission && warnings.commission.length > 0)) && (
          <div className="space-y-4">
            {errors?.commission && errors.commission.length > 0 && (
              <div className="flex items-start gap-3 p-6 bg-red-50 rounded-xl text-red-700 border border-red-200">
                <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-lg">Please fix the following:</p>
                  <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                    {errors.commission.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {warnings?.commission && warnings.commission.length > 0 && (
              <div className="flex items-start gap-3 p-6 bg-yellow-50 rounded-xl text-yellow-700 border border-yellow-200">
                <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-lg">Recommendations:</p>
                  <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                    {warnings.commission.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-8 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onPrevious}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Previous
            </button>
          </div>
          <button
            onClick={onNext}
            className="flex items-center gap-3 px-6 py-3 rounded-xl bg-harx-500 text-white hover:bg-harx-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            Next
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}