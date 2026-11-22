import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

type PenyaLogo = { id: string; nombre: string; foto?: string; color?: string };
type Props = { penyes: PenyaLogo[]; onContinueAsGuest: () => void; onClose?: () => void; preview?: boolean };

export default function WelcomeGate({ penyes, onContinueAsGuest, onClose, preview = false }: Props) {
  const [bubbles, setBubbles] = useState<PenyaLogo[]>([]);
  const [mode, setMode] = useState<"welcome" | "email">("welcome");
  const [accountMode, setAccountMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const available = penyes.filter((penya) => penya.foto);
    const shuffled = [...available];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!];
    }
    setBubbles(shuffled.slice(0, 9));
  }, [penyes]);

  const signInWithProvider = async (provider: "google" | "apple") => {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se ha podido iniciar sesión.");
      setBusy(false);
    }
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (accountMode === "register") {
        if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        setMessage(data.session
          ? "¡Cuenta creada! Ya puedes entrar en PENYERA."
          : "Registro iniciado. Revisa tu correo para confirmar la cuenta.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se ha podido completar el acceso.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="welcome-gate fixed inset-0 z-[2147483600] flex min-h-[100svh] flex-col items-center overflow-y-auto bg-white px-5 pb-5 pt-[max(24px,env(safe-area-inset-top))] text-[#111]">
      {preview && <button type="button" onClick={onClose || onContinueAsGuest} className="welcome-gate-preview-close" aria-label="Cerrar vista previa">×</button>}
      <div className="welcome-gate-brand">
        <img src="/penyera-isotipo.svg" alt="PENYERA" />
      </div>

      <div className="welcome-gate-art" aria-label="Logotipos de algunas peñas de PENYERA">
        <div className="welcome-gate-orbit" aria-hidden="true" />
        {bubbles.map((penya, index) => (
          <div key={penya.id} className={`welcome-gate-bubble welcome-gate-bubble-${index}`} style={{ animationDelay: `${index * -0.42}s`, backgroundColor: penya.color || "#edf2f3" }}>
            <img src={penya.foto} alt={penya.nombre} loading="eager" decoding="async" />
          </div>
        ))}
        {bubbles.length === 0 && ["P", "F", "A", "M", "C", "E"].map((letter, index) => (
          <div key={letter} className={`welcome-gate-bubble welcome-gate-bubble-${index}`} aria-hidden="true"><span>{letter}</span></div>
        ))}
      </div>

      <div className="welcome-gate-intro">
        <p className="welcome-gate-eyebrow">PENYERA · L’ALFÀS DEL PI</p>
        <h1>Las peñas y las fiestas, más cerca.</h1>
        <p>Descubre la comunidad festera, encuentra planes y vive cada momento.</p>
      </div>

      <div className="welcome-gate-actions">
        {mode === "welcome" ? (
          <>
            <button type="button" disabled={busy} onClick={() => void signInWithProvider("google")} className="welcome-gate-provider welcome-gate-google">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.09-1.92 3.27-4.75 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.15A11 11 0 0 0 1 12c0 1.78.43 3.46 1.15 4.95l3.69-2.84Z"/><path fill="#EA4335" d="M12 5.36c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.02 14.97 1 12 1a11 11 0 0 0-9.85 6.05l3.69 2.84C6.71 7.29 9.14 5.36 12 5.36Z"/></svg>
              <span>Continuar con Google</span>
            </button>
            <button type="button" disabled={busy} onClick={() => void signInWithProvider("apple")} className="welcome-gate-provider welcome-gate-apple">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M16.37 1.43c0 1.14-.42 2.2-1.22 3.07-.9.98-2.36 1.73-3.66 1.63-.16-1.1.4-2.26 1.12-3.05.8-.88 2.2-1.53 3.76-1.65ZM20.8 17.6c-.56 1.26-.83 1.82-1.55 2.94-1 1.52-2.4 3.42-4.15 3.44-1.55.02-1.95-1-4.05-.99-2.1.02-2.54 1.02-4.09 1-1.75-.02-3.08-1.73-4.08-3.25C.1 15.1-.2 8.45 2.36 5.7c1.82-1.96 4.7-2.1 6.6-.36.88.8 1.5 1.2 2.1 1.2.6-.01 1.2-.42 2.08-1.23 1.88-1.72 4.75-1.62 6.58.32.62.66 1.05 1.46 1.3 2.37-3.83 2.1-3.2 7.6-.22 9.6Z"/></svg>
              <span>Continuar con Apple</span>
            </button>
            <button type="button" onClick={() => { setMode("email"); setMessage(""); }} className="welcome-gate-email">Crear cuenta o iniciar sesión con correo</button>
          </>
        ) : (
          <div className="welcome-gate-form-wrap">
            <div className="welcome-gate-form-tabs">
              <button type="button" className={accountMode === "register" ? "is-active" : ""} onClick={() => { setAccountMode("register"); setMessage(""); }}>Crear cuenta</button>
              <button type="button" className={accountMode === "login" ? "is-active" : ""} onClick={() => { setAccountMode("login"); setMessage(""); }}>Iniciar sesión</button>
            </div>
            <form onSubmit={submitEmail} className="welcome-gate-form">
              {accountMode === "register" && <label>Nombre<input autoComplete="name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" /></label>}
              <label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" /></label>
              <label>Contraseña<input type="password" autoComplete={accountMode === "register" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" /></label>
              <button type="submit" disabled={busy}>{busy ? "Un momento…" : accountMode === "register" ? "Crear mi cuenta" : "Entrar"}</button>
            </form>
            <button type="button" className="welcome-gate-back" onClick={() => { setMode("welcome"); setMessage(""); }}>Volver a las opciones</button>
          </div>
        )}
        {message && <p role="status" className="welcome-gate-message">{message}</p>}
        <button type="button" onClick={onContinueAsGuest} className="welcome-gate-guest">{preview ? "Cerrar vista previa" : "Seguir sin identificarme"}</button>
        <p className="welcome-gate-privacy">Podrás iniciar sesión más adelante desde Ajustes.</p>
      </div>
    </div>
  );
}
