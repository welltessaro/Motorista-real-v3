
import React, { useState } from 'react';
import { X, Cloud, Lock, Key, CheckCircle, AlertTriangle, Database, Save, Info } from 'lucide-react';
import Button from './Button';
import { supabaseService } from '../services/supabaseClient';

interface CloudConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

const CloudConfig: React.FC<CloudConfigProps> = ({ isOpen, onClose }) => {
  const creds = supabaseService.getCredentials();
  const [url, setUrl] = useState(creds.url);
  const [key, setKey] = useState(creds.key);
  const [showSql, setShowSql] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (url && key) {
      supabaseService.saveCredentials(url, key);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Tem certeza? A sincronização será interrompida.')) {
      supabaseService.clearCredentials();
      setUrl('');
      setKey('');
    }
  };

  const sqlScript = `
-- Crie esta tabela no Editor SQL do Supabase
create table if not exists documents (
  id text primary key,
  collection text not null,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS (Segurança) se desejar, ou deixar aberto para teste
alter table documents enable row level security;

-- Política simples para permitir tudo (apenas para teste/dev)
create policy "Allow all access" on documents for all using (true) with check (true);
  `.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
               <Cloud size={24} />
             </div>
             <div>
               <h3 className="font-bold text-slate-800">Sincronização Nuvem</h3>
               <p className="text-xs text-slate-500">Torne seus dados acessíveis em qualquer lugar</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
             <X size={20} />
           </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 flex items-start gap-3">
             <Info size={20} className="shrink-0 mt-0.5" />
             <p>Esta configuração permite conectar o App ao <strong>Supabase (Gratuito)</strong>. Isso habilitará o backup automático e o uso em múltiplos dispositivos.</p>
          </div>

          <div className="space-y-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project URL</label>
               <div className="relative">
                 <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                   value={url}
                   onChange={e => setUrl(e.target.value)}
                   className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                   placeholder="https://xyz.supabase.co"
                 />
               </div>
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Anon Public Key</label>
               <div className="relative">
                 <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                   value={key}
                   onChange={e => setKey(e.target.value)}
                   type="password"
                   className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                   placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                 />
               </div>
             </div>
          </div>

          <div className="pt-2">
             <button 
               onClick={() => setShowSql(!showSql)}
               className="text-xs text-slate-500 font-bold underline mb-2 flex items-center gap-1"
             >
               <Database size={12} /> {showSql ? 'Esconder Script SQL' : 'Ver Script de Criação do Banco'}
             </button>
             
             {showSql && (
               <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-[10px] font-mono overflow-x-auto relative group">
                 <pre>{sqlScript}</pre>
                 <button 
                   onClick={() => navigator.clipboard.writeText(sqlScript)}
                   className="absolute top-2 right-2 p-1 bg-white/10 rounded hover:bg-white/20 text-white"
                   title="Copiar"
                 >
                   <Save size={14} />
                 </button>
               </div>
             )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
           {supabaseService.isReady() ? (
             <Button fullWidth variant="danger" onClick={handleDisconnect}>
                Desconectar
             </Button>
           ) : (
             <Button fullWidth onClick={handleSave} disabled={!url || !key}>
                <CheckCircle size={18} /> Salvar e Conectar
             </Button>
           )}
        </div>
      </div>
    </div>
  );
};

export default CloudConfig;
