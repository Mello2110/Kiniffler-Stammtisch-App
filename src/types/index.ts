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
    role: string; // Deprecated, keep for backward compat but rely on roles
    roles: string[]; // List of assigned roles
    joinYear?: number; // Added joinYear
    avatarUrl?: string;
    avatar?: {
        icon: string;      // Lucide icon name, e.g., "Beer", "Dog", "Star"
        bgColor: string;   // Tailwind color class, e.g., "bg-purple-500"
    };
    points: number;
    isAdmin?: boolean;
    email?: string; // Added for linking Auth User to Member
    birthday?: string; // YYYY-MM-DD
    notificationPreferences?: NotificationPreferences;
}

export interface NotificationPreferences {
    // Channels
    emailEnabled: boolean;
    pushEnabled: boolean;

    // FCM token for push
    fcmToken?: string;

    // Event Reminders
    eventReminder7Days: boolean;    // 1 week before events
    eventReminder1Day: boolean;     // 1 day before events

    // Voting Reminder
    votingReminder: boolean;        // Remind on 24th if not voted for next month

    // Monthly Overview
    monthlyOverview: boolean;       // Send overview on 1st of each month
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
    paidViaReconciliation?: boolean; // true if auto-paid by reconciliation
    reconciledAt?: any; // Firestore Timestamp when reconciled
    createdAt: any;
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    date: string; // ISO date string
    memberId?: string; // Firebase UID of the member who made the expense
    memberName?: string; // Denormalized display name
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
    uploaderName?: string;
    publicId?: string; // Cloudinary public_id for deletion
    createdAt: any; // Firestore Timestamp
    captureDate?: string; // ISO string 2024-01-01T12:00:00.000Z
    uploadDate?: string; // ISO string
}

// Score value can be a number, null (empty), or "stroke" (passed/crossed out)
export type ScoreValue = number | null | "stroke";

export interface KniffelScores {
    ones: ScoreValue;
    twos: ScoreValue;
    threes: ScoreValue;
    fours: ScoreValue;
    fives: ScoreValue;
    sixes: ScoreValue;
    threeOfAKind: ScoreValue;
    fourOfAKind: ScoreValue;
    fullHouse: ScoreValue;
    smallStraight: ScoreValue;
    largeStraight: ScoreValue;
    kniffel: ScoreValue;
    chance: ScoreValue;
}

// Guest Player Support
export interface GuestPlayer {
    id: string; // Format: guest_[timestamp]_[random]
    name: string;
    isGuest: true; // Explicit flag for type checking
    hostMemberId: string; // Member ID responsible for this guest's penalties
}

// Union type for player selection
export type Player = Member | GuestPlayer;

// Type guard functions
export function isMember(player: Player): player is Member {
    return !('isGuest' in player);
}

export function isGuest(player: Player): player is GuestPlayer {
    return 'isGuest' in player && player.isGuest === true;
}

export interface KniffelSheet {
    id: string;
    year: number;
    month: number; // 0-11
    createdAt: any; // Firestore Timestamp
    memberSnapshot: string[]; // Member IDs in selection order
    playerOrder?: string[]; // ALL player IDs (members + guests) in selection order
    guests?: GuestPlayer[]; // Guest player data (stored in sheet since they're not in members collection)
    scores: {
        [memberId: string]: KniffelScores; // Now includes guest IDs
    };
    // Timestamps for chance entries (first-come-first-served highlighting)
    chanceTimestamps?: {
        [memberId: string]: number; // Date.now() timestamp when chance was entered
    };
}
