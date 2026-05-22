import cors from "cors";
import express from "express";
import { createYoga } from "graphql-yoga";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { readUserFromRequest } from "./graphql/context.js";
import { schema } from "./graphql/schema.js";

const app = express();

app.use(
  cors({
    origin: env.webOrigin,
    credentials: true
  })
);

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  context: ({ request }) => ({
    user: readUserFromRequest(request)
  })
});

app.use("/graphql", yoga);

await connectDatabase();

app.listen(env.port, () => {
  console.log(`API running at http://localhost:${env.port}/graphql`);
});
