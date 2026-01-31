"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, Users, Check, UserPlus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Member, GuestPlayer, Player } from "@/types";
import { Toast, useToast } from "@/components/common/Toast";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Player Card component for drag-and-drop
interface SortablePlayerCardProps {
    player: Player;
    position: number;
    onRemove?: () => void;
    isGuest: boolean;
}

function SortablePlayerCard({ player, position, onRemove, isGuest }: SortablePlayerCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: player.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-2 p-3 rounded-xl border-2 transition-all",
                isDragging && "opacity-50 scale-105 shadow-xl z-50",
                isGuest
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-primary/30 bg-primary/10"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/10 rounded transition-colors"
            >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                isGuest ? "bg-amber-500 text-amber-950" : "bg-primary text-primary-foreground"
            )}>
                {position}
            </div>
            <div className="flex-1 flex items-center gap-2">
                <span className="font-medium">{player.name}</span>
                {isGuest && (
                    <span className="text-xs px-2 py-0.5 bg-amber-500 text-amber-950 rounded-full font-bold">
                        GUEST
                    </span>
                )}
            </div>
            {isGuest && onRemove && (
                <button
                    onClick={onRemove}
                    className="p-1 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                    title="Remove guest"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

interface PlayerSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: Member[];
    onCreateGame: (data: { selectedPlayerIds: string[]; guests: GuestPlayer[] }) => void;
}

export function PlayerSelectionModal({
    isOpen,
    onClose,
    members,
    onCreateGame
}: PlayerSelectionModalProps) {
    const { dict } = useLanguage();
    const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
    const [guests, setGuests] = useState<GuestPlayer[]>([]);
    const [showGuestInput, setShowGuestInput] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [guestHostMemberId, setGuestHostMemberId] = useState("");
    const { toast, showToast, hideToast } = useToast();

    // Sort members alphabetically for consistent display
    const sortedMembers = useMemo(() => {
        return [...members].sort((a, b) => a.name.localeCompare(b.name));
    }, [members]);

    // Combine members and guests for unified player list
    const allPlayers: Player[] = useMemo(() => {
        return [...sortedMembers, ...guests];
    }, [sortedMembers, guests]);

    const handleToggleSelection = (playerId: string) => {
        setSelectedOrder(prev => {
            if (prev.includes(playerId)) {
                // Remove from selection
                return prev.filter(id => id !== playerId);
            } else {
                // Add to selection
                return [...prev, playerId];
            }
        });
    };

    const handleSelectAll = () => {
        setSelectedOrder(sortedMembers.map(m => m.id));
    };

    const handleDeselectAll = () => {
        setSelectedOrder([]);
    };

    const handleAddGuest = () => {
        const trimmedName = guestName.trim();

        if (trimmedName.length < 2) {
            showToast(dict.kniffel.guestNameTooShort);
            return;
        }

        if (!guestHostMemberId) {
            showToast(dict.kniffel.hostMemberRequired);
            return;
        }

        const newGuest: GuestPlayer = {
            id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: trimmedName,
            isGuest: true,
            hostMemberId: guestHostMemberId
        };

        setGuests(prev => [...prev, newGuest]);
        setGuestName("");
        setGuestHostMemberId("");
        setShowGuestInput(false);
        showToast(dict.kniffel.guestAdded);
    };

    const handleRemoveGuest = (guestId: string) => {
        setGuests(prev => prev.filter(g => g.id !== guestId));
        setSelectedOrder(prev => prev.filter(id => id !== guestId));
    };

    const handleCreateGame = () => {
        if (selectedOrder.length >= 2) {
            onCreateGame({ selectedPlayerIds: selectedOrder, guests });
            setSelectedOrder([]);
            setGuests([]);
            onClose();
        }
    };

    const getSelectionPosition = (playerId: string): number => {
        const index = selectedOrder.indexOf(playerId);
        return index >= 0 ? index + 1 : 0;
    };

    const isSelected = (playerId: string): boolean => {
        return selectedOrder.includes(playerId);
    };

    const isGuest = (player: Player): player is GuestPlayer => {
        return 'isGuest' in player && player.isGuest === true;
    };

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle drag end for reordering selected players
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setSelectedOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Get selected players in order
    const selectedPlayers = useMemo(() => {
        return selectedOrder
            .map(id => allPlayers.find(p => p.id === id))
            .filter((p): p is Player => p !== undefined);
    }, [selectedOrder, allPlayers]);

    if (!isOpen) return null;

    const selectedCount = selectedOrder.length;
    const canCreate = selectedCount >= 2;

    return (
        <>
            <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl ring-1 ring-white/5 overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold outfit">
                                    {dict.kniffel.selectPlayers}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {dict.kniffel.selectPlayersDesc}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Info Banner */}
                        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                            <p className="text-sm text-primary font-medium">
                                💡 {dict.kniffel.selectionOrder}
                            </p>
                        </div>

                        {/* Members Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {sortedMembers.map((member) => {
                                const selected = isSelected(member.id);
                                const position = getSelectionPosition(member.id);

                                return (
                                    <button
                                        key={member.id}
                                        onClick={() => handleToggleSelection(member.id)}
                                        className={cn(
                                            "relative p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 active:scale-95",
                                            "flex flex-col items-center gap-2 min-h-[120px] touch-manipulation",
                                            selected
                                                ? "border-primary bg-primary/10 shadow-lg shadow-primary/25"
                                                : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                                        )}
                                    >
                                        {/* Selection Order Badge */}
                                        {selected && (
                                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                                                {position}
                                            </div>
                                        )}

                                        {/* Avatar or Initials */}
                                        <div
                                            className={cn(
                                                "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold outfit",
                                                selected
                                                    ? "bg-primary/20 text-primary"
                                                    : "bg-white/10 text-muted-foreground"
                                            )}
                                        >
                                            {member.avatarUrl ? (
                                                <img
                                                    src={member.avatarUrl}
                                                    alt={member.name}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                member.name.charAt(0).toUpperCase()
                                            )}
                                        </div>

                                        {/* Name */}
                                        <div className="text-center">
                                            <p className={cn(
                                                "font-semibold text-sm line-clamp-2",
                                                selected ? "text-primary" : ""
                                            )}>
                                                {member.name}
                                            </p>
                                        </div>

                                        {/* Check Icon */}
                                        {selected && (
                                            <div className="absolute bottom-2 right-2">
                                                <Check className="h-4 w-4 text-primary" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Add Guest Section */}
                        <div className="mt-6 pt-6 border-t border-white/10">
                            {!showGuestInput ? (
                                <button
                                    onClick={() => setShowGuestInput(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 transition-all"
                                >
                                    <UserPlus className="h-5 w-5" />
                                    <span className="font-medium">{dict.kniffel.addGuest}</span>
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                            placeholder={dict.kniffel.guestNamePlaceholder}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddGuest()}
                                            className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            value={guestHostMemberId}
                                            onChange={(e) => setGuestHostMemberId(e.target.value)}
                                            className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                                        >
                                            <option value="">{dict.kniffel.selectHostMember}</option>
                                            {sortedMembers.map(member => (
                                                <option key={member.id} value={member.id}>
                                                    {member.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAddGuest}
                                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-medium transition-colors"
                                        >
                                            <Check className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowGuestInput(false);
                                                setGuestName("");
                                                setGuestHostMemberId("");
                                            }}
                                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>)
                        </div>

                        {/* Guest Cards */}
                        {guests.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {guests.map((guest) => {
                                    const selected = isSelected(guest.id);
                                    const position = getSelectionPosition(guest.id);

                                    return (
                                        <div key={guest.id} className="relative">
                                            <button
                                                onClick={() => handleToggleSelection(guest.id)}
                                                className={cn(
                                                    "relative w-full p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 active:scale-95",
                                                    "flex flex-col items-center gap-2 min-h-[120px] touch-manipulation",
                                                    selected
                                                        ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/25"
                                                        : "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50"
                                                )}
                                            >
                                                {/* Guest Badge */}
                                                <div className="absolute -top-2 -left-2 px-2 py-0.5 bg-amber-500 text-amber-950 text-xs font-bold rounded-full">
                                                    {dict.kniffel.guestBadge}
                                                </div>

                                                {/* Selection Order Badge */}
                                                {selected && (
                                                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-500 text-amber-950 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                                                        {position}
                                                    </div>
                                                )}

                                                {/* Avatar Initials */}
                                                <div
                                                    className={cn(
                                                        "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold outfit",
                                                        selected
                                                            ? "bg-amber-500/30 text-amber-400"
                                                            : "bg-amber-500/20 text-amber-500"
                                                    )}
                                                >
                                                    {guest.name.charAt(0).toUpperCase()}
                                                </div>

                                                {/* Name */}
                                                <div className="text-center">
                                                    <p className={cn(
                                                        "font-semibold text-sm line-clamp-2",
                                                        selected ? "text-amber-400" : "text-amber-500"
                                                    )}>
                                                        {guest.name}
                                                    </p>
                                                </div>

                                                {/* Check Icon */}
                                                {selected && (
                                                    <div className="absolute bottom-2 right-2">
                                                        <Check className="h-4 w-4 text-amber-400" />
                                                    </div>
                                                )}
                                            </button>

                                            {/* Remove Guest Button */}
                                            <button
                                                onClick={() => handleRemoveGuest(guest.id)}
                                                className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg z-10"
                                                title={dict.kniffel.removeGuest}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Selected Players - Drag to Reorder */}
                        {selectedPlayers.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Check className="h-4 w-4 text-primary" />
                                    {dict.kniffel.selectedPlayers} ({selectedCount})
                                </h3>
                                <p className="text-xs text-muted-foreground mb-3">
                                    {dict.kniffel.dragToReorderPlayers}
                                </p>

                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={selectedOrder}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {selectedPlayers.map((player, index) => (
                                                <SortablePlayerCard
                                                    key={player.id}
                                                    player={player}
                                                    position={index + 1}
                                                    isGuest={isGuest(player)}
                                                    onRemove={
                                                        isGuest(player)
                                                            ? () => handleRemoveGuest(player.id)
                                                            : undefined
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10 bg-white/5">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Selection Count & Quick Actions */}
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="flex-1 sm:flex-none">
                                    <p className="text-sm font-medium">
                                        <span className="text-2xl font-bold text-primary outfit">
                                            {selectedCount}
                                        </span>{" "}
                                        <span className="text-muted-foreground">
                                            {selectedCount === 1
                                                ? dict.kniffel.playerSelected
                                                : dict.kniffel.playersSelected}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSelectAll}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                    >
                                        {dict.kniffel.selectAll}
                                    </button>
                                    <button
                                        onClick={handleDeselectAll}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                    >
                                        {dict.kniffel.deselectAll}
                                    </button>
                                </div>
                            </div>

                            {/* Create Game Button */}
                            <button
                                onClick={handleCreateGame}
                                disabled={!canCreate}
                                className={cn(
                                    "w-full sm:w-auto px-6 py-3 rounded-xl font-semibold transition-all duration-300",
                                    canCreate
                                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                                        : "bg-white/5 text-muted-foreground cursor-not-allowed opacity-50"
                                )}
                            >
                                {dict.kniffel.createGame}
                            </button>
                        </div>

                        {/* Validation Message */}
                        {!canCreate && selectedCount > 0 && (
                            <p className="mt-3 text-xs text-center text-muted-foreground">
                                {dict.kniffel.minPlayersError}
                            </p>
                        )}
                    </div>
                </div>
            </div >
        </>
    );
}


