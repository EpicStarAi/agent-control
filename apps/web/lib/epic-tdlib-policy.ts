// EPIC💀GRAM TDLib Policy — strict NOVIKOVA-only enforcement

export const TDLIB_ALLOWED_ACCOUNT_SLOTS = ['NOVIKOVA'] as const;
export type AllowedAccountSlot = typeof TDLIB_ALLOWED_ACCOUNT_SLOTS[number];

export const TDLIB_ALLOWED_OPERATIONS = {
  'account.status':    ['read'],
  'chat.list':         ['read'],
  'chat.resolve':      ['read'],
  'chat.permissions':  ['read'],
  'message.history':    ['read'],
  'message.send':      ['write'],
  'post.publish':      ['write'],
  'post.verify':       ['read'],
} as const;

export const TDLIB_FORBIDDEN_OPERATIONS = [
  'account.logout',
  'account.delete',
  'session.terminate',
  'session.export',
  '2fa.modify',
  'auth.keys.read',
  'session.dir.read',
  'credentials.export',
  'message.delete',
  'message.deleteBulk',
  'chat.invite',
  'chat.inviteBulk',
  'admin.modify',
] as const;

export interface TdLibPolicyContext {
  account_slot: string;
  operation: string;
  target_chat_id?: string;
}

export function enforceTdLibPolicy(ctx: TdLibPolicyContext): void {
  if (!TDLIB_ALLOWED_ACCOUNT_SLOTS.includes(ctx.account_slot as AllowedAccountSlot)) {
    const err = new Error(
      `POLICY_DENIED: account_slot "${ctx.account_slot}" not in allowlist. Only ${TDLIB_ALLOWED_ACCOUNT_SLOTS.join(', ')} allowed.`
    ) as Error & { code: string; blocked: string };
    err.code = 'POLICY_DENIED';
    err.blocked = 'NOVIKOVA_ONLY';
    throw err;
  }

  const opAllowed = TDLIB_ALLOWED_OPERATIONS[ctx.operation as keyof typeof TDLIB_ALLOWED_OPERATIONS];
  if (!opAllowed) {
    const err = new Error(`POLICY_DENIED: TDLib operation "${ctx.operation}" not allowed`) as Error & { code: string };
    err.code = 'POLICY_DENIED';
    throw err;
  }
}
