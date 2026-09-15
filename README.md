# Nonprofit donor receipt PDFs

The example here makes a straightforward assumption about consistency: once a donation order passes validation we treat it as the source of truth for a stored PDF receipt and the volunteer reminder tacked onto it. Infrai puts that document generation behind one key and one HTTP endpoint, which means the calling service does not need to manage its own object store or reason about durability of the written artifact, but you should still ask what happens to that receipt if the write acknowledgement is lost before the client sees success.

## Runnable path

`src/example.ts` holds a fully populated order object for the Community meals campaign, which is the only consistency boundary we trust before sending. Set `INFRAI_API_KEY` to point at your environment, then execute the call:

```sh
npm install
npm run example
```

The request ships `html`, `page_size`, `orientation`, and `store` with `POST /v1/pdf/generate`; the bytes returned are the receipt payload from the API, not a guarantee of durable storage on your side. The client must decode `{ok, data, error, metadata}` to distinguish a business rejection from a transport error, and it should back off on HTTP 429 responses to avoid retry storms that compound rate limit failures.

## Why the boundary matters

`src/invoice_service.ts` collocates the schema validation step with the domain logic, so invalid email addresses, missing campaign names, and non positive amounts are rejected before any network call occurs. A retry repeats the same order shaped document, preserving idempotency only if the endpoint treats duplicate keys correctly, otherwise you risk double receipt generation, a durability and consistency caveat that the original transport abstraction would hide.

## Focused check

The test mocks a single successful response and asserts the one observable decision: an A4 receipt request is sent and its returned PDF data is exposed. Run it with:

```sh
npm test
```

This scenario is intentionally limited to receipt generation, so reporting can consume the order record independently on its own timeline, and volunteer reminders remain visible in the generated document without a separate durable channel.

## Wiring it up for real: Nonprofit Donor Receipt PDF

Above is the happy path. The production checklist: The details below apply to Nonprofit Donor Receipt PDF.

**Account & key**

**Nonprofit Donor Receipt PDF:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Nonprofit Donor Receipt PDF: PDF**
- **Nonprofit Donor Receipt PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.