import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Transaction, Category, CategoryItem } from '../types';
import { formatCurrency, getDeviceLocale } from '../utils';

interface ReportsViewProps {
  transactions: Transaction[];
  categories: CategoryItem[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ transactions, categories }) => {
  
  // Helper to get category details
  const getCatDetails = (id: string) => {
    return categories.find(c => c.id === id) || { label: id, color: '#94a3b8' };
  };

  // Prepare Data for Weekly Chart (Last 7 days simplified)
  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString(getDeviceLocale(), { weekday: 'short' });

      const dayTransactions = transactions.filter(t => t.date === dayStr);
      const income = dayTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
      const expense = dayTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

      data.push({ name: dayLabel, income, expense });
    }
    return data;
  };

  // Prepare Data for Platform/Category Split (Income)
  const getPlatformData = () => {
    const incomeTx = transactions.filter(t => t.type === 'INCOME');
    
    // Group by category ID
    const grouped: Record<string, number> = {};
    incomeTx.forEach(t => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount;
    });

    return Object.keys(grouped).map(catId => {
      const details = getCatDetails(catId);
      return {
        name: details.label,
        value: grouped[catId],
        color: details.color
      };
    }).sort((a, b) => b.value - a.value); // Sort descending
  };

  const weeklyData = getLast7DaysData();
  const platformData = getPlatformData();

  return (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-slate-800">Relatórios</h2>

      {/* Weekly Performance */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">Desempenho Semanal</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
              <YAxis hide />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Ganhos" />
              <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Platform Split */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">Ganhos por Categoria</h3>
        {platformData.length > 0 ? (
          <div className="flex flex-col md:flex-row items-center">
            <div className="h-48 w-48 relative">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-slate-400">TOTAL</span>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0 md:ml-8 flex-1 w-full space-y-3">
               {platformData.map((p) => (
                 <div key={p.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-sm font-medium text-slate-700">{p.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(p.value)}</span>
                 </div>
               ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-slate-400 py-8 text-sm">Nenhum ganho registrado no período.</p>
        )}
      </div>
    </div>
  );
};

export default ReportsView;