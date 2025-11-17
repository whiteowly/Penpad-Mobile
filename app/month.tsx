import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Fab, FabIcon } from '@/components/ui/fab';
import { AddIcon, CheckIcon, TrashIcon, Icon, ChevronUpIcon, ChevronDownIcon, ClockIcon } from '@/components/ui/icon';
import Sidebar from './sidebar';
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
import { ArrowLeftIcon } from 'lucide-react-native';
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
} from '@/components/ui/checkbox';
import { VStack } from '@/components/ui/vstack';
import { ScrollView, Platform, PanResponder, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
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
} from 'firebase/firestore';
import { HStack } from '@/components/ui/hstack';
import { useUserTodos, TodoItem } from '@/lib/useUserTodos';
import {getMonthAndDay} from './dateCalculator';

type SubtaskItem = {
  id: string;
  text: string;
  completed: boolean;
  // reminders removed
};

const Main = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme].background;

  const [showModal, setShowModal] = useState(false);
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
  // picker / reminder state removed

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
          router.push('/generalTasks' as any);
        }
        // right swipe -> go back (if sensible)
        if (Math.abs(dy) < 80 && dx > 80 && Math.abs(vx) > 0.05) {
          router.back();
        }
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      // cleanup any remaining subcollection listeners
      Object.values(subUnsubs.current).forEach((unsub) => {
        try {
          unsub && unsub();
        } catch (e) {
          // ignore
        }
      });
    };
  }, []);

  // request notification permissions when this screen mounts
  useEffect(() => {
    (async () => {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (err) {
        console.warn('Notification permission request failed', err);
      }
    })();
  }, []);

  const handleLoadError = useCallback((_error: unknown, message: string) => {
    alert(`Could not load tasks. ${message}`);
  }, []);

  const todoHookOptions = useMemo(() => ({ onError: handleLoadError }), [handleLoadError]);

  const { db, activeUserId, isAuthenticated } = useUserTodos(todoHookOptions);
  const [todos, setTodos] = useState<TodoItem[]>([]);

  // subscribe to per-user monthlyTodos collection (separate table from main todos)
  useEffect(() => {
    if (!activeUserId) {
      setTodos([]);
      return;
    }

    const col = collection(db, 'users', activeUserId, 'monthlyTodos');
    const q = query(col, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items: TodoItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            text: typeof data.text === 'string' ? data.text : '',
            completed: Boolean(data.completed),
            // keep reminder metadata if present
            reminderAt: (data as any).reminderAt ?? null,
            notificationId: (data as any).notificationId ?? null,
          } as TodoItem;
        });
        setTodos(items);
      },
      (err) => handleLoadError(err, 'Could not load monthly tasks')
    );

    return () => unsub();
  }, [db, activeUserId, handleLoadError]);

  const sortedTodos = useMemo(() => {
    return [...todos].sort((a, b) => Number(a.completed) - Number(b.completed));
  }, [todos]);

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
      const todoRef = await addDoc(collection(db, 'users', activeUserId, 'monthlyTodos'), {
        text: trimmedValue,
        completed: false,
        createdAt: serverTimestamp(),
      });

      // create subtasks if any
      for (const s of newSubtasks) {
        const t = s.trim();
        if (!t) continue;
        await addDoc(collection(db, 'users', activeUserId, 'monthlyTodos', todoRef.id, 'subtasks'), {
          text: t,
          completed: false,
          createdAt: serverTimestamp(),
        });
      }

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

  const handleToggleTodo = async (todo: TodoItem) => {
    if (!activeUserId) {
      alert('You need to be signed in to update tasks.');
      return;
    }

    try {
  const todoRef = doc(db, 'users', activeUserId, 'monthlyTodos', todo.id);
      const willComplete = !todo.completed;

      await updateDoc(todoRef, { completed: willComplete, updatedAt: serverTimestamp() });

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
      }
      else {
        // if the todo was un-completed, decrement monthly completed counter (best-effort)
        try {
          const monthKey = getMonthKey(new Date());
          const monthStatsRef = doc(db, 'users', activeUserId, 'monthlyStats', monthKey);
          await setDoc(monthStatsRef, { totalCompleted: increment(-1) }, { merge: true });
        } catch (e) {
          // ignore errors here
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
  const todoRef = doc(db, 'users', activeUserId, 'monthlyTodos', todo.id);
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
  const subRef = doc(db, 'users', activeUserId, 'monthlyTodos', todoId, 'subtasks', subId);
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

    // subscribe to subtasks for real-time updates
  const subCol = collection(db, 'users', activeUserId, 'monthlyTodos', todoId, 'subtasks');
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

  const handleAddSubtask = async (todoId: string, text: string) => {
    if (!activeUserId) {
      alert('Sign in to add subtasks');
      return;
    }
    const t = text.trim();
    if (!t) return;
    try {
      await addDoc(collection(db, 'users', activeUserId, 'monthlyTodos', todoId, 'subtasks'), {
        text: t,
        completed: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to add subtask', error);
      alert('Could not add subtask');
    }
  };

  const handleToggleSubtask = async (todoId: string, sub: SubtaskItem) => {
    if (!activeUserId) {
      alert('Sign in to update subtasks');
      return;
    }

    try {
  const subRef = doc(db, 'users', activeUserId, 'monthlyTodos', todoId, 'subtasks', sub.id);
      await updateDoc(subRef, { completed: !sub.completed, updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Failed to update subtask', error);
      alert('Could not update subtask');
    }
  };

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
  const todoRef = doc(db, 'users', activeUserId, 'monthlyTodos', todo.id);
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
  const subRef = doc(db, 'users', activeUserId, 'monthlyTodos', todoId, 'subtasks', sub.id);
      await updateDoc(subRef, { text: newText, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error('Failed to save subtask edit', err);
      alert('Could not save subtask edit');
    } finally {
      setEditingSubtaskKey(null);
      setEditingSubtaskText('');
    }
  };

  // reminder/notification helpers removed

  const getMonthKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`; // e.g. 2025-10
  };

  // Monthly auto-reset disabled for this page: tasks stay until user deletes them.

  const cancelNotification = async (identifier: string | null | undefined) => {
    // reminders removed: no-op
    return;
  };

  // reminder handlers removed

  // subtask reminder handler removed

  // picker support removed

  const pendingTodo = pendingDeleteTodoId ? todos.find((t) => t.id === pendingDeleteTodoId) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <View {...panResponder.panHandlers} style={{ flex: 1 }}>
        <Box className="flex-1 px-6" style={{ backgroundColor }}>
         <Box className="flex-row items-center mb-4">
          <Box className="items-start w-[56px]">
            <Sidebar />
          </Box>
          <HStack space="xl" className="items-center justify-between flex-1 mb-2">
            <Text className="text-xl text-bold" style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}>
              Tasks
            </Text>
            <Text size="lg" className="text-typography-500">{getMonthAndDay()}</Text>
          </HStack>
          <Box className="w-[56px]" />
        </Box>

        <Divider className="my-[1px] w-full" />

        

        <Box className="mt-3">
           <Box className=" flex-row items-center justify-start rounded-md">
           <Pressable onPress={() => router.push('/generalTasks' as any)}>
           <Text size="lg" className="ml-2">General</Text>
           </Pressable>
            <Text size="lg" className="ml-2">•</Text>
            <Pressable onPress={() => router.push('/tasks' as any)}>
            <Text size="lg" className="ml-2">Today</Text>   
            </Pressable>
            <Text size="lg" className="ml-2">•</Text>
            <Pressable onPress={() => router.push('/weekly' as any)}>
            <Text size="lg" className="ml-2">Weekly</Text>
            </Pressable> 
            <Text size="lg" className="ml-2">•</Text>
            <Text size="lg" className="ml-2 border-b border-typography-900 pb-1" >Monthly</Text>   
            <Text size="lg" className="ml-2">•</Text>
          </Box>
          {!isAuthenticated && <Text className="mt-2 text-typography-500">Sign in to sync tasks across your devices.</Text>}

          <ScrollView className="mt-4" contentContainerStyle={{ paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
            <VStack space="sm">
              {todos.length ? (
                sortedTodos.map((todo) => {
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
                            </Pressable>
                          )}
                        </Checkbox>

                        <Pressable className="ml-3 rounded-full p-2" onPress={() => toggleExpand(todo.id)} accessibilityLabel="Toggle subtasks">
                          <Icon as={expandedMap[todo.id] ? ChevronUpIcon : ChevronDownIcon} size="lg" />
                        </Pressable>

                        {/* <Pressable className="ml-3 rounded-full p-2" onPress={() => setPickerState({ type: 'todo', todoId: todo.id, initialDate: (todo as any).reminderAt ? new Date((todo as any).reminderAt) : new Date() })} accessibilityLabel="Set todo reminder">
                          <Icon as={ClockIcon} size="sm" className={`${(todo as any).reminderAt ? 'text-success-600' : 'text-typography-600'}`} />
                        </Pressable> */}



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
                              <Button size="md" className="bg-primary-500 px-6 py-2 rounded-full" onPress={() => { handleAddSubtask(todo.id, subtaskInputs[todo.id] ?? ''); setSubtaskInputs((p) => ({ ...p, [todo.id]: '' })); }}>
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
          {/* Floating action button (fixed bottom-right) - stays visible while scrolling */}
          <Fab style={{ position: 'absolute', right: 20, bottom: 24, zIndex: 50 }} onPress={() => setShowModal(true)} size="xl">
            <FabIcon as={AddIcon} />
          </Fab>
        </Box>
      </View>
    </SafeAreaView>
  );
};

export default Main;


