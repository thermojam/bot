import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

const FIREBASE_SERVICE_KEY = JSON.parse(process.env.FIREBASE_SERVICE_KEY);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(FIREBASE_SERVICE_KEY),
    });
}

const db = admin.firestore();
export { admin };
export default db;
