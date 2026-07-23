/**
 * operator-chat — message construction tests
 *
 * Key invariant: when a request carries BOTH image attachments (vision) AND PDF
 * attachments, the LLM payload must contain both image_url content blocks AND
 * the extracted PDF text. Previously, PDF injection overwrote the multimodal
 * array with a plain string, silently dropping vision input.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

// ── pdf-parse mock ─────────────────────────────────────────────────────────────
// operator-chat.ts now lazy-imports pdf-parse via parsePdf().
// The dynamic `import("pdf-parse")` is intercepted by the same vi.mock.
vi.mock("pdf-parse", () => ({
  default: async (_buf: Buffer) => ({
    text: "Extracted PDF content: Contract dated 2025-01-01",
    numpages: 1,
  }),
}));

// ── OpenAI mock — capture the messages sent to the LLM ────────────────────────
// Using a module-level store so the factory closure can write to it.
const llmCalls: { messages: any[] }[] = [];

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(async (args: Record<string, unknown>) => {
          llmCalls.push({ messages: args["messages"] as any[] });
          return {
            choices: [
              {
                message: { role: "assistant", content: "OK", tool_calls: null },
                finish_reason: "stop",
              },
            ],
          };
        }),
      },
    },
  },
  generateImageBuffer: vi.fn(async () => Buffer.from("fake-png-bytes")),
}));

// Import router AFTER mocks so the mocked modules are used
import router from "./operator-chat";

// ── tiny 1×1 transparent PNG (valid image, ~68 bytes base64) ──────────────────
const FAKE_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// ── minimal PDF base64 header (pdf-parse mock will handle the actual parsing) ──
const FAKE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQK";

function buildApp(): Express {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use("/", router);
  return app;
}

describe("operator-chat: mixed image + PDF attachments", () => {
  beforeEach(() => {
    llmCalls.length = 0;
    // Stub fetch for EPICGRAM memory/rules endpoints → return empty entries
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string) =>
        new Response(JSON.stringify({ entries: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preserves image_url blocks when a PDF is attached alongside an image", async () => {
    const app = buildApp();

    const res = await request(app)
      .post("/operator/chat")
      .send({
        messages: [{ role: "user", content: "Analyse the image and summarise the contract" }],
        attachments: [
          { name: "photo.png",    type: "image/png",        dataUrl: FAKE_PNG_DATA_URL, size: 100 },
          { name: "contract.pdf", type: "application/pdf",  dataUrl: FAKE_PDF_DATA_URL, size: 400 },
        ],
        conversationId: "test-mixed-atts",
      });

    expect(res.status).toBe(200);
    expect(llmCalls.length).toBeGreaterThan(0);

    const messages: any[] = llmCalls[0]!.messages;
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    expect(lastUserMsg).toBeDefined();

    // Content must be an ARRAY (multimodal) — not a plain string
    expect(Array.isArray(lastUserMsg.content), "content should be an array").toBe(true);
    const parts: any[] = lastUserMsg.content;

    // ── image_url block must survive PDF injection ──────────────────────────
    const imageBlocks = parts.filter((p: any) => p.type === "image_url");
    expect(imageBlocks.length, "image_url block must be present").toBeGreaterThan(0);
    expect(imageBlocks[0]!.image_url.url).toBe(FAKE_PNG_DATA_URL);

    // ── PDF text must be injected into the text block ──────────────────────
    const textBlocks = parts.filter((p: any) => p.type === "text");
    expect(textBlocks.length, "text block must be present").toBeGreaterThan(0);
    const combinedText: string = textBlocks.map((b: any) => b.text as string).join(" ");
    expect(combinedText).toContain("Extracted PDF content");
    expect(combinedText).toContain("contract.pdf");
  });

  it("injects PDF text as <document> into plain-text messages without images", async () => {
    const app = buildApp();

    const res = await request(app)
      .post("/operator/chat")
      .send({
        messages: [{ role: "user", content: "Please summarise this document" }],
        attachments: [
          { name: "report.pdf", type: "application/pdf", dataUrl: FAKE_PDF_DATA_URL, size: 300 },
        ],
        conversationId: "test-pdf-only",
      });

    expect(res.status).toBe(200);
    expect(llmCalls.length).toBeGreaterThan(0);

    const messages: any[] = llmCalls[0]!.messages;
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    expect(lastUserMsg).toBeDefined();

    // No images → content can be either a plain string or an array with text only
    const contentText: string =
      typeof lastUserMsg.content === "string"
        ? lastUserMsg.content
        : (lastUserMsg.content as any[]).map((c: any) => c.text ?? "").join(" ");

    expect(contentText).toContain("Extracted PDF content");
    expect(contentText).toContain("report.pdf");
  });
});
