export const metadata = {
  title: "EPIC GRAM — AI Media Console",
  description: "EPIC GRAM: a lawful Telegram workspace and AI media console. Private beta.",
};

const page: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "radial-gradient(1200px 600px at 50% -10%, #1a2740 0%, #0a0d12 60%)",
  color: "#e8edf2",
  padding: "48px 24px",
};
const inner: React.CSSProperties = { maxWidth: 720, textAlign: "center", lineHeight: 1.6 };
const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.18)",
  fontSize: 13,
  letterSpacing: 1,
  color: "#b1742d",
  marginBottom: 20,
};
const btn: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 22px",
  borderRadius: 12,
  background: "#17212b",
  color: "#e8edf2",
  border: "1px solid rgba(255,255,255,.2)",
  textDecoration: "none",
  fontWeight: 600,
};

export default function LandingPage() {
  return (
    <main style={page}>
      <div style={inner}>
        <div style={badge}>PRIVATE BETA</div>
        <h1 style={{ fontSize: 44, margin: "0 0 8px" }}>EPIC GRAM</h1>
        <p style={{ fontSize: 20, opacity: 0.9, margin: "0 0 6px" }}>AI Media Console</p>
        <p style={{ opacity: 0.75, margin: "0 0 28px" }}>
          A lawful Telegram workspace with AI agents and a safe, approval-based send model.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/" style={btn}>Open App</a>
          <a href="/admin" style={{ ...btn, background: "transparent" }}>Operator Admin</a>
        </div>

        <div style={{ marginTop: 28, opacity: 0.6, fontSize: 14 }}>
          Telegram Web App: open this inside Telegram to run as a Mini App.
        </div>

        <p style={{ marginTop: 36, fontSize: 14 }}>
          <a style={{ color: "#7cc2ff" }} href="/terms">Terms</a> ·{" "}
          <a style={{ color: "#7cc2ff" }} href="/privacy">Privacy</a> ·{" "}
          <a style={{ color: "#7cc2ff" }} href="/abuse">Abuse Policy</a>
        </p>
        <p style={{ marginTop: 10, fontSize: 12, opacity: 0.5 }}>
          Private beta. Not a public production service. Consent-based, owner-operated automation only.
        </p>
      </div>
    </main>
  );
}
