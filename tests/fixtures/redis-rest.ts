import { createServer } from "node:http";
import { createClient } from "redis";
export async function redisRest(port = 4101) {
  const client = createClient({
    url: process.env.TEST_REDIS_URL ?? "redis://localhost:56379/15",
  });
  client.on("error", () => {});
  await client.connect();
  const server = createServer(async (request, response) => {
    if (request.headers.authorization !== "Bearer local-test-token") {
      response.writeHead(401).end();
      return;
    }
    try {
      let raw = "";
      for await (const chunk of request) raw += chunk.toString();
      const data: unknown = JSON.parse(raw);
      const execute = async (command: unknown) => {
        if (!Array.isArray(command)) throw new Error("Invalid command");
        const result = await client.sendCommand(command.map(String));
        return { result };
      };
      const result =
        request.url === "/pipeline" || request.url === "/multi-exec"
          ? await Promise.all((data as unknown[]).map(execute))
          : await execute(data);
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(result));
    } catch {
      response
        .writeHead(500)
        .end(JSON.stringify({ error: "Test Redis bridge error" }));
    }
  });
  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve),
  );
  return {
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await client.quit();
    },
  };
}
