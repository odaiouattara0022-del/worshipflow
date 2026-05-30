export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; name?: string; email?: string; phone?: string }>;
}) {
  const { error, name, email, phone } = await searchParams;

  const errorMessages: Record<string, string> = {
    missing: "Le nom et le PIN sont requis",
    short: "Le PIN doit contenir au moins 4 chiffres",
    mismatch: "Les deux PIN ne correspondent pas",
    exists: "Ce nom est déjà utilisé",
    server: "Erreur serveur, réessayez",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "16px", background: "#09090b" }}>
      <div style={{ width: "100%", maxWidth: "380px", background: "#18181b", borderRadius: "12px", border: "1px solid #27272a", padding: "32px 24px" }}>
        <h1 style={{ textAlign: "center", fontSize: "24px", fontWeight: "bold", color: "#6366f1", marginBottom: "4px" }}>
          ✦ ProSendWorship
        </h1>
        <p style={{ textAlign: "center", color: "#a1a1aa", marginBottom: "24px", fontSize: "14px" }}>
          Créer un compte
        </p>

        <form action="/api/auth/register" method="POST" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "14px", color: "#fafafa", marginBottom: "6px", fontWeight: "500" }}>
              Nom complet *
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={name || ""}
              placeholder="Ex: Jean Dupont"
              style={{ width: "100%", height: "44px", background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", color: "#fafafa", padding: "0 12px", fontSize: "16px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "14px", color: "#fafafa", marginBottom: "6px", fontWeight: "500" }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              defaultValue={email || ""}
              placeholder="votre@email.com"
              style={{ width: "100%", height: "44px", background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", color: "#fafafa", padding: "0 12px", fontSize: "16px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "14px", color: "#fafafa", marginBottom: "6px", fontWeight: "500" }}>
              Téléphone
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={phone || ""}
              placeholder="0700000000"
              style={{ width: "100%", height: "44px", background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", color: "#fafafa", padding: "0 12px", fontSize: "16px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "14px", color: "#fafafa", marginBottom: "6px", fontWeight: "500" }}>
              PIN (4 chiffres minimum) *
            </label>
            <input
              type="password"
              name="pin"
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              style={{ width: "100%", height: "48px", background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", color: "#fafafa", padding: "0 12px", fontSize: "24px", textAlign: "center", letterSpacing: "0.5em", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "14px", color: "#fafafa", marginBottom: "6px", fontWeight: "500" }}>
              Confirmer le PIN *
            </label>
            <input
              type="password"
              name="pinConfirm"
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              style={{ width: "100%", height: "48px", background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", color: "#fafafa", padding: "0 12px", fontSize: "24px", textAlign: "center", letterSpacing: "0.5em", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <p style={{ color: "#ef4444", textAlign: "center", fontSize: "14px", margin: "0" }}>
              {errorMessages[error] || "Erreur inconnue"}
            </p>
          )}

          <button
            type="submit"
            style={{ width: "100%", height: "48px", background: "#6366f1", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
          >
            Créer mon compte
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <a
            href="/login"
            style={{ color: "#a1a1aa", fontSize: "13px", textDecoration: "none" }}
          >
            ← Déjà un compte ? Se connecter
          </a>
        </div>
      </div>
    </div>
  );
}
