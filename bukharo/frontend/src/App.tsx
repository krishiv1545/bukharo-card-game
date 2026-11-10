import { useEffect, useState } from "react";
import { api } from "./api";
import RoomView from "./RoomView";

type User = string | null | undefined;   // undefined = still loading

function AuthForm({ onDone }: { onDone: (u: string) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState(""), [password, setPassword] = useState(""), [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api<{ username?: string; error?: string }>(`/api/auth/${mode}/`, { username, password });
    if (r.ok && r.data.username) onDone(r.data.username); else setErr(r.data.error ?? "failed");
  };
  const f = "w-full rounded bg-black/30 px-3 py-2";
  return (
    <form onSubmit={submit} className="mx-auto mt-24 w-80 space-y-3">
      <h1 className="text-3xl font-bold">Bukharo</h1>
      <input className={f} placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
      <input className={f} placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <p className="text-sm text-red-300">{err}</p>}
      <button className="w-full rounded bg-amber-400 py-2 font-bold text-black">{mode === "login" ? "Log in" : "Sign up"}</button>
      <button type="button" className="text-sm underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}</button>
    </form>
  );
}

export default function App() {
  const [user, setUser] = useState<User>(undefined);
  const [code, setCode] = useState(() => location.hash.slice(1).toUpperCase());
  const [join, setJoin] = useState(""), [err, setErr] = useState("");
  useEffect(() => { api<{ username: string | null }>("/api/auth/me/").then((r) => setUser(r.data.username)); }, []);
  useEffect(() => { const h = () => setCode(location.hash.slice(1).toUpperCase()); addEventListener("hashchange", h); return () => removeEventListener("hashchange", h); }, []);

  if (user === undefined) return <div className="p-8">Loading…</div>;
  if (user === null) return <AuthForm onDone={setUser} />;
  if (code.length === 6) return <RoomView key={code} code={code} me={user} leave={() => { location.hash = ""; }} />;

  const enter = async (path: string) => {
    const r = await api<{ code?: string; error?: string }>(path, {});
    if (r.ok && r.data.code) location.hash = r.data.code; else setErr(r.data.error ?? "failed");
  };
  return (
    <div className="mx-auto mt-24 w-96 space-y-4">
      <h1 className="text-3xl font-bold">Bukharo</h1>
      <p className="text-sm opacity-80">Signed in as <b>{user}</b></p>
      <button className="w-full rounded bg-amber-400 py-2 font-bold text-black" onClick={() => enter("/api/rooms/")}>Create a private room</button>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); enter(`/api/rooms/${join.trim().toUpperCase()}/join/`); }}>
        <input className="flex-1 rounded bg-black/30 px-3 py-2 uppercase tracking-widest" maxLength={6} placeholder="ROOM CODE" value={join} onChange={(e) => setJoin(e.target.value)} />
        <button className="rounded bg-emerald-600 px-4 font-semibold">Join</button>
      </form>
      {err && <p className="text-sm text-red-300">{err}</p>}
    </div>
  );
}
