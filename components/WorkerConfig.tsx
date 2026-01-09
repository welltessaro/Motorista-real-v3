
import React, { useState } from 'react';
import { X, Server, Globe, Key, Save, CheckCircle, Unplug, Activity, Code, Copy, FileJson } from 'lucide-react';
import Button from './Button';
import { cloudflareService } from '../services/cloudflareService';
import { mockBackend } from '../services/mockBackend';

interface WorkerConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

const WorkerConfig: React.FC<WorkerConfigProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'CODE'>('CONFIG');
  const [url, setUrl] = useState(cloudflareService.getWorkerUrl());
  const [token, setToken] = useState(cloudflareService.getToken());
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (url && token) {
      cloudflareService.saveConfig(url, token);
      onClose();
      window.location.reload();
    }
  };

  const handleDisconnect = () => {
    cloudflareService.clearConfig();
    setUrl('');
    setToken('');
    setStatus('IDLE');
    onClose();
    window.location.reload();
  };

  const handleTestConnection = async () => {
    setIsTestLoading(true);
    cloudflareService.saveConfig(url, token); // Save temp to test
    try {
      // Try to download data (even if null) to test auth
      await cloudflareService.downloadData();
      setStatus('SUCCESS');
      // Sync immediately if success
      await mockBackend.triggerCloudSyncNow();
    } catch (e) {
      setStatus('ERROR');
    } finally {
      setIsTestLoading(false);
    }
  };

  const workerCode = `const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const key = request.headers.get("X-Auth-Token");
    if (!key) return new Response("Missing Token", { status: 401, headers: corsHeaders });

    try {
      if (request.method === "POST") {
        const data = await request.json();
        await env.DATA_STORE.put(key, JSON.stringify(data));
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      if (request.method === "GET") {
        const data = await env.DATA_STORE.get(key);
        return new Response(data || "null", { headers: corsHeaders });
      }

      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  },
};`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(workerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConfigured = cloudflareService.isConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
               <Server size={24} />
             </div>
             <div>
               <h3 className="font-bold text-slate-800">Cloudflare Worker</h3>
               <p className="text-xs text-slate-500">Backend Serverless</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
             <X size={20} />
           </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'CONFIG' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'}`}
          >
            <Activity size={14} /> Configuração
          </button>
          <button
            onClick={() => setActiveTab('CODE')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'CODE' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'}`}
          >
            <Code size={14} /> Código Fonte
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'CONFIG' ? (
            <div className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Worker URL</label>
                 <div className="relative">
                   <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                     value={url}
                     onChange={e => setUrl(e.target.value)}
                     className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-mono"
                     placeholder="https://meu-worker.usuario.workers.dev"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Secreto (Token)</label>
                 <div className="relative">
                   <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                     value={token}
                     onChange={e => setToken(e.target.value)}
                     type="password"
                     className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-mono"
                     placeholder="Qualquer-String-Unica-Para-Seu-Usuario"
                   />
                 </div>
                 <p className="text-[10px] text-slate-400 mt-1">
                   Use um ID único. O Worker usará isso para criar sua chave no KV.
                 </p>
               </div>

               {status === 'SUCCESS' && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-2 text-sm font-bold animate-fade-in">
                  <CheckCircle size={16} /> Conexão bem sucedida!
                </div>
              )}

              {status === 'ERROR' && (
                 <div className="p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 text-sm font-bold animate-fade-in">
                   <Unplug size={16} /> Falha ao conectar. Verifique URL/Token.
                 </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 h-full flex flex-col">
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-xs text-orange-800 leading-relaxed">
                <p><strong>Instruções:</strong></p>
                <ol className="list-decimal pl-4 space-y-1 mt-1">
                  <li>Crie um Worker na Cloudflare.</li>
                  <li>Crie um KV Namespace chamado <code>DATA_STORE</code>.</li>
                  <li>Vincule o KV ao Worker em Settings {'>'} Variables.</li>
                  <li>Cole o código abaixo no editor do Worker (worker.js).</li>
                </ol>
              </div>

              <div className="relative flex-1 min-h-[200px] group">
                <div className="absolute top-2 right-2 z-10">
                   <button 
                     onClick={handleCopyCode}
                     className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg backdrop-blur-md transition-colors border border-white/10"
                     title="Copiar Código"
                   >
                     {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} />}
                   </button>
                </div>
                <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl text-[10px] font-mono h-full overflow-auto border border-slate-800 shadow-inner custom-scrollbar">
                  {workerCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'CONFIG' && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
             <Button 
               fullWidth 
               variant="secondary" 
               onClick={handleTestConnection} 
               isLoading={isTestLoading}
               disabled={!url || !token}
             >
               <Activity size={18} /> Testar Conexão
             </Button>

             {isConfigured ? (
               <div className="flex gap-3">
                  <Button fullWidth variant="danger" onClick={handleDisconnect}>
                     Desconectar
                  </Button>
                  <Button fullWidth onClick={handleSave}>
                     Salvar
                  </Button>
               </div>
             ) : (
               <Button fullWidth onClick={handleSave} disabled={!url || !token}>
                  <Save size={18} /> Salvar Configuração
               </Button>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerConfig;
