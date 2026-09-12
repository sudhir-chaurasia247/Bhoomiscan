import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import AppLayout from "../../layouts/AppLayout";
import SearchBar from "../../components/ui/SearchBar";
import Select from "../../components/ui/Select";
import DataTable from "../../components/tables/DataTable";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import api from "../../services/api";

function MyUploads() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .get("/documents", { params: { q: query || undefined, status, page: 1, limit: 50 } })
        .then((res) => {
          if (!active) return;
          setRows(res.data.data);
          setTotal(res.data.meta?.total ?? res.data.data.length);
        })
        .catch(() => {
          if (active) {
            setRows([]);
            setTotal(0);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, status]);

  const columns = [
    { key: "id", header: "Record ID", render: (r) => <span className="font-semibold">{r.id}</span> },
    { key: "fileName", header: "File", render: (r) => <span className="text-muted-foreground">{r.fileName}</span> },
    { key: "owner", header: "Owner" },
    { key: "khasra", header: "Khasra" },
    { key: "village", header: "Village" },
    { key: "uploadedOn", header: "Uploaded" },
    { key: "confidence", header: "Confidence", render: (r) => `${r.confidence}%` },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "action",
      header: "",
      render: (r) => (
        <Link
          to={
            r.status === "processing"
              ? `/operator/processing?documentId=${r.documentId}`
              : `/operator/result?recordId=${r.id}`
          }
        >
          <Button variant="soft" size="sm">
            View Details
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <AppLayout role="operator" title="My Uploads" subtitle="Complete history of records you digitized">
      <div className="surface mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <SearchBar
          className="flex-1"
          value={query}
          onChange={setQuery}
          placeholder="Search by record ID, owner, khasra or village"
        />
        <Select
          className="sm:w-52"
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "processing", label: "Processing" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{rows.length}</span> of{" "}
        {total} uploaded records
      </p>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyTitle="No uploads match your filters"
        emptyDescription="Try a different search term or reset the status filter."
      />
    </AppLayout>
  );
}

export default MyUploads;
