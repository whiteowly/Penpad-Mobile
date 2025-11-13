
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonIcon } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { app, auth } from '../firebaseConfig';
import { getFirestore, collection, doc, setDoc, serverTimestamp, onSnapshot, query, orderBy, addDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { ScrollView, Image, View, Platform } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import {  ArrowLeft } from 'lucide-react-native';
import { KeyboardAvoidingView } from 'react-native';
import { SendHorizontal } from 'lucide-react-native';
import { Divider } from '@/components/ui/divider';

type Params = {
  uid?: string; // target user id passed in the route
};

const ChatPage = () => {
  const params = useLocalSearchParams<Params>();
  const targetUid = params.uid ?? null;

  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme].background;


  const db = useMemo(() => getFirestore(app), []);
  const storage = useMemo(() => getStorage(app), []);
  const me = auth.currentUser;
  const myUid = me?.uid ?? null;

  const [targetUser, setTargetUser] = useState<{ username?: string; displayName?: string; photoURL?: string } | null>(null);
  const [messages, setMessages] = useState<Array<any>>([]);
  const [text, setText] = useState('');
  // which message id is showing its timestamp (tapped)
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  // Helpers to parse and format timestamps
  const toDate = (ts: any): Date | null => {
    if (!ts) return null;
    try {
      if (typeof ts?.toDate === 'function') return ts.toDate();
      if (ts && typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
      if (typeof ts === 'number') return new Date(ts);
      return new Date(String(ts));
    } catch (e) {
      return null;
    }
  };

  // canonical day key for comparing message days (YYYY-MM-DD)
  const getDayKey = (ts: any) => {
    const d = toDate(ts);
    if (!d) return '';
    return d.toISOString().slice(0, 10);
  };

  const formatDateReadable = (ts: any) => {
    const d = toDate(ts);
    if (!d) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (isSameDay(d, today)) return 'Today';
    if (isSameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (ts: any) => {
    const d = toDate(ts);
    if (!d) return '';
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const scrollRef = useRef<ScrollView | null>(null);

  // compute chatId deterministically
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
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      // scroll to bottom in next tick
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => unsub();
  }, [db, chatId]);

  const pickImageAndSend = async () => {
    if (!myUid || !chatId) return;
    // ensure chat metadata exists and includes both participants
    const ensureChatExists = async () => {
      try {
        if (!auth.currentUser) {
          const msg = 'Not authenticated when trying to create chat metadata';
          console.error(msg);
          throw new Error(msg);
        }
        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
          // create chat metadata. If this fails due to rules, we rethrow
          // DEBUG: log the payload and current auth uid so we can inspect what the
          // server sees and why rules may reject the write.
          try {
            console.log('DEBUG creating chat metadata', {
              chatId,
              participants: [myUid, targetUid],
              authUid: auth.currentUser?.uid ?? null,
            });
          } catch (e) {
            // ignore logging errors
          }
          await setDoc(chatRef, {
            participants: [myUid, targetUid],
            createdAt: serverTimestamp(),
          });
        }
      } catch (err: any) {
        // Provide more actionable logging so we can debug permission errors
        console.error('Failed to ensure chat exists', {
          message: err?.message ?? err,
          code: err?.code ?? null,
          stack: err?.stack ?? null,
        });
        // rethrow so callers can react and show the error to the user
        throw err;
      }
    };
    await ensureChatExists();
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        alert('Permission to access media is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri ?? (result as any).uri;
      if (!uri) return;

      // fetch file and upload. Some RN environments don't support `blob()`
      // so we fall back to arrayBuffer -> Uint8Array. We also provide
      // contentType metadata to Storage so server can infer file type.
      const resp = await fetch(uri);
      const contentType = resp.headers?.get?.('Content-Type') ?? 'image/jpeg';
      let uploadPayload: any;
      try {
        // preferred path for modern runtimes
        uploadPayload = await resp.blob();
      } catch (e) {
        // fallback for environments where blob() isn't implemented
        const buf = await resp.arrayBuffer();
        uploadPayload = new Uint8Array(buf);
      }

      const ts = Date.now();
      const fileRef = storageRef(storage, `chats/${chatId}/${ts}.jpg`);

      // Debug: log auth and upload details before starting
      try {
        console.log('DEBUG upload start', {
          authUid: auth.currentUser?.uid ?? null,
          chatId,
          uri,
          contentType,
          size: uploadPayload?.size ?? uploadPayload?.length ?? null,
          type: Object.prototype.toString.call(uploadPayload),
        });
      } catch (e) {
        // ignore logging errors
      }

      // Use resumable upload to get richer error callbacks and progress events
      const metadata = { contentType } as any;
      const uploadTask = uploadBytesResumable(fileRef, uploadPayload, metadata);

      // wrap the upload task in a promise so we can await and catch errors with more detail
      const url: string = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            try {
              const progress = snapshot.totalBytes ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 : null;
              console.log('DEBUG upload progress', { progress });
            } catch (e) { }
          },
          (uploadErr) => {
            // this error often contains useful info from the SDK/server
            console.error('DEBUG upload task error', uploadErr);
            reject(uploadErr);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch (e) {
              reject(e);
            }
          }
        );
      });

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        fromUid: myUid,
        toUid: targetUid,
        mediaUrl: url,
        text: null,
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      // Log full error to console for debugging
      console.error('Failed to pick/upload image', err);

      // Build a safe error payload to show to the user/developer
      const safeErr = {
        code: err?.code ?? null,
        message: err?.message ?? String(err),
        name: err?.name ?? null,
        // firebase storage may include a serverResponse or serverResponseText
        serverResponse: err?.serverResponse ?? err?.serverResponseText ?? null,
      };

      // Try to show a detailed alert so the developer can copy the error
      try {
        alert(`Could not send image:\n${JSON.stringify(safeErr, null, 2)}`);
      } catch (e) {
        // fallback to simple message if stringify/alert fails
        alert(`Could not send image: ${safeErr.message}`);
      }
    }
  };

  const sendMessage = async () => {
    if (!myUid || !chatId || (!text.trim())) return;
    // ensure chat metadata exists before attempting to send
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        // DEBUG: log payload and auth before creating
        try {
          console.log('DEBUG create chat metadata (sendMessage path)', {
            chatId,
            participants: [myUid, targetUid],
            authUid: auth.currentUser?.uid ?? null,
          });
        } catch (e) { }
        await setDoc(chatRef, { participants: [myUid, targetUid], createdAt: serverTimestamp() });
      }
    } catch (err: any) {
      // Log full error and surface to user with code/message to diagnose rules issues
      console.error('Failed to ensure chat metadata exists', {
        message: err?.message ?? err,
        code: err?.code ?? null,
        stack: err?.stack ?? null,
      });
      alert(`Could not create chat metadata: ${err?.code ?? ''} ${err?.message ?? String(err)}`);
      // stop — there's no point attempting to send if metadata creation is blocked
      return;
    }
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        fromUid: myUid,
        toUid: targetUid,
        text: text.trim(),
        mediaUrl: null,
        createdAt: serverTimestamp(),
      });
      setText('');
    } catch (err: any) {
      console.error('Failed to send message', {
        message: err?.message ?? err,
        code: err?.code ?? null,
        stack: err?.stack ?? null,
      });
      alert(`Could not send message: ${err?.code ?? ''} ${err?.message ?? String(err)}`);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <Box className="flex-1 px-2" style={{ backgroundColor }}>
          <HStack className="items-center ">
            <Box className="items-start w-[56px]">
              <Button size="2xl" variant="link" onPress={() => router.back()}>
                <ButtonIcon as={ArrowLeft} />
              </Button>
            </Box>

            <Box className="flex-1 items-center">
              <Text className="text-xl text-bold text-center" style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}>
                {targetUser?.username ? `${targetUser.username}` : targetUser?.displayName ?? 'Chat'}
              </Text>
            </Box>
            <Box className="items-end w-[56px]">
              <Avatar size="md">
                {targetUser?.photoURL ? (
                  <AvatarImage source={{ uri: targetUser.photoURL }} alt="avatar" />
                ) : (
                  <AvatarFallbackText>{targetUser?.displayName ?? targetUser?.username ?? '?'}</AvatarFallbackText>
                )}
              </Avatar>
            </Box>
          </HStack>

          <Divider className="my-[1px] w-full" />
        <Box className='flex-1 px-0'>
          <ScrollView ref={scrollRef} className="mt-3" contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            <VStack space="none">
              {messages.map((m, idx) => {
                const isMe = m.fromUid === myUid;
                const prev = idx > 0 ? messages[idx - 1] : null;
                const prevDay = prev ? getDayKey(prev.createdAt) : null;
                const thisDay = getDayKey(m.createdAt);
                const showDateSeparator = prevDay !== thisDay;
                return (
                  <React.Fragment key={m.id}>
                    {showDateSeparator ? (
                      <Box className="w-full items-center my-2">
                        <Text className="text-xs text-typography-500">{formatDateReadable(m.createdAt)}</Text>
                      </Box>
                    ) : null}

                    {/* layout: fixed left slot for avatar/spacer, middle flexible area for bubbles */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 }}>
                      <View style={{ flex: 0 }}>
                        {(() => {
                          const prevMsg = idx > 0 ? messages[idx - 1] : null;
                          const showAvatar = !isMe && (!prevMsg || prevMsg.fromUid !== m.fromUid);

                          return null;
                        })()}
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                          <Pressable
                            onPress={() => {
                              setExpandedMessageId((prev) => (prev === m.id ? null : m.id));
                            }}
                          >
                            <Box className={`${isMe ? (colorScheme === 'dark' ? 'bg-gray-200 text-black' : 'bg-background-500 text-white') : 'bg-background-50'} rounded-xl px-3 py-2`}>
                              {m.text ? <Text className={`${isMe ? (colorScheme === 'dark' ? 'text-black' : 'text-white') : ''}`}>{m.text}</Text> : null}
                              {m.mediaUrl ? (
                                <Image source={{ uri: m.mediaUrl }} style={{ width: 200, height: 200, borderRadius: 8, marginTop: 6 }} />
                              ) : null}

                              {expandedMessageId === m.id ? (
                                <Text className="text-xs text-typography-300 justify-end">{formatTime(m.createdAt)}</Text>
                              ) : null}
                            </Box>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </React.Fragment>
                );
              })}
            </VStack>

          </ScrollView>
          </Box>
          <Box className="">
          <Input 
            variant="rounded"
            size="lg"
            className='flex-1 px-2 items-center justify-end rounded-xl border-none bg-background-50'
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1, margin: 0, marginBottom: 0 }}
          >
            <HStack className="items-center flex-1 px-2 items-center justify-end rounded-md bg-background-50">
              <InputField placeholder="Message"  value={text} onChangeText={setText} />
              {/* <Button size="sm" variant="link" onPress={pickImageAndSend} className="ml-2 mr-2">
                    <ButtonIcon as={PaperclipIcon} /> 
                  </Button> */}
              <Button size="2xl" variant="link" onPress={sendMessage} className="ml-2 bg-background-50">
                <ButtonIcon size="2xl" as={SendHorizontal} />
              </Button>
            </HStack>
          </Input> 
           </Box>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatPage;
