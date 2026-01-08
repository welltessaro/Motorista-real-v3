import React, { useState, useRef, useEffect } from 'react';
import { Vehicle, OwnershipType } from '../types';
import Button from './Button';
import { formatPlate, handlePriceChange, formatCurrency, isValidPlate, formatDateForInput } from '../utils';
import { Car, ChevronRight, CheckCircle, Search, ChevronDown, AlertCircle, ShieldCheck, Calendar, CreditCard, Layers } from 'lucide-react';
import { mockBackend } from '../services/mockBackend';

interface OnboardingProps {
  onComplete: (vehicle: Vehicle) => void;
}

const CAR_DATA: Record<string, string[]> = {
  "Chevrolet": ["Onix", "Onix Plus", "Tracker", "Spin", "Cruze", "Montana", "S10"],
  "Fiat": ["Strada", "Argo", "Mobi", "Toro", "Pulse", "Fastback", "Cronos", "Fiorino", "Titano"],
  "Volkswagen": ["Polo", "Polo Track", "T-Cross", "Nivus", "Saveiro", "Virtus", "Taos", "Amarok", "Jetta"],
  "Hyundai": ["HB20", "HB20S", "Creta", "Tucson", "Santa Fe"],
  "Toyota": ["Hilux", "Corolla", "Corolla Cross", "Yaris Hatch", "Yaris Sedan", "SW4", "RAV4"],
  "Jeep": ["Compass", "Renegade", "Commander", "Wrangler", "Gladiator"],
  "Renault": ["Kwid", "Duster", "Oroch", "Master", "Logan", "Stepway", "Megane E-Tech", "Sandero"],
  "Honda": ["HR-V", "City Hatch", "City Sedan", "ZR-V", "Civic", "CR-V"],
  "Nissan": ["Kicks", "Versa", "Sentra", "Frontier"],
  "BYD": ["Song Plus", "Dolphin", "Dolphin Mini", "Yuan Plus", "Seal", "Tan", "Han"],
  "Caoa Chery": ["Tiggo 5x", "Tiggo 7", "Tiggo 8", "iCar", "Arrizo 6"],
  "Ford": ["Ranger", "Territory", "Maverick", "Mustang", "Transit"],
  "Citroën": ["C3", "C3 Aircross", "C4 Cactus", "Jumpy"],
  "Peugeot": ["208", "2008", "3008", "Expert"],
  "Mitsubishi": ["L200 Triton", "Pajero Sport", "Eclipse Cross"],
  "Ram": ["Rampage", "1500", "2500", "3500"],
  "BMW": ["X1", "320i", "X3", "X5"],
  "Mercedes-Benz": ["C-Class", "GLA", "GLC"],
  "Audi": ["A3", "Q3", "Q5"],
  "GWM": ["Haval H6", "Ora 03"]
};

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  
  // Form State
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('OWNED');
  
  const [costValue, setCostValue] = useState(0); // Rent or Installment Amount
  const [financingTotalMonths, setFinancingTotalMonths] = useState<string>('');
  const [financingPaidMonths, setFinancingPaidMonths] = useState<string>('');
  const [vehicleValue, setVehicleValue] = useState(0); // For OWNED depreciation
  
  // Insurance State
  const [hasInsurance, setHasInsurance] = useState(false);
  const [insuranceDate, setInsuranceDate] = useState(formatDateForInput(new Date()));
  const [insuranceInstallmentValue, setInsuranceInstallmentValue] = useState(0);
  const [insuranceTotalInstallments, setInsuranceTotalInstallments] = useState('');

  // Validation State
  const [plateError, setPlateError] = useState<string | null>(null);

  // Autocomplete UX State
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const getBrandSuggestions = () => {
    const allBrands = Object.keys(CAR_DATA).sort();
    if (!brand) return allBrands;
    return allBrands.filter(b => b.toLowerCase().includes(brand.toLowerCase()));
  };

  const getModelSuggestions = () => {
    const availableModels = CAR_DATA[brand] || [];
    if (!model) return availableModels;
    return availableModels.filter(m => m.toLowerCase().includes(model.toLowerCase()));
  };

  const handleSelectBrand = (selectedBrand: string) => {
    setBrand(selectedBrand);
    setShowBrandSuggestions(false);
    setModel('');
    setTimeout(() => modelInputRef.current?.focus(), 100);
  };

  const handleSelectModel = (selectedModel: string) => {
    setModel(selectedModel);
    setShowModelSuggestions(false);
  };

  const validateStep1 = () => {
    setPlateError(null);
    if (!isValidPlate(plate)) {
      setPlateError('Placa inválida. Use o formato AAA-0000 ou Mercosul.');
      return;
    }
    const existingVehicles = mockBackend.getVehicles();
    const isDuplicate = existingVehicles.some(v => v.plate === plate);
    if (isDuplicate) {
      setPlateError('Esta placa já está cadastrada no sistema.');
      return;
    }
    nextStep();
  };

  const nextStep = () => setStep(s => s + 1);

  const handleFinish = () => {
    const fullModelName = `${brand} ${model}`.trim();

    const vehicle: Vehicle = {
      id: crypto.randomUUID(),
      model: fullModelName,
      plate,
      ownershipType,
      rentAmount: ownershipType === 'RENTED' ? costValue : 0,
      financingInstallment: ownershipType === 'FINANCED' ? costValue : 0,
      financingTotalMonths: ownershipType === 'FINANCED' ? parseInt(financingTotalMonths) || 0 : undefined,
      financingPaidMonths: ownershipType === 'FINANCED' ? parseInt(financingPaidMonths) || 0 : undefined,
      vehicleValue: ownershipType === 'OWNED' ? vehicleValue : undefined,
      
      // Detailed Insurance Data
      insuranceRenewalDate: hasInsurance ? insuranceDate : undefined,
      insuranceInstallmentValue: hasInsurance ? insuranceInstallmentValue : undefined,
      insuranceTotalInstallments: hasInsurance ? parseInt(insuranceTotalInstallments) || 0 : undefined,

      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    onComplete(vehicle);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto p-6 justify-center">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
          <Car size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Bem-vindo, Motorista!</h1>
        <p className="text-slate-500 mt-2">Vamos configurar seu perfil para calcular seu lucro real.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 relative">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(i => (
             <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary-500' : 'bg-slate-100'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-700">Qual o seu carro?</h2>
            
            <div className="relative">
              <label className="text-sm text-slate-500 font-medium">Marca</label>
              <div className="relative">
                <input 
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setShowBrandSuggestions(true);
                    if (!CAR_DATA[e.target.value]) setModel(''); 
                  }}
                  onFocus={() => setShowBrandSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ex: Fiat, Chevrolet..."
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none mt-1" size={16} />
              </div>
              
              {showBrandSuggestions && (
                <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50">
                  {getBrandSuggestions().map((b) => (
                    <li 
                      key={b}
                      onMouseDown={() => handleSelectBrand(b)}
                      className="px-4 py-3 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700 cursor-pointer transition-colors"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="relative">
              <label className="text-sm text-slate-500 font-medium">Modelo</label>
              <div className="relative">
                <input 
                  ref={modelInputRef}
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setShowModelSuggestions(true);
                  }}
                  onFocus={() => setShowModelSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowModelSuggestions(false), 200)}
                  disabled={!CAR_DATA[brand]}
                  className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 outline-none transition-all ${!CAR_DATA[brand] ? 'opacity-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-primary-500'}`}
                  placeholder={!CAR_DATA[brand] ? "Selecione a marca primeiro" : "Ex: Argo, Toro..."}
                />
                 {model.length === 0 && CAR_DATA[brand] && (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none mt-1" size={18} />
                )}
              </div>

              {showModelSuggestions && CAR_DATA[brand] && (
                <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50">
                  {getModelSuggestions().map((m) => (
                    <li 
                      key={m}
                      onMouseDown={() => handleSelectModel(m)}
                      className="px-4 py-3 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700 cursor-pointer transition-colors"
                    >
                      {m}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="text-sm text-slate-500 font-medium">Placa</label>
              <input 
                value={plate}
                onChange={e => {
                   setPlate(formatPlate(e.target.value));
                   if(plateError) setPlateError(null);
                }}
                className={`w-full p-3 bg-slate-50 border rounded-xl mt-1 outline-none uppercase font-mono transition-colors ${
                  plateError 
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200' 
                    : 'border-slate-200 focus:ring-2 focus:ring-primary-500'
                }`}
                placeholder="ABC-1234"
                maxLength={7}
              />
              {plateError && (
                <div className="flex items-center gap-2 mt-2 text-xs text-red-500 font-medium animate-pulse">
                  <AlertCircle size={14} />
                  <span>{plateError}</span>
                </div>
              )}
            </div>
            
            <Button fullWidth onClick={validateStep1} disabled={!brand || !model || !plate}>
              Continuar <ChevronRight size={18} />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-700">Esse carro é...</h2>
            <div className="grid gap-3">
              {(['OWNED', 'FINANCED', 'RENTED'] as OwnershipType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setOwnershipType(type)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    ownershipType === type 
                    ? 'border-primary-500 bg-primary-50 text-primary-800' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="font-bold block">{type === 'OWNED' ? 'Próprio (Quitado)' : type === 'FINANCED' ? 'Financiado' : 'Alugado'}</span>
                </button>
              ))}
            </div>
            <Button fullWidth onClick={nextStep}>Continuar <ChevronRight size={18} /></Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-700">Custos Fixos</h2>
            
            {ownershipType === 'RENTED' && (
              <div>
                <label className="text-sm text-slate-500 font-medium">Valor do Aluguel (Mensal)</label>
                <input 
                  value={formatCurrency(costValue).replace('R$', '').trim()}
                  onChange={e => setCostValue(handlePriceChange(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="0,00"
                />
              </div>
            )}

            {ownershipType === 'FINANCED' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-500 font-medium">Valor da Parcela</label>
                  <input 
                    value={formatCurrency(costValue).replace('R$', '').trim()}
                    onChange={e => setCostValue(handlePriceChange(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="0,00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="text-sm text-slate-500 font-medium">Prazo Total (Meses)</label>
                    <input 
                      type="number"
                      value={financingTotalMonths}
                      onChange={e => setFinancingTotalMonths(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Ex: 48"
                    />
                   </div>
                   <div>
                    <label className="text-sm text-slate-500 font-medium">Qtd Paga (Meses)</label>
                    <input 
                      type="number"
                      value={financingPaidMonths}
                      onChange={e => setFinancingPaidMonths(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Ex: 12"
                    />
                   </div>
                </div>
              </div>
            )}

             {ownershipType === 'OWNED' && (
              <div>
                <label className="text-sm text-slate-500 font-medium">Valor Estimado do Veículo (Fipe)</label>
                <input 
                  value={formatCurrency(vehicleValue).replace('R$', '').trim()}
                  onChange={e => setVehicleValue(handlePriceChange(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="0,00"
                />
                <p className="text-xs text-slate-400 mt-1">Essencial para calcular a depreciação do seu patrimônio.</p>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                  <div className="relative flex items-center">
                      <input 
                          type="checkbox"
                          id="insurance-check"
                          checked={hasInsurance}
                          onChange={(e) => {
                              setHasInsurance(e.target.checked);
                              if (!e.target.checked) {
                                setInsuranceInstallmentValue(0);
                                setInsuranceTotalInstallments('');
                              }
                          }}
                          className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-500 cursor-pointer"
                      />
                  </div>
                  <label htmlFor="insurance-check" className="font-medium text-slate-700 cursor-pointer select-none flex items-center gap-2">
                      <ShieldCheck size={18} className="text-slate-400" />
                      O veículo possui seguro?
                  </label>
              </div>

              {hasInsurance && (
                  <div className="animate-fade-in pl-8 space-y-4 pt-2">
                       <div>
                         <label className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                            <CreditCard size={12} /> Valor da Parcela
                         </label>
                         <input 
                            value={formatCurrency(insuranceInstallmentValue).replace('R$', '').trim()}
                            onChange={e => setInsuranceInstallmentValue(handlePriceChange(e.target.value))}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="0,00"
                            autoFocus
                          />
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                                <Layers size={12} /> Qtd. Parcelas
                            </label>
                            <input 
                              type="number"
                              value={insuranceTotalInstallments}
                              onChange={e => setInsuranceTotalInstallments(e.target.value)}
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none"
                              placeholder="12"
                            />
                         </div>
                         <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                                <Calendar size={12} /> Vencimento
                            </label>
                            <input 
                              type="date"
                              value={insuranceDate}
                              onChange={e => setInsuranceDate(e.target.value)}
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                            />
                         </div>
                       </div>
                  </div>
              )}
            </div>

            <Button fullWidth onClick={handleFinish} variant="primary">
              <CheckCircle size={18} /> Finalizar Cadastro
            </Button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Onboarding;