"use client";

import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getAuthToken, clearAuthToken } from "@/lib/auth";

const CARTS_QUERY = gql`
  query Carts {
    carts {
      id
      code
      name
      active
    }
  }
`;

const CREATE_CART = gql`
  mutation CreateCart($input: CartInput!) {
    createCart(input: $input) {
      id
      code
      name
      active
    }
  }
`;

const UPDATE_CART = gql`
  mutation UpdateCart($id: ID!, $input: CartInput!) {
    updateCart(id: $id, input: $input) {
      id
      code
      name
      active
    }
  }
`;

const DELETE_CART = gql`
  mutation DeleteCart($id: ID!) {
    deleteCart(id: $id) {
      id
    }
  }
`;

type Cart = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type CartsResult = {
  carts: Cart[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function CartsClient() {
  const router = useRouter();
  const { data, error, loading, refetch } = useQuery<CartsResult>(CARTS_QUERY);
  const [createCart, createState] = useMutation(CREATE_CART);
  const [updateCart, updateState] = useMutation(UPDATE_CART);
  const [deleteCart, deleteState] = useMutation(DELETE_CART);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingCode, setEditingCode] = useState("");

  // Redirect to login if no auth token
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  // Handle authentication errors and redirect
  useEffect(() => {
    if (error) {
      const errorMessage = error.message || "";
      const errorCode = (error as any)?.graphQLErrors?.[0]?.extensions?.code;

      if (
        errorCode === "UNAUTHENTICATED" ||
        errorMessage.includes("Authentication required") ||
        errorMessage.includes("authentication") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("Unauthorized")
      ) {
        clearAuthToken();
        router.replace("/login");
      }
    }
  }, [error, router]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createCart({
      variables: {
        input: {
          name: newName,
          code: newCode || null
        }
      }
    });
    setNewName("");
    setNewCode("");
    await refetch();
  }

  async function handleUpdate(id: string) {
    await updateCart({
      variables: {
        id,
        input: {
          name: editingName,
          code: editingCode || null
        }
      }
    });
    setEditingId("");
    await refetch();
  }

  async function handleDelete(id: string) {
    await deleteCart({ variables: { id } });
    await refetch();
  }

  const busy = createState.loading || updateState.loading || deleteState.loading;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-950">Cart Management</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Create carts, update names, soft delete inactive carts, and open daily
          sales entries.
        </p>
      </div>

      <form
        className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={handleCreate}
      >
        <input
          className="h-11 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Cart name"
          value={newName}
        />
        <input
          className="h-11 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => setNewCode(event.target.value)}
          placeholder="Code optional"
          value={newCode}
        />
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:bg-stone-400"
          disabled={busy || !newName.trim()}
          type="submit"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add
        </button>
      </form>

      {loading ? (
        <p className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600 shadow-sm">
          Loading carts...
        </p>
      ) : null}

      {error || createState.error || updateState.error || deleteState.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error?.message ||
            createState.error?.message ||
            updateState.error?.message ||
            deleteState.error?.message}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {data?.carts.map((cart) => {
          const editing = editingId === cart.id;
          return (
            <article
              className="rounded-md border border-stone-200 bg-white p-4 shadow-sm"
              key={cart.id}
            >
              {editing ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <input
                    className="h-10 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    onChange={(event) => setEditingName(event.target.value)}
                    value={editingName}
                  />
                  <input
                    className="h-10 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    onChange={(event) => setEditingCode(event.target.value)}
                    value={editingCode}
                  />
                  <button
                    aria-label="Save cart"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white"
                    disabled={busy || !editingName.trim()}
                    onClick={() => handleUpdate(cart.id)}
                    type="button"
                  >
                    <Save aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Cancel edit"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 text-stone-700"
                    onClick={() => setEditingId("")}
                    type="button"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-stone-500">{cart.code}</p>
                    <h2 className="mt-1 text-xl font-bold text-stone-950">
                      {cart.name}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="inline-flex min-h-10 items-center justify-center rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white"
                      href={`/carts/${cart.id}?date=${today()}`}
                    >
                      Daily entry
                    </Link>
                    <button
                      aria-label="Edit cart"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 text-stone-700"
                      onClick={() => {
                        setEditingId(cart.id);
                        setEditingName(cart.name);
                        setEditingCode(cart.code);
                      }}
                      type="button"
                    >
                      <Edit3 aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Soft delete cart"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-700"
                      disabled={busy}
                      onClick={() => handleDelete(cart.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
