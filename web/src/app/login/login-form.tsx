"use client";

import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apolloClient } from "@/lib/apollo-client";
import { setAuthToken } from "@/lib/auth";

const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      user {
        username
        role
      }
    }
  }
`;

type LoginResult = {
  login: {
    token: string;
    user: {
      username: string;
      role: string;
    };
  };
};

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [login, { error, loading }] = useMutation<LoginResult>(LOGIN_MUTATION);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await login({
      variables: {
        username,
        password
      }
    });

    const token = result.data?.login.token;
    if (token) {
      setAuthToken(token);
      await apolloClient.resetStore();
      router.push("/dashboard");
    }
  }

  return (
    <section className="w-full max-w-sm rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
          <LockKeyhole aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-950">Admin Login</h1>
          <p className="text-sm text-stone-600">
            Sign in to manage daily cart entries.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Username</span>
          <input
            className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin"
            type="text"
            value={username}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Password</span>
          <input
            className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="admin123"
            type="password"
            value={password}
          />
        </label>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </p>
        ) : null}

        <button
          className="h-11 w-full rounded-md bg-emerald-700 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={loading}
          type="submit"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <Link
        href="/dashboard"
        className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
      >
        Back to dashboard
      </Link>
    </section>
  );
}
