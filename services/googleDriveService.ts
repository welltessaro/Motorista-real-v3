
// Google API Types (simplified)
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const CLIENT_ID_KEY = 'motoristareal_google_client_id';

// --- ÁREA DE CONFIGURAÇÃO DO DESENVOLVEDOR ---
// Deixe vazio para forçar o usuário a configurar na interface
const HARDCODED_CLIENT_ID = ''; 
// ---------------------------------------------

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const BACKUP_FILE_NAME = 'motoristareal_backup.json';

class GoogleDriveService {
  private tokenClient: any;
  private gapiInited = false;
  private gisInited = false;
  private accessToken: string | null = null;
  private currentUser: any = null;

  public isConfigured(): boolean {
    const id = this.getClientId();
    return !!id && id.length > 0;
  }

  public saveClientId(clientId: string) {
    localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
    window.location.reload();
  }

  public getClientId(): string {
    return localStorage.getItem(CLIENT_ID_KEY) || HARDCODED_CLIENT_ID;
  }

  public async init() {
    if (!this.isConfigured()) return;

    try {
      await Promise.all([this.loadGapi(), this.loadGis()]);
    } catch (e) {
      console.error("Failed to initialize Google Services", e);
    }
  }

  private loadGapi() {
    return new Promise<void>((resolve) => {
      if (typeof window.gapi === 'undefined') {
         setTimeout(() => this.loadGapi().then(resolve), 500);
         return;
      }
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
          });
          this.gapiInited = true;
          resolve();
        } catch (error) {
          console.error("GAPI Init Error", error);
          resolve(); // Resolve anyway to not block app
        }
      });
    });
  }

  private loadGis() {
    return new Promise<void>((resolve) => {
      if (typeof window.google === 'undefined') {
         setTimeout(() => this.loadGis().then(resolve), 500);
         return;
      }
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.getClientId(),
          scope: SCOPES,
          callback: (resp: any) => {
            if (resp.error !== undefined) {
              throw (resp);
            }
            this.accessToken = resp.access_token;
            this.fetchUserInfo();
          },
        });
        this.gisInited = true;
      } catch (error) {
        console.error("GIS Init Error", error);
      }
      resolve();
    });
  }

  public signIn(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConfigured()) {
        reject({ message: "Client ID não configurado." });
        return;
      }

      const proceed = () => {
         if (!this.tokenClient) {
           reject({ message: "Google Identity Services falhou ao iniciar. Verifique se o Client ID é válido." });
           return;
         }
         this.tokenClient.callback = async (resp: any) => {
          if (resp.error) {
            reject(resp);
          } else {
            this.accessToken = resp.access_token;
            await this.fetchUserInfo();
            resolve();
          }
        };
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      };

      if (!this.gisInited) {
        this.init().then(proceed).catch(reject);
      } else {
        proceed();
      }
    });
  }

  public signOut() {
    const token = window.gapi?.client?.getToken();
    if (token !== null) {
      try {
        window.google.accounts.oauth2.revoke(token.access_token);
        window.gapi.client.setToken('');
      } catch (e) {
        console.warn("Error revoking token", e);
      }
      this.accessToken = null;
      this.currentUser = null;
      localStorage.removeItem('google_user_cache');
    }
  }

  public getUser() {
    // Return cached user if available to prevent UI flicker
    if (!this.currentUser) {
       const cached = localStorage.getItem('google_user_cache');
       if (cached) return JSON.parse(cached);
    }
    return this.currentUser;
  }

  private async fetchUserInfo() {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch user info');
      const data = await response.json();
      this.currentUser = data;
      localStorage.setItem('google_user_cache', JSON.stringify(data));
      window.dispatchEvent(new Event('google-auth-change'));
    } catch (e) {
      console.error(e);
    }
  }

  // --- DRIVE OPERATIONS ---

  private async findBackupFile(): Promise<string | null> {
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name = '${BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed = false`,
        spaces: 'appDataFolder',
        fields: 'files(id, name)',
      });
      const files = response.result.files;
      if (files && files.length > 0) {
        return files[0].id;
      }
      return null;
    } catch (err) {
      console.error('Error finding file', err);
      return null;
    }
  }

  public async downloadData(): Promise<any | null> {
    if (!this.accessToken) return null;

    try {
      const fileId = await this.findBackupFile();
      if (!fileId) return null;

      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });
      return response.result;
    } catch (err) {
      console.error('Error downloading file', err);
      return null;
    }
  }

  public async uploadData(data: any): Promise<void> {
    if (!this.accessToken) return;

    try {
      const fileContent = JSON.stringify(data);
      const fileId = await this.findBackupFile();

      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
        parents: !fileId ? ['appDataFolder'] : undefined,
      };

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";
      const contentType = 'application/json';

      const multipartRequestBody =
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: ' + contentType + '\r\n\r\n' +
          fileContent +
          close_delim;

      await window.gapi.client.request({
        'path': fileId ? `/upload/drive/v3/files/${fileId}` : '/upload/drive/v3/files',
        'method': fileId ? 'PATCH' : 'POST',
        'params': {'uploadType': 'multipart'},
        'headers': {
          'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
      });

      console.log('Sync successful');
    } catch (err) {
      console.error('Sync failed', err);
    }
  }
}

export const googleDriveService = new GoogleDriveService();
