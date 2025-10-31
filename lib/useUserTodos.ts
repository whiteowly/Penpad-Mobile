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
};

type UseUserTodosOptions = {
  onError?: (error: unknown, message: string) => void;
};

export const useUserTodos = (options?: UseUserTodosOptions) => {
  const [activeUserId, setActiveUserId] = useState<string | null>(
    auth.currentUser?.uid ?? null
  );
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [subtaskCounts, setSubtaskCounts] = useState<Record<string, number>>({});
  const subUnsubsRef = useRef<Record<string, () => void>>({});
  const [summaryCounts, setSummaryCounts] = useState({
    totalCreated: 0,
    totalCompleted: 0,
  });

  const db = useMemo(() => getFirestore(app), []);
  const onError = options?.onError;

  const handleError = useCallback(
    (error: unknown) => {
      console.error('Failed to load todo data', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      onError?.(error, message);
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
      setSubtaskCounts({});
      return;
    }

    todos.forEach((t) => {
      const subsCol = collection(db, 'users', activeUserId, 'todos', t.id, 'subtasks');
      const q = query(subsCol, orderBy('createdAt', 'asc'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          setSubtaskCounts((prev) => ({ ...prev, [t.id]: snap.size }));
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

  const remainingCount = useMemo(() => todos.filter((todo) => !todo.completed).length, [todos]);

  const totalSubtasks = useMemo(() => {
    return Object.values(subtaskCounts).reduce((s, v) => s + (v || 0), 0);
  }, [subtaskCounts]);

  const totalCount = useMemo(() => {
    // include both top-level todos and subtasks in total count
    return todos.length + totalSubtasks;
  }, [todos.length, totalSubtasks]);

  const completedCount = summaryCounts.totalCompleted;

  return {
    db,
    todos,
    remainingCount,
    totalCount,
    completedCount,
    activeUserId,
    isAuthenticated: Boolean(activeUserId),
  };
};
