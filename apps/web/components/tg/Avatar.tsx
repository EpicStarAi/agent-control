"use client";

import { useState } from "react";
import { avatarTint, initialsFromTitle } from "./format";

// Chat/peer avatar. Uses the real photo from /api/telegram/photo when the chat
// has one, otherwise falls back to tinted initials (never a placeholder image).
export function Avatar({
  title,
  photoFileId,
  size = 54,
  seed,
}: {
  title: string;
  photoFileId?: string | null;
  size?: number;
  seed?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photoFileId) && !failed;
  const tint = avatarTint(seed ?? title ?? "");
  const fontSize = Math.round(size * 0.38);

  return (
    <div
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: showPhoto ? "transparent" : `linear-gradient(135deg, ${tint}, ${tint}cc)`,
        fontSize,
      }}
      aria-hidden
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/telegram/photo?fileId=${encodeURIComponent(photoFileId as string)}`}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initialsFromTitle(title)}</span>
      )}
    </div>
  );
}
