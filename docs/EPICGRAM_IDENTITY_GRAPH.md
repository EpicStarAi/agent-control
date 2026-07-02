# EPIC💀GRAM v2 — Identity Graph (relationship overlay, not a god-store)

> Fixed 2026-07-02 by EPIC⭐STAR. v2.0 direction. **DOC ONLY — no code under Feature Freeze.**
> Extends the P29.1 Relationship Graph and the v3 Knowledge Graph; refines
> `EPICGRAM_REFERRAL_PARTNER_ECONOMY.md` (invite becomes one edge type). Not legal advice.

## The good part
Making "invite" just one edge type in a user graph avoids a parallel referral subsystem, and it matches
how the architecture already trends: P29.1 already has a character↔character Relationship Graph, and v3
canon already names a Knowledge Graph. So a user-level Identity Graph is the natural generalization —
**extend the existing Relationship Graph from character-only to all-entity nodes**, not invent a new
system.

## The trap (and it contradicts last round's own conclusion)
"One graph for EVERYTHING — including Economy, Knowledge, Publisher — as edges" is the classic
over-generalization that kills projects. One message ago we agreed: **referral tree and economy are
DIFFERENT subsystems, keep them separate.** Turning Economy into "just an edge" silently reverses that.

Why it's wrong to store those AS edges:
- **No type safety / god-table.** An economy event (amount, currency, refund state, ordering) is nothing
  like an invite (code, expiry, uses) is nothing like a knowledge link. Forcing them into one homogeneous
  edge table = a soft-typed junk drawer where every consumer parses schema-in-JSON and the DB enforces
  nothing.
- **Money must not be an edge.** A ledger needs ACID, immutability, audit, reversal — the opposite of a
  flexible graph edge. Economy stays a **ledger**, exactly the downstream model we just fixed.
- **Blast radius.** Identity + money + social tokens in one structure widens the security surface; a
  traversal bug could cross financial/identity boundaries. Secrets/tokens stay OUT of the graph (same as
  Passport §3.2).
- **Perf.** One edges table with 9 semantics = every query filters by type; economy's access patterns
  (sums, ordering, reversals) don't belong next to knowledge links.

## The synthesis: graph as OVERLAY/INDEX, not as STORAGE
Distinguish the graph as a *relationship index* from the graph as *the store*:
- **Nodes = stable references** to entities that live in their own typed stores: user · project · character
  · org · account · invite.
- **Edges = typed, thin relationships** only: `owns · partners · member-of · referred-by · operates ·
  publishes-to`. An edge = `(src_node, dst_node, rel_type, light metadata)` — NOT the economy/knowledge
  payload.
- Each subsystem keeps its own properly-typed store (as today): `referral_invites`, the ledger,
  the memory store, `/api/connections`, `characters`/`avatar_projects`. The Identity Graph is an
  **overlay over these**, not a replacement.

So Economy is NOT a node/edge type — it's a **ledger that READS attribution from the graph** (the
`referred-by` / `owns` edges) and owns the money itself. The graph answers "who is connected to whom";
the ledger answers "who is owed what". This keeps the separation we agreed AND delivers the unification
you want — but only at the relationship layer.

```
Identity Graph (thin typed relationship overlay)
        │  provides attribution (who referred/owns whom)
        ▼
Economy Engine (reads attribution) ──► Reward Policy ──► Ledger ──► Manual Approval ──► Payout
```

## Governance constraint (or it rots)
A universal graph is a schema-governance burden. Node types and edge types must be a **small, closed,
versioned enum** (like our role / relation-type enums), never open-ended. Otherwise it becomes an
ontology nobody understands. Add a type only deliberately, versioned.

## Maps to what exists
- Generalize P29.1 `character_relationships` → an entity-agnostic `identity_edges(src_type,src_id,
  dst_type,dst_id,rel_type,metadata)` with a closed rel_type enum. Nodes reference existing tables; no
  data migration of the typed stores.
- Referral "Phase A" (attribution-only: invites + edges + leaderboard, no money) from the referral doc
  **IS the first slice of the Identity Graph.** The two proposals converge — build the relationship
  overlay first, economy reads it later.
- Authz note: the graph can later inform "who owns what" for permissions — but do NOT overload it as the
  permission system on day one.

## Sequencing (all v2.0)
1. Ship 1.0 first (close P30.1, NOVIKOVA reference, manual loop).
2. v2.0 Phase A: identity_edges overlay (generalize Relationship Graph) + invites as `referred-by` edges
   + leaderboard — no money. Legal-light, immediately useful.
3. v2.0 Phase B/C: Economy Engine reads graph attribution → shadow ledger → (legal-gated) human-approved
   payouts, single-level. Money last, as already fixed.

## Verdict
Yes — this is the more scalable long-term model, and future products (Marketplace, AI Media OS, Digital
Humans, cloud services) can share ONE relationship overlay instead of N referral systems. **But only if
the graph stays a thin typed relationship index and money/knowledge/secrets stay in their own stores.**
The graph unifies *relationships*, not *everything*. That distinction is what keeps it an asset instead
of a god-object.
