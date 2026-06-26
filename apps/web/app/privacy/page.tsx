// P0 legal skeleton — DRAFT. Not legal advice; have a lawyer review before public launch.
export const metadata = {
  title: "Privacy Policy — EPIC GRAM",
  description: "Privacy Policy for the EPIC GRAM client.",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px", lineHeight: 1.6 }}>
      <h1>Privacy Policy</h1>
      <p><em>DRAFT — last updated: 2026-06-26. Working draft pending legal review.</em></p>

      <h2>1. Self-hosted / local-first</h2>
      <p>
        EPIC GRAM is operated by you. Telegram session data, account credentials and content are
        stored locally in your own environment (e.g. the local runtime and your own database).
        Operators do not centrally collect your Telegram messages.
      </p>

      <h2>2. What data is processed</h2>
      <p>
        To function, the app processes: your connected account identifiers, channel/chat metadata,
        content you create or schedule, and AI prompts you submit. Some AI features send prompt
        text to third-party model providers (e.g. OpenRouter, Moonshot/Kimi, ElevenLabs) to return
        results; review each provider&apos;s policy. Local models (Ollama) keep prompts on your machine.
      </p>

      <h2>3. Secrets</h2>
      <p>
        API keys and tokens are stored in server-side environment files and are never displayed in
        the UI or committed to source control. You are responsible for rotating any credential that
        is exposed.
      </p>

      <h2>4. Third parties</h2>
      <p>
        Connected services (Telegram, model providers, payment/Stars, hosting) process data under
        their own policies. EPIC GRAM only shares what is necessary to perform an action you request.
      </p>

      <h2>5. Your control</h2>
      <p>
        You can disconnect accounts and delete local data at any time. Because data is local-first,
        deletion is performed in your own environment.
      </p>

      <h2>6. Contact</h2>
      <p>Contact: <a href="mailto:buchmanchik@gmail.com">buchmanchik@gmail.com</a></p>

      <p style={{ marginTop: 32 }}>
        See also: <a href="/terms">Terms of Service</a> · <a href="/abuse">Abuse Policy</a>
      </p>
    </main>
  );
}
