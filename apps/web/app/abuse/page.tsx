// P0 legal skeleton — DRAFT. Not legal advice; have a lawyer review before public launch.
export const metadata = {
  title: "Abuse Policy — EPIC GRAM",
  description: "Acceptable Use and Abuse Policy for the EPIC GRAM client.",
};

export default function AbusePage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px", lineHeight: 1.6 }}>
      <h1>Abuse / Acceptable Use Policy</h1>
      <p><em>DRAFT — last updated: 2026-06-26. Working draft pending legal review.</em></p>

      <h2>Prohibited</h2>
      <ul>
        <li>Spam or mass unsolicited messaging.</li>
        <li>Fake engagement, bot farms, or artificial growth.</li>
        <li>Cold mass-DM to people who have not opted in.</li>
        <li>Circumventing platform rate limits, bans, or anti-abuse systems.</li>
        <li>Accessing or automating accounts you do not own or are not authorized to operate.</li>
        <li>Fraud, scams, phishing, or distribution of malware.</li>
        <li>Content that sexualizes minors or otherwise violates the law.</li>
        <li>Anything violating Telegram&apos;s Terms of Service.</li>
      </ul>

      <h2>Built-in safeguards</h2>
      <p>
        EPIC GRAM is designed white-hat: outbound publishing and messaging run behind an explicit
        manual-approval gate, and a scam-radar flags suspicious activity. Automation is consent-based
        and operates only on accounts you are authorized to use.
      </p>

      <h2>Reporting abuse</h2>
      <p>
        Report suspected abuse to <a href="mailto:buchmanchik@gmail.com">buchmanchik@gmail.com</a>.
        Violations may result in suspension of access.
      </p>

      <p style={{ marginTop: 32 }}>
        See also: <a href="/terms">Terms of Service</a> · <a href="/privacy">Privacy Policy</a>
      </p>
    </main>
  );
}
