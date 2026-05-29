#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createWorkCueMcpServer } from "./server.js";

const server = createWorkCueMcpServer();
const transport = new StdioServerTransport();

await server.connect(transport);
