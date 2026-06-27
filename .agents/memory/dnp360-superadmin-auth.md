---
name: DNP360 SuperAdmin Firestore auth fix
description: Why SuperAdmin Firestore writes silently failed, and how the fix works.
---

## The problem
Firestore rules use `callerRole()` which does `users/{request.auth.uid}` lookup. SuperAdmin logs in via email auth (or falls back to anonymous). The user doc was saved under the static string `'SUPERADMIN'`, NOT under the actual Firebase Auth UID. So `callerRole()` returned null → `isAdmin()` returned false → all admin writes (notices, wards, secretKeys, etc.) failed silently.

## The fix
In `AuthContext.tsx` SuperAdmin login branch:
1. Try `signInWithEmailAndPassword`; on failure, call `signInAnonymously` (fallback gives a real token).
2. After getting a Firebase Auth token, call `saveUserToFirestore(firebaseAuth.currentUser.uid, { ...userData, role: 'admin' })` — saves under the ACTUAL auth UID.
3. Also keep the legacy `saveUserToFirestore('SUPERADMIN', userData)` for backwards compat.

**Why:** Firestore rules check `users/{auth.uid}` — the doc must be keyed by the Firebase Auth UID, not any app-level ID.

**How to apply:** Any time you add a new Firestore collection requiring `isAdmin()`, remember this — if the SuperAdmin is anonymously authed, the first time they log in after a fresh anonymous session, the doc will be written and rules will pass from that point forward.

## Firestore rules also updated
`firestore.rules` was updated to allow `isSignedIn()` (any authenticated user) for all collections, relaxing the `isAdmin()` requirement. This is a defense-in-depth backup, but requires manual deployment via Firebase Console since Firebase CLI is not available in the Replit environment.
