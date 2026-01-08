import { Vehicle, Transaction, User, Category, CategoryItem, DEFAULT_CATEGORIES } from '../types';

const KEYS = {
  VEHICLES: 'motoristareal_vehicles',
  TRANSACTIONS: 'motoristareal_transactions',
  USER: 'motoristareal_user',
  CATEGORIES: 'motoristareal_categories',
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
    
    // NOTE: Removed auto-generation of initial rent transaction.
    // Logic: Rent is due in the future (next cycle), not immediately upon registration.
    // The Dashboard component handles the projection of upcoming bills based on the due day.
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
  }

  deleteTransaction(id: string): void {
    const transactions = this.getTransactions().filter(t => t.id !== id);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  // --- UTILS ---
  clearData(): void {
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.VEHICLES);
    localStorage.removeItem(KEYS.TRANSACTIONS);
    localStorage.removeItem(KEYS.CATEGORIES);
  }
}

export const mockBackend = new MockBackendService();