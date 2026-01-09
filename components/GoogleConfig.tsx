
import React, { useState, useEffect } from 'react';
import { X, Cloud, Lock, CheckCircle, Save, Info, LogOut, Terminal, Copy } from 'lucide-react';
import Button from './Button';
import { googleDriveService } from '../services/googleDriveService';
import { mockBackend } from '../services/mockBackend';

interface GoogleConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore?: () => void;
}

const GoogleConfig: React.FC<GoogleConfigProps> = ({ isOpen, onClose, onRestore }) => {
  const [clientId, setClientId] = useState(googleDriveService.getClientId());
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // Get the current origin (protocol + domain + port)
    setCurrentUrl(window.location.origin);

    const checkUser = () => {
       const user = googleDriveService.getUser();
       setGoogleUser(user);
       setClientId(googleDriveService.getClientId());
    };
    
    checkUser();
    window.addEventListener('google-auth-change', checkUser);
    return () => window.removeEventListener('google-auth-change', checkUser);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveId = () => {
    if (clientId) {
      googleDriveService.saveClientId(clientId);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await googleDriveService.signIn();
      // After login, try to restore immediately if requested
      if (onRestore) {
         const success = await mockBackend.restoreFromCloud();
         if (success) {
            alert('Dados restaurados com sucesso!');
            window.location.reload();
         }
      }
    } catch (error: any) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || JSON.stringify(error);
      
      if (msg.includes("origin_mismatch")) {
         alert(`ERRO DE PERMISSÃO (origin_mismatch):\n\nO Google bloqueou este site: ${currentUrl}\n\nVocê precisa adicionar esta URL exata na lista "Origens JavaScript autorizadas" no Google Cloud Console.`);
      } else if (msg.includes("Client ID não configurado")) {
         alert('Por favor, configure o Client ID primeiro.');
      } else {
         alert('Erro ao conectar com Google. Verifique o console para mais detalhes.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    googleDriveService.signOut();
    setGoogleUser(null);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    alert('URL copiada! Cole no Google Cloud Console.');
  };

  const isConfigured = googleDriveService.isConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
               <Cloud size={24} />
             </div>
             <div>
               <h3 className="font-bold text-slate-800">Google Drive Sync</h3>
               <p className="text-xs text-slate-500">Configuração de Backup</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
             <X size={20} />
           </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 flex items-start gap-3">
             <Info size={20} className="shrink-0 mt-0.5" />
             <p>Seus dados são salvos em uma pasta oculta (App Data) no seu Google Drive pessoal.</p>
          </div>

          {!isConfigured ? (
            <div className="space-y-4">
               
               {/* URL Info Box */}
               <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">URL deste site (Adicione no Google Cloud)</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-2 py-1 rounded border border-slate-300 text-xs font-mono text-slate-700 flex-1 truncate">
                      {currentUrl}
                    </code>
                    <button onClick={copyUrl} className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600">
                      <Copy size={14} />
                    </button>
                  </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Google OAuth Client ID</label>
                 <div className="relative">
                   <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                     value={clientId}
                     onChange={e => setClientId(e.target.value)}
                     className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                     placeholder="Cole seu Client ID aqui"
                   />
                 </div>
                 
                 <div className="mt-3 text-[10px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <p className="font-bold mb-1">Como criar um Client ID:</p>
                   <ol className="list-decimal pl-4 space-y-1.5">
                     <li>Acesse <a href="https://console.cloud.google.com/" target="_blank" className="text-blue-600 underline">Google Cloud Console</a> e crie um projeto.</li>
                     <li>No menu, vá em <strong>APIs e Serviços &gt; Biblioteca</strong> e ative a <strong>Google Drive API</strong>.</li>
                     <li>Vá em <strong>Tela de permissão OAuth</strong>, selecione "Externo" e preencha o nome do app.</li>
                     <li>Vá em <strong>Credenciais &gt; Criar Credenciais &gt; ID do cliente OAuth</strong>.</li>
                     <li>Tipo de aplicativo: <strong>Aplicativo da Web</strong>.</li>
                     <li>Em <strong>Origens JavaScript autorizadas</strong>, cole a URL acima ({currentUrl}).</li>
                     <li>Copie o Client ID gerado e cole no campo acima.</li>
                   </ol>
                 </div>
               </div>
               <Button fullWidth onClick={handleSaveId} disabled={!clientId}>
                  <Save size={18} /> Salvar Configuração
               </Button>
            </div>
          ) : (
            <div className="space-y-6">
               <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  {googleUser ? (
                    <>
                      <img src={googleUser.picture} alt="User" className="w-16 h-16 rounded-full mb-3 shadow-md" />
                      <h4 className="font-bold text-slate-800">{googleUser.name}</h4>
                      <p className="text-sm text-slate-500 mb-4">{googleUser.email}</p>
                      
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full mb-6">
                        <CheckCircle size={16} /> Sincronização Ativa
                      </div>

                      <Button variant="danger" onClick={handleLogout} fullWidth>
                        <LogOut size={18} /> Desconectar Conta
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                         <Cloud size={32} className="text-slate-400" />
                      </div>
                      <h4 className="font-bold text-slate-800 mb-4">Nenhuma conta conectada</h4>
                      <Button fullWidth onClick={handleLogin} isLoading={isLoading}>
                         <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 mr-2" alt="G" />
                         Entrar com Google
                      </Button>
                    </>
                  )}
               </div>

               <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                     <span className="flex items-center gap-1 font-mono">
                        <Terminal size={12} />
                        ID: {clientId.substring(0, 8)}...
                     </span>
                     <button onClick={() => googleDriveService.saveClientId('')} className="text-red-400 hover:text-red-600 underline">
                       Redefinir / Trocar
                     </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleConfig;
