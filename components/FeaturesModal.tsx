import React from 'react';
import { X, Check, Star } from 'lucide-react';
import Button from './Button';

interface FeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeaturesModal: React.FC<FeaturesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 z-10">
          <X size={20} />
        </button>

        <div className="p-8 text-center bg-gradient-to-b from-primary-50 to-white">
          <div className="inline-flex items-center justify-center p-3 bg-primary-100 text-primary-600 rounded-full mb-4">
            <Star size={32} fill="currentColor" className="text-primary-500" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">MotoristaReal <span className="text-primary-600">PRO</span></h2>
          <p className="text-slate-600 max-w-md mx-auto">Desbloqueie relatórios avançados, gestão de múltiplos veículos e exportação contábil.</p>
        </div>

        <div className="p-8 grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="border border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-700 mb-4">Plano Gratuito</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <Check size={16} className="text-primary-500" /> 1 Veículo
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <Check size={16} className="text-primary-500" /> Controle de Ganhos/Gastos
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <Check size={16} className="text-primary-500" /> Cálculo Lucro Real
              </li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-primary-500 rounded-2xl p-6 relative bg-primary-50/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              RECOMENDADO
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Plano Pro</h3>
            <p className="text-2xl font-bold text-primary-600 mb-4">R$ 19,90 <span className="text-sm text-slate-500 font-normal">/mês</span></p>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                <Check size={16} className="text-primary-600" /> Veículos Ilimitados
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                <Check size={16} className="text-primary-600" /> Metas Inteligentes
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                <Check size={16} className="text-primary-600" /> Exportação CSV/PDF
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                <Check size={16} className="text-primary-600" /> Suporte Prioritário
              </li>
            </ul>
            <div className="mt-6">
              <Button fullWidth>Assinar Agora</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesModal;