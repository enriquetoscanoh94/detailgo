/**
 * Subscribes to a Firestore listener and exposes { data, loading, error }.
 *
 * `subscribe` must have the shape (onData, onError) => unsubscribe. It is held
 * in a ref so callers can pass an inline arrow without re-subscribing on every
 * render; pass a `deps` array to intentionally re-subscribe (e.g. on uid change).
 */

import { useEffect, useRef, useState } from 'react';

export function useSubscription(subscribe, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscribeRef = useRef(subscribe);
  subscribeRef.current = subscribe;

  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribe;
    try {
      unsubscribe = subscribeRef.current(
        (value) => {
          setData(value);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );
    } catch (err) {
      // A listener that fails to even start (e.g. misconfigured backend) must
      // degrade to an error state, never throw and crash the screen/app.
      setError(err);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

export default useSubscription;
