import assert from "node:assert/strict";
import test from "node:test";
import { decideReportDisposition, reportRequestSchema } from "../src/shipment_report.js";

test("an unresolved delivery exception requires attention", () => {
  const report = reportRequestSchema.parse({
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: "2026-08-08T00:00:00.000Z",
    shipments: [{
      shipmentId: "SHP-991",
      carrier: "Harbor Cargo",
      destination: "Ningbo depot",
      events: [{ occurredAt: "2026-08-05T09:00:00.000Z", kind: "exception_opened", location: "Ningbo", note: "Receiver unavailable" }],
      proofsOfDelivery: [],
      exceptions: [{ code: "DELIVERY_ATTEMPT", summary: "Receiver unavailable" }]
    }]
  });

  assert.equal(decideReportDisposition(report), "needs_attention");
});
