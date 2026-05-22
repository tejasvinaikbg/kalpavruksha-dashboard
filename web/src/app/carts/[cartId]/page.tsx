"use client";

import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";

const CART_ENTRY_QUERY = gql`
  query CartEntry($cartId: ID!, $date: String!) {
    carts {
      id
      code
      name
    }
    employees {
      id
      name
    }
    locations {
      id
      name
    }
    cartDayEntry(cartId: $cartId, date: $date) {
      id
      date
      employee {
        id
      }
      location {
        id
      }
      openingStock
      restock
      damagedStock
      closingStock
      normalOnlineQty
      normalOnlinePrice
      addOnOnlineQty
      addOnOnlinePrice
      discountedOnlineQty
      discountedOnlinePrice
      normalCashQty
      normalCashPrice
      addOnCashQty
      addOnCashPrice
      discountedCashQty
      discountedCashPrice
      miscellaneousAmount
      calculations {
        expectedClosing
        totalAmount
        hasMismatch
      }
    }
  }
`;

const CREATE_ENTRY_MUTATION = gql`
  mutation CreateCartDayEntry($input: CartDayEntryInput!) {
    createCartDayEntry(input: $input) {
      id
      calculations {
        expectedClosing
        totalAmount
        hasMismatch
      }
    }
  }
`;

const UPDATE_ENTRY_MUTATION = gql`
  mutation UpdateCartDayEntry($id: ID!, $input: CartDayEntryInput!) {
    updateCartDayEntry(id: $id, input: $input) {
      id
      calculations {
        expectedClosing
        totalAmount
        hasMismatch
      }
    }
  }
`;

type MasterOption = {
  id: string;
  code?: string;
  name: string;
};

type CartEntry = {
  id: string;
  date: string;
  employee: { id: string };
  location: { id: string };
  openingStock: number;
  restock: number;
  damagedStock: number;
  closingStock: number;
  normalOnlineQty: number;
  normalOnlinePrice: number;
  addOnOnlineQty: number;
  addOnOnlinePrice: number;
  discountedOnlineQty: number;
  discountedOnlinePrice: number;
  normalCashQty: number;
  normalCashPrice: number;
  addOnCashQty: number;
  addOnCashPrice: number;
  discountedCashQty: number;
  discountedCashPrice: number;
  miscellaneousAmount: number;
};

type CartEntryResult = {
  carts: MasterOption[];
  employees: MasterOption[];
  locations: MasterOption[];
  cartDayEntry: CartEntry | null;
};

type EntryForm = {
  employeeId: string;
  locationId: string;
  openingStock: string;
  restock: string;
  damagedStock: string;
  normalOnlineQty: string;
  normalOnlinePrice: string;
  addOnOnlineQty: string;
  addOnOnlinePrice: string;
  discountedOnlineQty: string;
  discountedOnlinePrice: string;
  normalCashQty: string;
  normalCashPrice: string;
  addOnCashQty: string;
  addOnCashPrice: string;
  discountedCashQty: string;
  discountedCashPrice: string;
  miscellaneousAmount: string;
};

type NumberField = Exclude<keyof EntryForm, "employeeId" | "locationId">;

const emptyForm: EntryForm = {
  employeeId: "",
  locationId: "",
  openingStock: "",
  restock: "",
  damagedStock: "",
  normalOnlineQty: "",
  normalOnlinePrice: "",
  addOnOnlineQty: "",
  addOnOnlinePrice: "",
  discountedOnlineQty: "",
  discountedOnlinePrice: "",
  normalCashQty: "",
  normalCashPrice: "",
  addOnCashQty: "",
  addOnCashPrice: "",
  discountedCashQty: "",
  discountedCashPrice: "",
  miscellaneousAmount: ""
};

const stockFields: Array<{ key: NumberField; label: string }> = [
  { key: "openingStock", label: "Opening stock" },
  { key: "restock", label: "Restock sent" },
  { key: "damagedStock", label: "Damaged stock" }
];

const onlineFields: Array<{ key: NumberField; label: string }> = [
  { key: "normalOnlineQty", label: "Normal qty" },
  { key: "normalOnlinePrice", label: "Normal price" },
  { key: "addOnOnlineQty", label: "Add-on qty" },
  { key: "addOnOnlinePrice", label: "Add-on price" },
  { key: "discountedOnlineQty", label: "Discounted qty" },
  { key: "discountedOnlinePrice", label: "Discounted price" }
];

const cashFields: Array<{ key: NumberField; label: string }> = [
  { key: "normalCashQty", label: "Normal qty" },
  { key: "normalCashPrice", label: "Normal price" },
  { key: "addOnCashQty", label: "Add-on qty" },
  { key: "addOnCashPrice", label: "Add-on price" },
  { key: "discountedCashQty", label: "Discounted qty" },
  { key: "discountedCashPrice", label: "Discounted price" },
  { key: "miscellaneousAmount", label: "Miscellaneous" }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function calculate(form: EntryForm) {
  const values = formNumbers(form);
  const availableStock = values.openingStock + values.restock;
  const totalSold =
    values.normalOnlineQty +
    values.addOnOnlineQty +
    values.discountedOnlineQty +
    values.normalCashQty +
    values.addOnCashQty +
    values.discountedCashQty;
  const expectedClosing = availableStock - totalSold - values.damagedStock;
  const normalOnlineAmount = values.normalOnlineQty * values.normalOnlinePrice;
  const addOnOnlineAmount = values.addOnOnlineQty * values.addOnOnlinePrice;
  const discountedOnlineAmount = values.discountedOnlineQty * values.discountedOnlinePrice;
  const totalOnlineAmount =
    normalOnlineAmount + addOnOnlineAmount + discountedOnlineAmount;
  const normalCashAmount = values.normalCashQty * values.normalCashPrice;
  const addOnCashAmount = values.addOnCashQty * values.addOnCashPrice;
  const discountedCashAmount = values.discountedCashQty * values.discountedCashPrice;
  const totalCashAmount =
    normalCashAmount + addOnCashAmount + discountedCashAmount;
  const totalAmount =
    totalOnlineAmount + totalCashAmount - values.miscellaneousAmount;

  return {
    availableStock,
    totalSold,
    expectedClosing,
    miscellaneousAmount: values.miscellaneousAmount,
    totalOnlineAmount,
    totalCashAmount,
    totalAmount
  };
}

function formNumbers(form: EntryForm) {
  const parsed = {} as Record<NumberField, number>;
  const keys = [
    ...stockFields,
    ...onlineFields,
    ...cashFields
  ].map((field) => field.key);

  keys.forEach((key) => {
    parsed[key] = form[key] === "" ? 0 : Number(form[key]);
  });

  return parsed;
}

export default function CartEntryPage() {
  const params = useParams<{ cartId: string }>();
  const cartId = Array.isArray(params.cartId) ? params.cartId[0] : params.cartId;
  const [date, setDate] = useState(today());
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [saveMessage, setSaveMessage] = useState("");
  const [createEntry, createState] = useMutation(CREATE_ENTRY_MUTATION);
  const [updateEntry, updateState] = useMutation(UPDATE_ENTRY_MUTATION);

  useEffect(() => {
    const searchDate = new URLSearchParams(window.location.search).get("date");
    if (searchDate) {
      setDate(searchDate);
    }
  }, []);

  const { data, error, loading, refetch } = useQuery<CartEntryResult>(
    CART_ENTRY_QUERY,
    {
      variables: { cartId, date },
      skip: !cartId
    }
  );

  const entry = data?.cartDayEntry;
  const selectedCart = data?.carts.find((cart) => cart.id === cartId);
  const calculations = useMemo(() => calculate(form), [form]);
  const saving = createState.loading || updateState.loading;

  useEffect(() => {
    if (entry) {
      setForm({
        employeeId: entry.employee.id,
        locationId: entry.location.id,
        openingStock: String(entry.openingStock),
        restock: String(entry.restock),
        damagedStock: String(entry.damagedStock),
        normalOnlineQty: String(entry.normalOnlineQty),
        normalOnlinePrice: String(entry.normalOnlinePrice),
        addOnOnlineQty: String(entry.addOnOnlineQty),
        addOnOnlinePrice: String(entry.addOnOnlinePrice),
        discountedOnlineQty: String(entry.discountedOnlineQty),
        discountedOnlinePrice: String(entry.discountedOnlinePrice),
        normalCashQty: String(entry.normalCashQty),
        normalCashPrice: String(entry.normalCashPrice),
        addOnCashQty: String(entry.addOnCashQty),
        addOnCashPrice: String(entry.addOnCashPrice),
        discountedCashQty: String(entry.discountedCashQty),
        discountedCashPrice: String(entry.discountedCashPrice),
        miscellaneousAmount: String(entry.miscellaneousAmount)
      });
      return;
    }

    if (data && !entry) {
      setForm((current) => ({
        ...emptyForm,
        employeeId: current.employeeId || data.employees[0]?.id || "",
        locationId: current.locationId || data.locations[0]?.id || ""
      }));
    }
  }, [data, entry]);

  function updateNumber(key: NumberField, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSave() {
    setSaveMessage("");
    const input = {
      cartId,
      date,
      ...formNumbers(form),
      employeeId: form.employeeId,
      locationId: form.locationId
    };

    if (entry?.id) {
      await updateEntry({
        variables: {
          id: entry.id,
          input
        }
      });
      setSaveMessage("Entry updated");
    } else {
      await createEntry({
        variables: {
          input
        }
      });
      setSaveMessage("Entry created");
    }

    await refetch();
  }

  return (
    <AdminShell>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            aria-label="Back to carts"
            href="/carts"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700 shadow-sm"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            disabled={saving || !form.employeeId || !form.locationId}
            onClick={handleSave}
            type="button"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                {selectedCart?.code ?? "Cart"}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-stone-950">
                {selectedCart?.name ?? "Cart entry"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Add or edit the daily stock and sales details for this cart.
              </p>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-semibold">Unable to load cart entry.</p>
                <p className="mt-1">{error.message}</p>
              </div>
            ) : null}

            {createState.error || updateState.error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {createState.error?.message ?? updateState.error?.message}
              </div>
            ) : null}

            {saveMessage ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                {saveMessage}
              </div>
            ) : null}

            <section className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-stone-950">Deployment</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">Date</span>
                  <input
                    className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    onChange={(event) => {
                      setDate(event.target.value);
                      setForm(emptyForm);
                    }}
                    type="date"
                    value={date}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">
                    Employee
                  </span>
                  <select
                    className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        employeeId: event.target.value
                      }))
                    }
                    value={form.employeeId}
                  >
                    <option value="">Select employee</option>
                    {data?.employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">
                    Location
                  </span>
                  <select
                    className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        locationId: event.target.value
                      }))
                    }
                    value={form.locationId}
                  >
                    <option value="">Select location</option>
                    {data?.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <FieldSection
              fields={stockFields}
              form={form}
              onChange={updateNumber}
              title="Stock"
            />
            <FieldSection
              fields={onlineFields}
              form={form}
              onChange={updateNumber}
              title="Online Sales"
            />
            <FieldSection
              fields={cashFields}
              form={form}
              onChange={updateNumber}
              title="Cash Sales & Employee Spending"
            />
          </div>

          <aside className="space-y-3 lg:sticky lg:top-5 lg:self-start">
            <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-stone-950">Summary</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <SummaryRow label="Available stock" value={calculations.availableStock} />
                <SummaryRow label="Total sold" value={calculations.totalSold} />
                <SummaryRow label="Closing stock" value={calculations.expectedClosing} />
                <SummaryRow
                  label="Misc charges"
                  value={`Rs. ${calculations.miscellaneousAmount}`}
                />
                <SummaryRow
                  label="Online amount"
                  value={`Rs. ${calculations.totalOnlineAmount}`}
                />
                <SummaryRow
                  label="Cash amount"
                  value={`Rs. ${calculations.totalCashAmount}`}
                />
                <SummaryRow
                  label="Total amount"
                  value={`Rs. ${calculations.totalAmount}`}
                />
              </dl>
            </div>

            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Closing stock is calculated as opening stock + restock - sales -
              damaged stock.
            </div>

            {loading ? (
              <p className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600 shadow-sm">
                Loading entry...
              </p>
            ) : null}
          </aside>
        </div>
      </section>
    </AdminShell>
  );
}

function FieldSection({
  fields,
  form,
  onChange,
  title
}: {
  fields: Array<{ key: NumberField; label: string }>;
  form: EntryForm;
  onChange: (key: NumberField, value: string) => void;
  title: string;
}) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-stone-950">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <label className="block" key={field.key}>
            <span className="text-sm font-medium text-stone-700">
              {field.label}
            </span>
            <input
              className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              min="0"
              onChange={(event) => onChange(field.key, event.target.value)}
              type="number"
              value={form[field.key]}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-stone-600">{label}</dt>
      <dd className="font-semibold text-stone-950">{value}</dd>
    </div>
  );
}
