"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Loader2, Camera, Check, AlertCircle, Trash2, RefreshCw, Ban } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import EXIF from "exif-js";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface BatchUploadProps {
    year?: number; // Optional - only used for default year in edge cases
    onUploadComplete: (stats: { [year: number]: number }) => void;
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
// Hardcoded fallbacks for production reliability
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "doasrf18u";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "stammtisch_gallery";
const MAX_CONCURRENT_UPLOADS = 3;
const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// DEBUG: Log config on load
console.log("[Cloudinary Config]", {
    cloudName: CLOUDINARY_CLOUD_NAME ? "OK (Set)" : "MISSING",
    preset: CLOUDINARY_UPLOAD_PRESET ? "OK (Set)" : "MISSING"
});

export function BatchUpload({ year, onUploadComplete }: BatchUploadProps) {
    // If no year provided, use current year as fallback (only for display/logging)
    const displayYear = year || new Date().getFullYear();
    const { user } = useAuth();
    const [queue, setQueue] = useState<UploadQueueItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [description, setDescription] = useState("");
    const [configError, setConfigError] = useState<string | null>(null);
    const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeUploadsRef = useRef<Set<string>>(new Set());
    const uploadedStatsRef = useRef<{ [year: number]: number }>({});

    const getExifDate = (file: File): Promise<string | null> => {
        return new Promise((resolve) => {
            try {
                EXIF.getData(file as any, function (this: any) {
                    const date = EXIF.getTag(this, "DateTimeOriginal");
                    console.log(`[EXIF] Raw date for ${file.name}:`, date);

                    if (date && typeof date === 'string') {
                        try {
                            // Expected format: "YYYY:MM:DD HH:MM:SS"
                            const parts = date.split(" ");
                            if (parts.length >= 1) {
                                const datePart = parts[0];
                                const timePart = parts[1] || "12:00:00";
                                const [year, month, day] = datePart.split(":");

                                if (year && month && day) {
                                    const isoString = `${year}-${month}-${day}T${timePart}`;
                                    const d = new Date(isoString);
                                    if (!isNaN(d.getTime())) {
                                        console.log(`[EXIF] Parsed valid date: ${d.toISOString()}`);
                                        resolve(d.toISOString());
                                        return;
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn("[EXIF] Date parsing error:", e);
                        }
                    } else {
                        console.log("[EXIF] No DateTimeOriginal found or invalid format");
                    }
                    resolve(null);
                });
            } catch (err) {
                console.error("[EXIF] Critical error in getData:", err);
                resolve(null);
            }
        });
    };

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

            // Get EXIF date BEFORE compression (compression strips metadata)
            const exifDate = await getExifDate(item.file);
            console.log("[StartUpload] EXIF Date:", exifDate);

            // AUTO-DETECT YEAR
            // Priority: 1. EXIF, 2. Filename Parse, 3. File Last Modified, 4. Current Year
            let detectedYear = new Date().getFullYear(); // Default to current year
            let detectionMethod = "Default (Current Year)";

            if (exifDate) {
                const y = new Date(exifDate).getFullYear();
                if (!isNaN(y) && y > 1900 && y <= new Date().getFullYear() + 1) {
                    detectedYear = y;
                    detectionMethod = "EXIF Data";
                }
            }

            // Fallback: Try to parse date from filename (e.g. IMG_20240512_...)
            if (detectionMethod === "Default (Current Year)") {
                // Common formats: 
                // IMG_20240512_... (Android/iOS)
                // WhatsApp Image 2024-05-12...
                // PXL_20240512_... (Pixel)
                // 20240512_...
                const filenameYearMatch = item.file.name.match(/(20\d{2})[-_]?(\d{2})[-_]?(\d{2})/);
                if (filenameYearMatch) {
                    const y = parseInt(filenameYearMatch[1]);
                    // Sanity check
                    if (y >= 2000 && y <= new Date().getFullYear() + 1) {
                        detectedYear = y;
                        detectionMethod = "Filename Parse";
                    }
                }
            }

            // Fallback: File Last Modified (only if nothing else found)
            if (detectionMethod === "Default (Current Year)" && item.file.lastModified) {
                const d = new Date(item.file.lastModified);
                const y = d.getFullYear();
                if (!isNaN(y)) {
                    // Only use lastModified if it seems reasonable (e.g. not 1970)
                    // AND distinct from "today" if possible? 
                    // Actually, if it's "today" it's ambiguous. But we can't distinguish unless we assume old photos.
                    detectedYear = y;
                    detectionMethod = "File Last Modified";
                }
            }

            // No additional fallback needed - defaults already set above

            console.log(`[StartUpload] Year Decision for ${item.file.name}:
            - Output Year: ${detectedYear}
            - Method: ${detectionMethod}
            - EXIF Date: ${exifDate || "None"}
            - Last Modified: ${new Date(item.file.lastModified).toISOString()}`);

            // Compress image
            const compressedBlob = await compressImage(item.file);
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 30 } : q));

            // Upload to Cloudinary - use DETECTED YEAR in folder path
            const formData = new FormData();
            formData.append('file', compressedBlob, item.file.name);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET || '');
            formData.append('folder', `gallery/${detectedYear}`);

            const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
            const response = await fetch(url, { method: 'POST', body: formData });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Cloudinary upload failed: ${response.status}`);
            }

            const cloudinaryResult = await response.json();
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 80 } : q));

            // Save metadata to Firestore - use DETECTED YEAR
            const timestamp = new Date().toISOString();
            console.log("[StartUpload] Saving to Firestore with publicId:", cloudinaryResult.public_id);
            await addDoc(collection(db, "gallery"), {
                year: detectedYear,
                url: cloudinaryResult.secure_url,
                publicId: cloudinaryResult.public_id,
                description: description.trim(),
                uploadedBy: user.uid,
                uploaderName: user.displayName || user.email || "Unbekannt",
                createdAt: serverTimestamp(),
                captureDate: exifDate || timestamp, // Use EXIF if available, else current time
                uploadDate: timestamp,
            });
            console.log("[StartUpload] Firestore save complete");

            // Store the year stats
            uploadedStatsRef.current[detectedYear] = (uploadedStatsRef.current[detectedYear] || 0) + 1;

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

    // Main upload controller - just starts the process
    const startUpload = () => {
        if (!user || queue.length === 0) return;

        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            const msg = "Cloudinary Konfigurationsfehler. Bitte Entwickler kontaktieren.";
            console.error("[StartUpload]", msg);
            setConfigError(msg);
            return;
        }

        setConfigError(null);
        setIsProcessing(true);
    };

    // Effect to manage queue processing safely without infinite loops
    useEffect(() => {
        if (!isProcessing) return;

        const processQueue = () => {
            // Check if we're done
            const pending = queue.filter(q => q.status === 'pending');
            const uploading = queue.some(q => q.status === 'uploading');

            // If nothing left to do and nothing currently running, we're done
            if (pending.length === 0 && !uploading) {
                console.log("[Queue] All uploads processed", uploadedStatsRef.current);
                setIsProcessing(false);
                // Verify if we actually completed some uploads successfully
                const completed = queue.filter(q => q.status === 'completed').length;
                if (completed > 0) {
                    onUploadComplete(uploadedStatsRef.current);
                    // Reset stats for next batch
                    uploadedStatsRef.current = {};
                }
                return;
            }

            // Check if we can start more uploads
            const activeCount = activeUploadsRef.current.size;
            const slotsAvailable = MAX_CONCURRENT_UPLOADS - activeCount;

            if (slotsAvailable > 0 && pending.length > 0) {
                // Find candidates that are NOT already in the active ref
                // This is the crucial check to prevent double-processing
                const candidates = pending
                    .filter(p => !activeUploadsRef.current.has(p.id))
                    .slice(0, slotsAvailable);

                if (candidates.length > 0) {
                    console.log(`[Queue] Starting ${candidates.length} new uploads`);
                    candidates.forEach(item => {
                        processUpload(item);
                    });
                }
            }
        };

        processQueue();
    }, [queue, isProcessing]); // Re-run when queue changes (item finishes) or processing starts

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
                        Fotos hochladen
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Deine Fotos werden automatisch nach Jahr sortiert. Max. {MAX_QUEUE_SIZE} Bilder gleichzeitig.
                    </p>
                </div>
                {queue.length > 0 && (
                    <button
                        onClick={() => {
                            setQueue([]);
                            setDescription("");
                        }}
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
                </div>
            )}

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
    );
}
