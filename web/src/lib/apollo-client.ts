"use client";

import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  from,
  ApolloLink
} from "@apollo/client";

import { SetContextLink } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

import { getAuthToken, clearAuthToken } from "@/lib/auth";

const graphqlUrl =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ??
  "http://localhost:4000/graphql";

const authLink = new SetContextLink((prevContext) => {
  const token = getAuthToken();

  return {
    headers: {
      ...prevContext.headers,
      ...(token
        ? {
          authorization: `Bearer ${token}`
        }
        : {})
    }
  };
});

const errorLink = onError((error) => {
  const graphQLErrors = (error as any)?.graphQLErrors;
  const networkError = (error as any)?.networkError;

  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const message = err?.message || "";
      const code = err?.extensions?.code;

      // Check if the error is authentication-related by code or message
      if (
        code === "UNAUTHENTICATED" ||
        message.includes("Authentication required") ||
        message.includes("authentication") ||
        message.includes("unauthorized") ||
        message.includes("Unauthorized")
      ) {
        // Clear auth token and redirect to login
        clearAuthToken();

        // Force redirect to login page
        if (typeof window !== "undefined") {
          // Use replace to prevent going back
          window.location.replace("/login");
        }

        return; // Stop processing other errors
      }
    }
  }

  if (networkError) {
    console.error("Network error:", networkError);
  }
});

const httpLink = new HttpLink({
  uri: graphqlUrl,
  credentials: "include"
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink.concat(httpLink)]),
  cache: new InMemoryCache()
});