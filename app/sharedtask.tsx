import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Fab, FabIcon } from '@/components/ui/fab';
import { AddIcon, CheckIcon, TrashIcon, Icon, ChevronUpIcon, ChevronDownIcon, ClockIcon } from '@/components/ui/icon';
import { Divider } from '@/components/ui/divider';
import {
    Modal,
    ModalBackdrop,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from '@/components/ui/modal';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { ArrowLeft, ArrowLeftIcon, MessageCircleMore } from 'lucide-react-native';
import {
    Checkbox,
    CheckboxIndicator,
    CheckboxIcon,
    CheckboxLabel,
} from '@/components/ui/checkbox';
import { VStack } from '@/components/ui/vstack';
import { ScrollView, PanResponder, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Pressable } from '@/components/ui/pressable';

import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    deleteDoc,
    setDoc,
    increment,
    onSnapshot,
    query,
    orderBy,
    where,
} from 'firebase/firestore';
import { HStack } from '@/components/ui/hstack';
import { useUserTodos, TodoItem } from '@/lib/useUserTodos';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { useLocalSearchParams } from 'expo-router';
import { auth } from '@/firebaseConfig';
type SubtaskItem = {
    id: string;
    text: string;
    completed: boolean;
    reminderAt?: any | null;
    notificationId?: string | null;
};
type Params = {
    uid?: string;
};
const Main = () => {
    const colorScheme = useColorScheme();
    const backgroundColor = Colors[colorScheme].background;
    const params = useLocalSearchParams<Params>();
    const targetUid = params.uid ?? null;
    const [showModal, setShowModal] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [shareFriendUid, setShareFriendUid] = useState('');
    const [sharingTodoId, setSharingTodoId] = useState<string | null>(null);
    const [pendingDeleteTodoId, setPendingDeleteTodoId] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [newSubtasks, setNewSubtasks] = useState<string[]>(['']);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
    const [subtasksMap, setSubtasksMap] = useState<Record<string, SubtaskItem[]>>({});
    const subUnsubs = useRef<Record<string, () => void>>({});
    const [subtaskInputs, setSubtaskInputs] = useState<Record<string, string>>({});
    const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
    const [editingTodoText, setEditingTodoText] = useState('');
    const [editingSubtaskKey, setEditingSubtaskKey] = useState<string | null>(null); // `${todoId}:${subId}`
    const [editingSubtaskText, setEditingSubtaskText] = useState('');
    const [messages, setMessages] = useState<Array<any>>([]);
    const [chatLastSeen, setChatLastSeen] = useState<Record<string, any>>({});
    const [pickerState, setPickerState] = useState<
        | { type: 'todo'; todoId: string; initialDate: Date }
        | { type: 'subtask'; todoId: string; subId: string; initialDate: Date }
        | null
    >(null);
    const [targetUser, setTargetUser] = useState<{ username?: string; displayName?: string; photoURL?: string } | null>(null);
    const targetUserPlaceholder = null; // placeholder, no-op (keeps nearby code layout)
    const me = auth.currentUser;
    const myUid = me?.uid ?? null;
    const scrollRef = useRef<ScrollView | null>(null);
    const router = useRouter();

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_evt, gestureState) => {
                const { dx, dy } = gestureState;
                // activate when horizontal movement dominates
                return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
            },
            onPanResponderRelease: (_evt, gestureState) => {
                const { dx, dy, vx } = gestureState;
                // left swipe -> next page (weekly)
                if (Math.abs(dy) < 80 && dx < -80 && Math.abs(vx) > 0.05) {
                    // cast to any to satisfy expo-router generated route union types
                    router.push('/tasks' as any);
                }
                // right swipe -> go back (if sensible)
                if (Math.abs(dy) < 80 && dx > 80 && Math.abs(vx) > 0.05) {
                    router.back();
                }
            },
        })
    ).current;

    useEffect(() => {
        // cleanup any remaining subcollection listeners on unmount
        return () => {
            Object.values(subUnsubs.current).forEach((unsub) => {
                try {
                    unsub && unsub();
                } catch (e) {
                    // ignore
                }
            });
        };
    }, []);

    // (Notification device-token registration removed)

    const handleLoadError = useCallback((_error: unknown, message: string) => {
        alert(`Could not load tasks. ${message}`);
    }, []);

    const todoHookOptions = useMemo(() => ({ onError: handleLoadError }), [handleLoadError]);
    // get user todo state and Firestore instance from shared hook
    const { db, todos, activeUserId, isAuthenticated } = useUserTodos(todoHookOptions);
    const IS_SHARED = true; // this page operates on the top-level `shared` collection

    const [sharedTasks, setSharedTasks] = useState<TodoItem[]>([]);
    // cache of user profiles for quick lookup of who created a shared task
    const [creators, setCreators] = useState<Record<string, { username?: string; displayName?: string; photoURL?: string }>>({});

    const sortedTodos = useMemo(() => {
        return [...todos].sort((a, b) => Number(a.completed) - Number(b.completed));
    }, [todos]);

    const sortedSharedTasks = useMemo(() => {
        return [...sharedTasks].sort((a, b) => Number(a.completed) - Number(b.completed));
    }, [sharedTasks]);

    // subscribe to shared tasks where the active user is a participant
    useEffect(() => {
        if (!activeUserId) {
            setSharedTasks([]);
            return;
        }
            try {
                const col = collection(db, 'shared');
                const q = query(col, where('participants', 'array-contains', activeUserId));
                const unsub = onSnapshot(
                    q,
                    (snapshot) => {
                        let items: TodoItem[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
                            // if viewing a specific friend's shared page, filter to docs that include that friend
                            if (targetUid) {
                                items = items.filter((it: any) => Array.isArray((it as any).participants) && (it as any).participants.includes(targetUid));
                            }
                            // sort client-side by createdAt desc
                            items.sort((a: any, b: any) => {
                                const ta = (a.createdAt && (a.createdAt as any).toMillis ? (a.createdAt as any).toMillis() : (a.createdAt ? Number(a.createdAt) : 0));
                                const tb = (b.createdAt && (b.createdAt as any).toMillis ? (b.createdAt as any).toMillis() : (b.createdAt ? Number(b.createdAt) : 0));
                                return tb - ta;
                            });
                            setSharedTasks(items);

                            // fetch creator profiles for any creators we don't have cached yet
                            (async () => {
                                try {
                                    const missing = Array.from(new Set(items.map((it: any) => (it as any).createdBy).filter(Boolean))).filter((uid) => !(uid in creators));
                                    if (missing.length === 0) return;
                                    const fetched: Record<string, { username?: string; displayName?: string; photoURL?: string }> = {};
                                    for (const uid of missing) {
                                        try {
                                            const uDoc = await getDoc(doc(db, 'users', uid));
                                            if (uDoc.exists()) {
                                                const d = uDoc.data() as any;
                                                fetched[uid] = { username: d.username, displayName: d.displayName, photoURL: d.photoURL };
                                            } else {
                                                fetched[uid] = { username: undefined, displayName: undefined, photoURL: undefined };
                                            }
                                        } catch (e) {
                                            console.error('Failed to fetch creator profile for', uid, e);
                                            fetched[uid] = { username: undefined, displayName: undefined, photoURL: undefined };
                                        }
                                    }
                                    setCreators((prev) => ({ ...prev, ...fetched }));
                                } catch (e) {
                                    console.error('Failed to fetch creators', e);
                                }
                            })();
                    },
                    (err) => {
                        console.error('Failed to load shared tasks (fallback)', err);
                        setSharedTasks([]);
                    }
                );

                return () => {
                    try { unsub && unsub(); } catch (_e) {}
                };
            } catch (err) {
                console.error('Failed to subscribe to shared tasks', err);
                setSharedTasks([]);
            }
    }, [activeUserId, db]);

    const handleAddTodo = async () => {
        const trimmedValue = inputValue.trim();
        if (!trimmedValue || !activeUserId) {
            if (!activeUserId) {
                alert('You need to be signed in to add tasks.');
            }
            return;
        }

        try {
            setIsSaving(true);
            // create in shared collection when on the shared page
            const rootCol = IS_SHARED ? collection(db, 'shared') : collection(db, 'users', activeUserId, 'todos');
            const participants = IS_SHARED ? (targetUid ? [activeUserId, targetUid] : [activeUserId]) : undefined;
            const todoRef = await addDoc(rootCol, {
                text: trimmedValue,
                completed: false,
                participants,
                createdBy: IS_SHARED ? activeUserId : undefined,
                createdAt: serverTimestamp(),
            });

            // create subtasks if any
            for (const s of newSubtasks) {
                const t = s.trim();
                if (!t) continue;
                const subCol = IS_SHARED ? collection(db, 'shared', todoRef.id, 'subtasks') : collection(db, 'users', activeUserId, 'todos', todoRef.id, 'subtasks');
                await addDoc(subCol, {
                    text: t,
                    completed: false,
                    createdAt: serverTimestamp(),
                });
            }

            // update stats only for personal todos
            if (!IS_SHARED) {
                try {
                    const statsRef = doc(db, 'users', activeUserId, 'stats', 'summary');
                    await setDoc(statsRef, { totalCreated: increment(1) }, { merge: true });
                    // also increment monthly-created counter for the current month
                    try {
                        const monthKey = getMonthKey(new Date());
                        const monthStatsRef = doc(db, 'users', activeUserId, 'monthlyStats', monthKey);
                        await setDoc(monthStatsRef, { totalCreated: increment(1) }, { merge: true });
                    } catch (e) {
                        console.error('Failed to update monthly created count', e);
                    }
                } catch (statsError) {
                    console.error('Failed to update created-task count', statsError);
                }
            }

            setInputValue('');
            setNewSubtasks(['']);
            setShowModal(false);
        } catch (error) {
            console.error('Failed to add task', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Could not add task. ${message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const openShareModal = (todoId: string) => {
        setSharingTodoId(todoId);
        setShareFriendUid('');
        setShareModalVisible(true);
    };

    const closeShareModal = () => {
        setSharingTodoId(null);
        setShareFriendUid('');
        setShareModalVisible(false);
    };

    const handleConfirmShare = async () => {
        if (!activeUserId) {
            alert('Sign in to share tasks');
            return;
        }
        const raw = (shareFriendUid || '').trim();
        if (!raw) {
            alert('Enter at least one friend UID to share with');
            return;
        }
        if (!sharingTodoId) {
            alert('No task selected to share');
            return;
        }

        // allow multiple UIDs separated by commas or whitespace; create one shared doc per friend
        const friendUids = raw.split(/[\s,]+/).map((s) => s.trim()).filter((s) => s.length > 0);
        // remove duplicates and exclude self
        const uniqueFriendUids = Array.from(new Set(friendUids)).filter((u) => u !== activeUserId);
        if (uniqueFriendUids.length === 0) {
            alert('No valid friend UIDs provided (cannot share with yourself).');
            return;
        }

        try {
            // find the todo to share
            const todo = todos.find((t) => t.id === sharingTodoId);
            if (!todo) {
                alert('Could not find the task to share');
                return;
            }

            const failures: string[] = [];
            for (const fuid of uniqueFriendUids) {
                try {
                    await addDoc(collection(db, 'shared'), {
                        text: todo.text ?? '',
                        createdBy: activeUserId,
                        participants: [activeUserId, fuid],
                        originalTodoId: todo.id,
                        createdAt: serverTimestamp(),
                        completed: todo.completed ?? false,
                    });
                } catch (e) {
                    console.error('Failed to create shared doc for', fuid, e);
                    failures.push(fuid);
                }
            }

            if (failures.length === 0) {
                alert('Task shared successfully');
            } else if (failures.length === uniqueFriendUids.length) {
                alert('Failed to share task with any of the specified friends.');
            } else {
                alert(`Shared with some friends; failed for: ${failures.join(', ')}`);
            }

            closeShareModal();
        } catch (err) {
            console.error('Failed to share task batch', err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            alert(`Could not share task. ${message}`);
        }
    };

    const handleToggleTodo = async (todo: TodoItem) => {
        if (!activeUserId) {
            alert('You need to be signed in to update tasks.');
            return;
        }

        try {
            const todoRef = IS_SHARED ? doc(db, 'shared', todo.id) : doc(db, 'users', activeUserId, 'todos', todo.id);
            const willComplete = !todo.completed;

            await updateDoc(todoRef, { completed: willComplete, updatedAt: serverTimestamp() });

            if (!IS_SHARED) {
                if (willComplete) {
                    try {
                        const statsRef = doc(db, 'users', activeUserId, 'stats', 'summary');
                        await setDoc(statsRef, { totalCompleted: increment(1) }, { merge: true });
                        // update monthly completed counter
                        try {
                            const monthKey = getMonthKey(new Date());
                            const monthStatsRef = doc(db, 'users', activeUserId, 'monthlyStats', monthKey);
                            await setDoc(monthStatsRef, { totalCompleted: increment(1) }, { merge: true });
                        } catch (e) {
                            console.error('Failed to update monthly completed count', e);
                        }
                    } catch (statsError) {
                        console.error('Failed to update completed-task count', statsError);
                    }
                } else {
                    // if the todo was un-completed, decrement monthly completed counter (best-effort)
                    try {
                        const monthKey = getMonthKey(new Date());
                        const monthStatsRef = doc(db, 'users', activeUserId, 'monthlyStats', monthKey);
                        await setDoc(monthStatsRef, { totalCompleted: increment(-1) }, { merge: true });
                    } catch (e) {
                        // ignore
                    }
                }
            }
        } catch (error) {
            console.error('Failed to update task', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Could not update task. ${message}`);
        }
    };

    const handleDeleteTodo = async (todo: TodoItem) => {
        if (!activeUserId) {
            alert('You need to be signed in to delete tasks.');
            return;
        }

        try {
            setDeletingId(todo.id);
            const todoRef = IS_SHARED ? doc(db, 'shared', todo.id) : doc(db, 'users', activeUserId, 'todos', todo.id);
            await deleteDoc(todoRef);
        } catch (error) {
            console.error('Failed to delete task', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Could not delete task. ${message}`);
        } finally {
            setDeletingId((current) => (current === todo.id ? null : current));
        }
    };

    const handleDeleteSubtask = async (todoId: string, subId: string) => {
        if (!activeUserId) {
            alert('You need to be signed in to delete subtasks.');
            return;
        }

        try {
            setDeletingId(subId);
            const subRef = IS_SHARED ? doc(db, 'shared', todoId, 'subtasks', subId) : doc(db, 'users', activeUserId, 'todos', todoId, 'subtasks', subId);
            await deleteDoc(subRef);
        } catch (error) {
            console.error('Failed to delete subtask', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Could not delete subtask. ${message}`);
        } finally {
            setDeletingId((current) => (current === subId ? null : current));
        }
    };

    const toggleExpand = (todoId: string) => {
        const isExpanded = Boolean(expandedMap[todoId]);
        if (isExpanded) {
            setExpandedMap((prev) => ({ ...prev, [todoId]: false }));
            const unsub = subUnsubs.current[todoId];
            if (unsub) {
                unsub();
                delete subUnsubs.current[todoId];
            }
            return;
        }

        setExpandedMap((prev) => ({ ...prev, [todoId]: true }));

        if (!activeUserId) return;

        // subscribe to subtasks for real-time updates (shared or user)
        const subCol = IS_SHARED ? collection(db, 'shared', todoId, 'subtasks') : collection(db, 'users', activeUserId, 'todos', todoId, 'subtasks');
        const q = query(subCol, orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(
            q,
            (snapshot) => {
                const items: SubtaskItem[] = snapshot.docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id,
                        text: typeof data.text === 'string' ? data.text : '',
                        completed: Boolean(data.completed),
                        // include reminder metadata so UI can reflect reminder state
                        // keep as raw value (timestamp/date) and notificationId if present
                        reminderAt: (data as any).reminderAt ?? null,
                        notificationId: (data as any).notificationId ?? null,
                    };
                });
                setSubtasksMap((prev) => ({ ...prev, [todoId]: items }));
            },
            (err) => console.error('Failed to load subtasks', err)
        );

        subUnsubs.current[todoId] = unsub;
    };

    const handleAddSubtask = async (todoId: string, text: string): Promise<string | null> => {
        if (!activeUserId) {
            alert('Sign in to add subtasks');
            return null;
        }
        const t = text.trim();
        if (!t) return null;
        try {
            const subCol = IS_SHARED ? collection(db, 'shared', todoId, 'subtasks') : collection(db, 'users', activeUserId, 'todos', todoId, 'subtasks');
            const ref = await addDoc(subCol, {
                text: t,
                completed: false,
                createdAt: serverTimestamp(),
            });
            return ref.id;
        } catch (error) {
            console.error('Failed to add subtask', error);
            alert('Could not add subtask');
            return null;
        }
    };

    const handleToggleSubtask = async (todoId: string, sub: SubtaskItem) => {
        if (!activeUserId) {
            alert('Sign in to update subtasks');
            return;
        }

        try {
            const subRef = IS_SHARED ? doc(db, 'shared', todoId, 'subtasks', sub.id) : doc(db, 'users', activeUserId, 'todos', todoId, 'subtasks', sub.id);
            await updateDoc(subRef, { completed: !sub.completed, updatedAt: serverTimestamp() });
        } catch (error) {
            console.error('Failed to update subtask', error);
            alert('Could not update subtask');
        }
    };
    const chatId = useMemo(() => {
        if (!myUid || !targetUid) return null;
        return [myUid, targetUid].sort().join('_');
    }, [myUid, targetUid]);

    // load target user for header
    useEffect(() => {
        if (!targetUid) return;
        const uRef = doc(db, 'users', targetUid);
        const unsub = onSnapshot(uRef, (snap) => {
            if (!snap.exists()) return setTargetUser(null);
            const d = snap.data() as any;
            setTargetUser({ username: d.username, displayName: d.displayName, photoURL: d.photoURL });
        });
        return () => unsub();
    }, [db, targetUid]);

    // subscribe to messages
    useEffect(() => {
        if (!chatId) return;
        const msgsCol = collection(db, 'chats', chatId, 'messages');
        const q = query(msgsCol, orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

            // detect newly added messages
            try {
                const changes = snap.docChanges();
                for (const ch of changes) {
                    if (ch.type !== 'added') continue;
                    const m = ch.doc.data() as any;
                    const msgId = ch.doc.id;
                    const createdBy = m.createdBy ?? null;
                    // ignore our own messages
                    if (!createdBy || createdBy === myUid) continue;

                    // compute message timestamp in ms
                    const msgTs = (m.createdAt && (m.createdAt as any).toMillis) ? (m.createdAt as any).toMillis() : (m.createdAt ? Number(m.createdAt) : Date.now());

                    // get my lastSeen for this chat (if any) from chatLastSeen map
                    const myLastSeenRaw = myUid ? chatLastSeen?.[myUid] : null;
                    const myLastSeenMs = myLastSeenRaw ? (myLastSeenRaw.toMillis ? myLastSeenRaw.toMillis() : Number(myLastSeenRaw)) : null;

                    // only notify if message is after my last seen timestamp (or if none recorded)
                    if (myLastSeenMs && msgTs <= myLastSeenMs) continue;

                    // schedule a local notification for the incoming message
                    (async () => {
                        try {
                            await Notifications.scheduleNotificationAsync({
                                content: {
                                    title: targetUser?.displayName ? `${targetUser.displayName}` : 'New message',
                                    body: typeof m.text === 'string' ? m.text : 'New message',
                                    data: { chatId, messageId: msgId },
                                },
                                trigger: null as any,
                            });
                        } catch (e) {
                            console.error('Failed to send local notification for incoming message', e);
                        }
                    })();
                }
            } catch (e) {
                console.error('Error while handling message changes for notifications', e);
            }

            setMessages(docs);
            // scroll to bottom in next tick
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
        });
        return () => unsub();
    }, [db, chatId]);

    // subscribe to chat-level lastSeen map so we know when each participant last opened the chat
    useEffect(() => {
        if (!chatId) {
            setChatLastSeen({});
            return;
        }
        const chatDocRef = doc(db, 'chats', chatId);
        const unsub = onSnapshot(chatDocRef, (snap) => {
            if (!snap.exists()) {
                setChatLastSeen({});
                return;
            }
            const data = snap.data() as any;
            setChatLastSeen((data && data.lastSeen) ? (data.lastSeen as Record<string, any>) : {});
        }, (err) => {
            console.error('Failed to subscribe to chat lastSeen', err);
            setChatLastSeen({});
        });
        return () => unsub();
    }, [db, chatId]);

    const unreadCount = useMemo(() => {
        if (!chatId) return 0;
        // count messages from the other user with createdAt after my lastSeen recorded in Firestore
        const others = messages.filter((m) => (m.createdBy ? m.createdBy !== myUid : true));
        if (!others.length) return 0;
        const myLastSeen = (() => {
            if (!myUid) return null;
            const raw = chatLastSeen?.[myUid];
            if (!raw) return null;
            return raw && (raw.toMillis ? raw.toMillis() : Number(raw));
        })();
        const count = others.filter((m) => {
            const ca = (m.createdAt && (m.createdAt as any).toMillis) ? (m.createdAt as any).toMillis() : (m.createdAt ? Number(m.createdAt) : 0);
            if (!myLastSeen) return true;
            return ca > myLastSeen;
        }).length;
        return count;
    }, [messages, chatLastSeen, chatId, myUid]);

    const startEditTodo = (todo: TodoItem) => {
        setEditingTodoId(todo.id);
        setEditingTodoText(todo.text ?? '');
    };

    const saveEditTodo = async (todo: TodoItem) => {
        if (!activeUserId) {
            alert('Sign in to edit tasks');
            return;
        }
        const newText = editingTodoText.trim();
        if (!newText) {
            setEditingTodoId(null);
            setEditingTodoText('');
            return;
        }

        try {
            const todoRef = IS_SHARED ? doc(db, 'shared', todo.id) : doc(db, 'users', activeUserId, 'todos', todo.id);
            await updateDoc(todoRef, { text: newText, updatedAt: serverTimestamp() });
        } catch (err) {
            console.error('Failed to save todo edit', err);
            alert('Could not save task edit');
        } finally {
            setEditingTodoId(null);
            setEditingTodoText('');
        }
    };

    const startEditSubtask = (todoId: string, sub: SubtaskItem) => {
        setEditingSubtaskKey(`${todoId}:${sub.id}`);
        setEditingSubtaskText(sub.text ?? '');
    };

    const saveEditSubtask = async (todoId: string, sub: SubtaskItem) => {
        if (!activeUserId) {
            alert('Sign in to edit subtasks');
            return;
        }
        const newText = editingSubtaskText.trim();
        if (!newText) {
            setEditingSubtaskKey(null);
            setEditingSubtaskText('');
            return;
        }

        try {
            const subRef = IS_SHARED ? doc(db, 'shared', todoId, 'subtasks', sub.id) : doc(db, 'users', activeUserId, 'todos', todoId, 'subtasks', sub.id);
            await updateDoc(subRef, { text: newText, updatedAt: serverTimestamp() });
        } catch (err) {
            console.error('Failed to save subtask edit', err);
            alert('Could not save subtask edit');
        } finally {
            setEditingSubtaskKey(null);
            setEditingSubtaskText('');
        }
    };

    const scheduleNotification = async (title: string, body: string, date: Date) => {
        try {
            const id = await Notifications.scheduleNotificationAsync({
                content: { title, body },
                trigger: date as any,
            });
            return id;
        } catch (err) {
            console.error('Failed to schedule notification', err);
            return null;
        }
    };

    const sendImmediateNotification = async (title: string, body: string) => {
        try {
            await Notifications.scheduleNotificationAsync({
                content: { title, body },
                // use null/undefined trigger to fire immediately (avoid strict trigger typing)
                trigger: null as any,
            });
        } catch (err) {
            console.error('Failed to send notification', err);
        }
    };

    const getMonthKey = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    };

    // Month-boundary check for todos: clear `todos` at month boundary and notify
    useEffect(() => {
        if (!activeUserId) return;

        const runResetCheck = async () => {
            try {
                const now = new Date();

                // Only run reset on month boundary: either last day (30th/31st) or 1st of month
                const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                let finalizeMonthStart: Date | null = null;
                if (now.getDate() === 1) {
                    finalizeMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                } else if (now.getDate() === lastDayOfMonth) {
                    finalizeMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                } else {
                    return;
                }

                const prevMonthKey = getMonthKey(finalizeMonthStart);
                const prevPrevMonthKey = getMonthKey(new Date(finalizeMonthStart.getFullYear(), finalizeMonthStart.getMonth() - 1, 1));

                const metaRef = doc(db, 'users', activeUserId, 'stats', 'monthlyMeta');
                const metaSnap = await getDoc(metaRef);
                const lastProcessed = metaSnap.exists() ? (metaSnap.data() as any).lastProcessedMonth : null;
                if (lastProcessed === prevMonthKey) return;

                const prevStatsRef = doc(db, 'users', activeUserId, 'monthlyStats', prevMonthKey);
                const prevStatsSnap = await getDoc(prevStatsRef);
                const prevStats = prevStatsSnap.exists() ? (prevStatsSnap.data() as any) : { totalCompleted: 0 };

                const prevPrevStatsRef = doc(db, 'users', activeUserId, 'monthlyStats', prevPrevMonthKey);
                const prevPrevStatsSnap = await getDoc(prevPrevStatsRef);
                const prevPrevStats = prevPrevStatsSnap.exists() ? (prevPrevStatsSnap.data() as any) : { totalCompleted: 0 };

                const completedThis = Number(prevStats.totalCompleted || 0);
                const completedBefore = Number(prevPrevStats.totalCompleted || 0);
                const delta = completedThis - completedBefore;

                let msg = '';
                if (delta > 0) msg = `You completed ${delta} more tasks than the previous month.`;
                else if (delta < 0) msg = `You completed ${Math.abs(delta)} fewer tasks than the previous month.`;
                else msg = `You completed the same number of tasks as the month before.`;

                // delete todos and their subtasks
                const todosCol = collection(db, 'users', activeUserId, 'todos');
                const todosSnap = await getDocs(todosCol);
                const deletes: Promise<any>[] = [];
                for (const td of todosSnap.docs) {
                    const subsCol = collection(db, 'users', activeUserId, 'todos', td.id, 'subtasks');
                    const subsSnap = await getDocs(subsCol);
                    for (const s of subsSnap.docs) {
                        deletes.push(deleteDoc(doc(db, 'users', activeUserId, 'todos', td.id, 'subtasks', s.id)));
                    }
                    deletes.push(deleteDoc(doc(db, 'users', activeUserId, 'todos', td.id)));
                }
                await Promise.all(deletes);

                await setDoc(metaRef, { lastProcessedMonth: prevMonthKey }, { merge: true });

                // reset the global summary completed count so Profile/computed completedCount restarts
                await setDoc(doc(db, 'users', activeUserId, 'stats', 'summary'), { totalCompleted: 0 }, { merge: true });

                await sendImmediateNotification('Monthly Summary', msg);
            } catch (err) {
                console.error('Tasks month reset failed', err);
            }
        };

        runResetCheck();
    }, [activeUserId, db]);

    const cancelNotification = async (identifier: string | null | undefined) => {
        if (!identifier) return;
        try {
            await Notifications.cancelScheduledNotificationAsync(identifier);
        } catch (err) {
            console.error('Failed to cancel scheduled notification', err);
        }
    };



   

    const pendingTodo = pendingDeleteTodoId ? (IS_SHARED ? sharedTasks.find((t) => t.id === pendingDeleteTodoId) : todos.find((t) => t.id === pendingDeleteTodoId)) : null;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor }}>
            <View {...panResponder.panHandlers} style={{ flex: 1 }}>
                <Box className="flex-1 px-6" style={{ backgroundColor }}>
                    <HStack className="items-center ">
                        <Box className="items-start w-[56px]">
                            <Button size="2xl" variant="link" onPress={() => router.back()}>
                                <ButtonIcon as={ArrowLeft} />
                            </Button>
                        </Box>

                        <Box className="flex-1 items-center">
                            <Text className="text-xl text-bold text-center" style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}>
                                {targetUser?.username ? `${targetUser.username}` : targetUser?.displayName ?? 'Shared Tasks'}
                            </Text>
                        </Box>
                        <Box className="items-end w-[56px]">
                            <Pressable onPress={() => {
                                if (targetUid) {
                                    router.push(`/frenProfile?uid=${encodeURIComponent(targetUid)}` as any);
                                } else {
                                    router.push('/frenProfile' as any);
                                }
                            }} style={{ position: 'relative' }}>
                                <Avatar size="md">
                                    {targetUser?.photoURL ? (
                                        <AvatarImage source={{ uri: targetUser.photoURL }} alt="avatar" />
                                    ) : (
                                        <AvatarFallbackText>{targetUser?.displayName ?? targetUser?.username ?? '?'}</AvatarFallbackText>
                                    )}
                                </Avatar>
                                
                               
                            </Pressable>
                        </Box>
                    </HStack>
                    <Divider className="my-[1px] w-full" />



                    <Box className="mt-3">




                        {!isAuthenticated && <Text className="mt-2 text-typography-500">Sign in to sync tasks across your devices.</Text>}

                        <ScrollView className="mt-4" contentContainerStyle={{ paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
                            <VStack space="sm">
                                {(IS_SHARED ? sharedTasks.length : todos.length) ? (
                                    (IS_SHARED ? sortedSharedTasks : sortedTodos).map((todo) => {
                                        const isExpanded = Boolean(expandedMap[todo.id]);
                                        const hstackClass = `flex-row items-center justify-between bg-background-50 ${isExpanded ? 'rounded-t-xl' : 'rounded-xl'}  border-border-200 px-2 py-3`;

                                        return (
                                            <VStack key={todo.id} space="0">
                                                <HStack className={hstackClass}>
                                                    <Checkbox value={todo.id} isChecked={todo.completed} onChange={() => handleToggleTodo(todo)} className="flex-1">
                                                        <CheckboxIndicator>
                                                            <CheckboxIcon as={CheckIcon} />
                                                        </CheckboxIndicator>
                                                        {editingTodoId === todo.id ? (
                                                            <Input variant="outline" size="md" className="ml-3 flex-1">
                                                                <InputField
                                                                    value={editingTodoText}
                                                                    onChangeText={setEditingTodoText}
                                                                    autoFocus
                                                                    returnKeyType="done"
                                                                    onSubmitEditing={() => saveEditTodo(todo)}
                                                                    onBlur={() => setEditingTodoId(null)}
                                                                />
                                                            </Input>
                                                        ) : (
                                                            <Pressable onLongPress={() => startEditTodo(todo)} delayLongPress={300} className="flex-1">
                                                                <CheckboxLabel className={`ml-3 text-base ${todo.completed ? 'line-through text-typography-400' : 'text-typography-900'}`}>
                                                                    {todo.text}
                                                                </CheckboxLabel>
                                                                {/* show who added this task (if known) */}
                                                                {((todo as any).createdBy) && (
                                                                    <Text className="text-xs text-typography-500 mt-1 ml-3">
                                                                        {((todo as any).createdBy) === activeUserId ? 'Added by you' : `Added by ${creators[(todo as any).createdBy]?.displayName ?? creators[(todo as any).createdBy]?.username ?? 'Unknown'}`}
                                                                    </Text>
                                                                )}
                                                            </Pressable>
                                                        )}
                                                    </Checkbox>

                                                    <Pressable className="ml-3 rounded-full p-2" onPress={() => toggleExpand(todo.id)} accessibilityLabel="Toggle subtasks">
                                                        <Icon as={expandedMap[todo.id] ? ChevronUpIcon : ChevronDownIcon} size="lg" />
                                                    </Pressable>
                                                    <Pressable className="ml-3 rounded-full p-2" onPress={() => setPendingDeleteTodoId(todo.id)} disabled={deletingId === todo.id} accessibilityLabel="Delete task">
                                                        <Icon as={TrashIcon} size="lg" className={`text-error-600 ${deletingId === todo.id ? 'opacity-40' : 'opacity-90'}`} />
                                                    </Pressable>
                                                </HStack>

                                                {isExpanded && (
                                                    <Box className="w-full bg-background-50 rounded-b-xl border-border-200 border-t-0 px-4 py-2 pl-6 -mt-px">
                                                        {(
                                                            (subtasksMap[todo.id] || []).map((sub, idx, arr) => (
                                                                <React.Fragment key={sub.id}>
                                                                    <HStack className="flex-row items-center justify-between w-full py-2">
                                                                        <Checkbox value={sub.id} isChecked={sub.completed} onChange={() => handleToggleSubtask(todo.id, sub)} className="flex-1">
                                                                            <CheckboxIndicator>
                                                                                <CheckboxIcon as={CheckIcon} />
                                                                            </CheckboxIndicator>
                                                                            {editingSubtaskKey === `${todo.id}:${sub.id}` ? (
                                                                                <Input variant="outline" size="md" className="ml-3 flex-1">
                                                                                    <InputField
                                                                                        value={editingSubtaskText}
                                                                                        onChangeText={setEditingSubtaskText}
                                                                                        autoFocus
                                                                                        returnKeyType="done"
                                                                                        onSubmitEditing={() => saveEditSubtask(todo.id, sub)}
                                                                                        onBlur={() => setEditingSubtaskKey(null)}
                                                                                    />
                                                                                </Input>
                                                                            ) : (
                                                                                <Pressable onLongPress={() => startEditSubtask(todo.id, sub)} delayLongPress={300} className="flex-1">
                                                                                    <CheckboxLabel className={`ml-3 text-base ${sub.completed ? 'line-through text-typography-400' : 'text-typography-900'}`}>{sub.text}</CheckboxLabel>
                                                                                </Pressable>
                                                                            )}
                                                                        </Checkbox>



                                                                        <Pressable className="ml-3 rounded-full p-2" onPress={() => handleDeleteSubtask(todo.id, sub.id)} disabled={deletingId === sub.id} accessibilityLabel="Delete subtask">
                                                                            <Icon as={TrashIcon} size="sm" className={`text-error-600 ${deletingId === sub.id ? 'opacity-40' : 'opacity-90'}`} />
                                                                        </Pressable>
                                                                    </HStack>
                                                                    {idx < (arr?.length ?? 0) - 1 && <Divider className="my-2 w-full" />}
                                                                </React.Fragment>
                                                            ))
                                                        )}

                                                        {!todo.completed && (
                                                            <HStack space='sm' className="w-full mt-3">
                                                                <Input variant="rounded" size="md" className="flex-1">
                                                                    <InputField placeholder="Add subtask..." value={subtaskInputs[todo.id] ?? ''} onChangeText={(v) => setSubtaskInputs((p) => ({ ...p, [todo.id]: v }))} />
                                                                </Input>

                                                     

                                                                <Button size="md" className="bg-primary-500 px-6 py-2 rounded-full" onPress={async () => {
                                                                    const text = subtaskInputs[todo.id] ?? '';
                                                                    const newId = await handleAddSubtask(todo.id, text);
                                                                    setSubtaskInputs((p) => ({ ...p, [todo.id]: '' }));
                                                                    
                                                                }}>
                                                                    <ButtonText>Add</ButtonText>
                                                                </Button>

                                                            </HStack>
                                                        )}
                                                    </Box>
                                                )}
                                            </VStack>
                                        );
                                    })
                                ) : (
                                    <Text className="text-typography-500 self-center justify-center">Tap the add button to create your first task.</Text>
                                )}
                            </VStack>
                        </ScrollView>

        
                    </Box>


                    <Modal isOpen={Boolean(pendingDeleteTodoId)} onClose={() => setPendingDeleteTodoId(null)} size="md">
                        <ModalBackdrop />
                        <ModalContent>
                            <ModalHeader className="flex-col items-center gap-0.5">
                                <Text style={{ fontFamily: 'Poppins_600SemiBold' }} size="xl">Delete Task</Text>
                                <Divider className="my-[5px] w-full" />
                            </ModalHeader>
                            <ModalBody>

                                {pendingTodo && <Text className="mt-2 text-typography-500">Delete "{pendingTodo.text}"?</Text>}
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="outline" action="secondary" className="mr-3" onPress={() => setPendingDeleteTodoId(null)}>
                                    <ButtonText>Nuh</ButtonText>
                                </Button>
                                <Button
                                    onPress={() => {
                                        if (pendingTodo) handleDeleteTodo(pendingTodo);
                                        setPendingDeleteTodoId(null);
                                    }}
                                >
                                    <ButtonText>Yuh</ButtonText>
                                </Button>
                            </ModalFooter>
                        </ModalContent>
                    </Modal>

                    


                    <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg">
                        <ModalBackdrop />
                        <ModalContent>
                            <ModalHeader className="flex-col items-center gap-0.5">
                                <Text style={{ fontFamily: 'Poppins_600SemiBold' }} size="xl">Add New Task</Text>
                                <Divider className="my-[5px] w-full" />
                            </ModalHeader>
                            <ModalBody className="mb-4 w-full">
                                <Input variant="outline" size="xl">
                                    <InputField placeholder="Add it here..." value={inputValue} onChangeText={setInputValue} autoFocus returnKeyType="done" onSubmitEditing={() => handleAddTodo()} />
                                </Input>
                              
                            </ModalBody>
                            <ModalFooter className="flex-col items-start gap-3 w-full">
                                <Button size="lg" className="w-full bg-primary-500" onPress={handleAddTodo} isDisabled={isSaving}>
                                    <ButtonText>Add It</ButtonText>
                                </Button>
                                <Button variant="link" size="sm" onPress={() => setShowModal(false)} className="gap-1">
                                    <ButtonIcon as={ArrowLeftIcon} />
                                    <ButtonText>Nevermind</ButtonText>
                                </Button>
                            </ModalFooter>
                        </ModalContent>
                    </Modal>

                    
                    <Fab
                        style={{ position: 'absolute', right: 20, bottom: 96, zIndex: 50 }}
                        size="xl"
                        onPress={() => {
                            if (!targetUid) {
                                alert('No chat user selected');
                                return;
                            }
                            // mark messages as seen (store lastSeen timestamp in Firestore) before navigating
                            (async () => {
                                try {
                                    if (chatId && myUid) {
                                        await setDoc(doc(db, 'chats', chatId), { lastSeen: { [myUid]: serverTimestamp() } }, { merge: true });
                                    }
                                } catch (e) {
                                    console.error('Failed to mark chat as seen in Firestore', e);
                                } finally {
                                    router.push(`/chat?uid=${encodeURIComponent(String(targetUid))}` as any);
                                }
                            })();
                        }}
                    >
                        <FabIcon as={MessageCircleMore} />
                        {unreadCount > 0 && (
                            <Box 
                                className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border border-white" 
                                style={{ position: 'absolute', top: 12, right: 12 }}
                            />
                        )}
                    </Fab>
                    
                    <Fab style={{ position: 'absolute', right: 20, bottom: 24, zIndex: 50 }} size="xl" onPress={() => setShowModal(true)}>
                        <FabIcon as={AddIcon} />
                    </Fab>

                </Box>
            </View>
        </SafeAreaView>
    );
};

export default Main;


