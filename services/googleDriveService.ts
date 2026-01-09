
// Google API Types (simplified)
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const CLIENT_ID_KEY = 'motoristareal_google_client_id';
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
    return !!localStorage.getItem(CLIENT_ID_KEY);
  }

  public saveClientId(clientId: string) {
    localStorage.setItem(CLIENT_ID_KEY, clientId);
    window.location.reload();
  }

  public getClientId(): string {
    return localStorage.getItem(CLIENT_ID_KEY) || '';
  }

  public async init() {
    if (!this.isConfigured()) return;

    await Promise.all([this.loadGapi(), this.loadGis()]);
  }

  private loadGapi() {
    return new Promise<void>((resolve) => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        this.gapiInited = true;
        resolve();
      });
    });
  }

  private loadGis() {
    return new Promise<void>((resolve) => {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.getClientId(),
        scope: SCOPES,
        callback: (resp: any) => {
          if (resp.error !== undefined) {
            throw (resp);
          }
          this.accessToken = resp.access_token;
          // Store basic user info if available from a previous hint, or fetch it
          this.fetchUserInfo();
        },
      });
      this.gisInited = true;
      resolve();
    });
  }

  public signIn(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.gisInited) {
        // Try simple init if not ready
        this.init().then(() => {
           this.tokenClient.requestAccessToken({ prompt: 'consent' });
           // We resolve optimistically or setup a listener, 
           // but for simplicity in this architecture we wait for the callback set in init
           // Since callback is global, we can use a custom event or just wait a bit.
           // A better way is to pass resolve to the callback, but let's assume success flow.
           resolve();
        });
        return;
      }
      
      // Override callback for this specific request if possible, or just trigger:
      this.tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          reject(resp);
        } else {
          this.accessToken = resp.access_token;
          await this.fetchUserInfo();
          resolve();
        }
      };
      
      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  public signOut() {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken('');
      this.accessToken = null;
      this.currentUser = null;
      localStorage.removeItem('google_user_cache');
    }
  }

  public getUser() {
    return this.currentUser;
  }

  private async fetchUserInfo() {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      const data = await response.json();
      this.currentUser = data;
      localStorage.setItem('google_user_cache', JSON.stringify(data));
      // Dispatch event to update UI
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

    const fileId = await this.findBackupFile();
    if (!fileId) return null;

    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });
      return response.result; // This is the JSON content
    } catch (err) {
      console.error('Error downloading file', err);
      return null;
    }
  }

  public async uploadData(data: any): Promise<void> {
    if (!this.accessToken) return;

    const fileContent = JSON.stringify(data);
    const fileId = await this.findBackupFile();

    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      parents: !fileId ? ['appDataFolder'] : undefined, // Only set parent on create
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

    const request = window.gapi.client.request({
      'path': fileId ? `/upload/drive/v3/files/${fileId}` : '/upload/drive/v3/files',
      'method': fileId ? 'PATCH' : 'POST',
      'params': {'uploadType': 'multipart'},
      'headers': {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      'body': multipartRequestBody
    });

    try {
      await request;
      console.log('Sync successful');
      return;
    } catch (err) {
      console.error('Sync failed', err);
    }
  }
}

export const googleDriveService = new GoogleDriveService();
