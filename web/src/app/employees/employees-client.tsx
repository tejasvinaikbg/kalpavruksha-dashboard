"use client";

import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { Edit3, Plus, Save, Trash2, UserCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getAuthToken, clearAuthToken } from "@/lib/auth";

const EMPLOYEES_QUERY = gql`
  query EmployeesAndAttendance($date: String!) {
    employees {
      id
      name
      phone
      active
    }
    attendance(date: $date) {
      id
      date
      status
      allowance
      source
      employee {
        id
      }
    }
  }
`;

const CREATE_EMPLOYEE = gql`
  mutation CreateEmployee($input: EmployeeInput!) {
    createEmployee(input: $input) {
      id
      name
      phone
      active
    }
  }
`;

const UPDATE_EMPLOYEE = gql`
  mutation UpdateEmployee($id: ID!, $input: EmployeeInput!) {
    updateEmployee(id: $id, input: $input) {
      id
      name
      phone
      active
    }
  }
`;

const DELETE_EMPLOYEE = gql`
  mutation DeleteEmployee($id: ID!) {
    deleteEmployee(id: $id) {
      id
    }
  }
`;

const UPSERT_ATTENDANCE = gql`
  mutation UpsertAttendance($input: AttendanceInput!) {
    upsertAttendance(input: $input) {
      id
      status
      allowance
      source
      employee {
        id
      }
    }
  }
`;

type Employee = {
  id: string;
  name: string;
  phone?: string | null;
  active: boolean;
};

type Attendance = {
  id: string;
  status: "present" | "absent";
  allowance: number;
  source: string;
  employee: {
    id: string;
  };
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function EmployeesClient() {
  const router = useRouter();
  const [date, setDate] = useState(today());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingPhone, setEditingPhone] = useState("");
  const [allowanceByEmployee, setAllowanceByEmployee] = useState<Map<string, string>>(new Map());
  const [hasToken, setHasToken] = useState(true);

  // Check auth token and redirect if missing
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setHasToken(false);
      router.replace("/login");
      return;
    }
    setHasToken(true);
  }, [router]);

  const { data, error, loading, refetch } = useQuery<{
    employees: Employee[];
    attendance: Attendance[];
  }>(EMPLOYEES_QUERY, {
    variables: { date },
    skip: !hasToken // Skip query if no token
  });

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

  // Don't render if no token or auth error detected
  if (!hasToken || (error?.message?.includes("Authentication required"))) {
    return null;
  }
  const [createEmployee, createState] = useMutation(CREATE_EMPLOYEE);
  const [updateEmployee, updateState] = useMutation(UPDATE_EMPLOYEE);
  const [deleteEmployee, deleteState] = useMutation(DELETE_EMPLOYEE);
  const [upsertAttendance, attendanceState] = useMutation(UPSERT_ATTENDANCE);

  const attendanceByEmployee = useMemo(() => {
    const map = new Map<string, Attendance>();
    data?.attendance.forEach((record) => {
      map.set(record.employee.id, record);
    });
    return map;
  }, [data?.attendance]);

  const busy =
    createState.loading ||
    updateState.loading ||
    deleteState.loading ||
    attendanceState.loading;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createEmployee({ variables: { input: { name, phone } } });
    setName("");
    setPhone("");
    await refetch();
  }

  async function handleUpdate(id: string) {
    await updateEmployee({
      variables: { id, input: { name: editingName, phone: editingPhone } }
    });
    setEditingId("");
    await refetch();
  }

  async function handleDelete(id: string) {
    await deleteEmployee({ variables: { id } });
    await refetch();
  }

  async function setAttendance(employeeId: string, status: "present" | "absent") {
    const allowance = Number(allowanceByEmployee.get(employeeId) || 0);
    await upsertAttendance({
      variables: {
        input: {
          employeeId,
          date,
          status,
          allowance
        }
      }
    });
    await refetch();
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-950">
            Employee Management
          </h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Manage employees and maintain daily attendance.
          </p>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Attendance date
          </span>
          <input
            className="mt-1 h-11 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </label>
      </div>

      <form
        className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={handleCreate}
      >
        <input
          className="h-11 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => setName(event.target.value)}
          placeholder="Employee name"
          value={name}
        />
        <input
          className="h-11 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Phone optional"
          value={phone}
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
          Loading employees...
        </p>
      ) : null}

      {error ||
        createState.error ||
        updateState.error ||
        deleteState.error ||
        attendanceState.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error?.message ||
            createState.error?.message ||
            updateState.error?.message ||
            deleteState.error?.message ||
            attendanceState.error?.message}
        </div>
      ) : null}

      <div className="grid gap-3">
        {data?.employees.map((employee) => {
          const editing = editingId === employee.id;
          const attendance = attendanceByEmployee.get(employee.id);
          const status = attendance?.status ?? "absent";
          return (
            <article
              className="rounded-md border border-stone-200 bg-white p-4 shadow-sm"
              key={employee.id}
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
                    onChange={(event) => setEditingPhone(event.target.value)}
                    value={editingPhone}
                  />
                  <button
                    aria-label="Save employee"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white"
                    disabled={busy || !editingName.trim()}
                    onClick={() => handleUpdate(employee.id)}
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <UserCheck
                      aria-hidden="true"
                      className="h-5 w-5 text-emerald-700"
                    />
                    <div>
                      <h2 className="font-bold text-stone-950">
                        {employee.name}
                      </h2>
                      <p className="text-sm text-stone-500">
                        {employee.phone || "No phone added"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`min-h-10 rounded-md px-3 text-sm font-semibold ${status === "present"
                        ? "bg-emerald-700 text-white"
                        : "border border-stone-200 text-stone-700"
                        }`}
                      disabled={busy}
                      onClick={() => setAttendance(employee.id, "present")}
                      type="button"
                    >
                      Present
                    </button>
                    <button
                      className={`min-h-10 rounded-md px-3 text-sm font-semibold ${status === "absent"
                        ? "bg-stone-800 text-white"
                        : "border border-stone-200 text-stone-700"
                        }`}
                      disabled={busy}
                      onClick={() => setAttendance(employee.id, "absent")}
                      type="button"
                    >
                      Absent
                    </button>
                    <input
                      className="h-10 w-24 rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => {
                        setAllowanceByEmployee(new Map(allowanceByEmployee).set(employee.id, event.target.value));
                      }}
                      placeholder="Allowance"
                      step="0.01"
                      type="number"
                      value={allowanceByEmployee.get(employee.id) || ""}
                    />
                    <button
                      aria-label="Edit employee"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 text-stone-700"
                      onClick={() => {
                        setEditingId(employee.id);
                        setEditingName(employee.name);
                        setEditingPhone(employee.phone ?? "");
                      }}
                      type="button"
                    >
                      <Edit3 aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Soft delete employee"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-700"
                      disabled={busy}
                      onClick={() => handleDelete(employee.id)}
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
