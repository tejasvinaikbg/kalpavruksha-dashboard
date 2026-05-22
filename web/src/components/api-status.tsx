"use client";

import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { CheckCircle2, Loader2, WifiOff } from "lucide-react";

const HEALTH_QUERY = gql`
  query Health {
    health
  }
`;

export function ApiStatus() {
  const { data, error, loading } = useQuery<{ health: string }>(HEALTH_QUERY, {
    fetchPolicy: "network-only"
  });

  const state = loading ? "loading" : error ? "error" : "connected";
  const message =
    state === "loading"
      ? "Checking API connection"
      : state === "error"
        ? "API unavailable"
        : data?.health ?? "API healthy";
  const Icon = loading ? Loader2 : error ? WifiOff : CheckCircle2;

  return (
    <div className="flex items-center gap-3 rounded-md border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <Icon
        aria-hidden="true"
        className={`h-5 w-5 ${
          state === "loading"
            ? "animate-spin text-stone-500"
            : state === "connected"
              ? "text-emerald-600"
              : "text-red-600"
        }`}
      />
      <div>
        <p className="text-sm font-semibold text-stone-950">
          {state === "connected" ? "API connected" : "API status"}
        </p>
        <p className="text-xs text-stone-600">{message}</p>
      </div>
    </div>
  );
}
