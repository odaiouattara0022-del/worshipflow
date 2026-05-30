export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "16px", background: "#09090b" }}>
      <div style={{ width: "100%", maxWidth: "380px", background: "#18181b", borderRadius: "12px", border: "1px solid #27272a", padding: "32px 24px" }}>
        <h1 style={{ textAlign: "center", fontSize: "24px", fontWeight: "bold", color: "#6366f1", marginBottom: "4px" }}>
          ✦ ProSendWorship
        </h1>
        <p style={{ textAlign: "center", color: "#a1a1aa", marginBottom: "24px", fontSize: "14px" }}>
          Connectez-vous
        </p>

        <form action="/api/auth/login-form" method="POST" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "14px", color: "#fafafa", marginBottom: "6px", fontWeight: "500" }}>
              Nom
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Votre nom"
              autoComplete="username"
              style={{ width: "100%", height: "44px", background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", color: "#fafafa", padding: "0 12px", fontSize: "16px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "14px", color: "#fafafa", marginBottom: "6px", fontWeight: "500" }}>
              Mot de passe
            </label>
            <input
              type="password"
              name="pin"
              required
              placeholder="Votre mot de passe"
              autoComplete="current-password"
              style={{ width: "100%", height: "48px", background: "#09090b", border: "1px solid #27272a", borderRadius: "8px", color: "#fafafa", padding: "0 12px", fontSize: "16px", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <p style={{ color: "#ef4444", textAlign: "center", fontSize: "14px", margin: "0" }}>
              {error === "invalid" ? "Nom ou mot de passe incorrect" : "Erreur de connexion"}
            </p>
          )}

          <button
            type="submit"
            style={{ width: "100%", height: "48px", background: "#6366f1", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
          >
            Se connecter
          </button>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #27272a", textAlign: "center" }}>
          <p style={{ color: "#a1a1aa", fontSize: "13px", marginBottom: "8px" }}>
            Pas encore de compte ?
          </p>
          <a
            href="/register"
            style={{ display: "block", padding: "12px", borderRadius: "8px", border: "1px solid #6366f1", textDecoration: "none", color: "#6366f1", fontWeight: "600", fontSize: "14px" }}
          >
            Créer un compte
          </a>
        </div>
      </div>
    </div>
  );
}
