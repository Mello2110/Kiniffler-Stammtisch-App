"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, Camera, Check, AlertCircle, Trash2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface BatchUploadProps {
    year: number;
    onUploadComplete: () => void;
}

interface UploadQueueItem {
    id: string;
    file: File;
    preview: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
}

export function BatchUpload({ year, onUploadComplete }: BatchUploadProps) {
    const { user } = useAuth();
    const [queue, setQueue] = useState<UploadQueueItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [description, setDescription] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1920;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(
                        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
                        'image/jpeg',
                        0.85
                    );
                };
            };
            reader.onerror = reject;
        });
    };

    const handleFiles = (files: FileList | null) => {
        if (!files) return;

        const newItems: UploadQueueItem[] = Array.from(files).slice(0, 50).map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            preview: URL.createObjectURL(file),
            progress: 0,
            status: 'pending'
        }));

        setQueue(prev => [...prev, ...newItems].slice(0, 50));
    };

    const removeFile = (id: string) => {
        setQueue(prev => prev.filter(item => item.id !== id));
    };

    const startUpload = async () => {
        if (!user || queue.length === 0 || isProcessing) return;

        setIsProcessing(true);

        const uploadPromises = queue.map(async (item) => {
            if (item.status === 'completed') return;

            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading' } : q));

            try {
                const compressedBlob = await compressImage(item.file);
                const storageRef = ref(storage, `gallery/${year}/${Date.now()}_${item.file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, compressedBlob);

                return new Promise<void>((resolve, reject) => {
                    uploadTask.on(
                        'state_changed',
                        (snapshot) => {
                            const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: p } : q));
                        },
                        (error) => {
                            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: error.message } : q));
                            reject(error);
                        },
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            await addDoc(collection(db, "gallery"), {
                                year,
                                url: downloadURL,
                                description: description.trim(),
                                uploadedBy: user.uid,
                                uploaderName: user.displayName || user.email || "Unbekannt",
                                createdAt: serverTimestamp(),
                            });
                            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', progress: 100 } : q));
                            resolve();
                        }
                    );
                });
            } catch (err) {
                console.error("Upload process error:", err);
                setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: "Fehler (CORS/Netzwerk)" } : q));
            }
        });

        await Promise.allSettled(uploadPromises);
        setIsProcessing(false);
        onUploadComplete();
    };

    const allCompleted = queue.length > 0 && queue.every(q => q.status === 'completed');

    return (
        <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm space-y-8 container max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black outfit flex items-center gap-2">
                        <Camera className="h-6 w-6 text-primary" />
                        Fotos für {year} hochladen
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Maximal 50 Fotos gleichzeitig. Automatische Optimierung aktiv.
                    </p>
                </div>
                {queue.length > 0 && (
                    <button
                        onClick={() => setQueue([])}
                        className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Liste leeren
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">


                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Beschreibung (optional)</label>
                        <textarea
                            placeholder="Was ist auf diesen Bildern zu sehen?"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-4 rounded-2xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[100px] resize-none"
                        />
                    </div>
                </div>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "border-4 border-dashed rounded-[40px] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group",
                        queue.length > 0 ? "bg-muted/30 border-muted-foreground/20 p-8" : "bg-primary/5 border-primary/20 p-12 hover:bg-primary/10 hover:border-primary/40"
                    )}
                >
                    <div className="p-6 rounded-[2rem] bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-500">
                        <Upload className="h-10 w-10" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-black outfit uppercase tracking-wider">Dateien wählen</p>
                        <p className="text-muted-foreground text-sm">Klicken oder Drag & Drop (max. 50)</p>
                    </div>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => handleFiles(e.target.files)}
                    />
                </div>
            </div>

            {queue.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{queue.length} Dateien ausgewählt</p>
                        {allCompleted && (
                            <span className="text-xs font-bold text-green-500 flex items-center gap-1 bg-green-500/10 px-3 py-1 rounded-full">
                                <Check className="h-3 w-3" /> Alle erfolgreich hochgeladen
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[300px] overflow-y-auto p-1">
                        {queue.map((item) => (
                            <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden border bg-muted group">
                                <img src={item.preview} alt="Upload" className="w-full h-full object-cover" />

                                {/* Progress Overlay */}
                                {item.status === 'uploading' && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-2">
                                        <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                                            <div className="bg-white h-full transition-all" style={{ width: `${item.progress}%` }} />
                                        </div>
                                    </div>
                                )}

                                {/* Status Icons */}
                                {item.status === 'completed' && (
                                    <div className="absolute inset-0 bg-green-500/40 flex items-center justify-center">
                                        <Check className="h-6 w-6 text-white bg-green-500 rounded-full p-1" />
                                    </div>
                                )}
                                {item.status === 'error' && (
                                    <div className="absolute inset-0 bg-red-500/40 flex flex-col items-center justify-center p-2 text-center">
                                        <AlertCircle className="h-6 w-6 text-white bg-red-500 rounded-full p-1 mb-1" />
                                        <p className="text-[8px] text-white font-bold leading-tight uppercase">{item.error || "Fehler"}</p>
                                    </div>
                                )}

                                {/* Remove Button */}
                                {item.status === 'pending' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
                                        className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 p-1.5 rounded-full text-white transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={startUpload}
                        disabled={isProcessing || allCompleted || !user}
                        className="w-full py-5 rounded-[2rem] bg-primary text-primary-foreground font-black text-xl outfit tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 overflow-hidden relative shadow-2xl shadow-primary/30"
                    >
                        {isProcessing ? (
                            <div className="flex items-center justify-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                HOCHLADEN...
                            </div>
                        ) : allCompleted ? (
                            "FERTIG!"
                        ) : (
                            "JETZT HOCHLADEN"
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
