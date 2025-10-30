import { Firestore, doc, getDoc, runTransaction, serverTimestamp, deleteDoc } from 'firebase/firestore';

/**
 * Normalize a username for storage/lookup.
 * Lowercase and trim. You can add more normalization (remove spaces, accents) as needed.
 */
export function normalizeUsername(input: string) {
  return input.trim().toLowerCase();
}

export async function isUsernameAvailable(db: Firestore, username: string) {
  const key = normalizeUsername(username);
  const ref = doc(db, 'usernames', key);
  try {
    const snap = await getDoc(ref);
    return !snap.exists();
  } catch (err: any) {
    // Surface Firestore errors with a code prefix so callers can react (e.g. permission-denied)
    const code = err?.code ?? 'unknown';
    throw new Error(`USERNAME_CHECK_FAILED:${code}:${err?.message ?? String(err)}`);
  }
}

/**
 * Reserve a username by creating a document under `usernames/{username}` with the user's uid.
 * This uses a transaction to ensure the username is not already taken.
 * Throws an error with message 'USERNAME_TAKEN' if the username exists.
 */
export async function reserveUsername(db: Firestore, username: string, uid: string) {
  const key = normalizeUsername(username);
  const ref = doc(db, 'usernames', key);

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        throw new Error('USERNAME_TAKEN');
      }
      tx.set(ref, { uid, createdAt: serverTimestamp() });
    });
  } catch (err: any) {
    const code = err?.code ?? null;
    if (err instanceof Error && err.message === 'USERNAME_TAKEN') {
      throw err; // preserve this sentinel error
    }
    // Re-throw with a clearer prefix so the client can identify permission or other failures
    throw new Error(`USERNAME_RESERVE_FAILED:${code ?? 'unknown'}:${err?.message ?? String(err)}`);
  }
}

/**
 * Release a username mapping (delete the document). Useful if signup fails after reservation.
 */
export async function releaseUsername(db: Firestore, username: string) {
  const key = normalizeUsername(username);
  await deleteDoc(doc(db, 'usernames', key));
}

export default {
  normalizeUsername,
  isUsernameAvailable,
  reserveUsername,
  releaseUsername,
};
