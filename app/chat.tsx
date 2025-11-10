// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { ScrollView, Image, View, Platform, KeyboardAvoidingView } from 'react-native';
// import { Box } from '@/components/ui/box';
// import { Text } from '@/components/ui/text';
// import { useColorScheme } from '@/components/useColorScheme';
// import { Colors } from '@/constants/Colors';
// import { Input, InputField } from '@/components/ui/input';
// import { Button, ButtonIcon } from '@/components/ui/button';
// import { Pressable } from '@/components/ui/pressable';
// import { HStack } from '@/components/ui/hstack';
// import { VStack } from '@/components/ui/vstack';
// import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
// import { Divider } from '@/components/ui/divider';
// import { ArrowLeftIcon, PaperclipIcon, ShareIcon } from '@/components/ui/icon';
// import { app, auth } from '../firebaseConfig';
// import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, serverTimestamp } from 'firebase/firestore';
// import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
// import * as ImagePicker from 'expo-image-picker';
// import { useLocalSearchParams, router } from 'expo-router';

// type Params = { uid?: string };

// export default function ChatPage() {
//   const params = useLocalSearchParams<Params>();
//   const targetUid = params.uid ?? null;

//   const colorScheme = useColorScheme();
//   const backgroundColor = Colors[colorScheme].background;

//   const db = useMemo(() => getFirestore(app), []);
//   const storage = useMemo(() => getStorage(app), []);
//   const me = auth.currentUser;
//   const myUid = me?.uid ?? null;

//   const [targetUser, setTargetUser] = useState<{ username?: string; displayName?: string; photoURL?: string } | null>(null);
//   const [messages, setMessages] = useState<Array<any>>([]);
//   const [text, setText] = useState('');

//   const scrollRef = useRef<ScrollView | null>(null);

//   const chatId = useMemo(() => {
//     if (!myUid || !targetUid) return null;
//     return [myUid, targetUid].sort().join('_');
//   }, [myUid, targetUid]);

//   // load target user profile for header
//   useEffect(() => {
//     if (!targetUid) return;
//     const uRef = doc(db, 'users', targetUid);
//     const unsub = onSnapshot(uRef, (snap) => {
//       if (!snap.exists()) return setTargetUser(null);
//       const d = snap.data() as any;
//       setTargetUser({ username: d.username, displayName: d.displayName, photoURL: d.photoURL });
//     });
//     return () => unsub();
//   }, [db, targetUid]);

//   // subscribe to chat messages
//   useEffect(() => {
//     if (!chatId) return;
//     const msgsCol = collection(db, 'chats', chatId, 'messages');
//     const q = query(msgsCol, orderBy('createdAt', 'asc'));
//     const unsub = onSnapshot(q, (snap) => {
//       setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
//       setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
//     });
//     return () => unsub();
//   }, [db, chatId]);

//   const pickImageAndSend = async () => {
//     if (!myUid || !chatId) return;
//     try {
//       const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//       if (!perm.granted) {
//         alert('Permission to access media is required.');
//         return;
//       }
//       const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
//       if (result.cancelled) return;
//       const uri = (result as any).assets?.[0]?.uri ?? (result as any).uri;
//       if (!uri) return;

//       const resp = await fetch(uri);
//       const blob = await resp.blob();
//       const ts = Date.now();
//       const fileRef = storageRef(storage, `chats/${chatId}/${ts}.jpg`);
//       await uploadBytes(fileRef, blob);
//       const url = await getDownloadURL(fileRef);

//       await addDoc(collection(db, 'chats', chatId, 'messages'), {
//         fromUid: myUid,
//         toUid: targetUid,
//         mediaUrl: url,
//         text: null,
//         createdAt: serverTimestamp(),
//       });
//     } catch (err) {
//       console.error('Failed to pick/upload image', err);
//       alert('Could not send image.');
//     }
//   };

//   const sendMessage = async () => {
//     if (!myUid || !chatId || !text.trim()) return;
//     try {
//       await addDoc(collection(db, 'chats', chatId, 'messages'), {
//         fromUid: myUid,
//         toUid: targetUid,
//         text: text.trim(),
//         mediaUrl: null,
//         createdAt: serverTimestamp(),
//       });
//       setText('');
//     } catch (err) {
//       console.error('Failed to send message', err);
//       alert('Could not send message.');
//     }
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor }}>
//       <Box className="flex-1 px-3" style={{ backgroundColor }}>
//         <Box className="flex-row items-center mb-4">
//           <Box className="items-start w-[56px]">
//             <Button size="xl" variant="link" onPress={() => router.back()}>
//               <ButtonIcon as={ArrowLeftIcon} />
//             </Button>
//           </Box>
//           <Text className="text-xl text-bold" style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}>
//             {targetUser?.username ? `@${targetUser.username}` : targetUser?.displayName ?? 'Chat'}
//           </Text>
//           <Box className="w-[56px]" />
//         </Box>

//         <Divider className="my-[1px] w-full" />

//         <ScrollView ref={scrollRef} className="mt-3" contentContainerStyle={{ paddingBottom: 240 }} keyboardShouldPersistTaps="handled">
//           <VStack space="sm">
//             {messages.map((m) => {
//               const isMe = m.fromUid === myUid;
//               return (
//                 <HStack key={m.id} className={`items-start ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
//                   {!isMe && (
//                     <Avatar size="sm">
//                       {targetUser?.photoURL ? (
//                         <AvatarImage source={{ uri: targetUser.photoURL }} alt="avatar" />
//                       ) : (
//                         <AvatarFallbackText>{targetUser?.displayName ?? targetUser?.username ?? '?'}</AvatarFallbackText>
//                       )}
//                     </Avatar>
//                   )}
//                   <Box className={`${isMe ? 'bg-primary-500 text-white' : 'bg-background-50'} rounded-xl px-3 py-2 max-w-[75%]`}>
//                     {m.text ? <Text className={`${isMe ? 'text-white' : ''}`}>{m.text}</Text> : null}
//                     {m.mediaUrl ? (
//                       <Image source={{ uri: m.mediaUrl }} style={{ width: 200, height: 200, borderRadius: 8, marginTop: 6 }} />
//                     ) : null}
//                   </Box>
//                 </HStack>
//               );
//             })}
//           </VStack>
//         </ScrollView>

//         <Input variant="rounded" size="lg" style={{ position: 'absolute', left: 16, right: 16, bottom: 80, zIndex: 50 }}>
//           <HStack className="items-center">
//             <InputField placeholder="Message" value={text} onChangeText={setText} />
//             <Pressable onPress={pickImageAndSend} className="ml-2 mr-2">
//               <ButtonIcon as={PaperclipIcon} />
//             </Pressable>
//             <Pressable onPress={sendMessage}>
//               <ButtonIcon as={ShareIcon} />
//             </Pressable>
//           </HStack>
//         </Input>
//       </Box>
//     </SafeAreaView>
//   );
// }
// import React from 'react';
// import { Box } from '@/components/ui/box';
// import { Heading } from '@/components/ui/heading';
// import { Text } from '@/components/ui/text';

// import { useColorScheme } from '@/components/useColorScheme';
// import { Colors } from '@/constants/Colors';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Fab, FabIcon } from '@/components/ui/fab';
// import { AddIcon, CheckIcon, PaperclipIcon, SearchIcon, ShareIcon, TrashIcon } from '@/components/ui/icon';
// import { router } from 'expo-router';
// import Sidebar from './sidebar';
 import { Divider } from '@/components/ui/divider';
// import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
// import { Input, InputField } from '@/components/ui/input';
// import { Pressable } from '@/components/ui/pressable';
// import { app, auth } from '../firebaseConfig';
// import {
//   getFirestore,
//   doc,
//   getDoc,
//   setDoc,
//   deleteDoc,
//   serverTimestamp,
//   onSnapshot,
//   collection,
//   query,
//   orderBy,
// } from 'firebase/firestore';
// import { normalizeUsername } from '@/lib/usernames';
// import { useEffect, useMemo, useState } from 'react';
// import { HStack } from '@/components/ui/hstack';
// import {
//   Avatar,
//   AvatarFallbackText,
//   AvatarImage,
// } from '@/components/ui/avatar';
// import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
// import { VStack } from '@/components/ui/vstack';
// import { ArrowLeftIcon } from '@/components/ui/icon';
// import { FormControl } from '@/components/ui/form-control';
// import { Paperclip } from 'lucide-react-native';
// type FriendDoc = { uid: string; displayName?: string; username?: string; createdAt?: any };

// const Main = () => {
//   const colorScheme = useColorScheme();
//   const backgroundColor = Colors[colorScheme].background;

//   const db = useMemo(() => getFirestore(app), []);
//   const uid = auth.currentUser?.uid ?? null;
//   const [user, setUser] = useState(auth.currentUser);
//   const [searchText, setSearchText] = useState('');
//   const [searchResult, setSearchResult] = useState<{ uid: string; username?: string } | null>(null);
//   const [isSearching, setIsSearching] = useState(false);
//   const resolvedAvatar = user?.photoURL ?? null;

//   const [incomingRequests, setIncomingRequests] = useState<Array<any>>([]);
//   const [friends, setFriends] = useState<FriendDoc[]>([]);
//   const [users, setUsers] = useState([1, 2, 3])

//   // listen to incoming friend requests
//   useEffect(() => {
//     if (!uid) return;
//     const q = query(collection(db, 'users', uid, 'friendRequests'), orderBy('createdAt', 'desc'));
//     const unsub = onSnapshot(q, (snap) => {
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
     import { ArrowLeftIcon, PaperclipIcon, ShareIcon } from '@/components/ui/icon';
      import { KeyboardAvoidingView } from 'react-native';
     import { SendHorizonal, SendHorizontal } from 'lucide-react-native';
    
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
                  } catch (e) {}
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
              } catch (e) {}
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
            <Box className="flex-1 px-3" style={{ backgroundColor }}>
              <Box className="flex-row items-center mb-4">
                <Box className="items-start w-[56px]">
                  <Button size="xl" variant="link" onPress={() => router.back()}>
                    <ButtonIcon as={ArrowLeftIcon} />
                  </Button>
                </Box>
                <Text className="text-xl text-bold" style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}>
                  {targetUser?.username ? `${targetUser.username}` : targetUser?.displayName ?? 'Chat'}
                </Text>
                <Box className="w-[56px]" />
              </Box>

              <Divider className="my-[1px] w-full" />

              <ScrollView ref={scrollRef} className="mt-3" contentContainerStyle={{ paddingBottom: 240 }} keyboardShouldPersistTaps="handled">
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
                            <Text className="text-xs text-typography-300">{formatDateReadable(m.createdAt)}</Text>
                          </Box>
                        ) : null}

                        <HStack className={`items-start ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                          {!isMe && (
                            <Avatar size="sm">
                              {targetUser?.photoURL ? (
                                <AvatarImage source={{ uri: targetUser.photoURL }} alt="avatar" />
                              ) : (
                                <AvatarFallbackText>{targetUser?.displayName ?? targetUser?.username ?? '?'}</AvatarFallbackText>
                              )}
                            </Avatar>
                          )}

                          {/* message bubble */}
                          {isMe ? (
                            <Pressable
                              onPress={() => {
                                setExpandedMessageId((prev) => (prev === m.id ? null : m.id));
                              }}
                            >
                              <Box className={`${isMe ? (colorScheme === 'dark' ? 'bg-gray-200 text-black' : 'bg-black text-white') : 'bg-background-50'} rounded-xl px-3 py-2 ` }>
                                {m.text ? <Text className={`${isMe ? (colorScheme === 'dark' ? 'text-black' : 'text-white') : ''}`}>{m.text}</Text> : null}
                                {m.mediaUrl ? (
                                  <Image source={{ uri: m.mediaUrl }} style={{ width: 200, height: 200, borderRadius: 8, marginTop: 6 }} />
                                ) : null}
                                <Text className="mt-1 text-xs text-typography-300">{formatTime(m.createdAt)}</Text>
                              </Box>
                            </Pressable>
                          ) : (
                            <Box className={`${isMe ? (colorScheme === 'dark' ? 'bg-gray-200 text-black' : 'bg-black text-white') : 'bg-background-50'} rounded-xl px-3 py-2 max-w-[75%]` }>
                              {m.text ? <Text className={`${isMe ? (colorScheme === 'dark' ? 'text-black' : 'text-white') : ''}`}>{m.text}</Text> : null}
                              {m.mediaUrl ? (
                                <Image source={{ uri: m.mediaUrl }} style={{ width: 200, height: 200, borderRadius: 8, marginTop: 6 }} />
                              ) : null}
                              <Text className="mt-1 text-xs text-typography-300">{formatTime(m.createdAt)}</Text>
                            </Box>
                          )}
                        </HStack>
                      </React.Fragment>
                    );
                  })}
                </VStack>
              </ScrollView>

              <Input
                variant="rounded"
                size="lg"
                // style={{ position: 'absolute', left: 0, right: 16, bottom: 0, zIndex: 50 }}
              >
                <HStack className="items-center">
                  <InputField placeholder="Message" value={text} onChangeText={setText} />
                  {/* <Button size="sm" variant="link" onPress={pickImageAndSend} className="ml-2 mr-2">
                    <ButtonIcon as={PaperclipIcon} />
                  </Button> */}
                  <Button size="md" onPress={sendMessage} className="ml-2">
                    <ButtonIcon size="lg" as={SendHorizontal} />
                  </Button>
                </HStack>
              </Input>
            </Box>
            </KeyboardAvoidingView>
          </SafeAreaView>
        );
      };

      export default ChatPage;
