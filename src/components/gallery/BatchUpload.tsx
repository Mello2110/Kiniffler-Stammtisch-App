"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, Camera, Check, AlertCircle, Trash2, RefreshCw, Ban } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
    status: 'pending' | 'uploading' | 'completed' | 'error' | 'rejected';
    error?: string;
    retryCount: number;
}

// Configuration constants
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const MAX_CONCURRENT_UPLOADS = 3;
const MAX_QUEUE_SIZE = 10;
const MAX_RETRIES = 3;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// DEBUG: Log config on load
console.log("[Cloudinary Config]", {
    cloudName: CLOUDINARY_CLOUD_NAME || "NOT SET",
    preset: CLOUDINARY_UPLOAD_PRESET || "NOT SET"
});

export function BatchUpload({ year, onUploadComplete }: BatchUploadProps) {
    const { user } = useAuth();
    const [queue, setQueue] = useState<UploadQueueItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [description, setDescription] = useState("");
    const [configError, setConfigError] = useState<string | null>(null);
    const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeUploadsRef = useRef<Set<string>>(new Set());

    // FIX: Improved image compression with proper error handling
    const compressImage = (file: File): Promise<Blob> => {
        console.log("[Compress] Starting compression for:", file.name);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                console.log("[Compress] FileReader loaded");
                const img = document.createElement('img');

                img.onload = () => {
                    console.log("[Compress] Image loaded:", img.width, "x", img.height);
                    try {
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
                        if (!ctx) {
                            reject(new Error('Canvas context failed'));
                            return;
                        }
                        ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    console.log("[Compress] Success, blob size:", blob.size);
                                    resolve(blob);
                                } else {
                                    reject(new Error('Compression failed - no blob'));
                                }
                            },
                            'image/jpeg',
                            0.85
                        );
                    } catch (err) {
                        console.error("[Compress] Canvas error:", err);
                        reject(err);
                    }
                };

                img.onerror = (err) => {
                    console.error("[Compress] Image load error:", err);
                    reject(new Error('Failed to load image'));
                };

                img.src = event.target?.result as string;
            };

            reader.onerror = (err) => {
                console.error("[Compress] FileReader error:", err);
                reject(err);
            };

            reader.readAsDataURL(file);
        });
    };

    const uploadToCloudinary = async (file: Blob, fileName: string): Promise<string> => {
        console.log("[Upload] Starting Cloudinary upload for:", fileName);

        const formData = new FormData();
        formData.append('file', file, fileName);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET || '');
        formData.append('folder', `gallery/${year}`);

        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
        console.log("[Upload] Posting to:", url);

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        console.log("[Upload] Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Upload] Cloudinary error:", errorText);
            throw new Error(`Cloudinary upload failed: ${response.status}`);
        }

        const data = await response.json();
        console.log("[Upload] Success! URL:", data.secure_url);
        return data.secure_url;
    };

    // File validation - blocks videos and non-image files
    const validateFile = (file: File): { valid: boolean; error?: string } => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
            if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'].includes(ext)) {
                return { valid: false, error: 'Nur Bilder - keine Videos!' };
            }
            return { valid: false, error: `Nicht unterstützt: .${ext}` };
        }
        return { valid: true };
    };

    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        console.log("[Files] Selected:", files.length, "files");

        const pendingCount = queue.filter(q => q.status === 'pending' || q.status === 'uploading').length;
        const availableSlots = MAX_QUEUE_SIZE - pendingCount;

        if (availableSlots <= 0) {
            setConfigError(`Upload-Warteschlange voll! Max. ${MAX_QUEUE_SIZE} gleichzeitig.`);
            return;
        }

        setConfigError(null);
        const rejected: string[] = [];
        const validItems: UploadQueueItem[] = [];

        Array.from(files).slice(0, availableSlots).forEach(file => {
            const validation = validateFile(file);
            if (!validation.valid) {
                rejected.push(`${file.name}: ${validation.error}`);
            } else {
                validItems.push({
                    id: Math.random().toString(36).substring(7),
                    file,
                    preview: URL.createObjectURL(file),
                    progress: 0,
                    status: 'pending',
                    retryCount: 0
                });
            }
        });

        if (rejected.length > 0) {
            setRejectedFiles(rejected);
            setTimeout(() => setRejectedFiles([]), 5000); // Clear after 5s
        }

        if (validItems.length > 0) {
            setQueue(prev => [...prev, ...validItems]);
        }

        // Clear file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (id: string) => {
        setQueue(prev => prev.filter(item => item.id !== id));
    };

    // Process single upload with retry logic
    const processUpload = async (item: UploadQueueItem): Promise<void> => {
        if (!user) return;

        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading', progress: 10 } : q));
        activeUploadsRef.current.add(item.id);

        try {
            console.log("[StartUpload] Processing:", item.file.name);

            // Compress image
            const compressedBlob = await compressImage(item.file);
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 30 } : q));

            // Upload to Cloudinary
            const downloadURL = await uploadToCloudinary(compressedBlob, item.file.name);
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 80 } : q));

            // Save metadata to Firestore
            console.log("[StartUpload] Saving to Firestore...");
            await addDoc(collection(db, "gallery"), {
                year,
                url: downloadURL,
                description: description.trim(),
                uploadedBy: user.uid,
                uploaderName: user.displayName || user.email || "Unbekannt",
                createdAt: serverTimestamp(),
            });
            console.log("[StartUpload] Firestore save complete");

            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', progress: 100 } : q));
        } catch (err) {
            console.error("[StartUpload] Error uploading:", item.file.name, err);

            // Check if we should retry
            const currentItem = queue.find(q => q.id === item.id);
            const retryCount = (currentItem?.retryCount || 0) + 1;

            if (retryCount < MAX_RETRIES) {
                console.log(`[StartUpload] Retry ${retryCount}/${MAX_RETRIES} for:`, item.file.name);
                setQueue(prev => prev.map(q => q.id === item.id ? {
                    ...q,
                    status: 'pending',
                    progress: 0,
                    retryCount,
                    error: `Retry ${retryCount}/${MAX_RETRIES}...`
                } : q));
            } else {
                setQueue(prev => prev.map(q => q.id === item.id ? {
                    ...q,
                    status: 'error',
                    error: err instanceof Error ? err.message : "Upload fehlgeschlagen"
                } : q));
            }
        } finally {
            activeUploadsRef.current.delete(item.id);
        }
    };

    // Main upload controller with concurrency limit
    const startUpload = useCallback(async () => {
        console.log("[StartUpload] Called", { user: !!user, queueLen: queue.length, isProcessing });

        if (!user || queue.length === 0 || isProcessing) {
            console.log("[StartUpload] Early return - conditions not met");
            return;
        }

        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            const msg = "Cloudinary nicht konfiguriert! Bitte NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME und NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local setzen.";
            console.error("[StartUpload]", msg);
            setConfigError(msg);
            return;
        }

        setConfigError(null);
        setIsProcessing(true);
        console.log("[StartUpload] Processing queue with concurrency:", MAX_CONCURRENT_UPLOADS);

        const processQueue = async () => {
            while (true) {
                // Get pending items
                const pendingItems = queue.filter(q => q.status === 'pending');
                if (pendingItems.length === 0 && activeUploadsRef.current.size === 0) {
                    break;
                }

                // Fill up to MAX_CONCURRENT_UPLOADS
                const availableSlots = MAX_CONCURRENT_UPLOADS - activeUploadsRef.current.size;
                const itemsToProcess = pendingItems.slice(0, availableSlots);

                if (itemsToProcess.length > 0) {
                    await Promise.all(itemsToProcess.map(item => processUpload(item)));
                } else if (activeUploadsRef.current.size > 0) {
                    // Wait a bit for active uploads to complete
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    break;
                }

                // Re-fetch queue state
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        };

        await processQueue();

        console.log("[StartUpload] All uploads complete");
        setIsProcessing(false);
        onUploadComplete();
    }, [user, queue, isProcessing, description, year, onUploadComplete]);

    const pendingCount = queue.filter(q => q.status === 'pending').length;
    const uploadingCount = queue.filter(q => q.status === 'uploading').length;
    const completedCount = queue.filter(q => q.status === 'completed').length;
    const errorCount = queue.filter(q => q.status === 'error').length;
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
                        Max. {MAX_QUEUE_SIZE} Bilder gleichzeitig. {MAX_CONCURRENT_UPLOADS} parallele Uploads.
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

            {/* Config error alert */}
            {configError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-500 font-bold text-sm">Fehler</p>
                        <p className="text-red-400 text-xs mt-1">{configError}</p>
                    </div>
                </div>
            )}

            {/* Rejected files alert */}
            {rejectedFiles.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 flex items-start gap-3 animate-in shake">
                    <Ban className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-orange-500 font-bold text-sm">Dateien abgelehnt</p>
                        <ul className="text-orange-400 text-xs mt-1 space-y-0.5">
                            {rejectedFiles.map((msg, i) => (
                                <li key={i}>{msg}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

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

                    {/* Queue status */}
                    {queue.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="bg-muted px-2 py-1 rounded-full">
                                📋 Warteschlange: {pendingCount + uploadingCount}/{MAX_QUEUE_SIZE}
                            </span>
                            {uploadingCount > 0 && (
                                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                    ⬆️ Aktiv: {uploadingCount}
                                </span>
                            )}
                            {completedCount > 0 && (
                                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                                    ✅ Fertig: {completedCount}
                                </span>
                            )}
                            {errorCount > 0 && (
                                <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                                    ❌ Fehler: {errorCount}
                                </span>
                            )}
                        </div>
                    )}
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
                        <p className="text-muted-foreground text-sm">Nur Bilder (JPG, PNG, WebP, GIF)</p>
                    </div>
                    <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => handleFiles(e.target.files)}
                    />
                </div>
            </div>

            {queue.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{queue.length} Dateien</p>
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
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2">
                                        <Loader2 className="h-6 w-6 text-white animate-spin mb-2" />
                                        <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                                            <div className="bg-white h-full transition-all" style={{ width: `${item.progress}%` }} />
                                        </div>
                                        <p className="text-[10px] text-white mt-1">{item.progress}%</p>
                                    </div>
                                )}

                                {/* Pending with retry info */}
                                {item.status === 'pending' && item.retryCount > 0 && (
                                    <div className="absolute inset-0 bg-yellow-500/40 flex flex-col items-center justify-center p-2">
                                        <RefreshCw className="h-5 w-5 text-white animate-spin" />
                                        <p className="text-[8px] text-white font-bold mt-1">Retry {item.retryCount}</p>
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

                                {/* Remove Button - for pending and error states */}
                                {(item.status === 'pending' || item.status === 'error') && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
                                        className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 p-1.5 rounded-full text-white transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={startUpload}
                        disabled={isProcessing || allCompleted || !user || pendingCount === 0}
                        className="w-full py-5 rounded-[2rem] bg-primary text-primary-foreground font-black text-xl outfit tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 overflow-hidden relative shadow-2xl shadow-primary/30"
                    >
                        {isProcessing ? (
                            <div className="flex items-center justify-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                HOCHLADEN... ({uploadingCount} aktiv)
                            </div>
                        ) : allCompleted ? (
                            "FERTIG!"
                        ) : (
                            `JETZT HOCHLADEN (${pendingCount})`
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
