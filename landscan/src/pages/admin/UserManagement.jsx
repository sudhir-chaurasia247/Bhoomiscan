import { useEffect, useState } from "react";
import { UserPlus, Pencil, Ban, CheckCircle2 } from "lucide-react";
import AppLayout from "../../layouts/AppLayout";
import SearchBar from "../../components/ui/SearchBar";
import Select from "../../components/ui/Select";
import DataTable from "../../components/tables/DataTable";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import api from "../../services/api";

function UserManagement() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", role: "operator", district: "Pune" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", role: "operator", district: "" });

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const loadUsers = () => {
    api
      .get("/admin/users", { params: { q: query || undefined, role, page: 1, limit: 100 } })
      .then((res) => {
        setList(res.data.data);
        setTotal(res.data.meta?.total ?? res.data.data.length);
      })
      .catch(() => {
        setList([]);
        setTotal(0);
      });
  };

  useEffect(() => {
    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [query, role]);

  const toggle = async (user) => {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    try {
      const res = await api.patch(`/admin/users/${user._id}/status`, { status: nextStatus });
      setList((prev) => prev.map((u) => (u._id === user._id ? res.data.data.user : u)));
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update user status");
    }
  };

  const startEdit = (user) => {
    setEditingId(user._id);
    setEditDraft({ name: user.name, role: user.role, district: user.district || "" });
  };

  const saveEdit = async (user) => {
    try {
      const res = await api.patch(`/admin/users/${user._id}`, editDraft);
      setList((prev) => prev.map((u) => (u._id === user._id ? res.data.data.user : u)));
      setEditingId(null);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update user");
    }
  };

  const columns = [
    {
      key: "name",
      header: "User",
      render: (u) =>
        editingId === u._id ? (
          <input
            value={editDraft.name}
            onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
            className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
        ) : (
          <div>
            <p className="font-semibold">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        ),
    },
    { key: "id", header: "User ID" },
    {
      key: "role",
      header: "Role",
      render: (u) =>
        editingId === u._id ? (
          <Select
            value={editDraft.role}
            onChange={(v) => setEditDraft({ ...editDraft, role: v })}
            options={[
              { value: "operator", label: "Operator" },
              { value: "verifier", label: "Verifier" },
              { value: "admin", label: "Admin" },
            ]}
          />
        ) : (
          <StatusBadge status={u.role} />
        ),
    },
    {
      key: "district",
      header: "District",
      render: (u) =>
        editingId === u._id ? (
          <input
            value={editDraft.district}
            onChange={(e) => setEditDraft({ ...editDraft, district: e.target.value })}
            className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
        ) : (
          u.district
        ),
    },
    { key: "lastActive", header: "Last Active" },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
    {
      key: "actions",
      header: "",
      render: (u) =>
        editingId === u._id ? (
          <div className="flex justify-end gap-2">
            <Button variant="success" size="sm" onClick={() => saveEdit(u)}>
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" icon={Pencil} onClick={() => startEdit(u)}>
              Edit
            </Button>
            <Button
              variant={u.status === "active" ? "danger" : "success"}
              size="sm"
              icon={u.status === "active" ? Ban : CheckCircle2}
              onClick={() => toggle(u)}
            >
              {u.status === "active" ? "Disable" : "Enable"}
            </Button>
          </div>
        ),
    },
  ];

  return (
    <AppLayout role="admin" title="User Management" subtitle="Manage operators, verifiers and administrators">
      {toast ? (
        <div className="mb-4 rounded-lg bg-primary-soft px-4 py-3 text-sm font-medium text-primary">
          {toast}
        </div>
      ) : null}

      <div className="surface mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
        <SearchBar className="flex-1" value={query} onChange={setQuery} placeholder="Search users by name or email" />
        <Select
          className="lg:w-48"
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: "all", label: "All roles" },
            { value: "admin", label: "Admin" },
            { value: "operator", label: "Operator" },
            { value: "verifier", label: "Verifier" },
          ]}
        />
        <Button icon={UserPlus} onClick={() => setShowForm((v) => !v)}>
          Add User
        </Button>
      </div>

      {showForm ? (
        <div className="surface mb-4 p-5">
          <h3 className="text-sm font-semibold">Add New User</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Full Name
              </span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Official Email
              </span>
              <input
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <Select
              label="Role"
              value={draft.role}
              onChange={(v) => setDraft({ ...draft, role: v })}
              options={[
                { value: "operator", label: "Operator" },
                { value: "verifier", label: "Verifier" },
                { value: "admin", label: "Admin" },
              ]}
            />
            <Select
              label="District"
              value={draft.district}
              onChange={(v) => setDraft({ ...draft, district: v })}
              options={["Pune", "Nashik", "Nagpur", "Solapur", "State HQ"].map((d) => ({ value: d, label: d }))}
            />
          </div>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          <div className="mt-4 flex gap-2">
            <Button
              disabled={!draft.name || !draft.email || creating}
              onClick={async () => {
                setCreating(true);
                setError("");
                try {
                  const res = await api.post("/admin/users", draft);
                  const { temporaryPassword } = res.data.data;
                  setDraft({ name: "", email: "", role: "operator", district: "Pune" });
                  setShowForm(false);
                  notify(
                    temporaryPassword
                      ? `User created. Temporary password: ${temporaryPassword}`
                      : "User created."
                  );
                  loadUsers();
                } catch (err) {
                  setError(err.response?.data?.message || "Failed to create user");
                } finally {
                  setCreating(false);
                }
              }}
            >
              Create User
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <p className="mb-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{total}</span> users
      </p>

      <DataTable
        columns={columns}
        rows={list}
        keyField="_id"
        emptyTitle="No users found"
        emptyDescription="Try a different name, email or role filter."
      />
    </AppLayout>
  );
}

export default UserManagement;
