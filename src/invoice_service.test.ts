import test from "node:test";
import assert from "node:assert/strict";
import { generateInvoice } from "./invoice_service.ts";

test("receipt generation sends a validated A4 invoice and returns its data", async () => {
  process.env.INFRAI_API_KEY = "test-key";
  let request: RequestInit | undefined;
  const fakeFetch = async (_url: string, init?: RequestInit) => {
    request = init;
    return new Response(JSON.stringify({ ok: true, data: { pdf: "stored-receipt" }, metadata: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const result = await generateInvoice({ donorName: "A", donorEmail: "a@example.org", campaign: "Meals", amountCents: 5000, orderId: "o-1" }, fakeFetch as typeof fetch);
  assert.deepEqual(result, { pdf: "stored-receipt" });
  assert.equal(request?.method, "POST");
  assert.match(String(request?.body), /page_size/);
});
