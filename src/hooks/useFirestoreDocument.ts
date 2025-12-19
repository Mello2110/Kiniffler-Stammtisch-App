import { useEffect, useState } from "react";
import { onSnapshot, DocumentReference, DocumentData, FirestoreError } from "firebase/firestore";

export function useFirestoreDocument<T = DocumentData>(
    docRef: DocumentReference<DocumentData> | null
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [exists, setExists] = useState(false);
    const [error, setError] = useState<FirestoreError | null>(null);

    useEffect(() => {
        if (!docRef) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const unsubscribe = onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setData({ id: snapshot.id, ...snapshot.data() } as unknown as T);
                    setExists(true);
                } else {
                    setData(null);
                    setExists(false);
                }
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error("Firestore Document Listen Error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => {
            unsubscribe();
        };
    }, [docRef]);

    return { data, loading, error, exists };
}
