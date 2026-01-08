import React from 'react';
import { LayoutDashboard, Car, PieChart, User, ChevronDown, Wallet } from 'lucide-react';
import { ViewState, Vehicle } from '../types';

interface AppLayoutProps {
  children: React.ReactNode;
  currentView: ViewState['currentView'];
  onNavigate: (view: ViewState['currentView']) => void;
  vehicles: Vehicle[];
  activeVehicleId: string;
  onSwitchVehicle: (id: string) => void;
  onAddVehicle: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  currentView, 
  onNavigate, 
  vehicles, 
  activeVehicleId, 
  onSwitchVehicle,
  onAddVehicle
}) => {
  
  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto border-x border-slate-200 shadow-2xl">
      
      {/* Header (Sticky Top) */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 group cursor-pointer relative">
          <div className="bg-primary-500 text-white p-1.5 rounded-lg">
             <Car size={18} />
          </div>
          <div className="relative group">
             <select 
               className="appearance-none bg-transparent font-bold text-slate-800 pr-6 outline-none cursor-pointer"
               value={activeVehicleId}
               onChange={(e) => {
                 if(e.target.value === 'ADD') {
                   onAddVehicle();
                 } else {
                   onSwitchVehicle(e.target.value);
                 }
               }}
             >
               {vehicles.map(v => (
                 <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>
               ))}
               <option value="ADD">+ Adicionar Carro</option>
             </select>
             <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
           MR
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        {children}
      </main>

      {/* Bottom Navigation (Sticky Bottom) */}
      <nav className="sticky bottom-0 z-30 bg-white border-t border-slate-200 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => onNavigate('DASHBOARD')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'DASHBOARD' ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutDashboard size={20} strokeWidth={currentView === 'DASHBOARD' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Início</span>
          </button>

          <button 
            onClick={() => onNavigate('FLEET')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'FLEET' ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Car size={20} strokeWidth={currentView === 'FLEET' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Frota</span>
          </button>

          <button 
            onClick={() => onNavigate('FINANCIAL')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'FINANCIAL' ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Wallet size={20} strokeWidth={currentView === 'FINANCIAL' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Financeiro</span>
          </button>

          <button 
            onClick={() => onNavigate('REPORTS')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'REPORTS' ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <PieChart size={20} strokeWidth={currentView === 'REPORTS' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Relatórios</span>
          </button>

          <button 
            onClick={() => onNavigate('PROFILE')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'PROFILE' ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <User size={20} strokeWidth={currentView === 'PROFILE' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;