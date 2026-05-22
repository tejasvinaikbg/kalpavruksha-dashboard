"use client";

import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { Edit3, MapPin, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getAuthToken, clearAuthToken } from "@/lib/auth";

const LOCATIONS_QUERY = gql`
  query Locations {
    locations {
      id
      name
      active
    }
  }
`;

const CREATE_LOCATION = gql`
  mutation CreateLocation($input: LocationInput!) {
    createLocation(input: $input) {
      id
      name
      active
    }
  }
`;

const UPDATE_LOCATION = gql`
  mutation UpdateLocation($id: ID!, $input: LocationInput!) {
    updateLocation(id: $id, input: $input) {
      id
      name
      active
    }
  }
`;

const DELETE_LOCATION = gql`
  mutation DeleteLocation($id: ID!) {
    deleteLocation(id: $id) {
      id
    }
  }
`;

type Location = {
  id: string;
  name: string;
  active: boolean;
};

export function LocationsClient() {
  const router = useRouter();
  const { data, error, loading, refetch } = useQuery<{ locations: Location[] }>(
    LOCATIONS_QUERY
  );
  const [createLocation, createState] = useMutation(CREATE_LOCATION);
  const [updateLocation, updateState] = useMutation(UPDATE_LOCATION);
  const [deleteLocation, deleteState] = useMutation(DELETE_LOCATION);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");

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

  const [editingName, setEditingName] = useState("");
  const busy = createState.loading || updateState.loading || deleteState.loading;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createLocation({ variables: { input: { name } } });
    setName("");
    await refetch();
  }

  async function handleUpdate(id: string) {
    await updateLocation({ variables: { id, input: { name: editingName } } });
    setEditingId("");
    await refetch();
  }

  async function handleDelete(id: string) {
    await deleteLocation({ variables: { id } });
    await refetch();
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-950">
          Location Management
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Add, update, and soft delete cart deployment locations.
        </p>
      </div>

      <form
        className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]"
        onSubmit={handleCreate}
      >
        <input
          className="h-11 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => setName(event.target.value)}
          placeholder="Location name"
          value={name}
        />
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:bg-stone-400"
          disabled={busy || !name.trim()}
          type="submit"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add
        </button>
      </form>

      {loading ? (
        <p className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600 shadow-sm">
          Loading locations...
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

      <div className="grid gap-3 sm:grid-cols-2">
        {data?.locations.map((location) => {
          const editing = editingId === location.id;
          return (
            <article
              className="rounded-md border border-stone-200 bg-white p-4 shadow-sm"
              key={location.id}
            >
              {editing ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <input
                    className="h-10 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    onChange={(event) => setEditingName(event.target.value)}
                    value={editingName}
                  />
                  <button
                    aria-label="Save location"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white"
                    disabled={busy || !editingName.trim()}
                    onClick={() => handleUpdate(location.id)}
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
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <MapPin aria-hidden="true" className="h-5 w-5 text-emerald-700" />
                    <h2 className="font-bold text-stone-950">{location.name}</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      aria-label="Edit location"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 text-stone-700"
                      onClick={() => {
                        setEditingId(location.id);
                        setEditingName(location.name);
                      }}
                      type="button"
                    >
                      <Edit3 aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Soft delete location"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-700"
                      disabled={busy}
                      onClick={() => handleDelete(location.id)}
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
