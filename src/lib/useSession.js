import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useSession() {
  const [session, setSession] = useState(undefined); // undefined = still loading

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return undefined;
    }

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) setSession(error ? null : data.session);
      })
      .catch(() => {
        if (active) setSession(null);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return session; // undefined while loading, null if logged out, object if logged in
}
