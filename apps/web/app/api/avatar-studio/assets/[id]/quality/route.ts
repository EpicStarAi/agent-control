import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getAsset, setAssetQuality } from "@/lib/avatarStudioData";
import { normalizeQuality, score } from "@/lib/avatarStudio";
import { broadcast } from "@/lib/operatorBus";

// P27.4 — operator quality gate for an asset. Sets quality_status + optional scores
// and notes. No automated face-matching here (manual/operator gate for P27.4).
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: asset } = await getAsset(ws, params.id);
  if (!asset) return NextResponse.json({ ok: false, message: "asset not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { status?: string; qualityScore?: number; identityScore?: number; styleScore?: number; artifactScore?: number; notes?: string };
  const qs = normalizeQuality(body.status);
  const { data: updated } = await setAssetQuality(ws, params.id, {
    qualityStatus: qs, qualityScore: score(body.qualityScore), identityScore: score(body.identityScore),
    styleScore: score(body.styleScore), artifactScore: score(body.artifactScore),
    qualityNotes: typeof body.notes === "string" ? body.notes.slice(0, 600) : undefined,
  });
  broadcast("audit.logged", { event: "avatar.asset.quality", workspaceId: ws, assetId: params.id, quality: qs });
  return NextResponse.json({ ok: true, asset: updated });
}
