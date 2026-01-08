import React, { useState } from 'react';
import { Transaction, Vehicle, Category, User, CategoryItem } from '../types';
import { formatCurrency, getDeviceLocale, handlePriceChange, formatDateForInput } from '../utils';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, CalendarClock, Target, Pencil, Check, Info, X, DollarSign, Activity } from 'lucide-react';
import Button from './Button';

interface DashboardProps {
  transactions: Transaction[];
  activeVehicle: Vehicle | null;
  onOpenTransaction: () => void;
  user: User;
  onUpdateUser: (user: User) => void;
  categories: CategoryItem[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
}

// Data structure for the Info Modal
interface InfoModalData {
  title: string;
  description: string;
  items: {
    label: string;
    value: string;
    color?: string;
    icon?: React.ReactNode;
  }[];
}

interface BillPaymentState {
  name: string;
  category: string;
  expectedAmount: number;
  dueDate: Date;
  actualAmount: number;
  paymentDate: string;
  description: string;
  parcelIndex?: number;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  activeVehicle, 
  onOpenTransaction, 
  user, 
  onUpdateUser, 
  categories,
  onAddTransaction,
  onUpdateVehicle
}) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(user.monthlyGoal || 3000);
  const [activeInfo, setActiveInfo] = useState<InfoModalData | null>(null);
  const [billToPay, setBillToPay] = useState<BillPaymentState | null>(null);

  const getCategoryLabel = (id: string) => categories.find(c => c.id === id)?.label || id;

  // Logic: Calculate Real Profit using PROVISIONS (Competência)
  // Real Profit = Earnings - Variable Costs - (Monthly Fixed Costs / 30 * Current Day) - 10% Maintenance Reserve
  const calculateFinancials = () => {
    if (!activeVehicle) return { 
      income: 0, variableCosts: 0, provisionedFixedCosts: 0, maintenanceReserve: 0, realProfit: 0, totalCosts: 0, totalMonthlyFixed: 0, daysInMonth: 30, currentDay: 1
    };

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 1. Calculate Earnings & Variable Costs from Transactions
    const monthlyTransactions = transactions.filter(t => {
      // Robust local date parsing
      const parts = t.date.split('T')[0].split('-');
      // Create date at noon local time to avoid timezone edge cases
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = monthlyTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);

    // Variable Costs
    const variableCosts = monthlyTransactions
      .filter(t => t.type === 'EXPENSE' && (t.category === Category.FUEL || t.category === Category.MAINTENANCE || t.category === Category.OTHER || !Object.values(Category).includes(t.category as any)))
      .reduce((acc, t) => acc + t.amount, 0);

    // 2. Calculate Fixed Costs Provision (Pro-rated by day)
    let totalMonthlyFixed = 0;
    let rentDailyProvision = 0;
    
    // Rent
    if (activeVehicle.ownershipType === 'RENTED' && activeVehicle.rentAmount) {
      if (activeVehicle.rentFrequency === 'WEEKLY') {
        // Convert weekly to monthly approximation for display, but use daily for provision
        totalMonthlyFixed += activeVehicle.rentAmount * 4.33; // Approx
        rentDailyProvision = activeVehicle.rentAmount / 7;
      } else {
        totalMonthlyFixed += activeVehicle.rentAmount;
        rentDailyProvision = activeVehicle.rentAmount / daysInMonth;
      }
    }

    // Financing
    let financingAmount = 0;
    if (activeVehicle.ownershipType === 'FINANCED' && activeVehicle.financingInstallment) {
      financingAmount = activeVehicle.financingInstallment;
      totalMonthlyFixed += financingAmount;
    }
    
    // Insurance
    let insuranceAmount = 0;
    if (activeVehicle.insuranceInstallmentValue) {
      insuranceAmount = activeVehicle.insuranceInstallmentValue;
      totalMonthlyFixed += insuranceAmount;
    }

    // Daily Cost Provision Logic
    // Rent is handled separately because of weekly frequency possibility
    const otherFixedDailyCost = (financingAmount + insuranceAmount) / daysInMonth;
    
    const provisionedFixedCosts = (rentDailyProvision * currentDay) + (otherFixedDailyCost * currentDay);
    
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
    variableCosts,
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
    if (goal === 0) return { dailyNetNeeded: 0, dailyGrossNeeded: 0, progress: 0, remaining: 0, remainingDays: 0, currentMargin: 0 };

    const remainingAmount = goal - realProfit; // This is NET remaining
    const remainingDays = daysInMonth - currentDay + 1; // Including today as a working day
    
    // Progress percentage (clamped 0-100)
    const progress = Math.min(Math.max((realProfit / goal) * 100, 0), 100);

    // 1. Net Daily Needed (Lucro Livre para o bolso)
    const dailyNetNeeded = remainingAmount > 0 ? remainingAmount / remainingDays : 0;

    // 2. Gross Daily Needed (Faturamento Bruto no App)
    // We need to account for costs. 
    // If I need R$ 100 profit, and my margin is 50%, I need to drive R$ 200.
    
    let currentMargin = 0.60; // Default pessimistic margin (60% profit / 40% cost)
    
    if (income > 0) {
      // Calculate actual margin based on month performance
      // Margin = RealProfit / Income
      const calculatedMargin = realProfit / income;
      // Sanity check for margin (e.g. if negative profit, use default)
      if (calculatedMargin > 0.1 && calculatedMargin <= 1) {
         currentMargin = calculatedMargin;
      }
    }

    const dailyGrossNeeded = dailyNetNeeded / currentMargin;

    return { 
      dailyNetNeeded, 
      dailyGrossNeeded, 
      progress, 
      remaining: remainingAmount, 
      remainingDays,
      currentMargin 
    };
  };

  const { dailyNetNeeded, dailyGrossNeeded, progress, remaining, remainingDays, currentMargin } = calculateGoalMetrics();

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
    const getNextDueDate = (category: string, dueDay: number, frequency: 'MONTHLY' | 'WEEKLY' = 'MONTHLY') => {
      let targetDate: Date;
      
      if (frequency === 'MONTHLY') {
        // Start checking from the current month's due date
        targetDate = new Date(now.getFullYear(), now.getMonth(), dueDay, 12, 0, 0);
      } else {
        // WEEKLY logic
        // dueDay is 1-7 (1=Monday, 7=Sunday)
        // JavaScript getDay() returns 0=Sunday, 1=Monday...
        const jsTargetDay = dueDay === 7 ? 0 : dueDay;
        
        targetDate = new Date(now);
        targetDate.setHours(12, 0, 0, 0);
        
        const currentJsDay = targetDate.getDay();
        const distance = jsTargetDay - currentJsDay;
        targetDate.setDate(targetDate.getDate() + distance);
        
        // Start looking from 3 weeks ago to catch missed payments
        targetDate.setDate(targetDate.getDate() - 21);
      }
      
      // Safety limit: check up to 12 months (or 52 weeks) ahead
      const loopLimit = frequency === 'MONTHLY' ? 12 : 52;

      for (let i = 0; i < loopLimit; i++) {
        const windowStart = new Date(targetDate);
        const windowEnd = new Date(targetDate);

        if (frequency === 'MONTHLY') {
           windowStart.setDate(targetDate.getDate() - 20);
           windowEnd.setDate(targetDate.getDate() + 15);
        } else {
           windowStart.setDate(targetDate.getDate() - 3);
           windowEnd.setDate(targetDate.getDate() + 3);
        }

        const isPaid = transactions.some(t => {
          if (t.category !== category || t.type !== 'EXPENSE') return false;
          
          // ROBUST DATE PARSING: Split YYYY-MM-DD
          const parts = t.date.split('T')[0].split('-');
          // Create a Date object at Noon (12:00) local time to avoid Timezone shifts
          const tDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
          
          return tDate >= windowStart && tDate <= windowEnd;
        });

        if (isPaid) {
          // If paid, move target to next period
          if (frequency === 'MONTHLY') {
             targetDate.setMonth(targetDate.getMonth() + 1);
          } else {
             targetDate.setDate(targetDate.getDate() + 7);
          }
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
      const frequency = activeVehicle.rentFrequency || 'MONTHLY';
      const nextDate = getNextDueDate(Category.RENT, dueDay, frequency);
      
      bills.push({ 
        name: `Aluguel (${frequency === 'WEEKLY' ? 'Semanal' : 'Mensal'})`, 
        category: Category.RENT,
        amount: activeVehicle.rentAmount, 
        date: nextDate,
        ...getStatus(nextDate)
      });
    }

    if (activeVehicle.ownershipType === 'FINANCED' && activeVehicle.financingInstallment) {
      const dueDay = activeVehicle.financingDueDay || 10;
      const nextDate = getNextDueDate(Category.FINANCING, dueDay, 'MONTHLY');
      bills.push({ 
        name: 'Financiamento',
        category: Category.FINANCING,
        amount: activeVehicle.financingInstallment, 
        date: nextDate,
        ...getStatus(nextDate)
      });
    }

    if (activeVehicle.insuranceInstallmentValue) {
      const dueDay = activeVehicle.insuranceDueDay || 10;
      const nextDate = getNextDueDate(Category.INSURANCE, dueDay, 'MONTHLY');
      bills.push({ 
        name: 'Seguro',
        category: Category.INSURANCE,
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

  // --- PAYMENT HANDLERS ---

  const initiatePayment = (bill: any) => {
    let description = `Pagamento ${bill.name}`;
    let parcelIndex = undefined;
    
    // Auto-detect parcel number for Financing
    if (bill.category === Category.FINANCING && activeVehicle) {
       const current = activeVehicle.financingPaidMonths || 0;
       parcelIndex = current + 1;
       description = `Pagamento Parcela ${parcelIndex}/${activeVehicle.financingTotalMonths || '?'}`;
    }

    setBillToPay({
      name: bill.name,
      category: bill.category,
      expectedAmount: bill.amount,
      actualAmount: bill.amount,
      dueDate: bill.date,
      paymentDate: formatDateForInput(new Date()),
      description,
      parcelIndex
    });
  };

  const confirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billToPay || !activeVehicle) return;

    // 1. Add Transaction
    onAddTransaction({
      vehicleId: activeVehicle.id,
      type: 'EXPENSE',
      category: billToPay.category,
      amount: billToPay.actualAmount,
      date: billToPay.paymentDate,
      description: billToPay.description
    });

    // 2. Update Vehicle State (if Financing)
    if (billToPay.category === Category.FINANCING) {
      const updatedVehicle = {
        ...activeVehicle,
        financingPaidMonths: (activeVehicle.financingPaidMonths || 0) + 1
      };
      onUpdateVehicle(updatedVehicle);
    }

    setBillToPay(null);
  };

  // --- INFO MODAL HANDLERS ---

  const openRealProfitInfo = () => {
    setActiveInfo({
      title: "Lucro Real Estimado",
      description: "Este não é apenas o saldo do banco. O Lucro Real desconta os gastos imediatos (combustível) + a depreciação do carro e custos fixos proporcionais aos dias que já passaram (aluguel/seguro/IPVA) + reserva de manutenção.",
      items: [
        { label: "Faturamento Bruto", value: `+ ${formatCurrency(income)}`, color: "text-emerald-600" },
        { label: "Custos Variáveis", value: `- ${formatCurrency(variableCosts)}`, color: "text-red-500" },
        { label: "Provisão de Custos Fixos (Competência)", value: `- ${formatCurrency(provisionedFixedCosts)}`, color: "text-red-500" },
        { label: "Reserva de Manutenção (10%)", value: `- ${formatCurrency(maintenanceReserve)}`, color: "text-indigo-500" },
        { label: "Lucro Real Líquido", value: `= ${formatCurrency(realProfit)}`, color: "text-slate-900 font-bold border-t border-slate-200 pt-2" }
      ]
    });
  };

  const openGoalInfo = () => {
    setActiveInfo({
      title: "Meta Diária Inteligente",
      description: "O app projeta quanto você precisa faturar (bruto) para cobrir seus custos estimados e ainda sobrar o lucro livre que você deseja.",
      items: [
        { label: "Meta Mensal (Livre)", value: formatCurrency(user.monthlyGoal || 0) },
        { label: "Falta (Livre)", value: formatCurrency(Math.max(0, (user.monthlyGoal || 0) - realProfit)) },
        { label: "Dias Restantes", value: `${remainingDays} dias` },
        { label: "Margem de Lucro Atual", value: `${Math.round(currentMargin * 100)}%` },
        { label: "Faturamento Bruto Necessário", value: `= ${formatCurrency(dailyGrossNeeded)} / dia`, color: "text-blue-600 font-bold border-t border-slate-200 pt-2" },
        { label: "Para sobrar (Lucro Líquido)", value: `~ ${formatCurrency(dailyNetNeeded)} / dia`, color: "text-emerald-600 text-xs" }
      ]
    });
  };

  const openReserveInfo = () => {
    setActiveInfo({
      title: "Reserva de Manutenção",
      description: "Para não ser pego de surpresa quando o carro quebrar ou precisar de pneus, o sistema separa automaticamente 10% de todo ganho bruto. Esse dinheiro deve ser guardado, não gasto.",
      items: [
        { label: "Faturamento Total", value: formatCurrency(income) },
        { label: "Percentual de Segurança", value: "10%" },
        { label: "Valor Retido", value: formatCurrency(maintenanceReserve), color: "text-indigo-600 font-bold" }
      ]
    });
  };

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
      <div 
        onClick={openRealProfitInfo}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden cursor-pointer transition-transform active:scale-[0.98] group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 opacity-80">
              <Wallet size={18} />
              <span className="text-sm font-medium uppercase tracking-wider">Lucro Real Estimado</span>
            </div>
            <Info size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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

      {/* Daily Goal Card */}
      <div 
        onClick={openGoalInfo}
        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden cursor-pointer transition-transform active:scale-[0.98] group"
      >
         {/* Background Decoration */}
         <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl pointer-events-none"></div>

         <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex items-center gap-2">
               <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Target size={20} />
               </div>
               <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    Meta Diária
                    <Info size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-slate-500">Para atingir sua remuneração livre</p>
               </div>
            </div>
            
            {/* Goal Setting UI */}
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
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
                  className="group/edit cursor-pointer flex items-center gap-1 text-slate-400 hover:text-primary-600 transition-colors"
                >
                  <span className="text-xs font-medium uppercase">Meta Mensal:</span>
                  <span className="text-sm font-bold text-slate-600 group-hover/edit:text-primary-700">
                    {formatCurrency(user.monthlyGoal || 0)}
                  </span>
                  <Pencil size={12} className="opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
         </div>

         {/* Calculation Display */}
         {(user.monthlyGoal || 0) > 0 ? (
           <div className="relative z-10">
              <div className="flex items-end gap-2 mb-2">
                 <span className="text-3xl font-bold text-blue-600 tracking-tight">
                    {remaining > 0 ? formatCurrency(dailyGrossNeeded) : 'Meta Batida! 🎉'}
                 </span>
                 {remaining > 0 && (
                   <span className="text-sm text-slate-500 font-medium mb-1">/ dia (Faturamento)</span>
                 )}
              </div>

              {remaining > 0 && (
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                   <Activity size={12} className="text-slate-400" />
                   Considerando seus custos, fature isso para sobrar <span className="font-bold text-emerald-600">{formatCurrency(dailyNetNeeded)}</span>
                </div>
              )}
              
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                 <div 
                   className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                   style={{ width: `${progress}%` }}
                 ></div>
              </div>
              
              <div className="flex justify-between text-xs text-slate-400">
                 <span>Faltam {remainingDays} dias</span>
                 <span>{Math.round(progress)}% do objetivo (Líquido)</span>
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
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                Próximos Vencimentos
              </h3>
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
                   <div className="flex items-center gap-3">
                     <div className="text-right">
                        <p className="font-bold text-slate-800">{formatCurrency(bill.amount)}</p>
                     </div>
                     <button 
                       onClick={() => initiatePayment(bill)}
                       className="px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-bold transition-colors"
                     >
                       Pagar
                     </button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Reserves Card */}
      <div 
        onClick={openReserveInfo}
        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 cursor-pointer transition-transform active:scale-[0.98] group"
      >
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <AlertCircle size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            Reserva de Manutenção
            <Info size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
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
                   <p className="font-semibold text-slate-800 text-sm">{getCategoryLabel(t.category)}</p>
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

      {/* PAYMENT MODAL */}
      {billToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
           <form 
             onSubmit={confirmPayment}
             className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative animate-scale-up"
           >
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <Check className="text-emerald-500" /> Confirmar Pagamento
              </h3>
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Descrição</label>
                    <input 
                       value={billToPay.description}
                       onChange={e => setBillToPay({...billToPay, description: e.target.value})}
                       className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary-500"
                    />
                 </div>

                 <div className="flex gap-4">
                    <div className="flex-1">
                       <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Valor</label>
                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                          <input 
                             value={formatCurrency(billToPay.actualAmount).replace('R$', '').trim()}
                             onChange={e => setBillToPay({...billToPay, actualAmount: handlePriceChange(e.target.value)})}
                             className="w-full p-2 pl-8 text-sm font-bold border border-slate-200 rounded-lg outline-none focus:border-primary-500"
                          />
                       </div>
                    </div>
                    <div className="w-1/3">
                       <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Data</label>
                       <input 
                          type="date"
                          value={billToPay.paymentDate}
                          onChange={e => setBillToPay({...billToPay, paymentDate: e.target.value})}
                          className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary-500"
                       />
                    </div>
                 </div>

                 {/* Financing Specific Logic */}
                 {billToPay.category === Category.FINANCING && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                       <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Referente à Parcela</label>
                       <input 
                          type="number"
                          value={billToPay.parcelIndex || ''}
                          onChange={e => setBillToPay({...billToPay, parcelIndex: parseInt(e.target.value)})}
                          className="w-full p-2 text-sm font-bold border border-slate-200 rounded-lg outline-none focus:border-primary-500"
                       />
                       <p className="text-[10px] text-slate-400 mt-1">O sistema atualizará a contagem automaticamente.</p>
                    </div>
                 )}

                 {/* Comparison Logic */}
                 {billToPay.expectedAmount !== billToPay.actualAmount && (
                    <div className="text-xs flex items-center gap-2 p-2 rounded bg-slate-50 text-slate-600">
                       <DollarSign size={14} />
                       {billToPay.actualAmount < billToPay.expectedAmount ? (
                          <span className="text-emerald-600 font-bold">Desconto de {formatCurrency(billToPay.expectedAmount - billToPay.actualAmount)}</span>
                       ) : (
                          <span className="text-red-500 font-bold">Juros de {formatCurrency(billToPay.actualAmount - billToPay.expectedAmount)}</span>
                       )}
                    </div>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                 <Button type="button" variant="secondary" onClick={() => setBillToPay(null)}>Cancelar</Button>
                 <Button type="submit">Confirmar</Button>
              </div>
           </form>
        </div>
      )}

      {/* INFORMATION MODAL */}
      {activeInfo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setActiveInfo(null)}>
          <div 
            className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh] animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
             {/* Header */}
             <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
               <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{activeInfo.title}</h3>
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                     <Info size={12} /> Entenda o cálculo
                  </div>
               </div>
               <button onClick={() => setActiveInfo(null)} className="p-2 bg-slate-200 rounded-full text-slate-500 hover:bg-slate-300">
                  <X size={20} />
               </button>
             </div>

             {/* Content */}
             <div className="p-6 overflow-y-auto">
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                   {activeInfo.description}
                </p>

                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Resumo Financeiro</h4>
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                   {activeInfo.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                         <span className="text-slate-600 font-medium">{item.label}</span>
                         <span className={`font-bold ${item.color || 'text-slate-800'}`}>{item.value}</span>
                      </div>
                   ))}
                </div>
             </div>

             {/* Footer */}
             <div className="p-4 border-t border-slate-100">
                <Button fullWidth onClick={() => setActiveInfo(null)} variant="secondary">
                   Entendi
                </Button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;