import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { registerTools } from "./tools.js";

function buildServer(): McpServer {
  const server = new McpServer({
    name: "unfaded-retailcrm",
    version: "1.0.0",
  });
  registerTools(server);
  return server;
}

const app = express();
app.use(express.json({ limit: "2mb" }));

// "Замок" коннектора: секретный токен — часть URL пути, а не заголовка,
// чтобы подключение работало из любого MCP-клиента без настройки
// дополнительных заголовков. Держите этот URL в тайне так же, как пароль.
const mcpPath = `/mcp/${config.connectorToken}`;

app.post(mcpPath, async (req, res) => {
  // Отдельный сервер+транспорт на каждый запрос — без сохранения сессии
  // между вызовами (stateless-режим), этого достаточно для наших задач
  // и не требует внешнего хранилища сессий.
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("Ошибка обработки MCP-запроса:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error" });
    }
  }
});

// GET/DELETE на этот путь не нужны в stateless-режиме без потоковых обновлений.
app.get(mcpPath, (_req, res) => res.status(405).send("Method Not Allowed"));
app.delete(mcpPath, (_req, res) => res.status(405).send("Method Not Allowed"));

// Публичный health-check — без секрета, просто чтобы хостинг видел, что сервис жив.
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(config.port, () => {
  console.log(`unfaded-retailcrm-connector слушает порт ${config.port}`);
  console.log(`MCP-путь настроен (значение токена не выводится в лог).`);
});
