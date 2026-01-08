import { Vehicle, Transaction, User, Category } from '../types';

const KEYS = {
  VEHICLES: 'motoristareal_vehicles',
  TRANSACTIONS: 'motoristareal_transactions',
  USER: 'motoristareal_user',
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

  // --- VEHICLES ---
  getVehicles(): Vehicle[] {
    const data = localStorage.getItem(KEYS.VEHICLES);
    return data ? JSON.parse(data) : [];
  }

  addVehicle(vehicle: Vehicle): void {
    const vehicles = this.getVehicles();
    vehicles.push(vehicle);
    localStorage.setItem(KEYS.VEHICLES, JSON.stringify(vehicles));
    
    // Auto-generate initial expense transaction if applicable (simplified simulation)
    // In a real backend, cron jobs would handle recurring expenses.
    // Here we just add one transaction for the current month if it has fixed costs.
    const today = new Date().toISOString();
    if (vehicle.rentAmount && vehicle.rentAmount > 0) {
       this.addTransaction({
           id: crypto.randomUUID(),
           vehicleId: vehicle.id,
           type: 'EXPENSE',
           category: Category.RENT,
           amount: vehicle.rentAmount,
           date: today,
           description: 'Aluguel Mensal (Gerado Automaticamente)'
       });
    }
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
  }
}

export const mockBackend = new MockBackendService();