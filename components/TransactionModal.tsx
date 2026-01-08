import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Fuel, Zap, Wallet } from 'lucide-react';
import { TransactionType, Category, Transaction, Vehicle, FuelType, FUEL_LABELS, CategoryItem, Account } from '../types';
import Button from './Button';
import { formatCurrency, handlePriceChange, formatDateForInput, formatDecimal } from '../utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  vehicle: Vehicle | null;
  categories: CategoryItem[];
  accounts: Account[];
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, vehicle, categories, accounts }) => {
  const [type, setType] = useState<TransactionType>('INCOME');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState<string>(formatDateForInput(new Date()));
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Fuel Specific State
  const [fuelType, setFuelType] = useState<FuelType>('GASOLINE');
  const [unitPrice, setUnitPrice] = useState<number>(0);

  // Initialize Default Selection
  useEffect(() => {
    if (isOpen) {
      const defaultCat = type === 'INCOME' 
        ? categories.find(c => c.type === 'INCOME' || c.type === 'BOTH') 
        : categories.find(c => c.id === Category.FUEL); // Default to Fuel for expense
      
      setCategory(defaultCat?.id || '');
      
      const defaultAcc = accounts.find(a => a.isDefault) || accounts[0];
      setSelectedAccountId(defaultAcc?.id || '');
      
      // Reset fields
      setFuelType('GASOLINE');
      setUnitPrice(0);
      setAmount(0);
      setDescription('');
    }
  }, [isOpen, type, categories, accounts]);

  // Auto-fill Logic for Fixed Costs
  useEffect(() => {
    if (isOpen && vehicle && type === 'EXPENSE') {
      if (category === Category.RENT && vehicle.ownershipType === 'RENTED' && vehicle.rentAmount) {
        setAmount(vehicle.rentAmount);
        const freq = vehicle.rentFrequency === 'WEEKLY' ? 'Semanal' : 'Mensal';
        setDescription(`Aluguel ${freq}`);
      } else if (category === Category.FINANCING && vehicle.ownershipType === 'FINANCED' && vehicle.financingInstallment) {
        setAmount(vehicle.financingInstallment);
        const currentParcel = (vehicle.financingPaidMonths || 0) + 1;
        setDescription(`Parcela ${currentParcel}/${vehicle.financingTotalMonths || '?'}`);
      } else if (category === Category.INSURANCE && vehicle.insuranceInstallmentValue) {
        setAmount(vehicle.insuranceInstallmentValue);
        setDescription('Parcela Seguro');
      }
    }
  }, [category, vehicle, isOpen, type]);

  if (!isOpen || !vehicle) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const calculatedVolume = (category === Category.FUEL && unitPrice > 0) 
      ? amount / unitPrice 
      : undefined;

    onSave({
      vehicleId: vehicle.id,
      accountId: selectedAccountId,
      type,
      category,
      amount,
      date,
      description,
      // Include fuel data if category is FUEL
      fuelType: category === Category.FUEL ? fuelType : undefined,
      unitPrice: category === Category.FUEL ? unitPrice : undefined,
      volume: calculatedVolume
    });
    
    // Reset form
    setAmount(0);
    setDescription('');
    setUnitPrice(0);
    onClose();
  };

  const visibleCategories = categories.filter(cat => {
    // Filter by Type
    if (cat.type !== 'BOTH' && cat.type !== type) return false;
    
    // Special Logic for Vehicle Types
    if (cat.id === Category.RENT && vehicle.ownershipType !== 'RENTED') return false;
    if (cat.id === Category.FINANCING && vehicle.ownershipType !== 'FINANCED') return false;

    return true;
  });

  // Calculation for display
  const calculatedVolume = (category === Category.FUEL && unitPrice > 0 && amount > 0) 
    ? amount / unitPrice 
    : 0;

  const getUnitLabel = () => {
    if (fuelType === 'GNV') return 'm³';
    if (fuelType === 'ELECTRIC') return 'kWh';
    return 'Litros';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">Nova Transação</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto">
          {/* Type Toggle */}
          <div className="p-4 grid grid-cols-2 gap-2 pb-0">
            <button
              type="button"
              onClick={() => { setType('INCOME'); }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${
                type === 'INCOME' 
                  ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <TrendingUp size={18} />
              <span className="font-semibold">Ganho</span>
            </button>
            <button
              type="button"
              onClick={() => { setType('EXPENSE'); }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${
                type === 'EXPENSE' 
                  ? 'bg-red-100 text-red-700 ring-2 ring-red-500' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <TrendingDown size={18} />
              <span className="font-semibold">Gasto</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            
            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Valor Total</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">R$</span>
                <input
                  type="text"
                  value={formatCurrency(amount).replace('R$', '').trim()}
                  onChange={(e) => setAmount(handlePriceChange(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            {/* Account Selector */}
            <div>
               <label className="block text-xs font-medium text-slate-500 uppercase mb-2 flex items-center gap-1">
                 <Wallet size={12} /> Conta (Carteira)
               </label>
               <div className="flex gap-2 overflow-x-auto pb-2">
                 {accounts.map(acc => (
                   <button
                     key={acc.id}
                     type="button"
                     onClick={() => setSelectedAccountId(acc.id)}
                     className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                       selectedAccountId === acc.id 
                         ? 'border-slate-800 bg-slate-800 text-white' 
                         : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                     }`}
                   >
                     {acc.name}
                   </button>
                 ))}
               </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Categoria</label>
              <div className="grid grid-cols-3 gap-2">
                {visibleCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      backgroundColor: category === cat.id ? `${cat.color}20` : 'white',
                      borderColor: category === cat.id ? cat.color : '#e2e8f0',
                      color: category === cat.id ? cat.color : '#475569'
                    }}
                    className="p-2 text-xs font-medium rounded-lg border transition-all hover:bg-slate-50"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FUEL SPECIFIC FIELDS */}
            {category === Category.FUEL && type === 'EXPENSE' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 animate-fade-in">
                
                {/* Fuel Type Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-2 flex items-center gap-1">
                     <Fuel size={12} /> Tipo de Combustível
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(FUEL_LABELS) as FuelType[]).map((fType) => (
                       <button
                        key={fType}
                        type="button"
                        onClick={() => setFuelType(fType)}
                        className={`py-2 px-1 text-xs font-semibold rounded-lg border transition-all ${
                          fuelType === fType 
                           ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                           : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                       >
                         {FUEL_LABELS[fType]}
                       </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Unit Price Input */}
                  <div>
                     <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                       Preço / {getUnitLabel().slice(0, -1)}
                     </label>
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                        <input
                          type="text"
                          value={formatCurrency(unitPrice).replace('R$', '').trim()}
                          onChange={(e) => setUnitPrice(handlePriceChange(e.target.value))}
                          className="w-full pl-8 pr-2 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                          placeholder="0,00"
                        />
                     </div>
                  </div>
                  
                  {/* Calculated Volume (Read Only) */}
                  <div>
                     <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                       Qtd. ({getUnitLabel()})
                     </label>
                     <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={formatDecimal(calculatedVolume)}
                          className="w-full px-3 py-2 text-sm font-bold text-slate-600 bg-slate-200 border border-slate-200 rounded-lg outline-none cursor-not-allowed"
                        />
                        {fuelType === 'ELECTRIC' && (
                           <Zap size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-500" />
                        )}
                     </div>
                  </div>
                </div>

              </div>
            )}

            {/* Date & Description */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Descrição (Opcional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ex: Posto Ipiranga"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" fullWidth variant={type === 'INCOME' ? 'primary' : 'danger'}>
                Salvar {type === 'INCOME' ? 'Ganho' : 'Gasto'}
              </Button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;