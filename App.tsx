import React, { useState, useEffect } from 'react';
import { ViewState, Vehicle, Transaction, User } from './types';
import { mockBackend } from './services/mockBackend';
import AppLayout from './components/AppLayout';
import Dashboard from './components/Dashboard';
import TransactionModal from './components/TransactionModal';
import VehicleManagerModal from './components/VehicleManagerModal';
import ReportsView from './components/ReportsView';
import FeaturesModal from './components/FeaturesModal';
import Onboarding from './components/Onboarding';
import Button from './components/Button';
import { LogOut, Star } from 'lucide-react';

const App: React.FC = () => {
  // Global State
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // UI State
  const [currentView, setCurrentView] = useState<ViewState['currentView']>('DASHBOARD');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Initialization
  useEffect(() => {
    const loadData = async () => {
      // Simulated delay for realism
      await new Promise(r => setTimeout(r, 800));
      
      const loadedUser = mockBackend.getUser();
      const loadedVehicles = mockBackend.getVehicles();
      
      setUser(loadedUser);
      setVehicles(loadedVehicles);

      if (loadedVehicles.length > 0) {
        setActiveVehicleId(loadedVehicles[0].id);
        const txs = mockBackend.getTransactions(loadedVehicles[0].id);
        setTransactions(txs);
      }

      setIsLoading(false);
    };
    loadData();
  }, []);

  // Effect to reload transactions when active vehicle changes
  useEffect(() => {
    if (activeVehicleId) {
      const txs = mockBackend.getTransactions(activeVehicleId);
      setTransactions(txs);
    }
  }, [activeVehicleId]);

  // Actions
  const handleOnboardingComplete = (vehicle: Vehicle) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name: 'Motorista',
      email: 'driver@email.com',
      onboardingCompleted: true
    };
    mockBackend.saveUser(newUser);
    mockBackend.addVehicle(vehicle);
    
    setUser(newUser);
    setVehicles([vehicle]);
    setActiveVehicleId(vehicle.id);
  };

  const handleUpdateUser = (updatedUser: User) => {
    mockBackend.saveUser(updatedUser);
    setUser(updatedUser);
  };

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = { ...newTx, id: crypto.randomUUID() };
    mockBackend.addTransaction(tx);
    setTransactions(prev => [...prev, tx]);
  };

  const handleSaveVehicle = (vehicle: Vehicle) => {
    const exists = vehicles.find(v => v.id === vehicle.id);
    if (exists) {
      mockBackend.updateVehicle(vehicle);
      setVehicles(prev => prev.map(v => v.id === vehicle.id ? vehicle : v));
    } else {
      mockBackend.addVehicle(vehicle);
      setVehicles(prev => [...prev, vehicle]);
      setActiveVehicleId(vehicle.id); // Switch to new vehicle
    }
    setEditingVehicle(null);
  };

  const handleArchiveVehicle = (id: string) => {
    // In a real app we would archive, here we just filter from UI for simplicity or alert
    const v = vehicles.find(veh => veh.id === id);
    if(v) {
      const updated = { ...v, isArchived: true };
      mockBackend.updateVehicle(updated);
      const remaining = vehicles.filter(veh => veh.id !== id);
      setVehicles(remaining);
      if(remaining.length > 0) setActiveVehicleId(remaining[0].id);
      else setActiveVehicleId('');
    }
    setIsVehicleModalOpen(false);
  };

  const handleLogout = () => {
    mockBackend.clearData();
    setUser(null);
    setVehicles([]);
    setTransactions([]);
    setActiveVehicleId('');
    setCurrentView('DASHBOARD');
  };

  // Render Logic

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Carregando MotoristaReal...</p>
        </div>
      </div>
    );
  }

  if (!user || vehicles.length === 0) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId) || null;

  return (
    <AppLayout
      currentView={currentView}
      onNavigate={setCurrentView}
      vehicles={vehicles}
      activeVehicleId={activeVehicleId}
      onSwitchVehicle={setActiveVehicleId}
      onAddVehicle={() => {
        setEditingVehicle(null);
        setIsVehicleModalOpen(true);
      }}
    >
      
      {currentView === 'DASHBOARD' && (
        <Dashboard 
          transactions={transactions} 
          activeVehicle={activeVehicle}
          onOpenTransaction={() => setIsTransactionModalOpen(true)}
          user={user}
          onUpdateUser={handleUpdateUser}
        />
      )}

      {currentView === 'FLEET' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">Minha Frota</h2>
          {vehicles.map(v => (
            <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">{v.model}</h3>
                <p className="text-sm text-slate-500">{v.plate}</p>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-1 inline-block">
                  {v.ownershipType === 'OWNED' ? 'Próprio' : v.ownershipType === 'RENTED' ? 'Alugado' : 'Financiado'}
                </span>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setEditingVehicle(v);
                  setIsVehicleModalOpen(true);
                }}
              >
                Editar
              </Button>
            </div>
          ))}
          <Button fullWidth variant="ghost" className="border-2 border-dashed border-slate-200" onClick={() => {
             setEditingVehicle(null);
             setIsVehicleModalOpen(true);
          }}>
            + Adicionar Veículo
          </Button>
        </div>
      )}

      {currentView === 'REPORTS' && (
        <ReportsView transactions={transactions} />
      )}

      {currentView === 'PROFILE' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800">Perfil</h2>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3">
              {user.name.charAt(0)}
            </div>
            <h3 className="font-bold text-lg text-slate-800">{user.name}</h3>
            <p className="text-slate-500">{user.email}</p>
          </div>

          <div 
            onClick={() => setIsFeaturesModalOpen(true)}
            className="bg-gradient-to-r from-primary-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg cursor-pointer transform transition hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3 mb-2">
              <Star fill="white" className="text-white" />
              <h3 className="font-bold text-lg">Seja PRO</h3>
            </div>
            <p className="text-primary-100 mb-4">Tenha acesso a relatórios avançados e exportação para contador.</p>
            <button className="bg-white text-primary-600 px-4 py-2 rounded-lg font-bold text-sm w-full">
              Ver Planos
            </button>
          </div>

          <Button variant="ghost" fullWidth onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <LogOut size={18} /> Sair do App (Resetar)
          </Button>
          
          <p className="text-center text-xs text-slate-400 mt-8">Versão 1.0.0 (MVP)</p>
        </div>
      )}

      {/* Modals */}
      <TransactionModal 
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleAddTransaction}
        vehicle={activeVehicle}
      />

      <VehicleManagerModal
        isOpen={isVehicleModalOpen}
        onClose={() => { setIsVehicleModalOpen(false); setEditingVehicle(null); }}
        vehicle={editingVehicle}
        onSave={handleSaveVehicle}
        onArchive={handleArchiveVehicle}
        onAddTransaction={handleAddTransaction}
      />

      <FeaturesModal 
        isOpen={isFeaturesModalOpen} 
        onClose={() => setIsFeaturesModalOpen(false)} 
      />

    </AppLayout>
  );
};

export default App;