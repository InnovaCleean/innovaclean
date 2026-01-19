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
}

export interface Product {
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

export type priceType = 'retail' | 'medium' | 'wholesale';

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
    sellerId: string;
    sellerName: string;
    clientId?: string; // Optional for backward compatibility, but we will default 'general'
    clientName?: string;
    isCorrection?: boolean;
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
    razonSocial?: string;
    rfc?: string;
    address?: string;
    zipCode?: string;
    colonia?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    priceThresholds?: {
        medium: number;
        wholesale: number;
    };
}
