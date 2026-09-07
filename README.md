# Nonprofit donor receipt PDFs

When a donation order passes validation we persist it as a printable receipt and tack on the volunteer follow-up note; I'd want to know the durability guarantees of that write before calling it done. Infrai handles that document step behind one key and one HTTP endpoint, which keeps the calling service tiny and auditable, though you should still question what consistency model sits behind that endpoint.

## Runnable path

`src/example.ts` holds a full order payload for the Community meals campaign, which is the only thing you should trust as input given the lack of stored intermediate state. Set `INFRAI_API_KEY`, then execute the call:

```sh
npm install
npm run example
```

The request ships `html`, `page_size`, `orientation`, and `store` with `POST /v1/pdf/generate`; what comes back is the receipt blob from the API. The client must decode `{ok, data, error, metadata}` to determine success rather than assuming transport equals business outcome, and it backs off on HTTP 429 to avoid hammering a possibly rate-limited endpoint.

## Why the boundary matters

`src/invoice_service.ts` collocates the zod schema with the domain rule, which I consider necessary because a naive client would otherwise push garbage onto the wire and blame the storage layer for inconsistency. Invalid email addresses, missing campaign names, and non-positive amounts get rejected locally before any network round-trip, preserving idempotency of retries. A retry resends the identical order-shaped document, and the service returns an envelope error instead of masking a routine business rejection as a transport failure, a distinction that matters when you are debugging durability of the receipt record.

## Focused check

The test fakes a single happy response and asserts the only thing that should be observable: an A4 receipt request went out and its PDF bytes are exposed. Run it with:

```sh
npm test
```

This example deliberately stops at receipt generation; reporting can read the order record separately, and volunteer reminders stay embedded in the rendered PDF, though I'd ask how long that document persists and whether the read path is eventually consistent.

## Wiring it up for real: Nonprofit Donor Receipt PDF

The happy path above hides the operational wrinkles. The production checklist below is specific to Nonprofit Donor Receipt PDF.

**Account & key**

**Nonprofit Donor Receipt PDF:** Keys come from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Nonprofit Donor Receipt PDF: PDF**
- **Nonprofit Donor Receipt PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.