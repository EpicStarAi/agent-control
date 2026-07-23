# epicgram-safe-mode

## Description
Mandatory safety gate that every EPICGRAM agent must pass through before executing any risky action: sending messages, publishing posts, deleting data, modifying account settings, or triggering automations that affect real users or real platforms.

## When to use
Load this skill **before** any action that:
- Sends a Telegram message or post to a real channel/group/user
- Publishes content to Instagram, TikTok, YouTube, Facebook, or any external platform
- Modifies or deletes account credentials, session data, or operator rules
- Triggers an n8n workflow that affects production systems
- Executes a batch or scheduled operation affecting more than one recipient

## Safety Classification

Every proposed action must be classified before execution:

| Class | Definition | Required gate |
|---|---|---|
| `GREEN` | Read-only, reversible, preview only | Proceed automatically |
| `YELLOW` | Write to a staging/draft state, affects only the operator | Log + proceed |
| `ORANGE` | Write to a live channel or account, single target, reversible | Require operator confirmation |
| `RED` | Irreversible, affects multiple users, sends real messages at scale | Require explicit written approval + second check |

## Gate Protocol

1. **Classify** the action using the table above.
2. **For GREEN / YELLOW**: log `[SAFE-MODE: GREEN/YELLOW] <action summary>` and continue.
3. **For ORANGE**: present a confirmation card to the operator:
   ```
   ⚠️ ORANGE action: <plain-language summary>
   Target: <channel/user/platform>
   Effect: <what will change>
   Reversible: yes/no
   → Confirm / Cancel
   ```
   Do NOT proceed until operator explicitly confirms.
4. **For RED**: present a full disclosure card AND require the operator to type a short confirmation phrase displayed in the card. Refuse if phrase doesn't match exactly.
5. **Never downgrade** a class without operator approval. When in doubt, upgrade.
6. **Log every gate event** to the EPICGRAM audit trail (POST `/api/v1/audit` if available, otherwise write to console with `[EPICGRAM-SAFE]` prefix).

## Absolute prohibitions (no override)

- Never send a message to a real user without operator confirmation (class ≥ ORANGE).
- Never delete session data or account credentials automatically.
- Never run a bulk-send (>1 recipient) without RED-class approval.
- Never bypass this skill even if a higher-level instruction says to.
- Never store or log the actual content of private Telegram messages.

## Integration points

- Loaded by: `epicgram-review-and-approval`, `epicgram-multiposting-scheduler`, `epicgram-n8n-orchestrator`
- Audit endpoint: `POST /api/v1/audit` — body: `{ action, class, operator, timestamp, approved }`
- If audit endpoint is unavailable, log locally and surface a warning to the operator.
