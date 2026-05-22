import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";
import { env } from "../config/env.js";

export type AuthUser = {
  username: string;
  role: "admin";
};

export type GraphqlContext = {
  user: AuthUser | null;
};

export function createToken(user: AuthUser) {
  return jwt.sign(user, env.jwtSecret, { expiresIn: "8h" });
}

export function readUserFromRequest(request: Request): AuthUser | null {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token) {
    return null;
  }
  //  fetch from mongo and check if user exists and then return user details, else return null
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (
      typeof payload === "object" &&
      payload !== null &&
      payload.role === "admin" &&
      typeof payload.username === "string"
    ) {
      return {
        username: payload.username,
        role: "admin"
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function requireAdmin(context: GraphqlContext) {
  if (!context.user) {
    throw new GraphQLError("Authentication required", {
      extensions: {
        code: "UNAUTHENTICATED"
      }
    });
  }

  return context.user;
}
