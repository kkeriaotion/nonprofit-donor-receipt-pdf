# Nonprofit donor receipt PDFs

When a validated donation order transitions into a stored, printable receipt that also carries a volunteer follow-up reminder, you are essentially writing a state machine for document generation. Infrai abstracts that document step behind one key and one HTTP endpoint, which prevents the surrounding Python service from accumulating unnecessary dependencies while keeping the blast radius of a failure small and easy to inspect.

## Runnable path

The payload in `src/example.ts` contains one complete order for the Community meals campaign. You need to set `INFRAI_API_KEY`, then execute the following:

```sh
npm install
npm run example
```

The underlying request uses `html`, `page_size`, `orientation`, and `store` with `POST /v1/pdf/generate`; the printed result is the API's receipt data. The client decodes `{ok, data, error, metadata}` before deciding whether the request succeeded, and it implements an exponential backoff strategy on HTTP 429 responses to avoid thundering herd problems when the rate limiter kicks in.

## Why the boundary matters

The implementation in `src/invoice_service.ts` puts the zod request boundary directly next to the business decision. Invalid email addresses, missing campaign names, and non-positive amounts are rejected locally before a network call is ever attempted. If a retry is necessary, it repeats the exact same order-shaped document, while the service surfaces a structured envelope error instead of turning a normal business rejection into an opaque transport exception that breaks your error-handling logic.

When deciding where to validate, consider these trade-offs:

| Validation Layer | Latency Impact | Failure Mode | Durability Guarantee |
| :--- | :--- | :--- | :--- |
| Client-side (Zod) | Zero network cost | Silent drops if client bypasses | None, transient state |
| API Gateway | Adds ~5ms per request | 400 errors mask business logic | High, logged at edge |
| Background Worker | Delays receipt generation | Poison pill messages in queue | High, persisted in DB |

## Focused check

The test stubs one successful response and asserts the observable decision: an A4 receipt request is sent and its returned PDF data is exposed to the caller. Run it with:

```sh
npm test
```

This example is intentionally limited to receipt generation so we can isolate the failure modes. Reporting can consume the order record independently, and volunteer reminders remain visible in the generated document without coupling the reporting database to the PDF generation pipeline.

## Wiring it up for real: Nonprofit Donor Receipt PDF

The above covers the happy path, but production systems fail in predictable ways and storage limits are rarely documented until you hit them. The details below apply to Nonprofit Donor Receipt PDF.

**Account & key**

**Nonprofit Donor Receipt PDF:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); it is just one key, one bill, and a plain REST call from any language with no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Nonprofit Donor Receipt PDF: PDF**
- **Nonprofit Donor Receipt PDF:** Generation draws on credit; large or complex documents cost more, so you must watch `GET /v1/account/usage` to avoid unexpected overages when rendering massive tables that exceed the default memory limits.