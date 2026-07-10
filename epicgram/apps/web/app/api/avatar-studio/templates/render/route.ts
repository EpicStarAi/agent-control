import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getAvatar, getPassport, listIdentitySources, createJob } from "@/lib/avatarStudioData";
import { getTemplateCard, buildTemplatePrompt, newBatchId } from "@/lib/avatarStudio";
import { isKnownProvider, DEFAULT_PROVIDER } from "@/lib/renderProviders";
import { broadcast } from "@/lib/operatorBus";

// P27.8 — render a template card into N queued candidate jobs for an avatar.
// Requires an existing avatar + at least one identity source. No auto-approve,
// no auto-publish. Candidates land in the existing P27.7 Candidate Groups.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { avatarId?: string; templateId?: string; candidateCount?: number; providerId?: string };

  const avatarId = String(body.avatarId || "");
  const { data: avatar } = await getAvatar(ws, avatarId);
  if (!avatar) return NextResponse.json({ ok: false, reason: "MISSING_AVATAR" }, { status: 404 });

  const { data: sources } = await listIdentitySources(ws, avatarId);
  if (!sources.length) return NextResponse.json({ ok: false, reason: "MISSING_IDENTITY_SOURCE" }, { status: 400 });

  const card = getTemplateCard(String(body.templateId || ""));
  if (!card) return NextResponse.json({ ok: false, reason: "MISSING_TEMPLATE" }, { status: 400 });

  const providerId = body.providerId && isKnownProvider(body.providerId) ? body.providerId : DEFAULT_PROVIDER;
  const { data: passport } = await getPassport(ws, avatarId);
  const prompt = buildTemplatePrompt(passport, card);
  const count = Math.max(1, Math.min(4, Number(body.candidateCount) || 3));
  const batchId = newBatchId();
  const jobs = [];
  for (let ci = 0; ci < count; ci++) {
    const { data: nj } = await createJob(ws, {
      avatarId, packId: "template", engine: "grok_imagine_ui", status: "queued",
      sceneKey: card.id, prompt, providerId, selectedBy: "template",
      batchId, candidateIndex: ci, attempts: 0, maxAttempts: 3,
    });
    jobs.push(nj);
  }
  broadcast("audit.logged", { event: "avatar.template.render", workspaceId: ws, avatarId, templateId: card.id, batchId, count });
  return NextResponse.json({ ok: true, status: "TEMPLATE_JOB_QUEUED", templateId: card.id, batchId, count, jobs });
}
