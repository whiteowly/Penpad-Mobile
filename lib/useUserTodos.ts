import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { app, auth } from '../firebaseConfig';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
  createdAt?: any;
  updatedAt?: any;
};

type UseUserTodosOptions = {
  onError?: (error: unknown, message: string) => void;
};

export const useUserTodos = (options?: UseUserTodosOptions) => {
  const [activeUserId, setActiveUserId] = useState<string | null>(
    auth.currentUser?.uid ?? null
  );
  const [todos, setTodos] = useState<TodoItem[]>([]);
  // per-todo subtask stats: total and incomplete counts
  const [subtaskStats, setSubtaskStats] = useState<Record<string, { total: number; incomplete: number }>>({});
  const subUnsubsRef = useRef<Record<string, () => void>>({});
  const [summaryCounts, setSummaryCounts] = useState({
    totalCreated: 0,
    totalCompleted: 0,
  });
  const [lastError, setLastError] = useState<any | null>(null);

  const db = useMemo(() => getFirestore(app), []);
  const onError = options?.onError;

  const handleError = useCallback(
    (error: unknown) => {
      // Structured logging to capture Firestore error codes (e.g. permission-denied)
      try {
        console.error('Failed to load todo data', {
          message: error instanceof Error ? error.message : String(error),
          name: (error as any)?.name ?? null,
          code: (error as any)?.code ?? null,
          stack: (error as any)?.stack ?? null,
        });
      } catch (e) {
        console.error('Failed to load todo data (logging failed)', error);
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      onError?.(error, message);
      try {
        setLastError({
          message,
          code: (error as any)?.code ?? null,
          name: (error as any)?.name ?? null,
        });
      } catch (e) {}
    },
    [onError]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setActiveUserId(currentUser?.uid ?? null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!activeUserId) {
      setTodos([]);
      setSummaryCounts({ totalCreated: 0, totalCompleted: 0 });
      return;
    }
    // DEBUG: log current auth state / activeUserId to help diagnose permission issues
    try {
      console.log('DEBUG useUserTodos: starting todos listener', {
        activeUserId,
        authUid: auth.currentUser?.uid ?? null,
      });
    } catch (e) {}

    const todosQuery = query(
      collection(db, 'users', activeUserId, 'todos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(todosQuery, (snapshot) => {
      const nextTodos: TodoItem[] = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          text: typeof data.text === 'string' ? data.text : '',
          completed: Boolean(data.completed),
          createdAt: (data as any).createdAt ?? null,
          updatedAt: (data as any).updatedAt ?? null,
        };
      });

      setTodos(nextTodos);
    }, handleError);

    return unsubscribe;
  }, [db, activeUserId, handleError]);

  useEffect(() => {
    if (!activeUserId) {
      setSummaryCounts({ totalCreated: 0, totalCompleted: 0 });
      return;
    }

    const statsRef = doc(db, 'users', activeUserId, 'stats', 'summary');

    const unsubscribe = onSnapshot(
      statsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setSummaryCounts({ totalCreated: 0, totalCompleted: 0 });
          return;
        }

        const data = snapshot.data();
        setSummaryCounts({
          totalCreated:
            typeof data.totalCreated === 'number' ? data.totalCreated : 0,
          totalCompleted:
            typeof data.totalCompleted === 'number' ? data.totalCompleted : 0,
        });
      },
      handleError
    );

    return unsubscribe;
  }, [db, activeUserId, handleError]);

  // subscribe to subtasks counts for each todo so we can include them in totalCount
  useEffect(() => {
    // cleanup old listeners
    Object.values(subUnsubsRef.current).forEach((unsub) => unsub && unsub());
    subUnsubsRef.current = {};

    if (!activeUserId || todos.length === 0) {
      setSubtaskStats({});
      return;
    }

    todos.forEach((t) => {
      const subsCol = collection(db, 'users', activeUserId, 'todos', t.id, 'subtasks');
      const q = query(subsCol, orderBy('createdAt', 'asc'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          try {
            const total = snap.size;
            const incomplete = snap.docs.reduce((acc, d) => {
              const data = d.data();
              return acc + (data && data.completed ? 0 : 1);
            }, 0);
            setSubtaskStats((prev) => ({ ...prev, [t.id]: { total, incomplete } }));
          } catch (err) {
            handleError(err);
          }
        },
        (err) => handleError(err)
      );
      subUnsubsRef.current[t.id] = unsub;
    });

    return () => {
      Object.values(subUnsubsRef.current).forEach((unsub) => unsub && unsub());
      subUnsubsRef.current = {};
    };
  }, [db, activeUserId, todos, handleError]);

  const totalSubtasks = useMemo(() => {
    // sum total subtasks from per-todo stats
    return Object.values(subtaskStats).reduce((s, v) => s + (v?.total || 0), 0);
  }, [subtaskStats]);

  const incompleteSubtasks = useMemo(() => {
    return Object.values(subtaskStats).reduce((s, v) => s + (v?.incomplete || 0), 0);
  }, [subtaskStats]);

  const remainingCount = useMemo(() => {
    // include top-level incomplete todos plus incomplete subtasks
    const topLevelIncomplete = todos.filter((todo) => !todo.completed).length;
    return topLevelIncomplete + incompleteSubtasks;
  }, [todos, incompleteSubtasks]);

  const totalCount = useMemo(() => {
    // include both top-level todos and subtasks in total count
    return todos.length + totalSubtasks;
  }, [todos.length, totalSubtasks]);

  // completedCount: count of todos completed today (top-level only)
  const completedCount = useMemo(() => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const inRange = (ts: any) => {
        if (!ts) return false;
        // Firestore Timestamp has toDate or toMillis
        let d: Date | null = null;
        if (typeof ts.toDate === 'function') d = ts.toDate();
        else if (typeof ts.toMillis === 'function') d = new Date(ts.toMillis());
        else d = ts instanceof Date ? ts : new Date(ts);
        if (!d || Number.isNaN(d.getTime())) return false;
        return d >= start && d <= end;
      };

      return todos.filter((t) => {
        if (!t.completed) return false;
        // prefer updatedAt, fallback to createdAt
        const ts = (t.updatedAt ?? t.createdAt) as any;
        return inRange(ts);
      }).length;
    } catch (err) {
      console.error('Failed to compute completedCount for today', err);
      return summaryCounts.totalCompleted || 0;
    }
  }, [todos, summaryCounts.totalCompleted]);

  return {
    db,
    todos,
    subtaskStats,
    remainingCount,
    totalCount,
    completedCount,
    activeUserId,
    isAuthenticated: Boolean(activeUserId),
    lastError,
  };
};
