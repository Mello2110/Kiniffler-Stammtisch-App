import { useEffect, useState, useRef } from "react";
import { onSnapshot, Query, DocumentData, FirestoreError } from "firebase/firestore";

interface UseFirestoreQueryOptions {
    idField?: string;
}

export function useFirestoreQuery<T = DocumentData>(
    queryRef: Query<DocumentData> | null,
    options: UseFirestoreQueryOptions = {}
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<FirestoreError | null>(null);

    // We rely on React's dependency array to trigger re-subscriptions when queryRef changes.
    // The consumer MUST memoize the queryRef using useMemo if it's derived in render.

    useEffect(() => {
        if (!queryRef) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const unsubscribe = onSnapshot(queryRef,
            (snapshot) => {
                const docs = snapshot.docs.map(doc => ({
                    ...(options.idField ? { [options.idField]: doc.id } : { id: doc.id }),
                    ...doc.data()
                })) as unknown as T[]; // Type check is loose here, relying on T
                setData(docs);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error("Firestore Listen Error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => {
            unsubscribe();
        };
    }, [queryRef]); // Dependency on queryRef object identity

    return { data, loading, error };
}
