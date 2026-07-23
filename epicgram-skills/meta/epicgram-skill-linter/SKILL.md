# epicgram-skill-linter

## Description
Validates that an EPICGRAM skill directory is correctly structured, has all required SKILL.md fields, is registered in registry.json, and doesn't reference non-existent upstream skills. Run after scaffolding or editing any skill.

## When to use
Load when:
- A new skill has been scaffolded.
- A SKILL.md has been edited.
- Running a pre-commit or CI check on the skills catalog.
- An agent or client reports that a skill didn't load correctly.

## Validation Checklist

For each skill, verify:

### Structure
- [ ] Directory exists at `epicgram-skills/<layer>/<skill-name>/`
- [ ] `SKILL.md` exists in the directory
- [ ] Directory name matches `epicgram-<noun>` pattern (kebab-case, `epicgram-` prefix)
- [ ] Layer folder is one of: `product`, `platform`, `clients`, `meta`

### SKILL.md content
- [ ] Has `# <skill-name>` as H1 (must match directory name)
- [ ] Has `## Description` section (non-empty, ≤ 2 sentences)
- [ ] Has `## When to use` section with at least one bullet
- [ ] Has `## Integration points` section
- [ ] No placeholder text left (`<fill in>`, `TODO`, `...` as the only content)
- [ ] References to other skills use correct exact names (cross-check against registry)
- [ ] No hard-coded secrets, tokens, or credentials in the file

### Registry
- [ ] Skill appears in `epicgram-skills/registry.json`
- [ ] `path` field points to the actual file
- [ ] `status` is one of: `active`, `stub`, `planned`
- [ ] `depends_on` and `used_by` reference only skill names that exist in the registry

## Output Format

```
✅ epicgram-safe-mode         — PASS (all checks)
✅ epicgram-content-brief      — PASS (all checks)
⚠️  epicgram-tiktok-publisher  — STUB (no When-to-use bullets, status: stub)
❌ epicgram-video-assembly     — FAIL: not in registry.json
```

Exit with a summary count: `N passed, M warnings, K failed`.

## Auto-fix rules

The linter may auto-fix:
- Missing `references/` or `scripts/` directories (create with `.gitkeep`)
- Wrong layer directory (move if skill-name makes the correct layer obvious)

The linter must NOT auto-fix:
- Missing SKILL.md content — report and stop
- Registry mismatches involving `depends_on` / `used_by` — report and ask

## Integration points

- Run after: `epicgram-skill-scaffolder`
- Updates nothing automatically — report only
- Can be invoked by: any agent, CI pipeline, pre-commit hook
- Reference: `epicgram-skills/registry.json`
