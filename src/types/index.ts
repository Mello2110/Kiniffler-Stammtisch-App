/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Event {
    id: string;
    title: string;
    date: Date; // ISO string or Date object
    location: string;
    description?: string;
    votes: number;
    status: 'confirmed' | 'proposed';
}

export interface Member {
    id: string;
    name: string;
    role: string; // Changed to string for free text input
    joinYear?: number; // Added joinYear
    avatarUrl?: string;
    points: number;
}

export interface StammtischVote {
    id: string; // usually composite userId_date
    userId: string;
    date: string; // ISO date string YYYY-MM-DD
    month: number;
    year: number;
    createdAt: any; // Firestore Timestamp
}

export interface SetEvent {
    id: string;
    title: string;
    description?: string;
    date: string; // ISO date string YYYY-MM-DD
    month: number;
    year: number;
    time?: string;     // HH:MM
    location?: string; // Venue name
    hostId?: string;
    createdAt: any;
}

export interface Penalty {
    id: string;
    userId: string;
    amount: number; // in Euro
    reason: string;
    date: string; // ISO date string
    isPaid: boolean;
    createdAt: any;
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    date: string; // ISO date string
    createdAt: any;
}

export interface Contribution {
    id: string;
    userId: string;
    month: number; // 0-11
    year: number;
    isPaid: boolean;
}

export interface Donation {
    id: string;
    userId: string;
    month: number;
    year: number;
    amount: number;
}

export interface PointEntry {
    id: string;
    userId: string;
    month: number; // 0-11
    year: number;
    points: number;
}

export interface CashConfig {
    startingBalance: number;
}

export interface GalleryImage {
    id: string;
    url: string;
    year: number;
    description?: string;
    uploadedBy: string;
    createdAt: any; // Firestore Timestamp
}
