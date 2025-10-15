import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos]
  );
  const totalCount = summaryCounts.totalCreated;
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
