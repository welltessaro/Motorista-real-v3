import { Vehicle, Transaction, User, Category, CategoryItem, DEFAULT_CATEGORIES, Account } from '../types';

const KEYS = {
  VEHICLES: 'motoristareal_vehicles',
  TRANSACTIONS: 'motoristareal_transactions',
  USER: 'motoristareal_user',
  CATEGORIES: 'motoristareal_categories',
  ACCOUNTS: 'motoristareal_accounts',
};

// Simulation of delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockBackendService {
  
  // --- USER ---
  getUser(): User | null {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  }

  saveUser(user: User): void {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  }

  // --- ACCOUNTS (NEW) ---
  getAccounts(): Account[] {
    const data = localStorage.getItem(KEYS.ACCOUNTS);
    if (!data) {
      // Initialize default accounts
      const defaultAccounts: Account[] = [
        { id: 'acc_prof', name: 'Conta Profissional', type: 'CHECKING', balance: 0, isDefault: true, color: 'blue' },
        { id: 'acc_pers', name: 'Conta Pessoal', type: 'CHECKING', balance: 0, isDefault: false, color: 'purple' },
      ];
      localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(defaultAccounts));
      return defaultAccounts;
    }
    return JSON.parse(data);
  }

  saveAccount(account: Account): void {
    const accounts = this.getAccounts();
    const index = accounts.findIndex(a => a.id === account.id);
    if (index >= 0) {
      accounts[index] = account;
    } else {
      accounts.push(account);
    }
    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
  }
  
  updateAccountBalance(accountId: string, amount: number, type: 'INCOME' | 'EXPENSE'): void {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      if (type === 'INCOME') {
        account.balance += amount;
      } else {
        account.balance -= amount;
      }
      this.saveAccount(account);
    }
  }

  // --- CATEGORIES ---
  getCategories(): CategoryItem[] {
    const data = localStorage.getItem(KEYS.CATEGORIES);
    if (!data) {
      // Initialize default categories
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(data);
  }

  saveCategory(category: CategoryItem): void {
    const categories = this.getCategories();
    // Check if update or new
    const index = categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  }

  deleteCategory(id: string): void {
    const categories = this.getCategories().filter(c => c.id !== id);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  }

  // --- VEHICLES ---
  getVehicles(): Vehicle[] {
    const data = localStorage.getItem(KEYS.VEHICLES);
    return data ? JSON.parse(data) : [];
  }

  addVehicle(vehicle: Vehicle): void {
    const vehicles = this.getVehicles();
    vehicles.push(vehicle);
    localStorage.setItem(KEYS.VEHICLES, JSON.stringify(vehicles));
  }

  updateVehicle(updatedVehicle: Vehicle): void {
    const vehicles = this.getVehicles().map(v => v.id === updatedVehicle.id ? updatedVehicle : v);
    localStorage.setItem(KEYS.VEHICLES, JSON.stringify(vehicles));
  }

  // --- TRANSACTIONS ---
  getTransactions(vehicleId?: string): Transaction[] {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    const transactions: Transaction[] = data ? JSON.parse(data) : [];
    if (vehicleId) {
      return transactions.filter(t => t.vehicleId === vehicleId);
    }
    return transactions;
  }

  addTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));

    // Update Account Balance logic
    if (transaction.accountId) {
      this.updateAccountBalance(transaction.accountId, transaction.amount, transaction.type);
    } else {
      // If no account specified (legacy), try to update default account
      const defaultAcc = this.getAccounts().find(a => a.isDefault);
      if (defaultAcc) {
        transaction.accountId = defaultAcc.id; // Retroactively fix logic for consistency
        this.updateAccountBalance(defaultAcc.id, transaction.amount, transaction.type);
        // Resave transaction with account ID
        this.updateTransaction(transaction);
      }
    }
  }
  
  updateTransaction(transaction: Transaction): void {
     const transactions = this.getTransactions();
     const index = transactions.findIndex(t => t.id === transaction.id);
     if (index >= 0) {
       transactions[index] = transaction;
       localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
     }
  }

  deleteTransaction(id: string): void {
    const transactions = this.getTransactions();
    const tx = transactions.find(t => t.id === id);
    
    if (tx && tx.accountId) {
      // Reverse balance operation
      const reverseType = tx.type === 'INCOME' ? 'EXPENSE' : 'INCOME';
      this.updateAccountBalance(tx.accountId, tx.amount, reverseType);
    }
    
    const newTransactions = transactions.filter(t => t.id !== id);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(newTransactions));
  }

  // --- UTILS ---
  clearData(): void {
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.VEHICLES);
    localStorage.removeItem(KEYS.TRANSACTIONS);
    localStorage.removeItem(KEYS.CATEGORIES);
    localStorage.removeItem(KEYS.ACCOUNTS);
  }
}

export const mockBackend = new MockBackendService();