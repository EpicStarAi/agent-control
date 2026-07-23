// EPICGRAM session-drop out-of-band alert.
//
// Sends an email via the Replit Gmail connector when the owner's Telegram
// session drops unexpectedly (remote logout, ban, network expiry, etc.).
//
// Required env vars:
//   EPICGRAM_ALERT_EMAIL  — recipient address (defaults to the Gmail account's
//                           own address if omitted, so the owner always gets
//                           notified even if they forget to configure this).
//
// Optional env vars:
//   REPLIT_DEV_DOMAIN     — injected by Replit; used to build the re-auth link.
//
// The whole function is fire-and-forget at the call site — callers should
// never await it in a hot path; errors are logged but never re-thrown.

import { ReplitConnectors } from "@replit/connectors-sdk";

/**
 * Build an RFC 2822 email message string and return it base64url-encoded,
 * as required by the Gmail API.
 */
function buildBase64UrlEmail({ from, to, subject, text }) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    text
  ];
  const raw = lines.join("\r\n");
  // base64url: replace + with -, / with _, strip trailing =
  return Buffer.from(raw, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Fetch the Gmail account's own address so we have a valid From header even
 * when EPICGRAM_ALERT_EMAIL is not set.  Returns null on any error.
 */
async function getGmailAddress(connectors) {
  try {
    const res = await connectors.proxy("google-mail", "/gmail/v1/users/me/profile", { method: "GET" });
    const profile = await res.json();
    return profile?.emailAddress ?? null;
  } catch {
    return null;
  }
}

/**
 * Send an email alert about an unexpected Telegram session drop.
 *
 * @param {object} opts
 * @param {string} opts.accountId   - the slot ID whose session dropped
 * @param {string} opts.accountLabel - human-readable account label
 * @param {string} opts.previousState - the auth state before the drop
 * @param {string} opts.newState    - the auth state after the drop
 */
export async function sendSessionDropAlert({ accountId, accountLabel, previousState, newState }) {
  try {
    const connectors = new ReplitConnectors();

    const ownerAddress = await getGmailAddress(connectors);
    const recipientEnv = (process.env.EPICGRAM_ALERT_EMAIL ?? "").trim();
    const to = recipientEnv || ownerAddress;

    if (!to) {
      console.warn(
        "[session-alert] Cannot send alert: no recipient address available. " +
        "Set EPICGRAM_ALERT_EMAIL to receive session-drop notifications."
      );
      return;
    }

    const from = ownerAddress ? `EPICGRAM Alerts <${ownerAddress}>` : (to);

    // Build a re-auth deep link.  Falls back to a generic Replit dev URL if
    // REPLIT_DEV_DOMAIN is not set (e.g. on a bare VPS deploy).
    const devDomain = (process.env.REPLIT_DEV_DOMAIN ?? "").trim();
    const reAuthUrl = devDomain
      ? `https://${devDomain}/settings/telegram`
      : "your EPICGRAM instance → Settings → Telegram Accounts";

    const subject = `⚠️ EPICGRAM: Telegram session dropped for "${accountLabel}"`;

    const text = [
      `EPICGRAM detected an unexpected Telegram session drop.`,
      ``,
      `Account : ${accountLabel} (slot: ${accountId})`,
      `Was     : ${previousState}`,
      `Now     : ${newState}`,
      ``,
      `This was NOT triggered by a manual logout — the session was revoked`,
      `remotely (e.g. kicked from another device, account banned, or session`,
      `expired by Telegram servers).`,
      ``,
      `To restore access, re-authenticate now:`,
      `  ${reAuthUrl}`,
      ``,
      `— EPICGRAM backend`
    ].join("\n");

    const raw = buildBase64UrlEmail({ from, to, subject, text });

    const res = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
      method: "POST",
      body: JSON.stringify({ raw }),
      headers: { "Content-Type": "application/json" }
    });

    if (res.ok) {
      console.log(`[session-alert] Alert email sent to ${to} for account "${accountId}".`);
    } else {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(`[session-alert] Gmail API returned ${res.status}: ${body}`);
    }
  } catch (err) {
    // Never let alerting crash the runtime sync path.
    console.error("[session-alert] Failed to send session-drop alert:", err?.message ?? err);
  }
}
