import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai_pdf.js";
import { reportRequestSchema } from "./shipment_report.js";
import { runReportWorkflow } from "./report_workflow.js";

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/reports") {
    send(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = reportRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    send(response, 201, await runReportWorkflow(input));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(response, 400, { error: "Invalid report request", details: error instanceof ZodError ? error.issues : undefined });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      send(response, status, { error: error.code, details: error.details });
      return;
    }
    console.error(error);
    send(response, 500, { error: "Report generation failed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Logistics report service listening on http://localhost:${port}`));
