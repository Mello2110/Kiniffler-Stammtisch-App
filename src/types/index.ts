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
        icon: string;      // Legacy: unused. Kept for backward compat.
        bgColor: string;   // Semantic color key, e.g. "lachs", "indigo" — resolved to hex in MemberAvatar
    };
    points: number;
    isAdmin?: boolean;
    email?: string; // Added for linking Auth User to Member
    paypalName?: string; // PayPal display name for automatic payment matching
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
    gameType?: GameDisciplineId; // undefined or 'kniffel' for legacy Kniffel points; 'schocken' | 'kegeln' for other disciplines
    sheetContributions?: Record<string, number>; // Maps sheet/session ID to the points it contributed
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
    isSubmitted?: boolean; // Flag to indicate if sheet has been transferred to matrix
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

// --- Ledger & Wallet Integration Types ---

export type LedgerTransactionCategory = 'paypal_deposit' | 'paypal_withdrawal' | 'contribution' | 'penalty' | 'expense' | 'donation' | 'refund' | 'uncategorized';

export interface LedgerEntry {
    id: string; // Document ID
    userId: string; // Firebase UID
    amount: number; // Positive for inflow, negative for outflow
    type: LedgerTransactionCategory;
    description: string; // e.g. "Zahlung erhalten von Max Mustermann" or "Monatsbeitrag Mai"
    date: string; // ISO date string
    createdAt: any; // Firestore Timestamp
    
    // Optional PayPal link for idempotency / tracking
    paypalTxId?: string;
    
    // If it's linked to another document (e.g. a penalty or contribution ID)
    linkedDocId?: string;
}

// --- Token & Award System Types ---

export type TokenType = 'regular' | 'shiny';

export interface TokenTransaction {
    id: string;
    memberId: string;
    amount: number; // 1 for earn, can be negative for spend/bet
    type: TokenType;
    category: 'planning' | 'hosting' | 'achievement' | 'transfer' | 'pot' | 'initial';
    reason: string;
    timestamp: any; // Firestore Timestamp
    year: number;
}

export interface Member {
    id: string;
    name: string;
    role: string;
    roles: string[];
    joinYear?: number;
    avatarUrl?: string;
    avatar?: {
        icon: string;
        bgColor: string;
    };
    points: number;
    tokenBalance?: number;       // Denormalized regular tokens
    tokenShinyBalance?: number;  // Denormalized shiny tokens (initially hidden)
    isAdmin?: boolean;
    email?: string;
    paypalName?: string;
    birthday?: string;
    notificationPreferences?: NotificationPreferences;
}

export interface TokenPot {
    id: string;
    creatorId: string;
    description: string;
    totalAmount: number;
    type: TokenType; // Regular pots or Shiny pots (if anyone is that crazy)
    participants: {
        memberId: string;
        amount: number;
    }[];
    status: 'open' | 'closed' | 'resolved';
    winners?: {
        memberId: string;
        share: number; // Percentage or exact amount? Let's use exact amount.
    }[];
    createdAt: any;
}

// =========================================================================
// MULTI-TENANT SAAS & MODULAR GAME ENGINE TYPES (PHASES 2 - 6)
// =========================================================================

export type GameDisciplineId = 'kniffel' | 'schocken' | 'kegeln';

export interface ClubThemeConfig {
    primaryColor: string; // Hex or OKLCH base color (e.g. "#8B5CF6")
    accentColor: string;  // Hex or OKLCH accent color (e.g. "#F59E0B")
    mode?: 'dark' | 'light';
}

export interface ClubPaymentConfig {
    paypalMeHandle: string;          // e.g. "marcelmueller" or "paypal.me/stammtisch"
    treasuryEmail: string;           // e.g. "kasse@verein.de"
    monthlyContributionEur: number;  // e.g. 15
    monthlyContributionDay?: number; // 1 = 1. des Monats, 15 = 15., 0 = Monatsletzter
    autoBookContributions?: boolean; // Default: true
    defaultPenaltyEur: number;       // e.g. 1
    currency: string;                // "EUR"
    paymentSyncMode?: 'manual_confirm' | 'auto_webhook' | 'imap_legacy';
    webhookSecret?: string;          // Optional token for inbound email / webhook verification
}

export interface CustomPenaltyCatalogItem {
    id: string;
    label: string;
    amountEur: number;
    gameType: GameDisciplineId | 'general';
}

export interface KniffelHouseRules {
    placementMode: 'dynamic_participants' | 'fixed_top3'; // dynamic = N..1 points (Stammtisch Original)
    kniffelBonusPoints: number;          // Default: +1 point in matrix if Kniffel > 0
    highestChanceBonusPoints: number;    // Default: +1 point in matrix (first-come-first-served)
    lowestChanceBonusPoints: number;     // Default: +1 point in matrix (first-come-first-served)
    upperBonusThreshold: number;         // Default: 63
    upperBonusScore: number;             // Default: 35
    strokePenaltyEur: number;            // Default: 1.00 €
}

export interface SchockenHouseRules {
    stockCoasters: number;               // Default: 13 Deckel
    juleEnabled: boolean;                // Default: true (4-2-1 = 7 Deckel)
    placementMode: 'dynamic_participants' | 'fixed_top3';
    schockOutMatrixBonusPoints: number;  // Default: +1 matrix point per Schock-Out thrown
    cleanSheetMatrixBonusPoints: number; // Default: +1 matrix point for 0 lost halves
    halfLossPenaltyEur: number;          // Default: 1.00 €
    finalLossPenaltyEur: number;         // Default: 2.00 €
    doubleHalfLossPenaltyEur: number;    // Default: 2.00 €
}

export interface KegelnHouseRules {
    placementMode: 'dynamic_participants' | 'fixed_top3';
    alleNeuneMatrixBonusPoints: number;  // Default: +1 matrix point per Alle Neune
    kranzMatrixBonusPoints: number;      // Default: +1 matrix point per Kranz
    pudelPenaltyEur: number;             // Default: 0.50 €
    autoBookPudelPenalty: boolean;       // Default: true
    pudelKingPenaltyEur: number;         // Default: 2.00 €
}

export interface ClubRulesetConfig {
    kniffel: KniffelHouseRules;
    schocken: SchockenHouseRules;
    kegeln: KegelnHouseRules;
    customPenaltyCatalog: CustomPenaltyCatalogItem[];
}

export interface ClubTenant {
    id: string;                      // e.g. "club_original"
    slug: string;                    // URL-friendly slug, e.g. "stammtisch"
    name: string;                    // Display title
    subtitle?: string;
    foundingYear?: number;           // e.g. 2016 — used to generate year folders for gallery & games
    logoUrl?: string;                // Cloudinary URL for club logo
    logoPublicId?: string;           // Cloudinary public_id for cleanup on replace/delete
    logoBackground?: 'transparent' | 'light' | 'dark';
    creatorUid: string;
    enabledGames: GameDisciplineId[];
    defaultGame: GameDisciplineId;
    theme: ClubThemeConfig;
    paymentConfig: ClubPaymentConfig;
    cashConfig: CashConfig;
    ruleset?: ClubRulesetConfig;
    hallOfFameCategories?: HallOfFameCategoryId[];
    createdAt?: any;
    migratedAt?: any;
}

export interface GlobalUserProfile {
    uid: string;
    name: string;
    email: string;
    defaultClubId: string;
    clubIds: string[];
    isSuperAdmin?: boolean;
    updatedAt?: any;
}


export interface ClubInvite {
    code: string;
    clubId: string;
    clubName: string;
    createdBy: string;
    createdAt?: any;
    expiresAt?: any | null;
    maxUses?: number | null;
    usedCount: number;
    active: boolean;
}

export interface PendingDeposit {
    id: string;
    userId: string;
    memberName: string;
    amount: number;
    referenceToken: string;
    note?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt?: any;
    resolvedAt?: any;
    resolvedBy?: string;
}

export type HallOfFameCategoryId =
    | "dayWinners"
    | "topDonors"
    | "topPenaltyPayers"
    | "topHosts"
    | "topParticipations"
    | "topScores"
    | "topKniffels";
