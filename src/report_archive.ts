import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ReportDisposition, ReportRequest } from "./shipment_report.js";

export async function archiveReport(
  archiveId: string,
  request: ReportRequest,
  disposition: ReportDisposition,
  pdf: unknown
): Promise<string> {
  const directory = resolve(process.env.REPORT_ARCHIVE_DIR ?? "archives");
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `${archiveId}.json`);
  await writeFile(path, JSON.stringify({ archiveId, disposition, periodStart: request.periodStart, periodEnd: request.periodEnd, pdf }, null, 2));
  return path;
}
