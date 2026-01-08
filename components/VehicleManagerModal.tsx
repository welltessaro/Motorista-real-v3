import React, { useState, useEffect } from 'react';
import { X, Car, CreditCard, Archive, Trash2, Calendar, Layers, ShieldCheck } from 'lucide-react';
import { Vehicle, OwnershipType } from '../types';
import Button from './Button';
import { formatCurrency, handlePriceChange, formatPlate, formatDateForInput } from '../utils';

interface VehicleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onSave: (vehicle: Vehicle) => void;
  onArchive: (vehicleId: string) => void;
}

const VehicleManagerModal: React.FC<VehicleManagerModalProps> = ({ isOpen, onClose, vehicle, onSave, onArchive }) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'FINANCIAL'>('GENERAL');
  
  // Form State
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('OWNED');
  
  // Financial State
  const [rentAmount, setRentAmount] = useState(0);
  const [rentDueDay, setRentDueDay] = useState<number>(5);

  const [financingInstallment, setFinancingInstallment] = useState(0);
  const [financingDueDay, setFinancingDueDay] = useState<number>(10);
  const [financingTotalMonths, setFinancingTotalMonths] = useState<number>(0);
  const [financingPaidMonths, setFinancingPaidMonths] = useState<number>(0);
  
  const [vehicleValue, setVehicleValue] = useState(0);
  
  // Insurance State
  const [insuranceRenewalDate, setInsuranceRenewalDate] = useState('');
  const [insuranceInstallmentValue, setInsuranceInstallmentValue] = useState(0);
  const [insuranceDueDay, setInsuranceDueDay] = useState<number>(10);
  const [insuranceTotalInstallments, setInsuranceTotalInstallments] = useState<number>(0);

  useEffect(() => {
    if (vehicle) {
      setModel(vehicle.model);
      setPlate(vehicle.plate);
      setOwnershipType(vehicle.ownershipType);
      
      setRentAmount(vehicle.rentAmount || 0);
      setRentDueDay(vehicle.rentDueDay || 5);

      setFinancingInstallment(vehicle.financingInstallment || 0);
      setFinancingDueDay(vehicle.financingDueDay || 10);
      setFinancingTotalMonths(vehicle.financingTotalMonths || 0);
      setFinancingPaidMonths(vehicle.financingPaidMonths || 0);
      
      setVehicleValue(vehicle.vehicleValue || 0);
      
      // Load insurance details
      setInsuranceRenewalDate(vehicle.insuranceRenewalDate || formatDateForInput(new Date()));
      setInsuranceInstallmentValue(vehicle.insuranceInstallmentValue || 0);
      setInsuranceDueDay(vehicle.insuranceDueDay || 10);
      setInsuranceTotalInstallments(vehicle.insuranceTotalInstallments || 0);
    } else {
      // Reset for new vehicle
      setModel('');
      setPlate('');
      setOwnershipType('OWNED');
      setRentAmount(0);
      setRentDueDay(5);
      setFinancingInstallment(0);
      setFinancingDueDay(10);
      setFinancingTotalMonths(0);
      setFinancingPaidMonths(0);
      setVehicleValue(0);
      setInsuranceRenewalDate(formatDateForInput(new Date()));
      setInsuranceInstallmentValue(0);
      setInsuranceDueDay(10);
      setInsuranceTotalInstallments(0);
    }
  }, [vehicle, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newVehicle: Vehicle = {
      id: vehicle?.id || crypto.randomUUID(),
      model,
      plate,
      ownershipType,
      
      rentAmount: ownershipType === 'RENTED' ? rentAmount : 0,
      rentDueDay: ownershipType === 'RENTED' ? rentDueDay : undefined,

      financingInstallment: ownershipType === 'FINANCED' ? financingInstallment : 0,
      financingDueDay: ownershipType === 'FINANCED' ? financingDueDay : undefined,
      financingTotalMonths: ownershipType === 'FINANCED' ? financingTotalMonths : undefined,
      financingPaidMonths: ownershipType === 'FINANCED' ? financingPaidMonths : undefined,
      
      vehicleValue: ownershipType === 'OWNED' ? vehicleValue : undefined,
      
      // Save Insurance
      insuranceRenewalDate: insuranceInstallmentValue > 0 ? insuranceRenewalDate : undefined,
      insuranceInstallmentValue: insuranceInstallmentValue > 0 ? insuranceInstallmentValue : undefined,
      insuranceDueDay: insuranceInstallmentValue > 0 ? insuranceDueDay : undefined,
      insuranceTotalInstallments: insuranceInstallmentValue > 0 ? insuranceTotalInstallments : undefined,

      isArchived: vehicle?.isArchived || false,
      createdAt: vehicle?.createdAt || new Date().toISOString(),
    };
    onSave(newVehicle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{vehicle ? 'Editar Veículo' : 'Novo Veículo'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('GENERAL')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'GENERAL' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Geral
          </button>
          <button
            onClick={() => setActiveTab('FINANCIAL')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'FINANCIAL' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Financeiro
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          {activeTab === 'GENERAL' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Modelo do Carro</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ex: Onix 1.0 Turbo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Placa</label>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(formatPlate(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono uppercase"
                  placeholder="ABC-1234"
                  maxLength={7}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Posse</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['OWNED', 'FINANCED', 'RENTED'] as OwnershipType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setOwnershipType(type)}
                      className={`p-2 text-xs font-medium rounded-lg border transition-all ${
                        ownershipType === type
                          ? 'bg-primary-50 border-primary-200 text-primary-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {type === 'OWNED' ? 'Próprio' : type === 'FINANCED' ? 'Financiado' : 'Alugado'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'FINANCIAL' && (
            <div className="space-y-4">
               {ownershipType === 'RENTED' && (
                <div className="grid grid-cols-3 gap-4">
                   <div className="col-span-2">
                     <label className="block text-sm font-medium text-slate-700 mb-1">Aluguel Mensal</label>
                     <input
                      type="text"
                      value={formatCurrency(rentAmount).replace('R$', '').trim()}
                      onChange={(e) => setRentAmount(handlePriceChange(e.target.value))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                     />
                   </div>
                   <div className="col-span-1">
                     <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento</label>
                     <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={rentDueDay}
                          onChange={(e) => setRentDueDay(Number(e.target.value))}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none pl-8"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">DIA</span>
                     </div>
                   </div>
                </div>
               )}

               {ownershipType === 'FINANCED' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-slate-700 mb-1">Parcela Mensal</label>
                       <input
                        type="text"
                        value={formatCurrency(financingInstallment).replace('R$', '').trim()}
                        onChange={(e) => setFinancingInstallment(handlePriceChange(e.target.value))}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                       />
                    </div>
                    <div className="col-span-1">
                       <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento</label>
                       <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={financingDueDay}
                            onChange={(e) => setFinancingDueDay(Number(e.target.value))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none pl-8"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">DIA</span>
                       </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Prazo (Meses)</label>
                       <input
                        type="number"
                        value={financingTotalMonths || ''}
                        onChange={(e) => setFinancingTotalMonths(parseInt(e.target.value) || 0)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Qtd Paga</label>
                       <input
                        type="number"
                        value={financingPaidMonths || ''}
                        onChange={(e) => setFinancingPaidMonths(parseInt(e.target.value) || 0)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                       />
                     </div>
                  </div>
                </div>
               )}

               {ownershipType === 'OWNED' && (
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Valor do Veículo (Fipe)</label>
                   <input
                    type="text"
                    value={formatCurrency(vehicleValue).replace('R$', '').trim()}
                    onChange={(e) => setVehicleValue(handlePriceChange(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                   />
                   <p className="text-xs text-slate-500 mt-1">Usado para cálculo de depreciação (aprox. 10-15% ao ano).</p>
                </div>
               )}

              {/* Detailed Insurance Block */}
              <div className="border-t border-slate-100 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                   <ShieldCheck className="text-primary-500" size={18} />
                   <h3 className="font-bold text-slate-700 text-sm">Dados do Seguro</h3>
                </div>
                
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                       <div className="col-span-2">
                         <label className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                            <CreditCard size={12} /> Valor da Parcela
                         </label>
                         <input 
                            value={formatCurrency(insuranceInstallmentValue).replace('R$', '').trim()}
                            onChange={e => setInsuranceInstallmentValue(handlePriceChange(e.target.value))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="0,00"
                          />
                       </div>
                       <div className="col-span-1">
                         <label className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                            <Calendar size={12} /> Dia Venc.
                         </label>
                         <input 
                            type="number"
                            min="1"
                            max="31"
                            value={insuranceDueDay}
                            onChange={e => setInsuranceDueDay(Number(e.target.value))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                       </div>
                    </div>

                       <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                                <Layers size={12} /> Qtd. Parcelas
                            </label>
                            <input 
                              type="number"
                              value={insuranceTotalInstallments || ''}
                              onChange={e => setInsuranceTotalInstallments(parseInt(e.target.value) || 0)}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                              placeholder="12"
                            />
                         </div>
                         <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                                <Calendar size={12} /> Fim Vigência
                            </label>
                            <input 
                              type="date"
                              value={insuranceRenewalDate}
                              onChange={e => setInsuranceRenewalDate(e.target.value)}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                            />
                         </div>
                       </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
           {vehicle && (
             <Button variant="danger" onClick={() => onArchive(vehicle.id)} className="px-4">
               <Trash2 size={18} />
             </Button>
           )}
           <Button onClick={handleSave} fullWidth>
             Salvar Veículo
           </Button>
        </div>
      </div>
    </div>
  );
};

export default VehicleManagerModal;