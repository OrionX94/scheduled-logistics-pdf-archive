import { z } from "zod";

const shipmentEventSchema = z.object({
  occurredAt: z.string().datetime(),
  kind: z.enum(["picked_up", "in_transit", "delivered", "exception_opened", "exception_resolved"]),
  location: z.string().min(1),
  note: z.string().min(1).optional()
});

const proofOfDeliverySchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  receivedAt: z.string().datetime()
});

const exceptionSchema = z.object({
  code: z.string().min(1),
  summary: z.string().min(1),
  resolvedAt: z.string().datetime().optional()
});

const shipmentSchema = z.object({
  shipmentId: z.string().min(1),
  carrier: z.string().min(1),
  destination: z.string().min(1),
  events: z.array(shipmentEventSchema).min(1),
  proofsOfDelivery: z.array(proofOfDeliverySchema),
  exceptions: z.array(exceptionSchema)
});

export const reportRequestSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  shipments: z.array(shipmentSchema).min(1)
}).superRefine((value, context) => {
  if (Date.parse(value.periodStart) >= Date.parse(value.periodEnd)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["periodEnd"], message: "periodEnd must follow periodStart" });
  }
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;
export type ReportDisposition = "needs_attention" | "ready_to_archive";

export function decideReportDisposition(input: ReportRequest): ReportDisposition {
  return input.shipments.some((shipment) => shipment.exceptions.some((item) => !item.resolvedAt))
    ? "needs_attention"
    : "ready_to_archive";
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderShipmentMarkdown(input: ReportRequest, disposition: ReportDisposition): string {
  const rows = input.shipments.map((shipment) => {
    const latest = [...shipment.events].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))[0];
    const openExceptions = shipment.exceptions.filter((item) => !item.resolvedAt);
    return `| ${escapeCell(shipment.shipmentId)} | ${escapeCell(shipment.carrier)} | ${escapeCell(shipment.destination)} | ${latest.kind} | ${shipment.proofsOfDelivery.length} | ${openExceptions.length} |`;
  });

  return [
    "# Periodic logistics report",
    "",
    `Period: ${input.periodStart} to ${input.periodEnd}`,
    `Archive decision: **${disposition}**`,
    "",
    "| Shipment | Carrier | Destination | Latest event | POD files | Open exceptions |",
    "| --- | --- | --- | --- | ---: | ---: |",
    ...rows
  ].join("\n");
}
