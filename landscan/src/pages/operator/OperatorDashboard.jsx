import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Upload, Clock, CheckCircle2, XCircle, ArrowUpRight } from "lucide-react";
import AppLayout from "../../layouts/AppLayout";
import StatsCard from "../../components/cards/StatsCard";
import ProgressCard from "../../components/cards/ProgressCard";
import BarChart from "../../components/dashboard/BarChart";
import DataTable from "../../components/tables/DataTable";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import api from "../../services/api";

function OperatorDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let active = true;
    api
      .get("/dashboard/operator")
      .then((res) => {
        if (!active) return;
        setStats(res.data.data.stats);
        setRecent(res.data.data.recentUploads || []);
      })
      .catch(() => {
        if (active) {
          setStats(null);
          setRecent([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const columns = [
    { key: "id", header: "Record ID", render: (r) => <span className="font-semibold">{r.id}</span> },
    { key: "owner", header: "Owner" },
    { key: "village", header: "Village" },
    { key: "uploadedOn", header: "Uploaded" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "action",
      header: "",
      render: (r) => (
        <Link to={`/operator/result?recordId=${r.id}`}>
          <Button variant="soft" size="sm">
            View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <AppLayout role="operator" title="Operator Dashboard" subtitle="Digitization activity overview">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Total Uploads" value={stats?.totalUploads ?? "—"} icon={Upload} hint="all time" />
        <StatsCard
          label="Pending Verification"
          value={stats?.pendingVerification ?? "—"}
          icon={Clock}
          tone="warning"
          hint="awaiting review"
        />
        <StatsCard
          label="Verified Records"
          value={stats?.verified ?? "—"}
          icon={CheckCircle2}
          tone="success"
          hint="approved"
        />
        <StatsCard label="Rejected Records" value={stats?.rejected ?? "—"} icon={XCircle} tone="danger" hint="rejected" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BarChart
            title="Recent Uploads"
            subtitle="Your latest submitted records"
            data={recent.map((r) => ({ label: r.id, uploads: 1, verified: r.status === "approved" ? 1 : 0 }))}
            series={[
              { key: "uploads", label: "Uploads", color: "bg-primary" },
              { key: "verified", label: "Verified", color: "bg-info/60" },
            ]}
          />
        </div>
        <div className="space-y-4">
          <ProgressCard
            title="Verification Rate"
            subtitle={`${stats?.verified ?? 0} of ${stats?.totalUploads ?? 0} records verified`}
            percent={
              stats?.totalUploads ? Math.round((stats.verified / stats.totalUploads) * 100) : 0
            }
            footer={`${stats?.uploadedThisMonth ?? 0} uploaded this month`}
          />
          <div className="surface p-5">
            <h3 className="text-sm font-semibold">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              <Link to="/operator/upload" className="block">
                <Button className="w-full" icon={Upload}>
                  Upload New Record
                </Button>
              </Link>
              <Link to="/operator/uploads" className="block">
                <Button variant="outline" className="w-full" icon={ArrowUpRight}>
                  View My Uploads
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Recent Upload Activity</h2>
        <DataTable columns={columns} rows={recent} />
      </div>
    </AppLayout>
  );
}

export default OperatorDashboard;
