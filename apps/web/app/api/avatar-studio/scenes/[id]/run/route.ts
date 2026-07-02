import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getScene, updateScene, getCharacter, getCharacterProfile, createJob, runQueueOnce } from "@/lib/avatarStudioData";
import { buildCharacterContext, buildScenePrompt, newBatchId } from "@/lib/avatarStudio";
import { broadcast } from "@/lib/operatorBus";

// P29.4 Cast→Content — "Run Scene". Single execution pipeline:
// Scene → per-character Context (P29.2) → Prompt → Image render (real mock pipeline
// P27.8 → Quality Gate) → video/voice/caption/publish as PLACEHOLDER steps → status.
// No auto-approve, no auto-publish (publish needs P28 Social + approval gate).
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: scene } = await getScene(ws, params.id);
  if (!scene) return NextResponse.json({ ok: false, reason: "MISSING_SCENE" }, { status: 404 });
  if (!scene.characterIds.length) return NextResponse.json({ ok: false, reason: "MISSING_CAST" }, { status: 400 });

  await updateScene(ws, scene.id, { status: "generating" });
  const batchId = newBatchId();
  const sceneKey = `scene:${scene.id}`;
  const cast: { characterId: string; name: string; avatarId: string; jobId: string }[] = [];
  let ci = 0;
  for (const charId of scene.characterIds) {
    const { data: character } = await getCharacter(ws, charId);
    if (!character) continue;
    const { data: profile } = await getCharacterProfile(ws, charId);
    const context = buildCharacterContext(character, profile);
    const prompt = buildScenePrompt(scene, context);
    const { data: job } = await createJob(ws, {
      avatarId: character.avatarId || "", packId: "scene", engine: "grok_imagine_ui", status: "queued",
      sceneKey, prompt, providerId: "mock_grok_imagine", selectedBy: "scene",
      batchId, candidateIndex: ci, attempts: 0, maxAttempts: 3,
    });
    cast.push({ characterId: charId, name: character.name, avatarId: character.avatarId || "", jobId: job.id });
    ci++;
  }
  if (!cast.length) { await updateScene(ws, scene.id, { status: "ready" }); return NextResponse.json({ ok: false, reason: "NO_RESOLVABLE_CHARACTERS" }, { status: 400 }); }

  // Run the mock render queue once → produces pending_review image assets (never approved).
  const run = await runQueueOnce(ws);
  const { data: after } = await updateScene(ws, scene.id, { status: "done" });

  const steps = {
    image: `done · ${cast.length} render job(s) → pending_review (Quality Gate)`,
    voice: "placeholder (voice provider — later phase)",
    video: "placeholder (video provider — later phase)",
    caption: "placeholder (caption — later phase)",
    publish: "placeholder (needs P28 Social Connect + approval gate — no auto-publish)",
  };
  broadcast("audit.logged", { event: "avatar.scene.run", workspaceId: ws, sceneId: scene.id, batchId, imageJobs: cast.length });
  return NextResponse.json({ ok: true, sceneId: scene.id, sceneKey, batchId, status: after?.status || "done", cast, imageJobs: cast.length, processed: run.processed, steps });
}
