
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Keys for LocalStorage
const SUPABASE_URL_KEY = 'motoristareal_supabase_url';
const SUPABASE_KEY_KEY = 'motoristareal_supabase_key';

class SupabaseService {
  private client: SupabaseClient | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const url = localStorage.getItem(SUPABASE_URL_KEY);
    const key = localStorage.getItem(SUPABASE_KEY_KEY);

    if (url && key) {
      try {
        this.client = createClient(url, key);
        this.isConfigured = true;
      } catch (error) {
        console.error("Failed to initialize Supabase:", error);
        this.isConfigured = false;
      }
    }
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public isReady(): boolean {
    return this.isConfigured && !!this.client;
  }

  public saveCredentials(url: string, key: string) {
    localStorage.setItem(SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(SUPABASE_KEY_KEY, key.trim());
    this.initialize();
    window.location.reload(); // Reload to force re-sync
  }

  public clearCredentials() {
    localStorage.removeItem(SUPABASE_URL_KEY);
    localStorage.removeItem(SUPABASE_KEY_KEY);
    this.client = null;
    this.isConfigured = false;
    window.location.reload();
  }

  public getCredentials() {
    return {
      url: localStorage.getItem(SUPABASE_URL_KEY) || '',
      key: localStorage.getItem(SUPABASE_KEY_KEY) || ''
    };
  }
}

export const supabaseService = new SupabaseService();
