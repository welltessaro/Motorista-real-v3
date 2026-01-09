
import { Vehicle, Transaction, User, Category, CategoryItem, DEFAULT_CATEGORIES, Account } from '../types';
import { supabaseService } from './supabaseClient';

const KEYS = {
  VEHICLES: 'motoristareal_vehicles',
  TRANSACTIONS: 'motoristareal_transactions',
  USER: 'motoristareal_user',
  CATEGORIES: 'motoristareal_categories',
  ACCOUNTS: 'motoristareal_accounts',
};

// Types for the generic "documents" table in Supabase
interface RemoteDocument {
  id: string; // The primary key (UUID)
  collection: string; // 'vehicles', 'transactions', etc.
  data: any; // JSONB
  updated_at?: string;
}

class BackendService {
  private memoryCache: Record<string, any> = {};
  private isInitialized = false;

  // Initialize: Load from LS first, then try to sync from Cloud if available
  async init(): Promise<void> {
    if (this.isInitialized) return;

    // 1. Load from LocalStorage (Instant)
    this.memoryCache[KEYS.USER] = JSON.parse(localStorage.getItem(KEYS.USER) || 'null');
    this.memoryCache[KEYS.VEHICLES] = JSON.parse(localStorage.getItem(KEYS.VEHICLES) || '[]');
    this.memoryCache[KEYS.TRANSACTIONS] = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
    this.memoryCache[KEYS.CATEGORIES] = JSON.parse(localStorage.getItem(KEYS.CATEGORIES) || JSON.stringify(DEFAULT_CATEGORIES));
    this.memoryCache[KEYS.ACCOUNTS] = this.loadAccountsFromStorage();

    // 2. Background Sync (If Supabase is ready)
    if (supabaseService.isReady()) {
      this.syncFromCloud(); // Don't await, let it happen in background
    }

    this.isInitialized = true;
  }

  private loadAccountsFromStorage(): Account[] {
    const data = localStorage.getItem(KEYS.ACCOUNTS);
    if (!data) {
      const defaultAccounts: Account[] = [
        { id: 'acc_prof', name: 'Conta Profissional', type: 'CHECKING', balance: 0, isDefault: true, color: 'blue' },
        { id: 'acc_pers', name: 'Conta Pessoal', type: 'CHECKING', balance: 0, isDefault: false, color: 'purple' },
      ];
      localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(defaultAccounts));
      return defaultAccounts;
    }
    return JSON.parse(data);
  }

  // --- PERSISTENCE HELPER ---
  private async persist(key: string, data: any, collectionName: string) {
    // 1. Update Memory
    this.memoryCache[key] = data;
    
    // 2. Update LocalStorage
    localStorage.setItem(key, JSON.stringify(data));

    // 3. Update Cloud (Fire & Forget)
    if (supabaseService.isReady()) {
      const client = supabaseService.getClient();
      if (client) {
        // We use an "Upsert" strategy on a generic 'documents' table to act like a NoSQL store
        // This avoids complex schema migration for the user.
        // Table Schema needed: id (text), collection (text), data (jsonb)
        
        // Note: For arrays (transactions/vehicles), we might ideally store rows, 
        // but for this "Free Tier Migration", storing the whole blob is safer to avoid conflict logic right now.
        // A better production approach would be row-level syncing.
        
        const { error } = await client
          .from('documents')
          .upsert({ 
            id: key, // Using the localStorage key as the ID for the document blob
            collection: collectionName,
            data: data,
            updated_at: new Date().toISOString()
          });
          
        if (error) console.error("Cloud Sync Error:", error);
      }
    }
  }

  private async syncFromCloud() {
    const client = supabaseService.getClient();
    if (!client) return;

    // Fetch all documents
    const { data, error } = await client.from('documents').select('*');
    
    if (!error && data) {
      data.forEach((doc: any) => {
        if (Object.values(KEYS).includes(doc.id)) {
           // Update Local Cache
           this.memoryCache[doc.id] = doc.data;
           localStorage.setItem(doc.id, JSON.stringify(doc.data));
        }
      });
      // Trigger a reload event or callback if needed, but React state usually drives UI
      // For this demo, we assume the next refresh or state update will catch it
      // Or we can force a reload if data changed significantly (not implemented to avoid UX jank)
    }
  }

  // --- USER ---
  getUser(): User | null {
    return this.memoryCache[KEYS.USER];
  }

  async saveUser(user: User): Promise<void> {
    await this.persist(KEYS.USER, user, 'user');
  }

  // --- ACCOUNTS ---
  getAccounts(): Account[] {
    return this.memoryCache[KEYS.ACCOUNTS] || [];
  }

  async saveAccount(account: Account): Promise<void> {
    const accounts = this.getAccounts();
    const index = accounts.findIndex(a => a.id === account.id);
    if (index >= 0) {
      accounts[index] = account;
    } else {
      accounts.push(account);
    }
    await this.persist(KEYS.ACCOUNTS, accounts, 'accounts');
  }

  async updateAccountBalance(accountId: string, amount: number, type: 'INCOME' | 'EXPENSE'): Promise<void> {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      if (type === 'INCOME') {
        account.balance += amount;
      } else {
        account.balance -= amount;
      }
      await this.saveAccount(account);
    }
  }

  // --- CATEGORIES ---
  getCategories(): CategoryItem[] {
    return this.memoryCache[KEYS.CATEGORIES] || DEFAULT_CATEGORIES;
  }

  async saveCategory(category: CategoryItem): Promise<void> {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    await this.persist(KEYS.CATEGORIES, categories, 'categories');
  }

  async deleteCategory(id: string): Promise<void> {
    const categories = this.getCategories().filter(c => c.id !== id);
    await this.persist(KEYS.CATEGORIES, categories, 'categories');
  }

  // --- VEHICLES ---
  getVehicles(): Vehicle[] {
    return this.memoryCache[KEYS.VEHICLES] || [];
  }

  async addVehicle(vehicle: Vehicle): Promise<void> {
    const vehicles = this.getVehicles();
    vehicles.push(vehicle);
    await this.persist(KEYS.VEHICLES, vehicles, 'vehicles');
  }

  async updateVehicle(updatedVehicle: Vehicle): Promise<void> {
    const vehicles = this.getVehicles().map(v => v.id === updatedVehicle.id ? updatedVehicle : v);
    await this.persist(KEYS.VEHICLES, vehicles, 'vehicles');
  }

  // --- TRANSACTIONS ---
  getTransactions(vehicleId?: string): Transaction[] {
    const transactions: Transaction[] = this.memoryCache[KEYS.TRANSACTIONS] || [];
    if (vehicleId) {
      return transactions.filter(t => t.vehicleId === vehicleId);
    }
    return transactions;
  }

  async addTransaction(transaction: Transaction): Promise<void> {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    await this.persist(KEYS.TRANSACTIONS, transactions, 'transactions');

    if (transaction.accountId) {
      await this.updateAccountBalance(transaction.accountId, transaction.amount, transaction.type);
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    const transactions = this.getTransactions();
    const tx = transactions.find(t => t.id === id);
    
    if (tx && tx.accountId) {
      const reverseType = tx.type === 'INCOME' ? 'EXPENSE' : 'INCOME';
      await this.updateAccountBalance(tx.accountId, tx.amount, reverseType);
    }
    
    const newTransactions = transactions.filter(t => t.id !== id);
    await this.persist(KEYS.TRANSACTIONS, newTransactions, 'transactions');
  }

  // --- UTILS ---
  async clearData(): Promise<void> {
    localStorage.clear();
    this.memoryCache = {};
    // Optional: Clear cloud data too? For safety, maybe just local.
  }
}

export const mockBackend = new BackendService();
