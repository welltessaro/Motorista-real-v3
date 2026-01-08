import React, { useState } from 'react';
import { X, Trash2, Plus, Tag } from 'lucide-react';
import { CategoryItem } from '../types';
import Button from './Button';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  onAddCategory: (category: CategoryItem) => void;
  onDeleteCategory: (id: string) => void;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'];

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ 
  isOpen, 
  onClose, 
  categories, 
  onAddCategory, 
  onDeleteCategory 
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [newColor, setNewColor] = useState(COLORS[0]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const id = newLabel.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    
    // Check for duplicate ID
    if (categories.some(c => c.id === id)) {
      alert('Categoria já existe!');
      return;
    }

    onAddCategory({
      id,
      label: newLabel,
      type: newType,
      color: newColor,
      isSystem: false
    });

    setNewLabel('');
    setNewColor(COLORS[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Gerenciar Categorias</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Add New */}
          <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-700">Nova Categoria</h3>
            <div>
              <input 
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Nome da categoria"
                className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={newType} 
                onChange={e => setNewType(e.target.value as any)}
                className="p-2 text-sm border border-slate-300 rounded-lg outline-none bg-white flex-1"
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Ganho</option>
              </select>
              <div className="flex gap-1 items-center bg-white border border-slate-300 rounded-lg px-2">
                 {COLORS.slice(0, 5).map(c => (
                   <button 
                     key={c}
                     type="button"
                     onClick={() => setNewColor(c)}
                     className={`w-5 h-5 rounded-full ${newColor === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                     style={{ backgroundColor: c }}
                   />
                 ))}
                 <button 
                   type="button"
                   className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]"
                   onClick={() => setNewColor(COLORS[Math.floor(Math.random() * COLORS.length)])}
                 >
                   +
                 </button>
              </div>
            </div>
            <Button type="submit" fullWidth disabled={!newLabel} className="py-2 text-sm">
              <Plus size={16} /> Adicionar
            </Button>
          </form>

          {/* List */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700">Categorias Existentes</h3>
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{cat.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{cat.type === 'INCOME' ? 'Ganho' : cat.type === 'EXPENSE' ? 'Gasto' : 'Ambos'}</p>
                  </div>
                </div>
                {!cat.isSystem && (
                  <button 
                    onClick={() => onDeleteCategory(cat.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {cat.isSystem && (
                  <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded">Padrão</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagerModal;