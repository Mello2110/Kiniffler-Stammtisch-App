"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy, where, doc } from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { StatCard } from "@/components/dashboard/StatCard";
import { NextEventWidget } from "@/components/dashboard/NextEventWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Users, Calendar, Trophy, Beer, AlertCircle, Crown } from "lucide-react";
import type { Member, Penalty, SetEvent, StammtischVote, PointEntry } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<SetEvent[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [votes, setVotes] = useState<StammtischVote[]>([]);
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
  const [seasonLeader, setSeasonLeader] = useState<{ name: string; points: number } | null>(null);
  const [hostedCount, setHostedCount] = useState(0);

  useEffect(() => {
    const currentYear = new Date().getFullYear();

    // 1. Fetch Members
    const unsubMembers = onSnapshot(collection(db, "members"), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      setMembers(data);
      // Note: Leader calculation is now handled by a separate Points listener
    });

    // 1.5 Fetch Points for Season Leader (Single Source of Truth)
    // 1.5 Fetch Points for Season Leader (Single Source of Truth)
    const qPoints = query(collection(db, "points"), where("year", "==", currentYear));
    const unsubPoints = onSnapshot(qPoints, (snap) => {
      const pointsData = snap.docs.map(doc => doc.data() as PointEntry);

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

      if (leaderId && members.length > 0) {
        const leaderMember = members.find(m => m.id === leaderId);
        if (leaderMember) {
          setSeasonLeader({ name: leaderMember.name, points: maxPoints });
        }
      } else {
        setSeasonLeader(null);
      }
    });

    // 2. Fetch Events
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;

    const qEvents = query(collection(db, "set_events"), orderBy("date", "asc"));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SetEvent));
      setEvents(data);

      // Calculate "Events Hosted" (in current year)
      // Note: In real app, might want to filter by date >= startOfYear <= endOfYear
      // For now, assuming all set events are relevant or simple filter
      const hosted = data.filter(e => e.date >= startOfYear && e.date <= endOfYear).length;
      setHostedCount(hosted);
    });

    // 3. Fetch Penalties
    const unsubPenalties = onSnapshot(collection(db, "penalties"), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Penalty));
      setPenalties(data);
      const total = data.reduce((sum, p) => sum + (p.isPaid ? (p.amount || 0) : 0), 0);
      setPenaltyPot(total);
    });

    // 4. Fetch Contributions
    const unsubContributions = onSnapshot(collection(db, "contributions"), (snap) => {
      setContributionsTotal(snap.size * 15);
    });

    // 5. Fetch Expenses
    const unsubExpenses = onSnapshot(collection(db, "expenses"), (snap) => {
      const total = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
      setExpensesTotal(total);
    });

    // 6. Fetch Config
    const unsubConfig = onSnapshot(doc(db, "config", "cash"), (docSnap) => {
      if (docSnap.exists()) {
        setStartingBalance(docSnap.data().startingBalance || 0);
      }
    });

    // 4. Fetch Votes (for potential next event)
    const unsubVotes = onSnapshot(collection(db, "stammtisch_votes"), (snap) => {
      const data = snap.docs.map(doc => doc.data() as StammtischVote);
      setVotes(data);
    });

    // 8. Fetch My Open Penalties
    let unsubMyPenalties = () => { };
    if (user) {
      const qMyPenalties = query(
        collection(db, "penalties"),
        where("userId", "==", user.uid),
        where("isPaid", "==", false)
      );
      unsubMyPenalties = onSnapshot(qMyPenalties, (snap) => {
        const total = snap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        setMyOpenPenalties(total);
      });
    }

    return () => {
      unsubMembers();
      unsubEvents();
      unsubPenalties();
      unsubContributions();
      unsubExpenses();
      unsubConfig();
      unsubVotes();
      unsubMyPenalties();
    };
  }, [user, members]); // Added members to dependency to re-calc leader if needed

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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-heading">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here is what's happening smoothly.</p>
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

          <Link href="/stats">
            <StatCard
              title="Season Leader"
              value={seasonLeader ? seasonLeader.name : "-"}
              icon={Trophy}
              description={seasonLeader ? `${seasonLeader.points} Points` : "No points yet"}
              className="border-yellow-500/20 hover:border-yellow-500/50 transition-colors h-full cursor-pointer"
            />
          </Link>

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

