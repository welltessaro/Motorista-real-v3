import React, { useState } from 'react';
import { Account, Transaction, CategoryItem } from '../types';
import { formatCurrency, getDeviceLocale } from '../utils';
import { Wallet, Plus, TrendingUp, TrendingDown, ArrowRightLeft, CreditCard } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'ALL' | string>('ALL');

  const getCategoryDetails = (id: string) => categories.find(c => c.id === id) || { label: id, color: '#94a3b8' };

  // Calculate Aggregates
  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  // Filter Transactions
  const displayedTransactions = activeTab === 'ALL' 
    ? transactions 
    : transactions.filter(t => t.accountId === activeTab);

  // Sort by date desc
  const sortedTransactions = [...displayedTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Financeiro</h2>
        <Button onClick={onOpenTransaction} className="h-10 px-4 text-xs">
          <Plus size={16} /> Novo Lançamento
        </Button>
      </div>

      {/* Total Balance Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-2 text-slate-300 text-sm mb-2">
           <Wallet size={16} /> Saldo Geral
        </div>
        <div className="text-3xl font-bold tracking-tight">
          {formatCurrency(totalBalance)}
        </div>
        <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
          <div className="flex-1">
             <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold uppercase">
               <TrendingUp size={12} /> Entradas (Mês)
             </div>
             <div className="text-lg font-semibold mt-1">
                {/* Simplified Calc for UI */}
                {formatCurrency(transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0))}
             </div>
          </div>
          <div className="flex-1">
             <div className="flex items-center gap-1 text-red-400 text-xs font-bold uppercase">
               <TrendingDown size={12} /> Saídas (Mês)
             </div>
             <div className="text-lg font-semibold mt-1">
                {formatCurrency(transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0))}
             </div>
          </div>
        </div>
      </div>

      {/* Account Cards */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-slate-700">Minhas Contas</h3>
          <button className="text-primary-600 text-xs font-bold hover:underline">Gerenciar</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
          {accounts.map(account => (
            <div 
              key={account.id}
              onClick={() => setActiveTab(activeTab === account.id ? 'ALL' : account.id)}
              className={`min-w-[160px] p-4 rounded-xl border-2 transition-all cursor-pointer snap-start ${
                activeTab === account.id 
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200 ring-offset-1' 
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                 <div className={`p-2 rounded-lg bg-${account.color}-100 text-${account.color}-600`}>
                    <CreditCard size={18} className={account.id === 'acc_pers' ? 'text-purple-600' : 'text-blue-600'} />
                 </div>
                 {account.isDefault && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">Padrão</span>}
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">{account.name}</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(account.balance)}</p>
            </div>
          ))}
          
          {/* Add Account Placeholder */}
          <div className="min-w-[60px] flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 cursor-pointer hover:bg-slate-100 hover:border-slate-300 hover:text-slate-600 transition-colors">
             <Plus size={24} />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div>
        <h3 className="font-bold text-slate-700 mb-3 px-1">
           {activeTab === 'ALL' ? 'Últimas Movimentações' : `Extrato: ${accounts.find(a => a.id === activeTab)?.name}`}
        </h3>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
           {sortedTransactions.length > 0 ? (
             <div className="divide-y divide-slate-50">
               {sortedTransactions.slice(0, 20).map(t => {
                 const cat = getCategoryDetails(t.category);
                 const acc = accounts.find(a => a.id === t.accountId);
                 return (
                   <div key={t.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {t.type === 'INCOME' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                         </div>
                         <div>
                            <p className="font-bold text-slate-800 text-sm">{cat.label}</p>
                            <div className="flex items-center gap-2">
                               <span className="text-xs text-slate-400">
                                 {new Date(t.date).toLocaleDateString(getDeviceLocale())}
                               </span>
                               {activeTab === 'ALL' && acc && (
                                 <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 truncate max-w-[80px]">
                                   {acc.name}
                                 </span>
                               )}
                            </div>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className={`font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-800'}`}>
                           {t.type === 'EXPENSE' ? '-' : '+'} {formatCurrency(t.amount)}
                         </p>
                         {t.description && <p className="text-[10px] text-slate-400 max-w-[120px] truncate ml-auto">{t.description}</p>}
                      </div>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="p-8 text-center text-slate-400 text-sm">
                Nenhum lançamento encontrado nesta conta.
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default FinancialView;