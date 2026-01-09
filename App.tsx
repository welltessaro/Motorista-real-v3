
import React, { useState, useEffect } from 'react';
import { ViewState, Vehicle, Transaction, User, CategoryItem, Account } from './types';
import { mockBackend } from './services/mockBackend';
import { googleDriveService } from './services/googleDriveService';
import AppLayout from './components/AppLayout';
import Dashboard from './components/Dashboard';
import TransactionModal from './components/TransactionModal';
import VehicleManagerModal from './components/VehicleManagerModal';
import ReportsView from './components/ReportsView';
import FeaturesModal from './components/FeaturesModal';
import CategoryManagerModal from './components/CategoryManagerModal';
import FinancialView from './components/FinancialView';
import Onboarding from './components/Onboarding';
import GoogleConfig from './components/GoogleConfig';
import Button from './components/Button';
import { LogOut, Tags, MessageSquare, Heart, Copy, Check, X, Cloud } from 'lucide-react';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  const [currentView, setCurrentView] = useState<ViewState['currentView']>('DASHBOARD');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isGoogleConfigOpen, setIsGoogleConfigOpen] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Initialize Backend
      await mockBackend.init();
      
      const loadedUser = mockBackend.getUser();
      const loadedVehicles = mockBackend.getVehicles();
      const loadedCategories = mockBackend.getCategories();
      const loadedAccounts = mockBackend.getAccounts();
      const txs = mockBackend.getTransactions();
      
      setUser(loadedUser);
      setVehicles(loadedVehicles);
      setCategories(loadedCategories);
      setAccounts(loadedAccounts);
      setTransactions(txs);

      if (loadedVehicles.length > 0 && !activeVehicleId) {
        setActiveVehicleId(loadedVehicles[0].id);
      }

      setIsLoading(false);
    };
    loadData();
  }, [activeVehicleId]);

  const dashboardTransactions = transactions.filter(t => t.vehicleId === activeVehicleId);

  const handleOnboardingComplete = async (data: { vehicle: Vehicle, userName: string }) => {
    const { vehicle, userName } = data;
    
    const newUser: User = {
      id: crypto.randomUUID(),
      name: userName, // Use the name from the input
      email: 'driver@email.com',
      onboardingCompleted: true
    };
    await mockBackend.saveUser(newUser);
    await mockBackend.addVehicle(vehicle);
    
    const initialAccounts = mockBackend.getAccounts();
    setAccounts(initialAccounts);
    setUser(newUser);
    setVehicles([vehicle]);
    setActiveVehicleId(vehicle.id);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    await mockBackend.saveUser(updatedUser);
    setUser(updatedUser);
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = { ...newTx, id: crypto.randomUUID() };
    await mockBackend.addTransaction(tx);
    
    setTransactions(prev => [...prev, tx]);
    
    if (tx.accountId) {
      setAccounts(prev => prev.map(acc => {
        if (acc.id === tx.accountId) {
           return {
             ...acc,
             balance: tx.type === 'INCOME' ? acc.balance + tx.amount : acc.balance - tx.amount
           };
        }
        return acc;
      }));
    }
  };

  const handleSaveVehicle = async (vehicle: Vehicle) => {
    const exists = vehicles.find(v => v.id === vehicle.id);
    if (exists) {
      await mockBackend.updateVehicle(vehicle);
      setVehicles(prev => prev.map(v => v.id === vehicle.id ? vehicle : v));
    } else {
      await mockBackend.addVehicle(vehicle);
      setVehicles(prev => [...prev, vehicle]);
      setActiveVehicleId(vehicle.id);
    }
    setEditingVehicle(null);
  };

  const handleArchiveVehicle = async (id: string) => {
    const v = vehicles.find(veh => veh.id === id);
    if(v) {
      const updated = { ...v, isArchived: true };
      await mockBackend.updateVehicle(updated);
      const remaining = vehicles.filter(veh => veh.id !== id);
      setVehicles(remaining);
      if(remaining.length > 0) setActiveVehicleId(remaining[0].id);
      else setActiveVehicleId('');
    }
    setIsVehicleModalOpen(false);
  };

  const handleAddCategory = async (category: CategoryItem) => {
    await mockBackend.saveCategory(category);
    setCategories(prev => [...prev, category]);
  };

  const handleDeleteCategory = async (id: string) => {
    await mockBackend.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };
  
  const handleAddAccount = async (account: Account) => {
    await mockBackend.saveAccount(account);
    setAccounts(prev => [...prev, account]);
  }

  const handleLogout = async () => {
    if (confirm('Deseja realmente apagar todos os dados locais?')) {
      await mockBackend.clearData();
      window.location.reload();
    }
  };

  const handleOpenEmailFeedback = () => {
    const email = "contato.wttecnologia@gmail.com";
    const subject = encodeURIComponent("sugestão de melhoria MotoristaReallAPP");
    window.location.href = `mailto:${email}?subject=${subject}`;
  };

  const handleCopyPix = () => {
    const pixKey = "64.324.898/0001-36";
    navigator.clipboard.writeText(pixKey).then(() => {
      setPixCopied(true);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">MotoristaReal v1.0.0</p>
        </div>
      </div>
    );
  }

  if (!user || vehicles.length === 0) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId) || null;
  const isGoogleConnected = !!googleDriveService.getUser();

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
          transactions={dashboardTransactions} 
          activeVehicle={activeVehicle}
          onOpenTransaction={() => setIsTransactionModalOpen(true)}
          user={user}
          onUpdateUser={handleUpdateUser}
          categories={categories}
          onAddTransaction={handleAddTransaction}
          onUpdateVehicle={handleSaveVehicle}
        />
      )}

      {currentView === 'FLEET' && (
        <div className="space-y-4 animate-fade-in px-1">
          <h2 className="text-2xl font-bold text-slate-800">Minha Frota</h2>
          {vehicles.map(v => (
            <div key={v.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center group active:scale-95 transition-transform">
              <div>
                <h3 className="font-bold text-slate-800">{v.model}</h3>
                <p className="text-xs text-slate-400 font-mono tracking-tighter">{v.plate}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase mt-2 inline-block ${
                  v.ownershipType === 'OWNED' ? 'bg-emerald-50 text-emerald-600' : 
                  v.ownershipType === 'RENTED' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  {v.ownershipType === 'OWNED' ? 'Próprio' : v.ownershipType === 'RENTED' ? 'Alugado' : 'Financiado'}
                </span>
              </div>
              <Button 
                variant="secondary" 
                className="px-4 py-2 text-xs"
                onClick={() => {
                  setEditingVehicle(v);
                  setIsVehicleModalOpen(true);
                }}
              >
                Editar
              </Button>
            </div>
          ))}
          <button 
            onClick={() => {
               setEditingVehicle(null);
               setIsVehicleModalOpen(true);
            }}
            className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold text-sm flex items-center justify-center gap-2 active:bg-slate-50 transition-colors"
          >
            + Adicionar Carro
          </button>
        </div>
      )}

      {currentView === 'FINANCIAL' && (
        <FinancialView 
          accounts={accounts}
          transactions={transactions}
          categories={categories}
          onAddAccount={handleAddAccount}
          onOpenTransaction={() => setIsTransactionModalOpen(true)}
        />
      )}

      {currentView === 'REPORTS' && (
        <ReportsView transactions={dashboardTransactions} categories={categories} />
      )}

      {currentView === 'PROFILE' && (
        <div className="space-y-6 animate-fade-in px-1">
          <h2 className="text-2xl font-bold text-slate-800">Ajustes</h2>
          
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-blue-500"></div>
            <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center text-4xl font-black mx-auto mb-4 border-4 border-white shadow-xl">
              {user.name.charAt(0)}
            </div>
            <h3 className="font-black text-xl text-slate-800 tracking-tight">{user.name}</h3>
            <p className="text-slate-400 text-sm font-medium">{user.email}</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => setIsGoogleConfigOpen(true)}
              className={`w-full p-5 rounded-3xl border flex items-center justify-between group active:bg-slate-50 transition-colors ${isGoogleConnected ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isGoogleConnected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Cloud size={20} />
                </div>
                <div>
                  <span className={`font-bold block ${isGoogleConnected ? 'text-blue-700' : 'text-slate-700'}`}>
                    {isGoogleConnected ? 'Sincronização Drive' : 'Conectar Google Drive'}
                  </span>
                  {isGoogleConnected && <span className="text-[10px] text-blue-500">Backup automático</span>}
                </div>
              </div>
              <Cloud size={16} className={isGoogleConnected ? 'text-blue-400' : 'text-slate-300'} />
            </button>

            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="w-full bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between group active:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl">
                  <Tags size={20} />
                </div>
                <span className="font-bold text-slate-700">Categorias de Lançamento</span>
              </div>
              <Tags size={16} className="text-slate-300" />
            </button>

            <button 
              onClick={handleOpenEmailFeedback}
              className="w-full bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between group active:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
                  <MessageSquare size={20} />
                </div>
                <span className="font-bold text-slate-700">Deixe suas sugestões</span>
              </div>
              <MessageSquare size={16} className="text-slate-300" />
            </button>

            <button 
              onClick={() => {
                setIsPixModalOpen(true);
                setPixCopied(false);
              }}
              className="w-full bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between group active:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
                  <Heart size={20} fill="currentColor" />
                </div>
                <span className="font-bold text-slate-700">Ajude nosso projeto</span>
              </div>
              <Heart size={16} className="text-slate-300" />
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full py-4 text-red-500 font-bold text-sm flex items-center justify-center gap-2 mt-8 opacity-50 hover:opacity-100 transition-opacity"
          >
            <LogOut size={16} /> Resetar Aplicativo
          </button>
          
          <p className="text-center text-[10px] text-slate-300 font-black uppercase tracking-[0.2em]">Build 1.0.0-stable</p>
        </div>
      )}

      {/* Google Config Modal */}
      <GoogleConfig 
        isOpen={isGoogleConfigOpen} 
        onClose={() => setIsGoogleConfigOpen(false)} 
      />

      {/* PIX Donation Modal */}
      {isPixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden relative animate-scale-up">
            <button 
              onClick={() => setIsPixModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 active:scale-90 transition-transform"
            >
              <X size={24} />
            </button>

            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart size={32} fill="currentColor" />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-2">Apoie o MotoristaReal</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Sua ajuda mantém o projeto gratuito e nos permite desenvolver novas funcionalidades para todos os motoristas.
              </p>

              {!pixCopied ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chave CNPJ</p>
                    <p className="font-mono font-bold text-slate-700 text-sm">64.324.898/0001-36</p>
                  </div>
                  
                  <Button 
                    fullWidth 
                    onClick={handleCopyPix}
                    className="bg-slate-900 text-white hover:bg-black py-4"
                  >
                    <Copy size={18} /> Copiar Chave PIX
                  </Button>
                </div>
              ) : (
                <div className="animate-fade-in space-y-4 py-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Check size={24} strokeWidth={3} />
                  </div>
                  <h4 className="font-bold text-emerald-600">Chave Copiada!</h4>
                  <p className="text-sm text-slate-500 px-4">
                    Muito obrigado pelo apoio! O MotoristaReal cresce junto com você. 🚀
                  </p>
                  <Button 
                    fullWidth 
                    variant="ghost" 
                    onClick={() => setIsPixModalOpen(false)}
                    className="text-slate-400 font-bold"
                  >
                    Fechar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <TransactionModal 
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleAddTransaction}
        vehicle={activeVehicle}
        categories={categories}
        accounts={accounts}
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

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
      />

    </AppLayout>
  );
};

export default App;
