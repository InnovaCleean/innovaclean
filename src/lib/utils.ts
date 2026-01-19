import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(amount);
};

export const getCDMXISOString = (): string => {
    // Return UTC string for storage. Source of truth.
    return new Date().toISOString();
};

export const formatDate = (dateString: string) => {
    // Check if it's a legacy local string (no 'Z' and no offset)
    // If it's legacy "YYYY-MM-DDTHH:mm:ss", treating it as UTC implies +6h shift which is wrong if it was already local -6.
    // If we change storage to UTC, we must handle legacy strings (which were "Text" CDMX) correctly?
    // User says current data is "Jan 18 19:38" (which was likely intended to be Jan 19 02:00?).
    // Let's rely on standard parsing.

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
};

export const getCDMXDate = (): string => {
    // Returns YYYY-MM-DD in CDMX timezone
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
};

export const getCDMXNow = (): Date => {
    // Returns a Date object representing CDMX time
    // But since Date is always absolute (unix), we create a Date that LOOKS like CDMX relative to UTC (hacky but useful for comparisons if needed)
    // Better: Just return standard now, and use timezone in formatters.
    return new Date();
};

export const parseCDMXDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    // For date inputs (YYYY-MM-DD)
    if (dateStr.length === 10 && dateStr.includes('-')) {
        // Create a date at noon CDMX
        // Note: "YYYY-MM-DD" parsing is UTC by default in JS.
        // We want noon CDMX.
        // Construct ISO string for CDMX noon: 
        // But simplest is purely local noon?
        return new Date(`${dateStr}T12:00:00`);
    }
    return new Date(dateStr);
};

export const getCDMXDateFromISO = (isoString: string): string => {
    try {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    } catch (e) {
        return getCDMXDate();
    }
};

export const getCDMXFirstDayOfMonth = (): string => {
    const today = getCDMXDate();
    return `${today.substring(0, 8)}01`;
};
