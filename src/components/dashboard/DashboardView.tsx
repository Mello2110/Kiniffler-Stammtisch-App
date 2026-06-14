"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, onSnapshot, orderBy, where, doc } from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { StatCard } from "@/components/dashboard/StatCard";
import { NextEventWidget } from "@/components/dashboard/NextEventWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Users, Trophy, Beer, AlertCircle, Crown, LayoutDashboard, Activity, Dice5, Star } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { useAllLedgers } from "@/hooks/useLedger";
import type { Member, Penalty, SetEvent, StammtischVote, PointEntry } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTitle } from "@/contexts/TitleContext";
import { useAuth } from "@/contexts/AuthContext";
import { EditableHeader } from "@/components/common/EditableHeader";
import { TokenService } from "@/lib/TokenService";
import { initializeMemberTokens } from "@/lib/initializeTokens";
import { TokenPotModal } from "@/components/dashboard/TokenPotModal";
import { ShinyEncounterModal } from "@/components/dashboard/ShinyEncounterModal";

export function DashboardView() {
    const { user } = useAuth();

    // ============================================
    // STATE
    // ============================================

    // Stats
    const [nextEvent, setNextEvent] = useState<{
        id?: string;
        title: string;
        date: string;
        location?: string;
        time?: string;
        type: 'set' | 'vote';
    } | null>(null);

    const [penaltyPot, setPenaltyPot] = useState(0);
    const [penaltiesPaidTotal, setPenaltiesPaidTotal] = useState(0);
    const [contributionsTotal, setContributionsTotal] = useState(0);
    const [donationsTotal, setDonationsTotal] = useState(0);
    const [expensesTotal, setExpensesTotal] = useState(0);
    const [startingBalance, setStartingBalance] = useState(0);
    const [seasonLeader, setSeasonLeader] = useState<{ id: string; points: number } | null>(null);
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
    const [isShinyModalOpen, setIsShinyModalOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // ============================================
    // QUERIES
    // ============================================
    const qMembers = useMemo(() => query(collection(db, "members")), []);
    const { data: members } = useFirestoreQuery<Member>(qMembers);

    // 1.5 Fetch Points for Season Leader (Single Source of Truth)
    const currentYear = new Date().getFullYear();
    const qPoints = useMemo(() => query(collection(db, "points"), where("year", "==", currentYear)), [currentYear]);
    const { data: pointsData } = useFirestoreQuery<PointEntry>(qPoints);

    // 2. Fetch Events (Current Year Only)
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;
    const qEvents = useMemo(() => query(
        collection(db, "set_events"),
        where("date", ">=", startOfYear),
        where("date", "<=", endOfYear),
        orderBy("date", "asc")
    ), [startOfYear, endOfYear]);
    const { data: events } = useFirestoreQuery<SetEvent>(qEvents);

    // 3. Fetch Penalties (Unpaid only for pot)
    const qPenalties = useMemo(() => query(collection(db, "penalties"), where("isPaid", "==", false)), []);
    const { data: penalties } = useFirestoreQuery<Penalty>(qPenalties);

    // 5. Fetch Expenses
    const qExpenses = useMemo(() => query(collection(db, "expenses")), []);
    const { data: expensesData } = useFirestoreQuery<{ amount: number }>(qExpenses);

    // 5.1 Fetch Contributions
    const qContributions = useMemo(() => query(collection(db, "contributions")), []);
    const { data: contributionsData } = useFirestoreQuery(qContributions);

    // 5.2 Fetch Donations
    const qDonations = useMemo(() => query(collection(db, "donations")), []);
    const { data: donationsData } = useFirestoreQuery<{ amount: number }>(qDonations);

    // 6. Fetch Config
    useEffect(() => {
        // Keep manual for single doc for now...
        const unsubConfig = onSnapshot(doc(db, "config", "cash"), (docSnap) => {
            if (docSnap.exists()) {
                setStartingBalance(docSnap.data().startingBalance || 0);
            }
        });
        return () => unsubConfig();
    }, []);

    // 7. Fetch Votes (Optimized: Future only)
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const qVotes = useMemo(() => query(
        collection(db, "stammtisch_votes"),
        where("date", ">=", todayStr)
    ), [todayStr]);
    const { data: votes } = useFirestoreQuery<StammtischVote>(qVotes);

    // 10. Automated Token Tasks (Initialization & Early Voter Bonus)
    useEffect(() => {
        const runTokenTasks = async () => {
            if (!user || isInitialized) return;

            try {
                // Initialize tokens for all members if needed
                await initializeMemberTokens();
                
                // Process automated bonus for early voting
                await TokenService.processMonthlyEarlyVoterBonus();
                
                setIsInitialized(true);
            } catch (err) {
                console.error("Token task error:", err);
            }
        };

        runTokenTasks();
    }, [user, isInitialized]);

    // Update Member Balance via Wallet/Ledger
    const { balance: memberBalance } = useLedger(user?.uid);

    // Fetch ALL ledgers
    const { entries: allLedgers } = useAllLedgers();
    
    // Total unpaid balances
    const [totalNegativeBalance, setTotalNegativeBalance] = useState(0);

    useEffect(() => {
        let pensTotal = 0;
        let contTotal = 0;
        
        // Sum penalties and contributions from ledger (absolute values)
        allLedgers.forEach(entry => {
            if (entry.type === 'penalty') {
                pensTotal += Math.abs(entry.amount);
            } else if (entry.type === 'contribution') {
                contTotal += Math.abs(entry.amount);
            }
        });

        setPenaltiesPaidTotal(pensTotal);
        setContributionsTotal(contTotal);

        // Calculate per-member net balance, then sum up negative (outstanding) balances
        const balancesByMember: { [uid: string]: number } = {};
        allLedgers.forEach(entry => {
            balancesByMember[entry.userId] = (balancesByMember[entry.userId] || 0) + entry.amount;
        });

        let negativeSum = 0;
        Object.values(balancesByMember).forEach(bal => {
            if (bal < 0) {
                negativeSum += Math.abs(bal);
            }
        });
        
        setTotalNegativeBalance(negativeSum);

        const dons = donationsData.reduce((sum, d) => sum + (d.amount || 0), 0);
        setDonationsTotal(dons);

        const exp = expensesData.reduce((sum, e) => sum + (e.amount || 0), 0);
        setExpensesTotal(exp);
    }, [allLedgers, donationsData, expensesData]);

    // 11. Shiny Encounter Trigger
    // We check if the user HAS a shiny balance but hasn't seen the popup yet.
    // To implement "hasn't seen yet", we could use localStorage.
    useEffect(() => {
        const currentUser = members.find(m => m.id === user?.uid);
        if (currentUser && (currentUser.tokenShinyBalance || 0) > 0) {
            const hasSeenShiny = localStorage.getItem(`shiny_seen_${user?.uid}`);
            if (!hasSeenShiny) {
                setIsShinyModalOpen(true);
                localStorage.setItem(`shiny_seen_${user?.uid}`, "true");
            }
        }
    }, [members, user]);

    // 8. Fetch ALL My Penalties (for balance calculation — includes paid + unpaid)
    const qMyPenalties = useMemo(() => {
        if (!user) return null;
        return query(
            collection(db, "penalties"),
            where("userId", "==", user.uid)
        );
    }, [user]);
    // Derived from ledger above

    // Calculate Season Leader
    useEffect(() => {
        // Logic same as Stats Page: Group by userId
        const totals: { [key: string]: number } = {};
        pointsData.forEach(p => {
            totals[p.userId] = (totals[p.userId] || 0) + p.points;
        });

        let leaderId = null;
        let maxPoints = -1; // Allow 0 to be a score

        Object.entries(totals).forEach(([uid, score]) => {
            if (score > maxPoints) {
                maxPoints = score;
                leaderId = uid;
            }
        });

        if (leaderId) {
            setSeasonLeader({ id: leaderId, points: maxPoints });
        } else {
            setSeasonLeader(null);
        }
    }, [pointsData]);


    // Determine Next Event
    useEffect(() => {
        // 1. Check for upcoming Set Event
        const upcomingSetEvent = events.find(e => e.date >= todayStr);
        if (upcomingSetEvent) {
            setNextEvent({
                id: upcomingSetEvent.id,
                title: upcomingSetEvent.title,
                date: upcomingSetEvent.date,
                location: upcomingSetEvent.location,
                time: upcomingSetEvent.time,
                type: 'set'
            });
            return;
        }

        // 2. If no set event, check for dates with votes
        const votesByDate: { [date: string]: number } = {};
        votes.forEach(v => {
            votesByDate[v.date] = (votesByDate[v.date] || 0) + 1;
        });

        // Find date with max votes
        let maxVotes = 0;
        let bestDate: string | null = null;
        Object.entries(votesByDate).forEach(([date, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                bestDate = date;
            } else if (count === maxVotes && bestDate && date < bestDate) {
                bestDate = date;
            }
        });

        if (bestDate && maxVotes > 0) {
            setNextEvent({
                title: "Planned Stammtisch",
                date: bestDate,
                location: "Location TBD",
                type: 'vote'
            });
        } else {
            setNextEvent(null);
        }

    }, [events, votes, todayStr]);

    const { dict } = useLanguage();
    const { title: sidebarTitle } = useTitle();

    // Cash balance = starting amount + all inflows - all outflows
    // penaltiesPaidTotal: absolute sum of penalty ledger entries (collected fines)
    // totalNegativeBalance: sum of what members still owe (not yet in the pot)
    // We rely purely on the ledger. Expenses automatically create a "system" debt in the ledger,
    // which is automatically picked up by totalNegativeBalance.
    const currentCashBalance = startingBalance + contributionsTotal + donationsTotal + penaltiesPaidTotal - totalNegativeBalance;

    // Current member: resolved once to avoid repeated .find() in JSX
    const currentMember = members.find(m => m.id === user?.uid);

    return (
        <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-8 md:p-12">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                            <LayoutDashboard className="h-3 w-3" />
                            {dict.headers.dashboard.badge}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                            {sidebarTitle} <span className="text-primary italic">{dict.headers.dashboard.highlight}</span>
                        </h1>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            {dict.headers.dashboard.subtext}
                        </p>
                    </div>

                    <div className="flex items-end gap-5 text-muted-foreground pb-0.5">
                        {/* Kanpai Branding (Text Only) */}
                        <div className="hidden sm:flex flex-col items-end leading-none opacity-90 hover:opacity-100 transition-opacity">
                            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/60 mb-0.5">powered by</span>
                            <span className="text-xl font-black tracking-tighter text-[#8B5CF6] leading-none">KANPAI</span>
                        </div>

                        <div className="h-12 w-px bg-border hidden sm:block mx-2" />

                        {/* Season Info */}
                        <div className="flex flex-col items-end leading-none">
                            <span className="text-3xl font-black text-foreground outfit leading-none">{new Date().getFullYear()}</span>
                            <span className="text-[10px] uppercase font-bold tracking-widest mt-1">{dict.dashboard.season}</span>
                        </div>

                        <div className="h-12 w-px bg-border mx-2" />
                        <Activity className="h-8 w-8 opacity-20 mb-1" />
                    </div>
                </div>

                {/* Decorative background elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* Top Section: Next Event & Quick Stats */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Next Event */}
                <NextEventWidget
                    event={nextEvent}
                    members={members}
                    currentUserId={user?.uid || ""}
                />

                {/* Stats Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link href="/members">
                        <StatCard
                            title={dict.dashboard.widgets.members.title}
                            value={members.length}
                            icon={Users}
                            description={dict.dashboard.widgets.members.desc}
                            className="hover:border-primary/50 transition-colors h-full cursor-pointer"
                        />
                    </Link>

                    <Link href="/cash">
                        <StatCard
                            title={dict.dashboard.widgets.penalties.title}
                            value={
                                memberBalance >= 0
                                    ? `+€${memberBalance.toFixed(2)}`
                                    : `-€${Math.abs(memberBalance).toFixed(2)}`
                            }
                            icon={AlertCircle}
                            description={
                                memberBalance > 0
                                    ? dict.dashboard.widgets.penalties.descPositive
                                    : memberBalance < 0
                                        ? dict.dashboard.widgets.penalties.descNegative
                                        : dict.dashboard.widgets.penalties.descZero
                            }
                            className={`transition-colors h-full cursor-pointer ${
                                memberBalance > 0
                                    ? "border-green-500/50 hover:bg-green-500/10"
                                    : memberBalance < 0
                                        ? "border-red-500/50 hover:bg-red-500/10"
                                        : "hover:border-primary/50"
                            }`}
                        />
                    </Link>

                    <Link href="/cash">
                        <StatCard
                            title={dict.dashboard.widgets.cash.title}
                            value={`€${currentCashBalance.toFixed(2)}`}
                            icon={Beer}
                            description={dict.dashboard.widgets.cash.desc}
                            className="border-red-500/20 hover:border-red-500/50 transition-colors h-full cursor-pointer"
                        />
                    </Link>

                    <Link href="/stats">
                        <StatCard
                            title={dict.dashboard.widgets.seasonLeader.title}
                            value={seasonLeader ? (members.find(m => m.id === seasonLeader.id)?.name || "Unknown") : "-"}
                            icon={Trophy}
                            description={seasonLeader ? `${seasonLeader.points} ${dict.dashboard.widgets.seasonLeader.desc}` : dict.dashboard.widgets.seasonLeader.noPoints}
                            className="border-yellow-500/20 hover:border-yellow-500/50 transition-colors h-full cursor-pointer"
                        />
                    </Link>

                    <div onClick={() => setIsTokenModalOpen(true)}>
                        <StatCard
                            title="Tokens"
                            value={
                                <div className="flex items-center gap-3">
                                    <span>{currentMember?.tokenBalance ?? 0}</span>
                                    {(currentMember?.tokenShinyBalance ?? 0) > 0 && (
                                        <span className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full text-sm border border-yellow-500/20 shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                                            <Star className="h-3.5 w-3.5 fill-current animate-pulse" />
                                            <span className="font-bold">{currentMember?.tokenShinyBalance}</span>
                                        </span>
                                    )}
                                </div>
                            }
                            icon={Dice5}
                            description={dict.dashboard.widgets.tokens?.desc || "Deine Tokens für Deals und Wetten"}
                            className="border-blue-500/20 hover:border-blue-500/50 transition-colors h-full cursor-pointer"
                        />
                    </div>

                    <Link href="/hall-of-fame">
                        <StatCard
                            title={dict.dashboard.widgets.hof.title}
                            value={dict.dashboard.widgets.hof.value}
                            icon={Crown}
                            description={dict.dashboard.widgets.hof.desc}
                            className="border-purple-500/20 hover:border-purple-500/50 transition-colors h-full cursor-pointer"
                        />
                    </Link>
                </div>
            </div>

            {/* Modals */}
            <TokenPotModal 
                isOpen={isTokenModalOpen} 
                onClose={() => setIsTokenModalOpen(false)} 
                members={members}
                currentUserId={user?.uid || ""}
            />
            
            <ShinyEncounterModal
                isOpen={isShinyModalOpen}
                onClose={() => setIsShinyModalOpen(false)}
            />

            {/* Quick Actions */}
            <div>
                <div className="mb-4">
                    <EditableHeader
                        pageId="dashboard"
                        headerId="quick-actions-title"
                        defaultText={dict.dashboard.quickActions}
                        as="h2"
                        className="text-xl font-semibold"
                    />
                </div>
                <QuickActions />
            </div>
        </div>
    );
}
