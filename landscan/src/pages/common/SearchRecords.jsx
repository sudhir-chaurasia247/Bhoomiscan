import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, RotateCcw } from "lucide-react";
import AppLayout from "../../layouts/AppLayout";
import Select from "../../components/ui/Select";
import DataTable from "../../components/tables/DataTable";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const EMPTY = { owner: "", khasra: "", survey: "", village: "", district: "all", status: "all" };
const DISTRICTS = ["Pune", "Nashik", "Nagpur", "Solapur", "Kolhapur"];

function SearchRecords() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(EMPTY);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSearch = async (f) => {
    setLoading(true);
    setError("");
    try {
      const params = {
        owner: f.owner || undefined,
        khasra: f.khasra || undefined,
        survey: f.survey || undefined,
        village: f.village || undefined,
        district: f.district !== "all" ? f.district : undefined,
        status: f.status,
        page: 1,
        limit: 50,
      };
      const res = await api.get("/records/search", { params });
      setRows(res.data.data);
      setTotal(res.data.meta?.total ?? res.data.data.length);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.message || "Search failed");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  const columns = [
    { key: "id", header: "Record ID", render: (r) => <span className="font-semibold">{r.id}</span> },
    { key: "owner", header: "Owner" },
    { key: "khasra", header: "Khasra Number" },
    { key: "survey", header: "Survey Number" },
    { key: "village", header: "Village" },
    { key: "district", header: "District" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "action",
      header: "",
      render: (r) => (
        <Link
          to={
            user?.role === "verifier"
              ? `/verifier/review?recordId=${r.id}`
              : `/operator/result?recordId=${r.id}`
          }
        >
          <Button variant="soft" size="sm">
            View
          </Button>
        </Link>
      ),
    },
  ];

  const textField = (key, label, placeholder) => (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        value={filters[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </div>
  );

  return (
    <AppLayout title="Search Records" subtitle="Query the digitized land record repository">
      <div className="surface p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {textField("owner", "Owner Name", "e.g. Ramesh Patil")}
          {textField("khasra", "Khasra Number", "e.g. 118/3")}
          {textField("survey", "Survey Number", "e.g. SUR-4218")}
          {textField("village", "Village", "e.g. Wagholi")}
          <Select
            label="District"
            value={filters.district}
            onChange={(v) => set("district", v)}
            options={[{ value: "all", label: "All districts" }, ...DISTRICTS.map((d) => ({ value: d, label: d }))]}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "processing", label: "Processing" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button icon={Search} disabled={loading} onClick={() => runSearch(filters)}>
            Search Records
          </Button>
          <Button
            variant="outline"
            icon={RotateCcw}
            onClick={() => {
              setFilters(EMPTY);
              setRows([]);
              setTotal(0);
              setSearched(false);
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {searched ? (
        <>
          <p className="mb-3 mt-6 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{total}</span> records found
          </p>

          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle="No matching land records"
            emptyDescription="Adjust your search criteria — try searching by owner name or khasra number alone."
          />
        </>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Enter search criteria above and click "Search Records" to query the repository.
        </p>
      )}
    </AppLayout>
  );
}

export default SearchRecords;
