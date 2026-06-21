import { onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import { rtdb } from '@/lib/firebase';

export type FirebaseStatus = 'connected' | 'offline';

export function useFirebaseStatus(): FirebaseStatus {
  const [status, setStatus] = useState<FirebaseStatus>('connected');
  const offlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didConnect = useRef(false);

  useEffect(() => {
    const connRef = ref(rtdb, '.info/connected');
    const unsub = onValue(connRef, (snap) => {
      const connected = snap.val() as boolean;

      if (offlineTimer.current) {
        clearTimeout(offlineTimer.current);
        offlineTimer.current = null;
      }

      if (connected) {
        didConnect.current = true;
        setStatus('connected');
      } else {
        offlineTimer.current = setTimeout(() => {
          setStatus('offline');
        }, didConnect.current ? 1500 : 5000);
      }
    });

    return () => {
      unsub();
      if (offlineTimer.current) clearTimeout(offlineTimer.current);
    };
  }, []);

  return status;
}
