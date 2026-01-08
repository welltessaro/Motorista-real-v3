
import React, { useState } from 'react';
import { Account, Transaction, CategoryItem } from '../types';
import { formatCurrency, getDeviceLocale } from '../utils';
import { Wallet, Plus, TrendingUp, TrendingDown, CreditCard, Landmark, Coins } from 'lucide-react';
import Button from './Button';

interface FinancialViewProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: CategoryItem[];
  onAddAccount: (account: Account) => void;
  onOpenTransaction: () => void;
}

const FinancialView: React.FC<FinancialViewProps> = ({ 
  accounts, 
  transactions, 
  categories,
  onAddAccount,
  onOpenTransaction 
}) => {
  const [activeAccountId, setActiveAccountId] = useState<'ALL' | string>('ALL');

  const getCategoryDetails = (id: string) => categories.find(c => c.id === id) || { label: id, color: '#94a3b8' };

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  const displayedTransactions = activeAccountId === 'ALL' 
    ? transactions 
    : transactions.filter(t => t.accountId === activeAccountId);

  const sortedTransactions = [...displayedTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getAccountIcon = (type: string) => {
    switch(type) {
      case 'CHECKING': return <Landmark size={18} />;
      case 'SAVINGS': return <Coins size={18} />;
      default: return <CreditCard size={18} />;
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-bold text-slate-800">Financeiro</h2>
        <button 
          onClick={onOpenTransaction}
          className="bg-primary-600 text-white p-2 rounded-full shadow-lg shadow-primary-500/30 active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Saldo Geral Card */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
             <Wallet size={14} /> Saldo Consolidado
          </div>
          <div className="text-4xl font-black tracking-tighter mb-6">
            {formatCurrency(totalBalance)}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Entradas</span>
              <span className="text-emerald-400 font-bold text-sm">
                + {formatCurrency(transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0))}
              </span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Saídas</span>
              <span className="text-red-400 font-bold text-sm">
                - {formatCurrency(transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Contas */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Suas Carteiras</h3>
          <button 
            className={`text-xs font-bold transition-colors ${activeAccountId === 'ALL' ? 'text-primary-600' : 'text-slate-400'}`}
            onClick={() => setActiveAccountId('ALL')}
          >
            Ver Todas
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 px-1 no-scrollbar snap-x">
          {accounts.map(account => (
            <div 
              key={account.id}
              onClick={() => setActiveAccountId(account.id)}
              className={`min-w-[200px] snap-center p-5 rounded-3xl border-2 transition-all duration-300 relative ${
                activeAccountId === account.id 
                  ? 'border-primary-500 bg-white shadow-xl shadow-primary-500/10' 
                  : 'border-white bg-white shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                 <div className={`p-3 rounded-2xl ${account.id === 'acc_prof' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {getAccountIcon(account.type)}
                 </div>
                 {account.isDefault && (
                   <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-black uppercase">Padrão</span>
                 )}
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">{account.name}</p>
              <p className="text-xl font-black text-slate-800 tracking-tight">{formatCurrency(account.balance)}</p>
              
              {activeAccountId === account.id && (
                <div className="absolute bottom-2 right-4 w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
              )}
            </div>
          ))}
          
          <button 
            className="min-w-[100px] flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 active:bg-slate-100 transition-colors gap-2"
          >
             <Plus size={20} />
             <span className="text-[10px] font-bold">Nova Conta</span>
          </button>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="bg-white rounded-t-[40px] shadow-2xl shadow-slate-200/50 min-h-[400px] -mx-4 px-6 pt-8 border-t border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-slate-800">
             {activeAccountId === 'ALL' ? 'Movimentações Recentes' : 'Extrato da Conta'}
          </h3>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
            {sortedTransactions.length} itens
          </span>
        </div>

        <div className="space-y-6">
           {sortedTransactions.length > 0 ? (
             sortedTransactions.map(t => {
               const cat = getCategoryDetails(t.category);
               return (
                 <div key={t.id} className="flex justify-between items-center group active:opacity-70 transition-opacity">
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {t.type === 'INCOME' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                       </div>
                       <div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">{cat.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className="text-[10px] text-slate-400 font-medium">
                               {new Date(t.date).toLocaleDateString(getDeviceLocale(), { day: '2-digit', month: 'short' })}
                             </span>
                             {activeAccountId === 'ALL' && (
                               <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-bold uppercase">
                                 {accounts.find(a => a.id === t.accountId)?.name.split(' ')[1] || 'Conta'}
                               </span>
                             )}
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className={`font-black text-sm tracking-tight ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-800'}`}>
                         {t.type === 'EXPENSE' ? '-' : '+'} {formatCurrency(t.amount)}
                       </p>
                       {t.description && <p className="text-[10px] text-slate-400 font-medium max-w-[100px] truncate">{t.description}</p>}
                    </div>
                 </div>
               );
             })
           ) : (
             <div className="py-20 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                  <Wallet size={32} />
                </div>
                <p className="text-slate-400 text-xs font-medium italic">Nenhum registro encontrado nesta carteira.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default FinancialView;
