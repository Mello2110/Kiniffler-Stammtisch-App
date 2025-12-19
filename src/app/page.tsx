"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, onSnapshot, orderBy, where, doc, getCountFromServer } from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { StatCard } from "@/components/dashboard/StatCard";
import { NextEventWidget } from "@/components/dashboard/NextEventWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Users, Calendar, Trophy, Beer, AlertCircle, Crown, LayoutDashboard, Activity } from "lucide-react";
import type { Member, Penalty, SetEvent, StammtischVote, PointEntry } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user } = useAuth();

  // States not handled by hook directly or derived
  const [myOpenPenalties, setMyOpenPenalties] = useState(0);

  // Stats
  const [nextEvent, setNextEvent] = useState<{
    title: string;
    date: string;
    location?: string;
    time?: string;
    type: 'set' | 'vote';
  } | null>(null);

  const [penaltyPot, setPenaltyPot] = useState(0);
  const [contributionsTotal, setContributionsTotal] = useState(0);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [startingBalance, setStartingBalance] = useState(0);
  const [seasonLeader, setSeasonLeader] = useState<{ id: string; points: number } | null>(null);
  const [hostedCount, setHostedCount] = useState(0);

  // Queries (Memoized to prevent infinite loops in hook)
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

  // 6. Fetch Config
  useEffect(() => {
    // Keep manual for single doc for now or create useFirestoreDoc later. 
    // For simplicity and safety against leaks, manual with strict cleanup is fine for single doc.
    const unsubConfig = onSnapshot(doc(db, "config", "cash"), (docSnap) => {
      if (docSnap.exists()) {
        setStartingBalance(docSnap.data().startingBalance || 0);
      }
    });
    return () => unsubConfig();
  }, []);

  // 7. Fetch Votes
  const qVotes = useMemo(() => query(collection(db, "stammtisch_votes")), []);
  const { data: votes } = useFirestoreQuery<StammtischVote>(qVotes);

  // 8. Fetch My Open Penalties
  const qMyPenalties = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, "penalties"),
      where("userId", "==", user.uid),
      where("isPaid", "==", false)
    );
  }, [user]);
  const { data: myOpenPenaltiesData } = useFirestoreQuery<Penalty>(qMyPenalties);

  // --- Derived State Calculations ---

  // Season Leader Calculation
  useEffect(() => {
    // Aggregate points per user
    const stats: Record<string, number> = {};
    pointsData.forEach(p => {
      stats[p.userId] = (stats[p.userId] || 0) + p.points;
    });

    // Find leader
    let maxPoints = -1;
    let leaderId = "";

    Object.entries(stats).forEach(([uid, total]) => {
      if (total > maxPoints) {
        maxPoints = total;
        leaderId = uid;
      }
    });

    if (leaderId) {
      setSeasonLeader({ id: leaderId, points: maxPoints });
    } else {
      setSeasonLeader(null);
    }
  }, [pointsData]);

  // Hosted Count Calculation
  useEffect(() => {
    setHostedCount(events.length);
  }, [events]);

  // Penalty Pot Calculation
  useEffect(() => {
    const total = penalties.reduce((sum, p) => sum + (p.amount || 0), 0);
    setPenaltyPot(total);
  }, [penalties]);

  // Expenses Total Calculation
  useEffect(() => {
    const total = expensesData.reduce((acc, doc) => acc + (doc.amount || 0), 0);
    setExpensesTotal(total);
  }, [expensesData]);

  // My Open Penalties Calculation
  useEffect(() => {
    const total = myOpenPenaltiesData.reduce((sum, doc) => sum + (doc.amount || 0), 0);
    setMyOpenPenalties(total);
  }, [myOpenPenaltiesData]);

  // 4. Fetch Contributions (Count Only) - Optimized
  useEffect(() => {
    const fetchContributionCount = async () => {
      try {
        const countSnap = await getCountFromServer(collection(db, "contributions"));
        setContributionsTotal(countSnap.data().count * 15);
      } catch (e) {
        console.error("Error fetching contributions count", e);
      }
    };
    fetchContributionCount();
  }, []);

  // Determine Next Event
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Check for upcoming Set Event
    const upcomingSetEvent = events.find(e => e.date >= today);
    if (upcomingSetEvent) {
      setNextEvent({
        title: upcomingSetEvent.title,
        date: upcomingSetEvent.date,
        location: upcomingSetEvent.location,
        time: upcomingSetEvent.time,
        type: 'set'
      });
      return;
    }

    // 2. If no set event, check for dates with votes
    // Group votes by date
    const votesByDate: { [date: string]: number } = {};
    votes.forEach(v => {
      if (v.date >= today) {
        votesByDate[v.date] = (votesByDate[v.date] || 0) + 1;
      }
    });

    // Find date with max votes
    let maxVotes = 0;
    let bestDate: string | null = null;
    Object.entries(votesByDate).forEach(([date, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        bestDate = date;
      } else if (count === maxVotes && bestDate && date < bestDate) {
        // Tie breaker: sooner date
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

  }, [events, votes]);

  const currentCashBalance = startingBalance + contributionsTotal + penaltyPot - expensesTotal;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-8 md:p-12">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
              <LayoutDashboard className="h-3 w-3" />
              Overview
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
              Stammtisch <span className="text-primary italic">Dashboard</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Willkommen zurück! Hier ist dein Überblick über anstehende Events, Finanzen und aktuelle News.
            </p>
          </div>

          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex flex-col items-end">
              <span className="text-2xl font-black text-foreground outfit">{new Date().getFullYear()}</span>
              <span className="text-xs uppercase font-bold tracking-widest">Season</span>
            </div>
            <div className="h-10 w-px bg-border" />
            <Activity className="h-8 w-8 opacity-20" />
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Top Section: Next Event & Quick Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Next Event */}
        <NextEventWidget event={nextEvent} />

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/members">
            <StatCard
              title="Total Members"
              value={members.length}
              icon={Users}
              description="Active regular members"
              className="hover:border-primary/50 transition-colors h-full cursor-pointer"
            />
          </Link>

          <Link href="/cash">
            <StatCard
              title="My Open Penalties"
              value={`€${myOpenPenalties.toFixed(2)}`}
              icon={AlertCircle}
              description="Unpaid fines"
              className={`transition-colors h-full cursor-pointer ${myOpenPenalties > 0 ? "border-orange-500/50 hover:bg-orange-500/10" : "hover:border-primary/50"}`}
            />
          </Link>

          <Link href="/cash">
            <StatCard
              title="Current Cash Balance"
              value={`€${currentCashBalance.toFixed(2)}`}
              icon={Beer}
              description="Available funds"
              className="border-red-500/20 hover:border-red-500/50 transition-colors h-full cursor-pointer"
            />
          </Link>

          <StatCard
            title="Season Leader"
            value={seasonLeader ? (members.find(m => m.id === seasonLeader.id)?.name || "Unknown") : "-"}
            icon={Trophy}
            description={seasonLeader ? `${seasonLeader.points} Points` : "No points yet"}
            className="border-yellow-500/20 hover:border-yellow-500/50 transition-colors h-full cursor-pointer"
          />

          <Link href="/hall-of-fame">
            <StatCard
              title="Hall of Fame"
              value="Legends"
              icon={Crown}
              description="Top Donors & Hosts"
              className="border-purple-500/20 hover:border-purple-500/50 transition-colors h-full cursor-pointer"
            />
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <QuickActions />
      </div>
    </div>
  );
}

