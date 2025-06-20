import admin from 'firebase-admin';

const FIREBASE_SERVICE_KEY = JSON.parse(process.env.FIREBASE_SERVICE_KEY);

admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_SERVICE_KEY),
});

const db = admin.firestore();

export { admin };
export default db;
