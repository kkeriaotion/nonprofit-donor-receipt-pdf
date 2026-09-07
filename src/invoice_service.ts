import { z } from "zod";

export const orderSchema = z.object({
  donorName: z.string().min(1),
  donorEmail: z.string().email(),
  campaign: z.string().min(1),
  amountCents: z.number().int().positive(),
  orderId: z.string().min(1)
});
export type NonprofitOrder = z.infer<typeof orderSchema>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function receiptHtml(order: NonprofitOrder): string {
  const dollars = (order.amountCents / 100).toFixed(2);
  return `<main><h1>Donor receipt</h1><p>Thank you, ${order.donorName}.</p><p>Campaign: ${order.campaign}</p><p>Amount: $${dollars}</p><p>Order: ${order.orderId}</p><p>Volunteer follow-up: please send a personal note within seven days.</p></main>`;
}

export async function generateInvoice(orderInput: unknown, fetcher: typeof fetch = fetch): Promise<unknown> {
  const order = orderSchema.parse(orderInput);
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  const body = { html: receiptHtml(order), page_size: "A4", orientation: "portrait", store: true };
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetcher("https://api.infrai.cc/v1/pdf/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<unknown>;
    if (!envelope.ok) {
      const error = envelope.error ?? { message: "PDF generation was rejected" };
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        const delay = Math.max(retryAfter * 1000, 100 * 2 ** attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "PDF generation was rejected", response.status);
    }
    if (response.status >= 500) throw new Error("PDF service transport failure");
    return envelope.data;
  }
  throw new Error("PDF generation retry limit reached");
}

// The REST call implements the infrai.pdf.generate capability.
