import React from 'react';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fab, FabIcon } from '@/components/ui/fab';
import { AddIcon, CheckIcon, SearchIcon, ShareIcon, ArrowLeftIcon, TrashIcon, CloseIcon } from '@/components/ui/icon';
import { router } from 'expo-router';
import Sidebar from './sidebar';
import { Divider } from '@/components/ui/divider';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';

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

type FriendDoc = { uid: string; displayName?: string; username?: string; createdAt?: any };

const Main = () => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme].background;

  const db = useMemo(() => getFirestore(app), []);
  const uid = auth.currentUser?.uid ?? null;

  const [emailSearchText, setEmailSearchText] = useState('');
  const [emailSearchResult, setEmailSearchResult] = useState<{ uid: string; email?: string; username?: string } | null>(null);
  const [isEmailSearching, setIsEmailSearching] = useState(false);
  const [emailSearchTried, setEmailSearchTried] = useState(false);
  const [emailSearchError, setEmailSearchError] = useState<string | null>(null);

  const [incomingRequests, setIncomingRequests] = useState<Array<any>>([]);
  const [friends, setFriends] = useState<FriendDoc[]>([]);

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

  const handleEmailSearch = async () => {
    setIsEmailSearching(true);
    setEmailSearchResult(null);
    setEmailSearchTried(false);
    try {
      // Ensure the client is authenticated before attempting the query.
      // Firestore rules only allow this list query when request.auth != null.
      if (!auth.currentUser) {
        const msg = 'You must be signed in to search by email.';
        console.error('Email search attempted while not authenticated');
        setEmailSearchError(msg);
        setEmailSearchTried(true);
        setIsEmailSearching(false);
        return;
      }
      const trimmed = (emailSearchText || '').trim().toLowerCase();
      if (!trimmed) {
        setIsEmailSearching(false);
        return;
      }
      // query users collection by lowercased email stored at signup
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where('emailLowerCase', '==', trimmed));
      const snaps = await getDocs(q);
      if (snaps.empty) {
        setEmailSearchResult(null);
      } else {
        // take first match
        const docSnap = snaps.docs[0];
        const data = docSnap.data() as any;
        if (docSnap.id !== uid) {
          setEmailSearchResult({ uid: docSnap.id, email: data?.email ?? trimmed, username: data?.username ?? undefined });
        } else {
          setEmailSearchResult(null);
        }
      }
      // mark that a search attempt completed
      setEmailSearchTried(true);
    } catch (err: any) {
      // Provide clearer logging for permission errors and show to the user
      const code = err?.code ?? 'unknown';
      const message = err?.message ?? String(err);
      console.error('Email search failed', code, message);
      setEmailSearchError(`${code}: ${message}`);
      setEmailSearchResult(null);
      setEmailSearchTried(true);
    } finally {
      setIsEmailSearching(false);
    }
  };

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


  const acceptRequest = async (requestId: string, fromUid: string, fromDisplayName?: string) => {
    if (!uid) return;
    // We'll perform each Firestore operation separately and handle
    // permission errors gracefully. The important parts are: (1) create
    // our own friend doc and (2) remove the incoming request. Attempts
    // to modify the other user's sentRequests or write their friend doc
    // may be rejected by rules; treat those as non-fatal.
    const mineRef = doc(db, 'users', uid, 'friends', fromUid);
    try {
      await setDoc(mineRef, { uid: fromUid, displayName: fromDisplayName ?? null, createdAt: serverTimestamp() });
    } catch (e: any) {
      console.error('Failed to create local friend doc', fromUid, e);
      // If we can't write our own friend doc, abort and surface error.
      throw e;
    }

    // Try to create reciprocal friend doc on the other user's document.
    try {
      const theirRef = doc(db, 'users', fromUid, 'friends', uid);
      await setDoc(theirRef, { uid, displayName: auth.currentUser?.displayName ?? null, createdAt: serverTimestamp() });
    } catch (e: any) {
      // Permissible to fail due to security rules; log and continue.
      if (e?.code === 'permission-denied') {
        console.warn('Could not create reciprocal friend doc due to security rules; continuing.', e.message);
      } else {
        console.error('Failed to create reciprocal friend doc', e);
      }
    }

    // Remove the incoming friend request (we are the recipient so this should be allowed).
    try {
      await deleteDoc(doc(db, 'users', uid, 'friendRequests', requestId));
    } catch (e: any) {
      console.error('Failed to remove incoming friend request', requestId, e);
      // Not fatal to the client UX, but surface to console for debugging.
    }

    // Attempt to remove the sender's sentRequests entry. This is often
    // disallowed by rules (only the owner may delete), so don't fail the
    // flow if it errors.
    try {
      await deleteDoc(doc(db, 'users', fromUid, 'sentRequests', uid));
    } catch (e: any) {
      console.warn('Could not remove sender sentRequest (non-fatal)', fromUid, e?.code ?? e);
    }
    // At this point we've completed the visible accept flow.
    return;
  };

  const rejectRequest = async (requestId: string) => {
    if (!uid) return;
    try {
      // fetch the request to find the sender uid so we can clean up their sentRequests entry
      const reqSnap = await getDoc(doc(db, 'users', uid, 'friendRequests', requestId));
      const fromUid = reqSnap.exists() ? (reqSnap.data() as any).fromUid : null;
      await deleteDoc(doc(db, 'users', uid, 'friendRequests', requestId));
      if (fromUid) {
        try {
          await deleteDoc(doc(db, 'users', fromUid, 'sentRequests', uid));
        } catch (e) {
          console.error('Failed to remove sender sentRequest after reject', fromUid, e);
        }
      }
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
            <Button
              size="lg"
              variant='link'
              onPress={() => { router.back(); }}>
              <ButtonIcon as={ArrowLeftIcon} />
            </Button>
          </Box>
          <Text
            className="text-xl text-bold"
            style={{ color: Colors[colorScheme].text, fontFamily: 'Poppins_600SemiBold' }}
          >
            Add Friends
          </Text>
          <Box className="w-[56px]" />
        </Box>
        <Divider className="my-0 w-full" />

        <Box className="mt-2">
          {/* Incoming Requests */}
          <Box>
            <Text size="md" className="mb-2">Incoming Requests</Text>
            {incomingRequests.length === 0 ? (
              <Text size="sm">None</Text>
            ) : (
              incomingRequests.map((r) => (
                <VStack key={r.id} className="mb-1">
                  <HStack key={r.id} className="flex-row items-center justify-between bg-background-50 rounded-xl border-border-200 px-4 py-3">
                    <Text size="md">{r.fromDisplayName ?? r.fromUid}</Text>
                    <Box className="flex-row gap-2">
                      <Button className="bg-secondary-500 px-6 py-2 rounded-full" onPress={() => acceptRequest(r.id, r.fromUid, r.fromDisplayName)}>
                        <ButtonIcon as={CheckIcon} />
                      </Button>
                      <Button className="bg-secondary-500 px-6 py-2 rounded-full bg-red-500" onPress={() => rejectRequest(r.id)}>
                        <ButtonIcon as={CloseIcon} />
                      </Button>
                    </Box>
                  </HStack>
                </VStack>
              ))
            )}
          </Box>

          <Divider className="my-4 w-full" />

          {/* Search by Email */}
          <Box className="flex-0 items-start gap-2">
            <Text size="md" className="mb-2">Search by Email</Text>
            <HStack className="flex-row items-center gap-2">
              <Input variant="rounded" size="md" className="flex-1">
                <InputField
                  placeholder="email@example.com"
                  value={emailSearchText}
                  onChangeText={(v) => { setEmailSearchText(v); setEmailSearchResult(null); setEmailSearchTried(false); }}
                  autoCapitalize="none"
                />
              </Input>
              <Button
                className="bg-secondary-500 px-6 py-2 rounded-full"
                size="lg"
                onPress={handleEmailSearch}
                disabled={!auth.currentUser || isEmailSearching}
              >
                <ButtonIcon as={SearchIcon} />
              </Button>
            </HStack>
          </Box>
          <Box className="mt-4">
            {emailSearchResult ? (
              <Box className="flex-row items-center justify-between">
                <Text size="lg">{emailSearchResult.username ?? emailSearchResult.email}</Text>
                <Button variant="outline" className="bg-secondary-500 px-6 py-2 rounded-full" onPress={() => sendFriendRequest(emailSearchResult.uid)}>
                  <ButtonText>Send Request</ButtonText>
                </Button>
              </Box>
            ) : (
              emailSearchTried && emailSearchText ? <Text>No user found with that email</Text> : null
            )}

            {emailSearchTried && emailSearchError ? (
              <Box className="mt-2">
                <Text size="sm" className="text-red-500">{emailSearchError}</Text>
              </Box>
            ) : null}
          </Box>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default Main;
