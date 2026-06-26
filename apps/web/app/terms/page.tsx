// P0 legal skeleton — DRAFT. Not legal advice; have a lawyer review before public launch.
export const metadata = {
  title: "Terms of Service — EPIC GRAM",
  description: "Terms of Service for the EPIC GRAM client.",
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px", lineHeight: 1.6 }}>
      <h1>Terms of Service</h1>
      <p><em>DRAFT — last updated: 2026-06-26. This is a working draft pending legal review.</em></p>

      <h2>1. What EPIC GRAM is</h2>
      <p>
        EPIC GRAM is a lawful, user-operated communication and media console for managing
        your own Telegram accounts, channels and content workflows with explicit, consent-based
        automation. You operate it on your own behalf and for accounts you are authorized to use.
      </p>

      <h2>2. Acceptable use</h2>
      <p>
        You agree NOT to use EPIC GRAM for spam, mass unsolicited messaging, fake engagement,
        circumventing platform rate limits or anti-abuse systems, accessing accounts you do not
        own or are not authorized to operate, or any activity that violates Telegram&apos;s Terms of
        Service or applicable law. Outbound publishing and messaging require explicit manual
        approval.
      </p>

      <h2>3. Accounts and authorization</h2>
      <p>
        You are responsible for the accounts you connect and for obtaining any required consent
        from people you communicate with. You must comply with Telegram&apos;s Terms and the rules of
        any third-party service you connect.
      </p>

      <h2>4. AI-generated content</h2>
      <p>
        EPIC GRAM can assist in generating text, media and suggestions. You are responsible for
        reviewing and approving any content before it is published or sent.
      </p>

      <h2>5. No warranty / limitation of liability</h2>
      <p>
        The software is provided &quot;as is&quot; without warranties. To the maximum extent permitted by
        law, the operators are not liable for indirect or consequential damages arising from use.
      </p>

      <h2>6. Changes</h2>
      <p>These terms may be updated. Continued use after changes constitutes acceptance.</p>

      <h2>7. Contact</h2>
      <p>Contact: <a href="mailto:buchmanchik@gmail.com">buchmanchik@gmail.com</a></p>

      <p style={{ marginTop: 32 }}>
        See also: <a href="/privacy">Privacy Policy</a> · <a href="/abuse">Abuse Policy</a>
      </p>
    </main>
  );
}
