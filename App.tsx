import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { BackHandler, SafeAreaView } from "react-native";
import { api, setDevSubject } from "./src/api";
import { AllProperties } from "./src/AllProperties";
import { Dashboard } from "./src/Dashboard";
import type { Hotel, HotelsResponse } from "./src/figures";
import { SignIn } from "./src/SignIn";
import { c } from "./src/theme";

/* ══════════════════════════════════════════════════════════════════
   THE FIDATO PMS ON A PHONE — slice 1, the owner's figures (D27-321):
   sign in, every property, one property's Dashboard. Three screens, so a
   state and Android's back button instead of a navigation library; the
   library comes when a slice needs more than one level of back.
   ══════════════════════════════════════════════════════════════════ */

type View = { at: "sign-in" } | { at: "all" } | { at: "hotel"; hotel: Hotel };

export default function App() {
  const [view, setView] = useState<View>({ at: "sign-in" });
  const [session, setSession] = useState<HotelsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (view.at !== "hotel") return false;
      setView({ at: "all" });
      return true;
    });
    return () => sub.remove();
  }, [view]);

  async function signInAs(uid: string) {
    setBusy(true);
    setError(null);
    setDevSubject(uid);
    try {
      const s = await api<HotelsResponse>("/api/hotels");
      setSession(s);
      setView({ at: "all" });
    } catch (e) {
      setDevSubject(null);
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setDevSubject(null);
    setSession(null);
    setView({ at: "sign-in" });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.grey50 }}>
      <StatusBar style="dark" />
      {view.at === "sign-in" || !session ? (
        <SignIn onDev={signInAs} busy={busy} error={error} />
      ) : view.at === "hotel" ? (
        <Dashboard hotel={view.hotel} onBack={() => setView({ at: "all" })} />
      ) : (
        <AllProperties
          hotels={session.hotels}
          who={session.scope.fullName}
          onOpen={(hotel) => setView({ at: "hotel", hotel })}
          onSignOut={signOut}
        />
      )}
    </SafeAreaView>
  );
}
