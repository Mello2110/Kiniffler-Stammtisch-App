"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowUpDown, ArrowUp, ArrowDown, X, ChevronDown, AlertCircle, GripVertical, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toast, useToast } from "@/components/common/Toast";
import type { Member, KniffelSheet, KniffelScores, ScoreValue, Player, GuestPlayer } from "@/types";
import { isMember, isGuest } from "@/types";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    horizontalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DiceCountEntryModal, UPPER_FIELD_MULTIPLIERS } from "./DiceCountEntryModal";

interface KniffelScorecardProps {
    sheet: KniffelSheet;
    members: Member[];
}

type ScoreField = keyof KniffelScores;
type SortMethod = "scoreHigh" | "scoreLow" | "alphabet" | "manual";

const UPPER_FIELDS: ScoreField[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];
const LOWER_FIELDS: ScoreField[] = ["threeOfAKind", "fourOfAKind", "fullHouse", "smallStraight", "largeStraight", "kniffel", "chance"];

// Fields with fixed point values (toggle-click)
const FIXED_POINT_FIELDS: Partial<Record<ScoreField, number>> = {
    fullHouse: 25,
    smallStraight: 30,
    largeStraight: 40,
    kniffel: 50,
};

// Sortable Player Header component - extracted to comply with React Rules of Hooks
interface SortablePlayerHeaderProps {
    player: Player;
    isReorderMode: boolean;
    isFullscreen: boolean;
    dict: any;
}

function SortablePlayerHeader({ player, isReorderMode, isFullscreen, dict }: SortablePlayerHeaderProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: player.id, disabled: !isReorderMode });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <th
            ref={setNodeRef}
            style={style}
            className={cn(
                "text-center p-2 font-semibold",
                !isFullscreen && "min-w-[100px]",
                isDragging && "opacity-50 z-50"
            )}
        >
            <div className="flex flex-col items-center gap-1">
                {isReorderMode && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <GripVertical className="h-4 w-4 text-primary" />
                    </div>
                )}
                <span>{player.name}</span>
                {isGuest(player) && (
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                        {dict.kniffel.guestLabel}
                    </span>
                )}
            </div>
        </th>
    );
}

export function KniffelScorecard({ sheet, members }: KniffelScorecardProps) {
    const { dict } = useLanguage();
    const [localScores, setLocalScores] = useState(sheet.scores);
    const [sortMethod, setSortMethod] = useState<SortMethod>("manual");
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [localPlayerOrder, setLocalPlayerOrder] = useState(sheet.playerOrder || sheet.memberSnapshot);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { toast, showToast, hideToast } = useToast();

    // State for dice count entry modal (upper section fields)
    const [diceCountModal, setDiceCountModal] = useState<{
        isOpen: boolean;
        playerId: string;
        playerName: string;
        field: ScoreField;
        currentValue: number | null;
    }>({
        isOpen: false,
        playerId: "",
        playerName: "",
        field: "ones",
        currentValue: null,
    });

    // Drag and drop sensors for column reordering
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Handle column reorder
    const handleColumnReorder = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = localPlayerOrder.indexOf(active.id as string);
            const newIndex = localPlayerOrder.indexOf(over.id as string);
            const newOrder = arrayMove(localPlayerOrder, oldIndex, newIndex);

            setLocalPlayerOrder(newOrder);

            // Save to Firestore
            try {
                await updateDoc(doc(db, "kniffelSheets", sheet.id), {
                    playerOrder: newOrder
                });
                showToast(dict.kniffel.orderSaved);
                setIsReorderMode(false);
            } catch (error) {
                console.error("Error saving column order:", error);
            }
        }
    };

    // Fullscreen toggle handler - CSS-based for better mobile support
    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);
    }, []);

    // Lock body scroll when in fullscreen
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFullscreen]);

    // Short field names for compact mode
    const getShortFieldLabel = (field: ScoreField): string => {
        const shortLabels: Record<ScoreField, string> = {
            ones: "1er",
            twos: "2er",
            threes: "3er",
            fours: "4er",
            fives: "5er",
            sixes: "6er",
            threeOfAKind: "3x",
            fourOfAKind: "4x",
            fullHouse: "FH",
            smallStraight: "kS",
            largeStraight: "gS",
            kniffel: "K!",
            chance: "Ch"
        };
        return shortLabels[field];
    };

    // Get players (members + guests) that were part of this sheet, in selection order
    const sheetPlayers = useMemo(() => {
        // Preserve the order from playerOrder (or fallback to memberSnapshot)
        const orderedIds = localPlayerOrder;
        const memberMap = new Map(members.map(m => [m.id, m]));
        const guestMap = new Map((sheet.guests || []).map(g => [g.id, g]));

        return orderedIds
            .map(id => memberMap.get(id) || guestMap.get(id))
            .filter((p): p is Player => p !== undefined);
    }, [localPlayerOrder, members, sheet.guests]);

    // Calculate compact mode based on player count (must be after sheetPlayers)
    const compactMode = useMemo(() => {
        const playerCount = sheetPlayers.length;
        if (playerCount >= 10) return 'ultra-compact-mode';
        if (playerCount >= 7) return 'compact-mode';
        return '';
    }, [sheetPlayers.length]);

    // Helper to get numeric value (strokes count as 0)
    const getNumericValue = (value: ScoreValue): number => {
        if (value === "stroke" || value === null) return 0;
        return value;
    };

    // Check if value is a stroke
    const isStroke = (value: ScoreValue): boolean => {
        return value === "stroke";
    };

    // Check if field is a fixed-point field
    const isFixedPointField = (field: ScoreField): boolean => {
        return field in FIXED_POINT_FIELDS;
    };

    // Calculate upper section sum for a member
    const calculateUpperSum = useCallback((memberId: string): number => {
        const scores = localScores[memberId];
        if (!scores) return 0;
        return UPPER_FIELDS.reduce((sum, field) => sum + getNumericValue(scores[field]), 0);
    }, [localScores]);

    // Calculate bonus (35 if upper sum >= 63)
    const calculateBonus = useCallback((memberId: string): number => {
        return calculateUpperSum(memberId) >= 63 ? 35 : 0;
    }, [calculateUpperSum]);

    // Calculate lower section sum for a member
    const calculateLowerSum = useCallback((memberId: string): number => {
        const scores = localScores[memberId];
        if (!scores) return 0;
        return LOWER_FIELDS.reduce((sum, field) => sum + getNumericValue(scores[field]), 0);
    }, [localScores]);

    // Calculate total score
    const calculateTotal = useCallback((memberId: string): number => {
        return calculateUpperSum(memberId) + calculateBonus(memberId) + calculateLowerSum(memberId);
    }, [calculateUpperSum, calculateBonus, calculateLowerSum]);

    // Sort players based on selected method
    const sortedPlayers = useMemo(() => {
        switch (sortMethod) {
            case "scoreHigh":
                return [...sheetPlayers].sort((a, b) => calculateTotal(b.id) - calculateTotal(a.id));
            case "scoreLow":
                return [...sheetPlayers].sort((a, b) => calculateTotal(a.id) - calculateTotal(b.id));
            case "alphabet":
                return [...sheetPlayers].sort((a, b) => a.name.localeCompare(b.name));
            case "manual":
            default:
                return sheetPlayers;
        }
    }, [sheetPlayers, sortMethod, calculateTotal]);

    // Get sort icon
    const getSortIcon = () => {
        switch (sortMethod) {
            case "scoreHigh": return <ArrowDown className="h-4 w-4" />;
            case "scoreLow": return <ArrowUp className="h-4 w-4" />;
            default: return <ArrowUpDown className="h-4 w-4" />;
        }
    };

    // Get sort label
    const getSortLabel = () => {
        switch (sortMethod) {
            case "scoreHigh": return dict.kniffel.sortScoreHigh;
            case "scoreLow": return dict.kniffel.sortScoreLow;
            case "alphabet": return dict.kniffel.sortAlphabet;
            case "manual": return dict.kniffel.sortManual;
        }
    };

    // Update score in Firebase
    const updateScore = async (memberId: string, field: ScoreField, newValue: ScoreValue) => {
        setLocalScores(prev => ({
            ...prev,
            [memberId]: {
                ...prev[memberId],
                [field]: newValue
            }
        }));

        try {
            await updateDoc(doc(db, "kniffelSheets", sheet.id), {
                [`scores.${memberId}.${field}`]: newValue
            });
        } catch (error) {
            console.error("Error updating score:", error);
        }
    };

    // Handle toggle-click for fixed-point fields
    const handleFixedFieldClick = (memberId: string, field: ScoreField) => {
        const scores = localScores[memberId];
        const currentValue = scores?.[field];
        const fixedValue = FIXED_POINT_FIELDS[field];

        if (currentValue === fixedValue) {
            // Filled → Empty
            updateScore(memberId, field, null);
        } else {
            // Empty or different → Fill with fixed value
            updateScore(memberId, field, fixedValue!);
        }
    };

    // Handle score change for non-fixed fields
    const handleScoreChange = (memberId: string, field: ScoreField, value: string) => {
        let newValue: ScoreValue;

        if (value === "-" || value.toLowerCase() === "stroke" || value.toLowerCase() === "strich") {
            newValue = "stroke";
        } else if (value === "") {
            newValue = null;
        } else {
            const numValue = parseInt(value, 10);
            if (isNaN(numValue)) return;
            newValue = numValue;
        }

        updateScore(memberId, field, newValue);
    };

    // Toggle stroke for a field
    const toggleStroke = (memberId: string, field: ScoreField) => {
        const scores = localScores[memberId];
        const currentValue = scores?.[field];
        const newValue: ScoreValue = currentValue === "stroke" ? null : "stroke";
        updateScore(memberId, field, newValue);
    };

    // Create penalty for a player (members or guests)
    const createPenalty = async (player: Player) => {
        // Determine the ID to charge (member ID or guest's host member ID)
        let chargeUserId = player.id;
        let isGuestPenalty = false;

        if (isGuest(player)) {
            if (!player.hostMemberId) {
                showToast("Error: No host member assigned to guest");
                return;
            }
            chargeUserId = player.hostMemberId;
            isGuestPenalty = true;
        }

        try {
            await addDoc(collection(db, "penalties"), {
                userId: chargeUserId,
                amount: 1,
                reason: isGuestPenalty ? `${dict.kniffel.penaltyReason} (${player.name})` : dict.kniffel.penaltyReason,
                date: new Date().toISOString().split("T")[0],
                isPaid: false,
                createdAt: serverTimestamp(),
                // Guest metadata
                isGuestPenalty: isGuestPenalty,
                guestId: isGuestPenalty ? player.id : null,
                guestName: isGuestPenalty ? player.name : null
            });
            showToast(`✓ 1€ ${dict.kniffel.penalty} - ${player.name}`);
        } catch (error) {
            console.error("Error creating penalty:", error);
        }
    };

    // Determine Kniffel row highlighting (exclude strokes and empty)
    const getKniffelHighlight = (memberId: string): boolean => {
        const scores = localScores[memberId];
        const value = scores?.kniffel;
        return typeof value === "number" && value > 0;
    };

    // Determine Chance row highlighting (exclude strokes)
    const getChanceHighlight = (memberId: string): "highest" | "lowest" | null => {
        const filledChanceValues: { memberId: string; value: number }[] = [];

        sortedPlayers.forEach(m => {
            const scores = localScores[m.id];
            const value = scores?.chance;
            if (typeof value === "number") {
                filledChanceValues.push({ memberId: m.id, value });
            }
        });

        const currentScores = localScores[memberId];
        const currentValue = currentScores?.chance;
        if (typeof currentValue !== "number") return null;

        if (filledChanceValues.length <= 1) return null;

        const values = filledChanceValues.map(v => v.value);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);

        if (currentValue === maxValue) return "highest";
        if (currentValue === minValue) return "lowest";
        return null;
    };

    // Field label mapping
    const getFieldLabel = (field: ScoreField): string => {
        const labels: Record<ScoreField, string> = {
            ones: dict.kniffel.ones,
            twos: dict.kniffel.twos,
            threes: dict.kniffel.threes,
            fours: dict.kniffel.fours,
            fives: dict.kniffel.fives,
            sixes: dict.kniffel.sixes,
            threeOfAKind: dict.kniffel.threeOfAKind,
            fourOfAKind: dict.kniffel.fourOfAKind,
            fullHouse: dict.kniffel.fullHouse,
            smallStraight: dict.kniffel.smallStraight,
            largeStraight: dict.kniffel.largeStraight,
            kniffel: dict.kniffel.kniffelRow,
            chance: dict.kniffel.chance
        };
        return labels[field];
    };

    const renderScoreInput = (memberId: string, field: ScoreField) => {
        const scores = localScores[memberId];
        const value = scores?.[field];
        const isKniffel = field === "kniffel";
        const isChance = field === "chance";
        const isStrokeValue = isStroke(value);
        const isFixed = isFixedPointField(field);
        const fixedValue = FIXED_POINT_FIELDS[field];
        const isFilled = isFixed && value === fixedValue;
        const isUpperField = UPPER_FIELDS.includes(field);

        let highlightClass = "";
        if (isStrokeValue) {
            highlightClass = "bg-gray-500/20 border-gray-400/30 text-gray-400 line-through";
        } else if (isFixed && isFilled) {
            highlightClass = "bg-green-500/20 border-green-400/40 text-green-300 font-bold";
        } else if (isKniffel && getKniffelHighlight(memberId)) {
            highlightClass = "bg-yellow-500/30 border-yellow-400/50";
        } else if (isChance) {
            const chanceHighlight = getChanceHighlight(memberId);
            if (chanceHighlight === "highest") {
                highlightClass = "bg-green-500/30 border-green-400/50";
            } else if (chanceHighlight === "lowest") {
                highlightClass = "bg-orange-500/30 border-orange-400/50";
            }
        }

        // Find player name for modal
        const getPlayerName = () => {
            const player = sortedPlayers.find(p => p.id === memberId);
            return player?.name || "";
        };

        // Fixed-point fields: toggle-click behavior
        if (isFixed) {
            return (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleFixedFieldClick(memberId, field)}
                        className={cn(
                            "w-full text-center px-1 py-1.5 rounded-lg border transition-all duration-200 text-sm cursor-pointer",
                            isFilled
                                ? "bg-green-500/20 border-green-400/40 text-green-300 font-bold"
                                : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground"
                        )}
                    >
                        {isStrokeValue ? "-" : (isFilled ? fixedValue : "")}
                    </button>
                    <button
                        onClick={() => toggleStroke(memberId, field)}
                        className={cn(
                            "p-1 rounded transition-colors shrink-0",
                            isStrokeValue
                                ? "bg-gray-500/30 text-gray-300"
                                : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                        )}
                        title={dict.kniffel.stroke}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            );
        }

        // Upper section fields: clickable button that opens dice count modal
        if (isUpperField) {
            const hasValue = !isStrokeValue && value !== undefined && value !== null;
            return (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setDiceCountModal({
                            isOpen: true,
                            playerId: memberId,
                            playerName: getPlayerName(),
                            field: field,
                            currentValue: isStrokeValue ? null : (typeof value === 'number' ? value : null),
                        })}
                        className={cn(
                            "w-full text-center px-1 py-1.5 rounded-lg border transition-all duration-200 text-sm cursor-pointer",
                            isStrokeValue
                                ? "bg-gray-500/20 border-gray-400/30 text-gray-400"
                                : hasValue
                                    ? "bg-primary/20 border-primary/40 text-primary font-semibold"
                                    : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground"
                        )}
                    >
                        {isStrokeValue ? "-" : (hasValue ? value : "")}
                    </button>
                    <button
                        onClick={() => toggleStroke(memberId, field)}
                        className={cn(
                            "p-1 rounded transition-colors shrink-0",
                            isStrokeValue
                                ? "bg-gray-500/30 text-gray-300"
                                : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                        )}
                        title={dict.kniffel.stroke}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            );
        }

        // Lower section non-fixed fields: regular input (threeOfAKind, fourOfAKind, chance)
        return (
            <div className="flex items-center gap-1">
                <input
                    type="text"
                    inputMode="numeric"
                    value={isStrokeValue ? "-" : (value ?? "")}
                    onChange={(e) => handleScoreChange(memberId, field, e.target.value)}
                    className={cn(
                        "w-full text-center px-1 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm",
                        highlightClass
                    )}
                />
                <button
                    onClick={() => toggleStroke(memberId, field)}
                    className={cn(
                        "p-1 rounded transition-colors shrink-0",
                        isStrokeValue
                            ? "bg-gray-500/30 text-gray-300"
                            : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    )}
                    title={dict.kniffel.stroke}
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
        );
    };

    // Content to render - extracted so it can be used in portal or inline
    const scorecardContent = (
        <div
            id="kniffel-scorecard-container"
            className={cn(
                "overflow-x-auto",
                isFullscreen && "kniffel-fullscreen",
                isFullscreen && compactMode
            )}
        >
            {/* Sort and Reorder Controls */}
            <div className={cn(
                "flex justify-end gap-2 mb-3 relative fullscreen-controls",
                isFullscreen && "p-4 pb-0"
            )}>
                {/* Reorder Columns Button */}
                <button
                    onClick={() => setIsReorderMode(!isReorderMode)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-all",
                        isReorderMode
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-white/5 hover:bg-white/10 border-white/10"
                    )}
                    title={isReorderMode ? dict.kniffel.reorderMode : dict.kniffel.reorderColumns}
                >
                    <GripVertical className="h-4 w-4" />
                    <span className="hidden sm:inline">{dict.kniffel.reorderColumns}</span>
                </button>

                {/* Sort Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all h-full"
                    >
                        {getSortIcon()}
                        <span className="hidden sm:inline">{dict.kniffel.sort}: {getSortLabel()}</span>
                        <span className="sm:hidden">{getSortLabel()}</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", showSortDropdown && "rotate-180")} />
                    </button>

                    {showSortDropdown && (
                        <div className="absolute top-full right-0 mt-1 z-10 bg-secondary border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                            {(["scoreHigh", "scoreLow", "alphabet", "manual"] as SortMethod[]).map(method => (
                                <button
                                    key={method}
                                    onClick={() => {
                                        setSortMethod(method);
                                        setShowSortDropdown(false);
                                    }}
                                    className={cn(
                                        "w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors",
                                        sortMethod === method && "bg-primary/20 text-primary"
                                    )}
                                >
                                    {method === "scoreHigh" && dict.kniffel.sortScoreHigh}
                                    {method === "scoreLow" && dict.kniffel.sortScoreLow}
                                    {method === "alphabet" && dict.kniffel.sortAlphabet}
                                    {method === "manual" && dict.kniffel.sortManual}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Fullscreen Toggle Button - Now on the far right */}
                <button
                    onClick={toggleFullscreen}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-all touch-target",
                        isFullscreen
                            ? "bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-300"
                            : "bg-white/5 hover:bg-white/10 border-white/10"
                    )}
                    title={isFullscreen ? dict.kniffel.exitFullscreen : dict.kniffel.enterFullscreen}
                >
                    {isFullscreen ? (
                        <>
                            <X className="h-5 w-5" />
                            <span className="hidden sm:inline">{dict.kniffel.exitFullscreen}</span>
                        </>
                    ) : (
                        <Maximize className="h-4 w-4" />
                    )}
                </button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleColumnReorder}
            >
                <div className={cn("kniffel-table-wrapper", isFullscreen && "flex-1 overflow-auto px-4 pb-4")}>
                    <table className={cn("w-full text-sm border-separate border-spacing-0")}>
                        <thead>
                            <tr>
                                <th className={cn("text-left p-2 font-semibold sticky left-0 z-20 bg-secondary shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] sticky-col", !isFullscreen && "min-w-[140px]")}></th>
                                <SortableContext
                                    items={localPlayerOrder}
                                    strategy={horizontalListSortingStrategy}
                                    disabled={!isReorderMode}
                                >
                                    {sortedPlayers.map((player) => (
                                        <SortablePlayerHeader
                                            key={player.id}
                                            player={player}
                                            isReorderMode={isReorderMode}
                                            isFullscreen={isFullscreen}
                                            dict={dict}
                                        />
                                    ))}
                                </SortableContext>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Upper Section Header */}
                            <tr className="bg-primary/10">
                                <td colSpan={sortedPlayers.length + 1} className="p-2 font-bold text-primary text-xs uppercase tracking-wider sticky left-0 z-20 bg-primary/10">
                                    {dict.kniffel.upperSection}
                                </td>
                            </tr>

                            {/* Upper Section Fields */}
                            {UPPER_FIELDS.map(field => (
                                <tr key={field} className="border-b border-white/5">
                                    <td className={cn("p-2 font-medium sticky left-0 z-10 bg-secondary shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-b border-white/5 sticky-col", isFullscreen && "whitespace-nowrap")}>{isFullscreen && compactMode ? getShortFieldLabel(field) : getFieldLabel(field)}</td>
                                    {sortedPlayers.map((player: Player) => (
                                        <td key={player.id} className={cn("p-1", !isFullscreen && "min-w-[100px]")}>
                                            {renderScoreInput(player.id, field)}
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            {/* Upper Sum */}
                            <tr className="bg-white/5 font-semibold">
                                <td className="p-2 sticky left-0 z-10 bg-secondary/90 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-b border-white/5">{dict.kniffel.upperSum}</td>
                                {sortedPlayers.map((player: Player) => (
                                    <td key={player.id} className={cn("p-2 text-center", !isFullscreen && "min-w-[100px]")}>
                                        {calculateUpperSum(player.id)}
                                    </td>
                                ))}
                            </tr>

                            {/* Bonus */}
                            <tr className="bg-white/5 font-semibold">
                                <td className="p-2 sticky left-0 z-10 bg-secondary/90 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-b border-white/5">{dict.kniffel.bonus}</td>
                                {sortedPlayers.map((player: Player) => (
                                    <td key={player.id} className={cn("p-2 text-center", !isFullscreen && "min-w-[100px]")}>
                                        <span className={cn(calculateBonus(player.id) > 0 && "text-green-400")}>
                                            {calculateBonus(player.id)}
                                        </span>
                                    </td>
                                ))}
                            </tr>

                            {/* Lower Section Header */}
                            <tr className="bg-primary/10">
                                <td colSpan={sortedPlayers.length + 1} className="p-2 font-bold text-primary text-xs uppercase tracking-wider sticky left-0 z-20 bg-primary/10">
                                    {dict.kniffel.lowerSection}
                                </td>
                            </tr>

                            {/* Lower Section Fields */}
                            {LOWER_FIELDS.map(field => (
                                <tr key={field} className="border-b border-white/5">
                                    <td className={cn("p-2 font-medium sticky left-0 z-10 bg-secondary shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-b border-white/5 sticky-col", isFullscreen && "whitespace-nowrap")}>
                                        {isFullscreen && compactMode ? getShortFieldLabel(field) : getFieldLabel(field)}
                                        {isFixedPointField(field) && !isFullscreen && (
                                            <span className="text-xs text-muted-foreground ml-1 block sm:inline">
                                                ({FIXED_POINT_FIELDS[field]})
                                            </span>
                                        )}
                                    </td>
                                    {sortedPlayers.map((player: Player) => (
                                        <td key={player.id} className={cn("p-1", !isFullscreen && "min-w-[100px]")}>
                                            {renderScoreInput(player.id, field)}
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            {/* Lower Sum */}
                            <tr className="bg-white/5 font-semibold">
                                <td className="p-2 sticky left-0 z-10 bg-secondary/90 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-b border-white/5">{dict.kniffel.lowerSum}</td>
                                {sortedPlayers.map((player: Player) => (
                                    <td key={player.id} className={cn("p-2 text-center", !isFullscreen && "min-w-[100px]")}>
                                        {calculateLowerSum(player.id)}
                                    </td>
                                ))}
                            </tr>

                            {/* Total Score */}
                            <tr className="bg-primary/20 font-bold text-lg">
                                <td className="p-3 sticky left-0 z-10 bg-secondary shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-t border-primary/30">{dict.kniffel.total}</td>
                                {sortedPlayers.map((player: Player) => (
                                    <td key={player.id} className={cn("p-3 text-center text-primary", !isFullscreen && "min-w-[100px]")}>
                                        {calculateTotal(player.id)}
                                    </td>
                                ))}
                            </tr>

                            {/* Penalty Row */}
                            <tr className="bg-red-500/10 border-t-2 border-red-500/30">
                                <td className="p-2 font-medium flex items-center gap-2 sticky left-0 z-10 bg-secondary shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-t border-red-500/30">
                                    <AlertCircle className="h-4 w-4 text-red-400" />
                                    {dict.kniffel.penalty}
                                </td>
                                {sortedPlayers.map((player: Player) => (
                                    <td key={player.id} className={cn("p-2 text-center", !isFullscreen && "min-w-[100px]")}>
                                        <button
                                            onClick={() => createPenalty(player)}
                                            className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-500/30 touch-target flex items-center justify-center w-full"
                                        >
                                            1€
                                        </button>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </DndContext>
        </div>
    );

    // Modal element - needs to be portalled in fullscreen mode
    const modalElement = (
        <DiceCountEntryModal
            isOpen={diceCountModal.isOpen}
            onClose={() => setDiceCountModal(prev => ({ ...prev, isOpen: false }))}
            onSave={(score) => {
                handleScoreChange(diceCountModal.playerId, diceCountModal.field, String(score));
            }}
            onStroke={() => {
                toggleStroke(diceCountModal.playerId, diceCountModal.field);
            }}
            fieldLabel={getFieldLabel(diceCountModal.field)}
            multiplier={UPPER_FIELD_MULTIPLIERS[diceCountModal.field] || 1}
            playerName={diceCountModal.playerName}
            currentValue={diceCountModal.currentValue}
        />
    );

    return (
        <>
            <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
            {isFullscreen && typeof document !== 'undefined'
                ? createPortal(scorecardContent, document.body)
                : scorecardContent
            }

            {/* Dice Count Entry Modal - render via portal if in fullscreen */}
            {isFullscreen && typeof document !== 'undefined'
                ? createPortal(modalElement, document.body)
                : modalElement
            }
        </>
    );
}


