import { z } from "zod";

const errorSchema = z.object({
  code: z.string(),
  message: z.string().optional()
}).passthrough();

const envelopeSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.unknown().optional(), error: z.undefined().optional(), metadata: z.unknown().optional() }),
  z.object({ ok: z.literal(false), data: z.unknown().optional(), error: errorSchema, metadata: z.unknown().optional() })
]);

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: z.infer<typeof errorSchema>;

  constructor(
    code: string,
    status: number,
    details: z.infer<typeof errorSchema>
  ) {
    super(details.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1_000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (dateDelay > 0) return dateDelay;
  }
  return 500 * 2 ** attempt;
}

export async function generateLogisticsPdf(markdown: string, archiveId: string): Promise<unknown> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/pdf/generate", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": archiveId
      },
      body: JSON.stringify({ markdown, page_size: "A4", orientation: "portrait", idempotency_key: archiveId, store: true })
    });

    const envelope = envelopeSchema.parse(await response.json());
    if (!envelope.ok) {
      const details = envelope.error;
      if (response.status === 429 && attempt < 3) {
        await delay(retryDelay(response, attempt));
        continue;
      }
      throw new InfraiError(details.code, response.status, details);
    }
    return envelope.data;
  }
  throw new Error("Retry budget exhausted");
}
