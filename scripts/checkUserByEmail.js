const admin = require('firebase-admin');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/checkUserByEmail.js <email>');
    process.exit(1);
  }
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    console.error('Set the GOOGLE_APPLICATION_CREDENTIALS env var to your service account JSON path.');
    process.exit(1);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    const db = admin.firestore();
    const trimmed = String(email).trim().toLowerCase();
    const snaps = await db.collection('users').where('emailLowerCase', '==', trimmed).limit(1).get();
    if (snaps.empty) {
      console.log('No user found for', trimmed);
      process.exit(0);
    }
    const doc = snaps.docs[0];
    console.log('User found:');
    console.log('uid:', doc.id);
    console.log('data:', doc.data());
  } catch (err) {
    console.error('Error querying Firestore:', err);
    process.exit(2);
  }
}

main();
