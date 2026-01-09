
import React, { useState, useEffect } from 'react';
import { X, Cloud, Lock, CheckCircle, Save, Info, LogOut, Terminal } from 'lucide-react';
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

  useEffect(() => {
    const checkUser = () => {
       const user = googleDriveService.getUser();
       setGoogleUser(user);
       // Refresh ID in case it was updated in service
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
      const msg = error?.message || JSON.stringify(error);
      if (msg.includes("origin_mismatch")) {
         alert('Erro: A URL deste site não está autorizada no Google Cloud Console (Authorized JavaScript origins).');
      } else {
         alert('Erro ao conectar. Verifique o Client ID e as origens autorizadas.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    googleDriveService.signOut();
    setGoogleUser(null);
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
               <p className="text-xs text-slate-500">Backup automático na sua nuvem pessoal</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
             <X size={20} />
           </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 flex items-start gap-3">
             <Info size={20} className="shrink-0 mt-0.5" />
             <p>Seus dados são salvos em uma pasta oculta (App Data) no seu Google Drive. Ninguém, além de você, tem acesso.</p>
          </div>

          {!isConfigured ? (
            <div className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Google OAuth Client ID</label>
                 <div className="relative">
                   <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                     value={clientId}
                     onChange={e => setClientId(e.target.value)}
                     className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                     placeholder="xxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                   />
                 </div>
                 <div className="mt-3 text-[10px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <p className="font-bold mb-1">Passo a Passo:</p>
                   <ol className="list-decimal pl-4 space-y-1">
                     <li>Crie um projeto no <strong>Google Cloud Console</strong>.</li>
                     <li>Habilite a API <strong>Google Drive API</strong>.</li>
                     <li>Crie Credenciais > <strong>OAuth Client ID</strong>.</li>
                     <li>Adicione a URL do app em <strong>Authorized JavaScript origins</strong>.</li>
                     <li>Copie o Client ID e cole acima (ou no arquivo de serviço).</li>
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
                        ID: {clientId.substring(0, 8)}...{clientId.substring(clientId.length - 6)}
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
