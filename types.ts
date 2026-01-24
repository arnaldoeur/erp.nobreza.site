
export enum UserRole {
  ADMIN = 'ADMIN',
  COMMERCIAL = 'COMMERCIAL',
  TECHNICIAN = 'TECHNICIAN',
  ADMINISTRATIVE = 'ADMINISTRATIVE'
}

export interface User {
  id: string;
  companyId: string | number;
  name: string;
  photo?: string;
  email: string;
  role: UserRole;
  responsibility?: string;
  hireDate: Date;
  active: boolean;
  contact?: string;
  location?: string;
  socialSecurityNumber?: string;
  baseSalary?: number;
  baseHours?: number;
}

export interface Shift {
  name: string;
  start: string;
  end: string;
}

export interface CompanyInfo {
  id: string | number;
  name: string;
  slogan: string;
  nuit: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  logo?: string;
  logoVertical?: string;
  logoHorizontal?: string;
  closingTime?: string;
  themeColor?: string;
  themeColorSecondary?: string;
  workingHours?: {
    start: string;
    end: string;
    days: number[];
  };
  shifts?: Shift[];
  paymentMethods?: string[];
  phone2?: string;
  isDarkMode?: boolean;
  language?: 'pt-MZ' | 'en-US';
  timezone?: string;
}

export interface Product {
  id: string;
  companyId: string | number;
  name: string;
  category: string;
  code: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  minStock: number;
  supplierId: string;
  unit?: string;
}

export interface SaleItem {
  productId: string;
  companyId: string | number;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type PaymentMethod = 'CASH' | 'MPESA' | 'EMOLA' | 'MKESH' | 'TRANSFER' | 'OTHER' | string;

export type DocumentType = 'INVOICE' | 'PURCHASE_ORDER' | 'SUPPLIER_INVOICE';

export interface BillingDocument {
  id: string;
  companyId: string | number;
  type: DocumentType;
  timestamp: Date;
  items: SaleItem[];
  total: number;
  targetName: string;
  targetDetails?: {
    nuit?: string;
    address?: string;
    email?: string;
    contact?: string;
  };
  status: 'PENDING' | 'PAID' | 'SENT';
  performedBy: string;
}

export interface Sale {
  id: string;
  companyId: string | number;
  timestamp: Date;
  items: SaleItem[];
  total: number;
  type: 'DIRECT' | 'INVOICE';
  customerName?: string;
  paymentMethod: PaymentMethod;
  otherPaymentDetails?: string;
  performedBy: string;
}

export interface Supplier {
  id: string;
  companyId: string | number;
  name: string;
  nuit?: string;
  location: string;
  contact: string;
  email: string;
  conditions: string;
  estimated_delivery?: string; // New field
  isPreferred: boolean;
  logo?: string;
}

export type ClosureStatus = 'CLOSED' | 'REOPENED' | 'AUDITED';

export interface DailyClosure {
  id: string;
  companyId: string | number;
  closureDate: Date;
  shift: string;
  responsibleId: string;
  responsibleName: string;
  systemTotal: number;
  manualCash: number;
  difference: number;
  observations: string;
  status: ClosureStatus;
  createdAt: Date;
}

export interface SystemLog {
  id?: string;
  companyId: string | number;
  timestamp?: Date;
  userId?: string;
  userName?: string;
  action: string;
  details: string;
}

export interface Customer {
  id: string;
  companyId: string | number;
  name: string;
  nuit: string;
  contact: string;
  email: string;
  address: string;
  type: 'NORMAL' | 'INSTITUTIONAL';
  totalSpent: number;
  createdAt: Date;
}
export interface HealthPlan {
  id: string;
  companyId: string | number;
  name: string;
  insurer: string;
  coveragePercentage: number;
  contact?: string;
  email?: string;
  website?: string;
  description?: string;
  coverageDetails?: string;
  active: boolean;
}

export interface EventAttendee {
  eventId: string;
  userId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  user?: { name: string; email: string };
}

export interface CalendarEvent {
  id: string;
  companyId: string | number;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  type: 'MEETING' | 'TASK' | 'REMINDER';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  isPersonal?: boolean;
  createdBy: string;
  attendees?: EventAttendee[];
}
