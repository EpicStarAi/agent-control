# Character Passport — Asset Packs (Digital Actor model)

> Fixed 2026-07-02 by EPIC⭐STAR. Extends `EPIC_AI_OS_v3.md` §4 (Character = full digital actor).
> Principle: don't build the pipeline around pretty images — build a **character passport** where
> each stage is a distinct **asset-pack type**. Then any scene = assembling packs. Same conveyor
> for every character; only the pack contents change.
>
> Discipline: this is a **post–Feature-Freeze / v2.0** expansion. Documented now, built after
> Release 1.0 and after the open P30.1 gate (first real Grok asset) is closed.
> Implementation rule: **extend the existing Template-Card category system + Character Profile +
> Identity Sources — do NOT create a parallel entity.**

## The 9 packs → mapping to what's already built

| # | Pack | Contents | Status vs current build |
|---|---|---|---|
| 1 | 📷 **Identity** | 20–50 reference photos · face-consistency check · Identity Lock | ✅ **built**: Identity Intake + Identity Sources (P27.8), IDENTITY LOCK + FORBIDDEN in prompt. 🟡 needs real face provider (InstantID/PuLID) = P27.9 leaf. |
| 2 | 😀 **Emotion** | neutral·smile·laugh·surprise·sad·angry·thoughtful·confident | ✅ **partial**: Template Cards category `emotion` (neutral/smile/serious/surprised/confident). Extend list. |
| 3 | 🎙 **Voice** | voice · timbre · speech rate · emotional styles · laugh · pauses | 🟡 **new**: Voice provider (ElevenLabs) under RenderProviderAdapter (capability `audio/voice`). Placeholder in Run Scene today. |
| 4 | 🌍 **Environment** | home·office·studio·car·cafe·street · persistent locations | ✅ **partial**: Template Cards category `background` (studio/city/office/neon/outdoor). Extend to named persistent locations. |
| 5 | 👗 **Wardrobe** | casual·sport·business·evening·summer·winter·accessories | ✅ **partial**: Template Cards category `outfit` (casual/business/cyber/travel/creator). Extend. |
| 6 | 🚶 **Motion** | walk·head turns·hand gestures·sitting·laptop·phone·idle anim | 🟡 **new**: Video/motion provider (Veo/Kling/LivePortrait), capability `video/lipsync`. Placeholder now. |
| 7 | 💃 **Performance** | dance·sport·yoga·posing·on-camera·stream | 🟡 **new**: video-performance provider (same video leaf). |
| 8 | 🧠 **Behavior** | manner·vocabulary·catchphrases·character·reactions·memory | ✅ **built**: Character Profile (P29.2: personality/speechStyle/toneOfVoice/skills/constraints/memory) + memory scopes. |
| 9 | 🎬 **Story** | biography·goals·relationships·arcs·development history | ✅ **built**: Character Profile `storySeed` + Story Planner (P29.3 Season/Episode/Scene) + Relationship Graph (P29.1). |

**Net-new work = packs 3 (Voice), 6 (Motion), 7 (Performance)** — all provider leaves under the
existing Render Router. Packs 1/2/4/5/8/9 already exist and just get expanded.

## The one pipeline (already exists as Run Scene, P29.4)
```
Identity + Emotion + Voice + Environment + Wardrobe + Motion + Story
      → Scene (cast + assembled prompt)
      → Media Pipeline (image · video · voice)
      → Quality Gate → Approval → Publish
```
Run Scene already assembles a Scene from the cast + character context. Packs simply become the
typed inputs it pulls from. Scales to any new character: swap pack contents, conveyor unchanged.

## How to build it (post-freeze), without a parallel system
- **Pack = a Template-Card category** (already have emotion/pose/outfit/background/camera/platform).
  Add categories `voice` · `motion` · `performance`; expand emotion/outfit/background lists.
- **Pack asset = an AvatarAsset tagged with its pack type** (reuse assets + a `packType` tag / sceneKey
  convention). No new asset table.
- **Identity pack** = Identity Sources (exists). **Behavior/Story packs** = Character Profile (exists).
- Real face/voice/video = provider adapters under the existing RenderProviderAdapter contract
  (P27.9 image-identity, P27.10 voice, video) — plugged in one at a time.

## Sequencing
1. **Close P30.1** — first real Grok asset (open gate).
2. Release 1.0 on the working image loop.
3. Then v2.0: expand Template-Card categories → Emotion/Wardrobe/Environment packs; add Voice
   provider → Voice pack; add Video provider → Motion/Performance packs; wire the passport view.
Nothing here is built before 1.0. NOVIKOVA is the reference passport; every other character copies it.
