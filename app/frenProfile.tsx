import React from 'react';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fab, FabIcon } from '@/components/ui/fab';
import { AddIcon, CheckIcon, SearchIcon, ShareIcon, ArrowLeftIcon, TrashIcon, CloseIcon } from '@/components/ui/icon';
import { router, useLocalSearchParams } from 'expo-router';
import Sidebar from './sidebar';
import { Divider } from '@/components/ui/divider';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { getAuth } from 'firebase/auth';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { ScrollView } from 'react-native';
import { useRef } from 'react';
import { app, auth } from '../firebaseConfig';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { normalizeUsername } from '@/lib/usernames';
import { useEffect, useMemo, useState } from 'react';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { ArrowLeft } from 'lucide-react-native';

type FriendDoc = { uid: string; displayName?: string; username?: string; createdAt?: any };
type Params = {
  uid?: string; // target user id passed in the route
};
const Main = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme].background;
   const params = useLocalSearchParams<Params>();
    const targetUid = params.uid ?? null;
  const db = useMemo(() => getFirestore(app), []);
  const uid = auth.currentUser?.uid ?? null;
const [targetUser, setTargetUser] = useState<{ username?: string; displayName?: string; photoURL?: string } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchResult, setSearchResult] = useState<{ uid: string; username?: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [emailSearchText, setEmailSearchText] = useState('');
  const [emailSearchResult, setEmailSearchResult] = useState<{ uid: string; email?: string; username?: string } | null>(null);
  const [isEmailSearching, setIsEmailSearching] = useState(false);
  const [emailSearchTried, setEmailSearchTried] = useState(false);
const [messages, setMessages] = useState<Array<any>>([]);
  const [incomingRequests, setIncomingRequests] = useState<Array<any>>([]);
  const [friends, setFriends] = useState<FriendDoc[]>([]);
  const me = auth.currentUser;
    const myUid = me?.uid ?? null;
const scrollRef = useRef<ScrollView | null>(null);
  // listen to incoming friend requests
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'friendRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setIncomingRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [db, uid]);

  // listen to friends list
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'friends'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setFriends(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [db, uid]);

  const sendFriendRequest = async (targetUid: string) => {
    if (!uid) return;
    try {
      const requestRef = doc(db, 'users', targetUid, 'friendRequests', uid);
      const sentRef = doc(db, 'users', uid, 'sentRequests', targetUid);
      // write both recipient's incoming request and our outgoing record
      await setDoc(requestRef, {
        fromUid: uid,
        fromDisplayName: auth.currentUser?.displayName ?? auth.currentUser?.email ?? null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      await setDoc(sentRef, {
        fromUid: uid,
        toUid: targetUid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      // clear the email search input/result after sending a request
      setEmailSearchText('');
      setEmailSearchResult(null);
    } catch (err) {
      console.error('Failed to send friend request', err);
    }
  };

  // listen to outgoing (pending) requests sent by current user
  const [pendingRequests, setPendingRequests] = useState<Array<any>>([]);
  const [pendingMeta, setPendingMeta] = useState<Record<string, { username?: string; displayName?: string; email?: string }>>({});
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'sentRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPendingRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [db, uid]);

  // Resolve metadata (username/displayName/email) for pending targets
  useEffect(() => {
    let isMounted = true;
    const uids = Array.from(new Set(pendingRequests.map((p) => p.toUid).filter(Boolean)));
    const missing = uids.filter((id) => !pendingMeta[id]);
    if (missing.length === 0) return;
    (async () => {
      try {
        const entries: Array<[string, any]> = [];
        await Promise.all(
          missing.map(async (id) => {
            try {
              const snap = await getDoc(doc(db, 'users', id));
              if (snap.exists()) {
                const d = snap.data() as any;
                entries.push([id, { username: d?.username, displayName: d?.displayName, email: d?.email }]);
              } else {
                entries.push([id, {}]);
              }
            } catch (err) {
              console.error('Failed to fetch user meta for pending request', id, err);
              entries.push([id, {}]);
            }
          })
        );
        if (!isMounted) return;
        setPendingMeta((prev) => {
          const copy = { ...prev };
          for (const [id, meta] of entries) copy[id] = meta;
          return copy;
        });
      } catch (err) {
        console.error('Failed to resolve pending request metas', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [pendingRequests]);

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


  const removeFriend = async (friendUid: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'friends', friendUid));
      await deleteDoc(doc(db, 'users', friendUid, 'friends', uid));
    } catch (err) {
      console.error('Failed to remove friend', err);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <Box className="flex-1 px-3" style={{ backgroundColor }}>
           <Box className="flex-row items-center mb-4">
                    <Box className="items-start w-[56px]">
              <Button size="2xl" variant="link" onPress={() => router.back()}>
                <ButtonIcon as={ArrowLeft} />
              </Button>
            </Box>
                  <Text
                    className="text-3xl text-bold"
                    style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}
                  >
                    
                  </Text>
                  <Box className="w-[56px]" />
                   <Box className="items-end w-[56px]">
              <Pressable onPress={() => {router.push(`/frenProfile`) }}>
              <Avatar size="md">
                {targetUser?.photoURL ? (
                  <AvatarImage source={{ uri: targetUser.photoURL }} alt="avatar" />
                ) : (
                  <AvatarFallbackText>{targetUser?.displayName ?? targetUser?.username ?? '?'}</AvatarFallbackText>
                )}
              </Avatar>
              </Pressable>
            </Box>
                </Box>
        

        
      </Box>
    </SafeAreaView>
  );
};

export default Main;
