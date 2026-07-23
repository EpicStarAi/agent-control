# epicgram-skill-scaffolder

## Description
Generates a new EPICGRAM skill directory with the correct folder structure, SKILL.md skeleton, and registry entry. Use this whenever adding a skill to the catalog — do not create skill folders manually.

## When to use
Load when:
- You need to create a new EPICGRAM skill.
- An operator asks to "add a skill for X" or "scaffold a new skill".
- Expanding the catalog with a Wave 2 or Wave 3 skill.

## Required inputs

Before scaffolding, confirm:
1. **Skill name** — `epicgram-<noun-verb>` format, kebab-case, max 40 chars.
2. **Layer** — `product | platform | clients | meta`
3. **Description** — one sentence: what triggers this skill.
4. **Wave** — `1 | 2 | 3`
5. **Dependencies** — which existing skills this one calls or is called by.

## Directory structure to create

```
epicgram-skills/<layer>/<skill-name>/
├── SKILL.md           ← main skill file (required)
├── references/        ← optional: API docs, schema snippets, external references
│   └── .gitkeep
└── scripts/           ← optional: helper scripts called from SKILL.md
    └── .gitkeep
```

## SKILL.md skeleton

```markdown
# <skill-name>

## Description
<one sentence — what triggers this skill>

## When to use
Load when:
- <trigger condition 1>
- <trigger condition 2>

## [Core section — protocol, rules, API calls, etc.]

## Integration points
- Requires: <upstream skills>
- Feeds into: <downstream skills>
- Logs to: POST /api/v1/audit
```

## Registry update

After creating the skill directory and SKILL.md, add an entry to `epicgram-skills/registry.json`:

```json
{
  "name": "<skill-name>",
  "layer": "<product|platform|clients|meta>",
  "wave": <1|2|3>,
  "status": "active | stub | planned",
  "path": "epicgram-skills/<layer>/<skill-name>/SKILL.md",
  "description": "<one sentence>",
  "depends_on": [],
  "used_by": []
}
```

## Naming rules

- Always prefix with `epicgram-`
- Use nouns + verbs or compound nouns: `epicgram-content-brief`, `epicgram-safe-mode`
- No version suffixes in the name (use registry `version` field instead)
- Layer folder must match one of: `product`, `platform`, `clients`, `meta`

## Integration points

- Updates: `epicgram-skills/registry.json`
- Called by: any agent adding a new skill
- Related: `epicgram-skill-linter` (validate after scaffolding)
