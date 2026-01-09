
import React, { useState, useEffect } from 'react';
import { X, Cloud, Lock, CheckCircle, Save, Info, LogOut } from 'lucide-react';
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
    } catch (error) {
      console.error(error);
      alert('Erro ao conectar com Google. Verifique o Client ID.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    googleDriveService.signOut();
    setGoogleUser(null);
  };

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

          {!googleDriveService.isConfigured() ? (
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
                 <p className="text-[10px] text-slate-400 mt-2">
                   Para funcionar, você precisa criar um projeto no Google Cloud Console, habilitar a <strong>Google Drive API</strong> e criar uma credencial do tipo <strong>OAuth Client ID</strong> para Aplicação Web.
                 </p>
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
                  <p className="text-xs text-slate-400 text-center">
                    ID: {googleDriveService.getClientId().substring(0, 15)}... 
                    <button onClick={() => googleDriveService.saveClientId('')} className="text-red-400 underline ml-1">Alterar</button>
                  </p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleConfig;
