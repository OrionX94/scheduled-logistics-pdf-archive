import { reportRequestSchema } from "../src/shipment_report.js";
import { runReportWorkflow } from "../src/report_workflow.js";

const sample = reportRequestSchema.parse({
  periodStart: "2026-08-01T00:00:00.000Z",
  periodEnd: "2026-08-08T00:00:00.000Z",
  shipments: [{
    shipmentId: "SHP-2048",
    carrier: "Northline Freight",
    destination: "Shanghai distribution center",
    events: [
      { occurredAt: "2026-08-02T08:15:00.000Z", kind: "picked_up", location: "Suzhou" },
      { occurredAt: "2026-08-03T16:40:00.000Z", kind: "delivered", location: "Shanghai" }
    ],
    proofsOfDelivery: [{ name: "SHP-2048-signed.pdf", url: "https://files.example.com/pod/SHP-2048", receivedAt: "2026-08-03T16:45:00.000Z" }],
    exceptions: []
  }]
});

console.log(JSON.stringify(await runReportWorkflow(sample), null, 2));
