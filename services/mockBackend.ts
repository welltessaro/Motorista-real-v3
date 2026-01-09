
import { Vehicle, Transaction, User, CategoryItem, DEFAULT_CATEGORIES, Account } from '../types';
import { googleDriveService } from './googleDriveService';
import { cloudflareService } from './cloudflareService';

const KEYS = {
  VEHICLES: 'motoristareal_vehicles',
  TRANSACTIONS: 'motoristareal_transactions',
  USER: 'motoristareal_user',
  CATEGORIES: 'motoristareal_categories',
  ACCOUNTS: 'motoristareal_accounts',
};

class BackendService {
  private memoryCache: Record<string, any> = {};
  private isInitialized = false;
  private syncDebounceTimer: any = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    // 1. Initialize Google Service (Async)
    try {
      if (typeof window !== 'undefined') {
         setTimeout(() => googleDriveService.init(), 1000);
      }
    } catch (e) {
      console.error("Google Init Error", e);
    }

    // 2. Load from LocalStorage (Instant)
    this.memoryCache[KEYS.USER] = JSON.parse(localStorage.getItem(KEYS.USER) || 'null');
    this.memoryCache[KEYS.VEHICLES] = JSON.parse(localStorage.getItem(KEYS.VEHICLES) || '[]');
    this.memoryCache[KEYS.TRANSACTIONS] = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
    this.memoryCache[KEYS.CATEGORIES] = JSON.parse(localStorage.getItem(KEYS.CATEGORIES) || JSON.stringify(DEFAULT_CATEGORIES));
    this.memoryCache[KEYS.ACCOUNTS] = this.loadAccountsFromStorage();

    // 3. Try Auto-Restore from Cloudflare if configured
    if (cloudflareService.isConfigured()) {
       this.restoreFromCloud();
    }

    this.isInitialized = true;
  }

  // Generic Restore (Tries Cloudflare first, then Google if triggered manually)
  async restoreFromCloud(provider: 'CLOUDFLARE' | 'GOOGLE' = 'CLOUDFLARE'): Promise<boolean> {
    try {
      let data = null;
      
      if (provider === 'CLOUDFLARE') {
         data = await cloudflareService.downloadData();
      } else {
         data = await googleDriveService.downloadData();
      }

      if (data) {
        // Update Local Storage
        if (data.user) localStorage.setItem(KEYS.USER, JSON.stringify(data.user));
        if (data.vehicles) localStorage.setItem(KEYS.VEHICLES, JSON.stringify(data.vehicles));
        if (data.transactions) localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
        if (data.categories) localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data.categories));
        if (data.accounts) localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(data.accounts));

        // Update Memory
        this.memoryCache[KEYS.USER] = data.user;
        this.memoryCache[KEYS.VEHICLES] = data.vehicles;
        this.memoryCache[KEYS.TRANSACTIONS] = data.transactions;
        this.memoryCache[KEYS.CATEGORIES] = data.categories;
        this.memoryCache[KEYS.ACCOUNTS] = data.accounts;
        
        return true;
      }
    } catch (e) {
      console.error(`Restore failed from ${provider}`, e);
    }
    return false;
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
  private async persist(key: string, data: any) {
    // 1. Update Memory
    this.memoryCache[key] = data;
    
    // 2. Update LocalStorage
    localStorage.setItem(key, JSON.stringify(data));

    // 3. Trigger Cloud Sync (Debounced)
    this.triggerCloudSync();
  }

  public async triggerCloudSyncNow() {
    // Public method to force sync immediately
    if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);
    await this.performSync();
  }

  private triggerCloudSync() {
    if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);
    
    this.syncDebounceTimer = setTimeout(async () => {
       await this.performSync();
    }, 5000); // Sync after 5 seconds of inactivity
  }

  private async performSync() {
      const fullBackup = {
        user: this.memoryCache[KEYS.USER],
        vehicles: this.memoryCache[KEYS.VEHICLES],
        transactions: this.memoryCache[KEYS.TRANSACTIONS],
        categories: this.memoryCache[KEYS.CATEGORIES],
        accounts: this.memoryCache[KEYS.ACCOUNTS],
        last_updated: new Date().toISOString()
      };
      
      // Dual Sync Strategy
      if (googleDriveService.isConfigured()) {
        await googleDriveService.uploadData(fullBackup);
      }
      if (cloudflareService.isConfigured()) {
        await cloudflareService.uploadData(fullBackup);
      }
  }

  // --- USER ---
  getUser(): User | null {
    return this.memoryCache[KEYS.USER];
  }

  async saveUser(user: User): Promise<void> {
    await this.persist(KEYS.USER, user);
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
    await this.persist(KEYS.ACCOUNTS, accounts);
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
    await this.persist(KEYS.CATEGORIES, categories);
  }

  async deleteCategory(id: string): Promise<void> {
    const categories = this.getCategories().filter(c => c.id !== id);
    await this.persist(KEYS.CATEGORIES, categories);
  }

  // --- VEHICLES ---
  getVehicles(): Vehicle[] {
    return this.memoryCache[KEYS.VEHICLES] || [];
  }

  async addVehicle(vehicle: Vehicle): Promise<void> {
    const vehicles = this.getVehicles();
    vehicles.push(vehicle);
    await this.persist(KEYS.VEHICLES, vehicles);
  }

  async updateVehicle(updatedVehicle: Vehicle): Promise<void> {
    const vehicles = this.getVehicles().map(v => v.id === updatedVehicle.id ? updatedVehicle : v);
    await this.persist(KEYS.VEHICLES, vehicles);
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
    await this.persist(KEYS.TRANSACTIONS, transactions);

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
    await this.persist(KEYS.TRANSACTIONS, newTransactions);
  }

  // --- UTILS ---
  async clearData(): Promise<void> {
    localStorage.clear();
    this.memoryCache = {};
    if (googleDriveService.isConfigured()) googleDriveService.signOut();
    if (cloudflareService.isConfigured()) cloudflareService.clearConfig();
  }
}

export const mockBackend = new BackendService();
