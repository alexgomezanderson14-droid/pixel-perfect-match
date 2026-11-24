import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import WelcomeArtwork from "@/components/WelcomeArtwork";

type Props = { artworkSettings?: string; onContinueAsGuest: () => void; onClose?: () => void; preview?: boolean; invitationName?: string };

export default function WelcomeGate({ artworkSettings = "", onContinueAsGuest, onClose, preview = false, invitationName = "" }: Props) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [mode, setMode] = useState<"welcome" | "email">(invitationName ? "email" : "welcome");
  const [accountMode, setAccountMode] = useState<"login" | "register">(invitationName ? "register" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (invitationName) { setMode("email"); setAccountMode("register"); } }, [invitationName]);

  const leaveThen = (action: () => void) => {
    if (isLeaving) return;
    setIsLeaving(true);
    window.setTimeout(action, 680);
  };

  const submitEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (accountMode === "register" && password.length < 8) {
      setMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setBusy(true);
    setMessage("");
    leaveThen(() => {
      const request = accountMode === "register"
        ? supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}${window.location.pathname}${window.location.search}` },
          })
        : supabase.auth.signInWithPassword({ email: email.trim(), password });
      void request.then(({ data, error }) => {
        if (error) throw error;
        setPassword("");
        if (accountMode === "register" && !data.session) {
          setMessage("Registro iniciado. Revisa tu correo para confirmar la cuenta.");
          setBusy(false);
          setIsLeaving(false);
        }
      }).catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "No se ha podido completar el acceso.");
        setBusy(false);
        setIsLeaving(false);
      });
    });
  };

  return (
    <div className={`welcome-gate fixed inset-0 z-[2147483600] flex min-h-[100svh] flex-col items-center overflow-y-auto px-5 pb-5 pt-[max(24px,env(safe-area-inset-top))] text-[#111]${isLeaving ? " is-leaving" : ""}`}>
      {preview && <button type="button" onClick={onClose || onContinueAsGuest} className="welcome-gate-preview-close" aria-label="Cerrar vista previa">×</button>}
      <div className="welcome-gate-brand">
        <img src="/penyera-isotipo.svg" alt="PENYERA" />
      </div>

      <div className="welcome-gate-art"><WelcomeArtwork settings={artworkSettings} /></div>

            <div className="welcome-gate-intro">
        <p className="welcome-gate-eyebrow">PENYERA · L’ALFÀS DEL PI</p>
        <h1>Las peñas y las fiestas, más cerca.</h1>
        <p>Descubre la comunidad festera, encuentra planes y vive cada momento.</p>
      </div>

      <div className="welcome-gate-actions">
        {invitationName && <p className="welcome-gate-message">Te han invitado a solicitar tu incorporación a <strong>{invitationName}</strong>. Identifícate o crea tu cuenta y completa la solicitud.</p>}
        {mode === "welcome" ? (
          <>
            <button type="button" onClick={() => { setMode("email"); setAccountMode("login"); setMessage(""); }} className="welcome-gate-email">Iniciar sesión</button>
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
        {!invitationName && <button type="button" onClick={() => leaveThen(onContinueAsGuest)} className="welcome-gate-guest">{preview ? "Cerrar vista previa" : "Continuar sin identificarme"}</button>}
        <p className="welcome-gate-privacy">Podrás iniciar sesión más adelante desde Ajustes.</p>
      </div>
    </div>
  );
}
