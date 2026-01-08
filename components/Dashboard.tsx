import React, { useState } from 'react';
import { Transaction, Vehicle, Category, User } from '../types';
import { formatCurrency, getDeviceLocale, handlePriceChange } from '../utils';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, CalendarClock, Target, Pencil, Check } from 'lucide-react';
import Button from './Button';

interface DashboardProps {
  transactions: Transaction[];
  activeVehicle: Vehicle | null;
  onOpenTransaction: () => void;
  user: User;
  onUpdateUser: (user: User) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, activeVehicle, onOpenTransaction, user, onUpdateUser }) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(user.monthlyGoal || 3000);

  // Logic: Calculate Real Profit using PROVISIONS (Competência)
  // Real Profit = Earnings - Variable Costs - (Monthly Fixed Costs / 30 * Current Day) - 10% Maintenance Reserve
  const calculateFinancials = () => {
    if (!activeVehicle) return { 
      income: 0, variableCosts: 0, provisionedFixedCosts: 0, maintenanceReserve: 0, realProfit: 0, totalCosts: 0, totalMonthlyFixed: 0 
    };

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 1. Calculate Earnings & Variable Costs from Transactions
    const monthlyTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = monthlyTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);

    // Variable Costs (Fuel, Maintenance, Other) - Paid instantly
    const variableCosts = monthlyTransactions
      .filter(t => t.type === 'EXPENSE' && (t.category === Category.FUEL || t.category === Category.MAINTENANCE || t.category === Category.OTHER))
      .reduce((acc, t) => acc + t.amount, 0);

    // 2. Calculate Fixed Costs Provision (Pro-rated by day)
    let totalMonthlyFixed = 0;
    
    // Rent
    if (activeVehicle.ownershipType === 'RENTED' && activeVehicle.rentAmount) {
      totalMonthlyFixed += activeVehicle.rentAmount;
    }
    // Financing
    if (activeVehicle.ownershipType === 'FINANCED' && activeVehicle.financingInstallment) {
      totalMonthlyFixed += activeVehicle.financingInstallment;
    }
    // Insurance
    if (activeVehicle.insuranceInstallmentValue) {
      totalMonthlyFixed += activeVehicle.insuranceInstallmentValue;
    }

    // Daily Cost Provision
    const dailyFixedCost = totalMonthlyFixed / daysInMonth;
    const provisionedFixedCosts = dailyFixedCost * currentDay;
    
    // 3. Maintenance Reserve (10% of Income)
    const maintenanceReserve = income * 0.10;

    const totalCosts = variableCosts + provisionedFixedCosts;
    const realProfit = income - totalCosts - maintenanceReserve;

    return {
      income,
      variableCosts,
      provisionedFixedCosts,
      maintenanceReserve,
      realProfit,
      totalCosts,
      totalMonthlyFixed,
      daysInMonth,
      currentDay
    };
  };

  const { 
    income, 
    totalCosts, 
    maintenanceReserve, 
    realProfit, 
    provisionedFixedCosts, 
    totalMonthlyFixed,
    daysInMonth,
    currentDay
  } = calculateFinancials();

  // Logic for Goal Calculation
  const calculateGoalMetrics = () => {
    const goal = user.monthlyGoal || 0;
    if (goal === 0) return { dailyNeeded: 0, progress: 0, remaining: 0 };

    const remainingAmount = goal - realProfit;
    const remainingDays = daysInMonth - currentDay + 1; // Including today as a working day
    
    // If profit already exceeds goal, daily needed is 0
    const dailyNeeded = remainingAmount > 0 ? remainingAmount / remainingDays : 0;
    
    // Progress percentage (clamped 0-100)
    const progress = Math.min(Math.max((realProfit / goal) * 100, 0), 100);

    return { dailyNeeded, progress, remaining: remainingAmount, remainingDays };
  };

  const { dailyNeeded, progress, remaining, remainingDays } = calculateGoalMetrics();

  const handleSaveGoal = () => {
    onUpdateUser({ ...user, monthlyGoal: tempGoal });
    setIsEditingGoal(false);
  };

  // Logic for Upcoming Bills Widget
  // INTELLIGENT BILL TRACKING: Checks if bills are paid in advance and shifts to next month
  const getUpcomingBills = () => {
    if (!activeVehicle) return [];
    
    const now = new Date();
    // Normalize today to start of day for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Helper to find the actual next due date based on payment history
    const getNextDueDate = (category: Category, dayOfMonth: number) => {
      // Start checking from the current month's due date
      // We set hour to 12 to avoid DST issues
      let targetDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, 12, 0, 0);
      
      // Safety limit: check up to 12 months ahead to prevent infinite loops
      for (let i = 0; i < 12; i++) {
        const windowStart = new Date(targetDate);
        windowStart.setDate(targetDate.getDate() - 20);
        
        const windowEnd = new Date(targetDate);
        windowEnd.setDate(targetDate.getDate() + 15);

        const isPaid = transactions.some(t => {
          if (t.category !== category || t.type !== 'EXPENSE') return false;
          const tDate = new Date(t.date);
          tDate.setHours(12, 0, 0, 0);
          return tDate >= windowStart && tDate <= windowEnd;
        });

        if (isPaid) {
          // If paid, move target to next month
          targetDate.setMonth(targetDate.getMonth() + 1);
        } else {
          // If not paid, this is the next due bill
          return targetDate;
        }
      }
      return targetDate;
    };

    // Helper to calc status based on the calculated target date
    const getStatus = (targetDate: Date) => {
      // Diff in milliseconds
      const diffTime = targetDate.getTime() - today.getTime(); // target - today
      // Diff in days (ceil to ensure partial days count as 1 if future)
      const targetDayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const diffDays = Math.ceil((targetDayStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)); 

      if (diffDays < 0) return { label: 'Atrasado', color: 'text-red-500', days: diffDays };
      if (diffDays === 0) return { label: 'Vence Hoje', color: 'text-orange-500', days: 0 };
      return { label: `Vence em ${diffDays} dias`, color: 'text-slate-500', days: diffDays };
    };

    const bills = [];

    if (activeVehicle.ownershipType === 'RENTED' && activeVehicle.rentAmount) {
      const dueDay = activeVehicle.rentDueDay || 5; 
      const nextDate = getNextDueDate(Category.RENT, dueDay);
      bills.push({ 
        name: 'Aluguel', 
        amount: activeVehicle.rentAmount, 
        date: nextDate,
        ...getStatus(nextDate)
      });
    }

    if (activeVehicle.ownershipType === 'FINANCED' && activeVehicle.financingInstallment) {
      const dueDay = activeVehicle.financingDueDay || 10;
      const nextDate = getNextDueDate(Category.FINANCING, dueDay);
      bills.push({ 
        name: 'Financiamento', 
        amount: activeVehicle.financingInstallment, 
        date: nextDate,
        ...getStatus(nextDate)
      });
    }

    if (activeVehicle.insuranceInstallmentValue) {
      const dueDay = activeVehicle.insuranceDueDay || 10;
      const nextDate = getNextDueDate(Category.INSURANCE, dueDay);
      bills.push({ 
        name: 'Seguro', 
        amount: activeVehicle.insuranceInstallmentValue, 
        date: nextDate,
        ...getStatus(nextDate)
      });
    }

    // Sort by Due Date (closest first)
    return bills.sort((a, b) => {
       return a.days - b.days;
    });
  };

  const upcomingBills = getUpcomingBills();

  return (
    <div className="space-y-6 pb-24">
      {/* Header Info */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-slate-500 text-sm font-medium">Bom dia,</p>
          <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
        </div>
        <div className="text-right">
           <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-md font-bold capitalize">
             {new Date().toLocaleDateString(getDeviceLocale(), { month: 'long' })}
           </span>
        </div>
      </div>

      {/* Main Card: Lucro Real */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Wallet size={18} />
            <span className="text-sm font-medium uppercase tracking-wider">Lucro Real Estimado</span>
          </div>
          <div className="text-4xl font-bold mb-6 tracking-tight">
            {formatCurrency(realProfit)}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div>
              <span className="text-xs text-slate-400 block mb-1">Faturamento</span>
              <span className="text-lg font-semibold text-emerald-400 flex items-center gap-1">
                <TrendingUp size={14} /> {formatCurrency(income)}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Custos (Proporcionais)</span>
              <span className="text-lg font-semibold text-red-400 flex items-center gap-1">
                <TrendingDown size={14} /> {formatCurrency(totalCosts)}
              </span>
            </div>
          </div>
          
          {totalMonthlyFixed > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 text-xs text-slate-400">
               * Considera {formatCurrency(provisionedFixedCosts)} de custos fixos proporcionais aos dias de hoje.
            </div>
          )}
        </div>
      </div>

      {/* Daily Goal Card (New) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl pointer-events-none"></div>

         <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex items-center gap-2">
               <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Target size={20} />
               </div>
               <div>
                  <h3 className="font-bold text-slate-800">Meta Diária</h3>
                  <p className="text-xs text-slate-500">Para atingir sua remuneração livre</p>
               </div>
            </div>
            
            {/* Goal Setting UI */}
            <div className="text-right">
              {isEditingGoal ? (
                <div className="flex items-center gap-2 animate-fade-in">
                  <input 
                    type="text" 
                    value={formatCurrency(tempGoal).replace('R$', '').trim()}
                    onChange={(e) => setTempGoal(handlePriceChange(e.target.value))}
                    className="w-24 text-sm border-b-2 border-primary-500 outline-none text-right font-bold text-slate-800"
                    autoFocus
                  />
                  <button onClick={handleSaveGoal} className="p-1 bg-primary-100 text-primary-600 rounded-full hover:bg-primary-200">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingGoal(true)}
                  className="group cursor-pointer flex items-center gap-1 text-slate-400 hover:text-primary-600 transition-colors"
                >
                  <span className="text-xs font-medium uppercase">Meta Mensal:</span>
                  <span className="text-sm font-bold text-slate-600 group-hover:text-primary-700">
                    {formatCurrency(user.monthlyGoal || 0)}
                  </span>
                  <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
         </div>

         {/* Calculation Display */}
         {(user.monthlyGoal || 0) > 0 ? (
           <div className="relative z-10">
              <div className="flex items-end gap-2 mb-2">
                 <span className="text-3xl font-bold text-blue-600 tracking-tight">
                    {remaining > 0 ? formatCurrency(dailyNeeded) : 'Meta Batida! 🎉'}
                 </span>
                 {remaining > 0 && (
                   <span className="text-sm text-slate-500 font-medium mb-1">/ dia</span>
                 )}
              </div>
              
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                 <div 
                   className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                   style={{ width: `${progress}%` }}
                 ></div>
              </div>
              
              <div className="flex justify-between text-xs text-slate-400">
                 <span>Faltam {remainingDays} dias</span>
                 <span>{Math.round(progress)}% do objetivo</span>
              </div>
           </div>
         ) : (
            <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
               <p className="text-sm text-slate-500 mb-2">Defina quanto você quer ganhar livre este mês.</p>
               <Button variant="secondary" onClick={() => setIsEditingGoal(true)} className="text-xs py-2 h-auto">
                 Definir Meta Mensal
               </Button>
            </div>
         )}
      </div>

      {/* Fixed Costs & Provisions Widget */}
      {upcomingBills.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="text-primary-600" size={20} />
              <h3 className="font-bold text-slate-800">Próximos Vencimentos</h3>
           </div>
           
           <div className="space-y-4">
              {upcomingBills.map((bill, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                   <div>
                      <p className="font-bold text-slate-700 text-sm">{bill.name}</p>
                      <p className={`text-xs font-medium ${bill.color}`}>
                         {bill.label} ({bill.date.toLocaleDateString(getDeviceLocale(), { day: '2-digit', month: '2-digit' })})
                      </p>
                   </div>
                   <div className="text-right">
                      <p className="font-bold text-slate-800">{formatCurrency(bill.amount)}</p>
                      <p className="text-[10px] text-slate-400 uppercase">Valor Total</p>
                   </div>
                </div>
              ))}
           </div>
           
           <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 mb-1 flex justify-between">
                 <span>Provisão Mensal Acumulada</span>
                 <span className="font-bold text-slate-700">{Math.round((provisionedFixedCosts / totalMonthlyFixed) * 100)}%</span>
              </p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                 <div 
                   className="bg-primary-500 h-full rounded-full transition-all duration-1000"
                   style={{ width: `${Math.min((provisionedFixedCosts / totalMonthlyFixed) * 100, 100)}%` }}
                 ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 text-center">
                 Você já consumiu {formatCurrency(provisionedFixedCosts)} do seu custo fixo mensal.
              </p>
           </div>
        </div>
      )}

      {/* Reserves Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Reserva de Manutenção</h3>
          <p className="text-sm text-slate-500 mb-2">10% dos ganhos retidos automaticamente para imprevistos.</p>
          <span className="text-xl font-bold text-indigo-600">{formatCurrency(maintenanceReserve)}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
         <button 
           onClick={onOpenTransaction}
           className="bg-primary-50 hover:bg-primary-100 transition-colors p-4 rounded-xl flex flex-col items-center justify-center gap-2 border border-primary-100"
         >
           <div className="bg-primary-500 text-white p-2 rounded-full shadow-md shadow-primary-500/20">
             <TrendingUp size={20} />
           </div>
           <span className="font-bold text-primary-800 text-sm">Novo Ganho</span>
         </button>

         <button 
           onClick={onOpenTransaction}
           className="bg-red-50 hover:bg-red-100 transition-colors p-4 rounded-xl flex flex-col items-center justify-center gap-2 border border-red-100"
         >
           <div className="bg-red-500 text-white p-2 rounded-full shadow-md shadow-red-500/20">
             <TrendingDown size={20} />
           </div>
           <span className="font-bold text-red-800 text-sm">Novo Gasto</span>
         </button>
      </div>

      {/* Recent Transactions Snippet */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3">Últimas Movimentações</h3>
        <div className="space-y-3">
          {transactions.slice(0, 4).reverse().map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
               <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                   {t.type === 'INCOME' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                 </div>
                 <div>
                   <p className="font-semibold text-slate-800 text-sm">{t.category}</p>
                   <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString(getDeviceLocale())}</p>
                 </div>
               </div>
               <span className={`font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-800'}`}>
                 {t.type === 'EXPENSE' ? '-' : '+'} {formatCurrency(t.amount)}
               </span>
            </div>
          ))}
          {transactions.length === 0 && (
             <div className="text-center py-8 text-slate-400 text-sm">
               Nenhuma transação registrada.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;