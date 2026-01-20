export type UserRole = 'admin' | 'seller';

export interface User {
    id: string;
    username: string;
    name: string;
    role: UserRole;
    password?: string;
    email?: string;
    phone?: string;
    startDate?: string; // ISO Date string
    active?: boolean;
    avatar?: string; // Base64 image
}

export interface Client {
    id: string;
    name: string; // Razón Social
    rfc: string;
    email?: string;
    phone?: string;
    address: string;
    zipCode: string;
    colonia: string; // Updated from zip lookup
    city: string;
    state: string;
    walletActive?: boolean; // Deprecated, use walletStatus
    walletStatus?: 'inactive' | 'pending' | 'active';
}

export interface Product {
    id: string;
    sku: string;
    category: string;
    name: string;
    unit?: string; // e.g. "Litro", "Pieza"
    priceRetail: number;
    priceMedium: number;
    priceWholesale: number;
    cost: number;
    stockInitial: number;
    stockCurrent: number;
}

export type ExpenseType = 'fijo' | 'variable';

export interface Expense {
    id: string;
    description: string;
    amount: number;
    type: ExpenseType;
    category: string; // e.g., 'Renta', 'Luz', 'Sueldos', 'Materia Prima'
    date: string;
    userId: string;
    userName: string;
}

export type priceType = 'retail' | 'medium' | 'wholesale';


export type PaymentMethod = 'cash' | 'card' | 'card_credit' | 'card_debit' | 'transfer' | 'wallet' | 'multiple';

export interface Sale {
    id: string;
    folio: string;
    date: string;
    sku: string;
    unit: string; // Persistent unit at time of sale
    quantity: number;
    priceType: priceType;
    priceUnit: number; // Snapshot of price at time of sale
    amount: number;
    paymentMethod?: PaymentMethod; // Added payment method
    paymentDetails?: Record<string, number>; // Added for multiple payments
    sellerId: string;
    sellerName: string;
    clientId?: string; // Optional for backward compatibility, but we will default 'general'
    clientName?: string;
    isCorrection?: boolean;
    isCancelled?: boolean; // New flag for cancellation
    correctionNote?: string;
    productName?: string; // Added for DB consistency
}

export interface Purchase {
    id: string;
    date: string;
    sku: string;
    quantity: number;
    costUnit: number;
    costTotal: number;
    userId?: string;
    userName?: string;
    productName?: string; // Added
    supplier?: string; // Added
    notes?: string;   // Added
}


export interface Theme {
    name: string;
    id: string;
    colors: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950: string;
    }
}

export interface Settings {
    themeId: string;
    logo?: string;
    companyName: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    email?: string;
    rfc?: string;
    address?: string;
    zipCode?: string;
    colonia?: string;
    priceThresholds?: {
        medium: number;
        wholesale: number;
    };
    loyaltyPercentage?: number;
    razonSocial?: string;
    masterPin?: string;
}


export interface LoyaltyTransaction {
    id: string;
    clientId: string;
    saleId?: string;
    amount: number; // positive for earn, negative for spend
    points: number;
    type: 'earn' | 'redeem' | 'adjustment';
    description: string;
    date: string;
    created_at: string;
}
