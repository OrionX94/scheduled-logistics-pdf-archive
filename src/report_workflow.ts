import { createHash } from "node:crypto";
import { generateLogisticsPdf } from "./infrai_pdf.js";
import { archiveReport } from "./report_archive.js";
import { decideReportDisposition, renderShipmentMarkdown, type ReportRequest } from "./shipment_report.js";

export async function runReportWorkflow(input: ReportRequest) {
  const disposition = decideReportDisposition(input);
  const archiveId = createHash("sha256")
    .update(JSON.stringify({ periodStart: input.periodStart, periodEnd: input.periodEnd, shipments: input.shipments.map((item) => item.shipmentId) }))
    .digest("hex")
    .slice(0, 24);
  const markdown = renderShipmentMarkdown(input, disposition);
  const pdf = await generateLogisticsPdf(markdown, archiveId);
  const archivePath = await archiveReport(archiveId, input, disposition, pdf);
  return { archiveId, disposition, archivePath, pdf };
}
