
const WORKER_URL_KEY = 'motoristareal_cf_worker_url';
const WORKER_TOKEN_KEY = 'motoristareal_cf_token';

class CloudflareService {
  public isConfigured(): boolean {
    return !!this.getWorkerUrl() && !!this.getToken();
  }

  public getWorkerUrl(): string {
    return localStorage.getItem(WORKER_URL_KEY) || '';
  }

  public getToken(): string {
    return localStorage.getItem(WORKER_TOKEN_KEY) || '';
  }

  public saveConfig(url: string, token: string) {
    // Remove trailing slash if present
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    localStorage.setItem(WORKER_URL_KEY, cleanUrl);
    localStorage.setItem(WORKER_TOKEN_KEY, token);
  }

  public clearConfig() {
    localStorage.removeItem(WORKER_URL_KEY);
    localStorage.removeItem(WORKER_TOKEN_KEY);
  }

  public async uploadData(data: any): Promise<void> {
    if (!this.isConfigured()) return;

    try {
      const response = await fetch(this.getWorkerUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': this.getToken()
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Falha no upload Cloudflare');
      console.log('Cloudflare Sync: Success');
    } catch (error) {
      console.error('Cloudflare Sync Error:', error);
    }
  }

  public async downloadData(): Promise<any | null> {
    if (!this.isConfigured()) return null;

    try {
      const response = await fetch(this.getWorkerUrl(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': this.getToken()
        }
      });

      if (!response.ok) throw new Error('Falha no download Cloudflare');
      
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error('Cloudflare Download Error:', error);
      return null;
    }
  }
}

export const cloudflareService = new CloudflareService();
