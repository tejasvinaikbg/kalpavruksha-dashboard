import cors from "cors";
import express from "express";
import { createYoga } from "graphql-yoga";

import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { readUserFromRequest } from "./graphql/context.js";
import { schema } from "./graphql/schema.js";

const bootstrap = async () => {
  const app = express();

  app.use(express.json());

  app.use(
    cors({
      origin: [
        "http://localhost:3000",
        env.webOrigin
      ],
      credentials: true
    })
  );

  // ROOT ROUTE
  app.get("/", (_req, res) => {
    res.json({
      message: "API running"
    });
  });

  // HEALTH ROUTE
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok"
    });
  });

  // GRAPHQL
  const yoga = createYoga({
    schema,

    graphqlEndpoint: "/graphql",

    context: async ({ request }) => ({
      user: await readUserFromRequest(request)
    })
  });

  // IMPORTANT
  app.use(yoga);

  // DATABASE
  await connectDatabase();

  // IMPORTANT FOR RAILWAY
  const PORT = Number(
    process.env.PORT || env.port || 4000
  );

  // IMPORTANT
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running on port ${PORT}`);
  });
};

bootstrap().catch((error) => {
  console.error("BOOTSTRAP ERROR:", error);

  process.exit(1);
});