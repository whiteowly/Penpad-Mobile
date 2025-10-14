import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Fab, FabIcon } from '@/components/ui/fab';
import { AddIcon, CheckIcon, TrashIcon, Icon } from '@/components/ui/icon';
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
import { Pressable } from '@/components/ui/pressable';
import { app, auth } from '../firebaseConfig';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getFirestore,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { HStack } from '@/components/ui/hstack';

type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
};

const Main = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;

  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const db = useMemo(() => getFirestore(app), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setActiveUserId(currentUser?.uid ?? null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!activeUserId) {
      setTodos([]);
      return;
    }

    const todosQuery = query(
      collection(db, 'users', activeUserId, 'todos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      todosQuery,
      (snapshot) => {
        const nextTodos: TodoItem[] = snapshot.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            text: typeof data.text === 'string' ? data.text : '',
            completed: Boolean(data.completed),
          };
        });

        setTodos(nextTodos);
      },
      (error) => {
        console.error('Failed to load tasks', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        alert(`Could not load tasks. ${message}`);
      }
    );

    return unsubscribe;
  }, [db, activeUserId]);

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
      await addDoc(collection(db, 'users', activeUserId, 'todos'), {
        text: trimmedValue,
        completed: false,
        createdAt: serverTimestamp(),
      });
      setInputValue('');
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
      const todoRef = doc(db, 'users', activeUserId, 'todos', todo.id);
      await updateDoc(todoRef, {
        completed: !todo.completed,
        updatedAt: serverTimestamp(),
      });
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
      const todoRef = doc(db, 'users', activeUserId, 'todos', todo.id);
      await deleteDoc(todoRef);
    } catch (error) {
      console.error('Failed to delete task', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Could not delete task. ${message}`);
    } finally {
      setDeletingId((current) => (current === todo.id ? null : current));
    }
  };

  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos]
  );

  const isAuthenticated = Boolean(activeUserId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <Box className="flex-1 px-6" style={{ backgroundColor }}>
        <Box className="flex-row items-center justify-between mb-4">
          <Box className="items-start w-[56px]">
            <Sidebar />
          </Box>
          <Heading className="flex-1 text-center text-3xl font-bold text-typography-900">
            Tasks
          </Heading>
          <Box className="w-[56px]" />
        </Box>
        <Divider className="my-[1px] w-full" />

        <Box className="mt-6">
          <Heading size="md" className="text-typography-700">
            {todos.length ? `${remainingCount} tasks remaining` : 'No tasks yet'}
          </Heading>
          {!isAuthenticated && (
            <Text className="mt-2 text-typography-500">
              Sign in to sync tasks across your devices.
            </Text>
          )}
          <VStack space="md" className="mt-4">
            {todos.length ? (
              todos.map((todo) => (
                <HStack
                  key={todo.id}
                  className="flex-row items-center justify-between bg-background-50 rounded-xl border border-border-200 px-4 py-3"
                >
                  <Checkbox
                    value={todo.id}
                    isChecked={todo.completed}
                    onChange={() => handleToggleTodo(todo)}
                    className="flex-1"
                  >
                    <CheckboxIndicator>
                      <CheckboxIcon as={CheckIcon} />
                    </CheckboxIndicator>
                    <CheckboxLabel
                      className={`ml-3 text-base ${
                        todo.completed
                          ? 'line-through text-typography-400'
                          : 'text-typography-900'
                      }`}
                    >
                      {todo.text}
                    </CheckboxLabel>
                  </Checkbox>
                  <Pressable
                    className="ml-3 rounded-full p-2"
                    onPress={() => handleDeleteTodo(todo)}
                    isDisabled={deletingId === todo.id}
                    accessibilityLabel="Delete task"
                  >
                    <Icon
                      as={TrashIcon}
                      size="lg"
                      className={`text-error-600 ${
                        deletingId === todo.id ? 'opacity-40' : 'opacity-90'
                      }`}
                    />
                  </Pressable>
                </HStack>
              ))
            ) : (
              <Text className="text-typography-500 self-center justify-center">
                Tap the add button to create your first task.
              </Text>
            )}
          </VStack>
        </Box>

        <Fab
          placement="bottom right"
          size="xl"
          className="m-6"
          onPress={() => setShowModal(true)}
        >
          <FabIcon as={AddIcon} />
        </Fab>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          size="lg"
        >
          <ModalBackdrop />
          <ModalContent>
            <ModalHeader className="flex-col items-center gap-0.5">
              <Heading>Add New Task</Heading>
              <Divider className="my-[5px] w-full" />
            </ModalHeader>
            <ModalBody className="mb-4 w-full">
              <Input variant="rounded" size="xl">
                <InputField
                  placeholder="Add it here..."
                  value={inputValue}
                  onChangeText={setInputValue}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => handleAddTodo()}
                />
              </Input>
            </ModalBody>
            <ModalFooter className="flex-col items-start gap-3 w-full">
              <Button
                size="lg"
                className="w-full bg-primary-500"
                onPress={handleAddTodo}
                isDisabled={isSaving}
              >
                <ButtonText>{isSaving ? 'Adding...' : 'Add It'}</ButtonText>
              </Button>
              <Button
                variant="link"
                size="sm"
                onPress={() => setShowModal(false)}
                className="gap-1"
              >
                <ButtonIcon as={ArrowLeftIcon} />
                <ButtonText>Nevermind</ButtonText>
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </SafeAreaView>
  );
};

export default Main;
