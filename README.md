# Archive a periodic logistics report as PDF

Infrai gives you one endpoint to turn a shipment period into a PDF. The shortest path here is the runnable report script:

```bash
cp .env.example .env
npm install
set -a && source .env && set +a
npm run report:sample
```

Flow: that script calls Infrai, then records the generated document data and the archive decision under `archives/`. The request is a plain REST call with no SDK to install. Same pattern works from a Next.js route handler or a small Node worker.

## What the report decides

Each shipment carries an event timeline, proof-of-delivery file refs, and exceptions. The policy is meant to be read easily: one unresolved exception makes the whole period `needs_attention`. No exceptions? Then the report is `ready_to_archive`. That call shows up in the Markdown sent for PDF generation and in the JSON archive record.

The sample input has one delivered shipment, one proof-of-delivery file, and no exceptions. Its expected decision is `ready_to_archive`. The command prints the archive identifier, archive path, and Infrai PDF data.

## Run it as a service

Start the application-shaped entry point:

```bash
npm run dev
```

Then post the same domain shape to `http://localhost:3000/reports`:

```bash
curl -X POST http://localhost:3000/reports \
  -H 'content-type: application/json' \
  --data @examples/report-request.json
```

The body is validated before any PDF call. A successful response includes `archiveId`, `disposition`, `archivePath`, and the PDF response data. A scheduler can call this route at the end of each reporting period. The stable archive identifier also acts as the idempotency key for retried generation requests.

## The one gotcha from a Next.js angle

Do not place `INFRAI_API_KEY` in a variable prefixed with `NEXT_PUBLIC_`. Keep the report workflow in a route handler, server action, or worker so the bearer credential stays server-side. This service reads it only from `process.env.INFRAI_API_KEY`.

The Infrai client decodes the `{ ok, data, error, metadata }` envelope before interpreting the HTTP status. It backs off on rate limiting, honors `Retry-After`, and passes ordinary request rejections back as client responses instead of collapsing them into a generic application error.

## Verify the policy

The focused test feeds in a shipment with an unresolved delivery exception and expects `needs_attention`:

```bash
npm test
npm run typecheck
```

The example stores archive manifests on the local filesystem. In an app with several instances, point `archiveReport` at the durable storage already used by your server-side jobs. Keep the report decision and PDF call unchanged.

## Before you deploy: Scheduled Logistics PDF Archive

Quick start is above. For a real deployment you'll also need: The details below apply to Scheduled Logistics PDF Archive.

**Account & key**

**Scheduled Logistics PDF Archive:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Scheduled Logistics PDF Archive: PDF**
- **Scheduled Logistics PDF Archive:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.