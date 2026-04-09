"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Sparkles, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

interface ShinyEncounterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ShinyEncounterModal({ isOpen, onClose }: ShinyEncounterModalProps) {
    useEffect(() => {
        if (isOpen) {
            // Trigger epic confetti
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function() {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="relative max-w-lg w-full bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 rounded-[2.5rem] p-1 shadow-[0_0_50px_rgba(234,179,8,0.6)]"
                    >
                        <div className="bg-background rounded-[2.3rem] p-8 md:p-10 space-y-6 text-center overflow-hidden relative">
                            {/* Decorative background stars */}
                            <div className="absolute top-10 left-10 opacity-10 animate-pulse">
                                <Star className="h-20 w-20 text-yellow-500" />
                            </div>
                            <div className="absolute bottom-10 right-10 opacity-10 animate-pulse delay-700">
                                <Star className="h-16 w-16 text-yellow-500" />
                            </div>

                            <motion.div 
                                animate={{ 
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 10, -10, 0]
                                }}
                                transition={{ repeat: Infinity, duration: 3 }}
                                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-500/20 border-2 border-yellow-500 mb-2"
                            >
                                <Sparkles className="h-12 w-12 text-yellow-500" />
                            </motion.div>

                            <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase outfit">
                                GEISTESKRANK!
                            </h2>

                            <div className="space-y-4 text-muted-foreground">
                                <p className="text-xl font-bold text-foreground">
                                    Du hast gerade einen <span className="text-yellow-500 font-black">SHINY TOKEN</span> generiert!
                                </p>
                                <p className="leading-relaxed">
                                    Halt dich fest: Die Chance dafür liegt bei exakt <span className="text-foreground font-bold underline">1 zu 8.192</span>. 
                                    Das ist statistisch gesehen so unwahrscheinlich, dass du eigentlich eher von einem Satelliten getroffen werden müsstest, während du diese App bedienst!
                                </p>
                                <p className="bg-primary/5 p-4 rounded-2xl border border-primary/20 text-sm italic">
                                    "Stell dir vor, du würfelst mit einem 8000-seitigen Würfel und triffst die Eins. Genau das hast du gerade getan."
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
                                    <div className="text-2xl font-black text-yellow-500">25x</div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest opacity-60">Wert eines Tokens</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30">
                                    <div className="text-2xl font-black text-primary">5 Pkt.</div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest opacity-60">Saison-Bonus</div>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-primary text-primary-foreground font-black rounded-2xl shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 mt-4"
                            >
                                <Trophy className="h-5 w-5" />
                                ICH BIN DER AUSERWÄHLTE!
                            </button>
                        </div>

                        {/* Sparkles on the edges */}
                        <div className="absolute -top-4 -right-4 bg-yellow-400 p-2 rounded-full border-4 border-background animate-bounce">
                            <Star className="h-6 w-6 text-background fill-current" />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
