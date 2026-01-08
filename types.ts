
export type OwnershipType = 'OWNED' | 'FINANCED' | 'RENTED';

export type TransactionType = 'INCOME' | 'EXPENSE';

export enum Category {
  UBER = 'UBER',
  NINE_NINE = '99',
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  INSURANCE = 'INSURANCE',
  RENT = 'RENT',
  FINANCING = 'FINANCING',
  OTHER = 'OTHER'
}

export type FuelType = 'GASOLINE' | 'ETHANOL' | 'GNV' | 'ELECTRIC';

export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  ownershipType: OwnershipType;
  
  // Rent
  rentAmount?: number; // Weekly or Monthly
  rentDueDay?: number; // 1-31

  // Financing
  financingInstallment?: number;
  financingDueDay?: number; // 1-31
  financingTotalMonths?: number;
  financingPaidMonths?: number;
  vehicleValue?: number; // Market value for depreciation calculation (OWNED)
  
  // New Insurance Fields
  insuranceRenewalDate?: string; // Data de vencimento da apólice (anual)
  insuranceInstallmentValue?: number; // Valor da parcela mensal
  insuranceDueDay?: number; // 1-31 (Dia do vencimento da parcela)
  insuranceTotalInstallments?: number; // Quantidade de parcelas

  isArchived: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  vehicleId: string;
  type: TransactionType;
  category: Category;
  amount: number;
  date: string; // ISO String
  description?: string;
  
  // Fuel Specific
  fuelType?: FuelType;
  unitPrice?: number; // Price per Liter/m3/kWh
  volume?: number; // Total Liters/m3/kWh
}

export interface User {
  id: string;
  name: string;
  email: string;
  onboardingCompleted: boolean;
  monthlyGoal?: number; // Meta de lucro livre mensal
}

export interface AppVersionInfo {
  version: string;
  build: number;
}

export interface ViewState {
  currentView: 'DASHBOARD' | 'FLEET' | 'REPORTS' | 'PROFILE';
}

export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.UBER]: 'Uber',
  [Category.NINE_NINE]: '99',
  [Category.FUEL]: 'Combustível',
  [Category.MAINTENANCE]: 'Manutenção',
  [Category.INSURANCE]: 'Seguro',
  [Category.RENT]: 'Aluguel',
  [Category.FINANCING]: 'Parcela',
  [Category.OTHER]: 'Outros',
};

export const FUEL_LABELS: Record<FuelType, string> = {
  'GASOLINE': 'Gasolina',
  'ETHANOL': 'Etanol',
  'GNV': 'GNV',
  'ELECTRIC': 'Elétrico (kWh)'
};

export const CATEGORY_COLORS: Record<Category, string> = {
  [Category.UBER]: '#10b981', // green-500
  [Category.NINE_NINE]: '#f59e0b', // amber-500
  [Category.FUEL]: '#ef4444', // red-500
  [Category.MAINTENANCE]: '#6366f1', // indigo-500
  [Category.INSURANCE]: '#8b5cf6', // violet-500
  [Category.RENT]: '#ec4899', // pink-500
  [Category.FINANCING]: '#14b8a6', // teal-500
  [Category.OTHER]: '#94a3b8', // slate-400
};
