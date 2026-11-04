import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const server = new McpServer({
  name: "synthetic-order-tools",
  version: "1.0.0",
});
server.registerTool(
  "sum_prices",
  {
    description: "Total synthetic order lines in integer cents.",
    inputSchema: z
      .object({
        lines: z
          .array(
            z
              .object({
                quantity: z.number().int().min(1).max(100),
                unitCents: z.number().int().min(0).max(100000),
              })
              .strict(),
          )
          .min(1)
          .max(10),
      })
      .strict(),
    outputSchema: { totalCents: z.number().int().nonnegative() },
  },
  async ({ lines }) => {
    const result = {
      totalCents: lines.reduce(
        (sum, line) => sum + line.quantity * line.unitCents,
        0,
      ),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
);
await server.connect(new StdioServerTransport());
