import React from 'react';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fab, FabIcon } from '@/components/ui/fab';
import { AddIcon, CheckIcon, SearchIcon, ShareIcon, TrashIcon } from '@/components/ui/icon';
import { router } from 'expo-router';
import Sidebar from './sidebar';
import { Divider } from '@/components/ui/divider';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { app, auth } from '../firebaseConfig';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  orderBy,
} from 'firebase/firestore';
import { normalizeUsername } from '@/lib/usernames';
import { useEffect, useMemo, useState } from 'react';
import { HStack } from '@/components/ui/hstack';
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from '@/components/ui/avatar';
import { ScrollView } from 'react-native';
import { VStack } from '@/components/ui/vstack';

type FriendDoc = { uid: string; displayName?: string; username?: string; photoURL?: string; createdAt?: any };

const Main = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme].background;

  const db = useMemo(() => getFirestore(app), []);
  const uid = auth.currentUser?.uid ?? null;
  const [user, setUser] = useState(auth.currentUser);
  const [searchText, setSearchText] = useState('');
  const [searchResult, setSearchResult] = useState<{ uid: string; username?: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const resolvedAvatar = user?.photoURL ?? null;

  const [incomingRequests, setIncomingRequests] = useState<Array<any>>([]);
  const [friends, setFriends] = useState<FriendDoc[]>([]);
  const [users, setUsers] = useState([1, 2, 3])

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

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchResult(null);
    try {
      const key = normalizeUsername(searchText || '');
      if (!key) {
        setIsSearching(false);
        return;
      }
      const ref = doc(db, 'usernames', key);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setSearchResult(null);
      } else {
        const data = snap.data() as any;
        if (data?.uid && data.uid !== uid) {
          setSearchResult({ uid: data.uid, username: key });
        } else {
          // found self or missing uid
          setSearchResult(null);
        }
      }
    } catch (err) {
      console.error('Search failed', err);
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (targetUid: string) => {
    if (!uid) return;
    try {
      const requestRef = doc(db, 'users', targetUid, 'friendRequests', uid);
      const sentRef = doc(db, 'users', uid, 'sentRequests', targetUid);
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
    } catch (err) {
      console.error('Failed to send friend request', err);
    }
  };

  const acceptRequest = async (requestId: string, fromUid: string, fromDisplayName?: string) => {
    if (!uid) return;
    try {
      // create friend docs for both users (bi-directional)
      const mineRef = doc(db, 'users', uid, 'friends', fromUid);
      const theirRef = doc(db, 'users', fromUid, 'friends', uid);
      await setDoc(mineRef, { uid: fromUid, displayName: fromDisplayName ?? null, createdAt: serverTimestamp() });
      await setDoc(theirRef, { uid, displayName: auth.currentUser?.displayName ?? null, createdAt: serverTimestamp() });

      // remove the request
      await deleteDoc(doc(db, 'users', uid, 'friendRequests', requestId));
    } catch (err) {
      console.error('Failed to accept friend request', err);
    }
  };

  const rejectRequest = async (requestId: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'friendRequests', requestId));
    } catch (err) {
      console.error('Failed to reject friend request', err);
    }
  };

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
            <Sidebar />
          </Box>
          <Text
            className="text-xl text-bold"
            style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}
          >
            Friends
          </Text>
          <Box className="w-[56px]" />
        </Box>

        <Divider className="my-[1px] w-full" />
       

        <ScrollView className="mt-3" contentContainerStyle={{ paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
          <Box>  {friends.length === 0 ? (
            <Box className="items-center justify-center flex-0">
              <Text className="text-muted">You have no friends yet</Text>
            </Box>
          ) : (
            friends.map((f) => (
              <VStack key={f.uid} className="mb-1">
              <HStack key={f.uid} className="flex-row items-center justify-between bg-background-50 rounded-xl border-border-200 px-4 py-3">
                <Text size="lg">{f.displayName ?? f.username ?? f.uid}</Text>
                <Pressable onPress={() => router.push(`/chat?uid=${encodeURIComponent(f.uid)}`)}>
                  <Avatar size="md">
                    {f.photoURL ? (
                      <AvatarImage source={{ uri: f.photoURL }} alt="Profile avatar" />
                    ) : (
                      <AvatarFallbackText>{f.displayName ?? f.username ?? f.uid}</AvatarFallbackText>
                    )}
                  </Avatar>
                </Pressable>
              </HStack>
      
              </VStack>
            ))
          )}</Box>
        </ScrollView>
        <Fab
          placement="bottom right"
          size="xl"
          className="m-6"
          onPress={() => router.push('/addFriends')}
        >
          <FabIcon as={SearchIcon} />
        </Fab>
      </Box>
    </SafeAreaView>
  );
};

export default Main;
