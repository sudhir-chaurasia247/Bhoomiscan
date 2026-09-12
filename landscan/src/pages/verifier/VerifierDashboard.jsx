import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, CheckCircle2, XCircle, Timer } from "lucide-react";
import AppLayout from "../../layouts/AppLayout";
import StatsCard from "../../components/cards/StatsCard";
import ProgressCard from "../../components/cards/ProgressCard";
import BarChart from "../../components/dashboard/BarChart";
import DataTable from "../../components/tables/DataTable";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import api from "../../services/api";

function VerifierDashboard() {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    let active = true;
    api
      .get("/dashboard/verifier")
      .then((res) => {
        if (!active) return;
        setStats(res.data.data.stats);
        setQueue(res.data.data.queuePreview || []);
        setActivity(res.data.data.activity || []);
      })
      .catch(() => {
        if (active) {
          setStats(null);
          setQueue([]);
          setActivity([]);
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
    { key: "priority", header: "Priority", render: (r) => <StatusBadge status={r.priority} /> },
    { key: "confidence", header: "Confidence", render: (r) => `${r.confidence}%` },
    {
      key: "action",
      header: "",
      render: (r) => (
        <Link to={`/verifier/review?recordId=${r.id}`}>
          <Button variant="soft" size="sm">
            Review
          </Button>
        </Link>
      ),
    },
  ];

  const approved = stats?.approvedByYou ?? 0;
  const rejected = stats?.rejectedByYou ?? 0;
  const reviewedTotal = approved + rejected;

  return (
    <AppLayout role="verifier" title="Verifier Dashboard" subtitle="Records awaiting your verification">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Pending In Queue"
          value={stats?.pendingInQueue ?? "—"}
          icon={ClipboardList}
          tone="warning"
          hint={`${stats?.highPriority ?? 0} high priority`}
        />
        <StatsCard label="Approved By You" value={approved} icon={CheckCircle2} tone="success" hint="all time" />
        <StatsCard
          label="Rejected By You"
          value={rejected}
          icon={XCircle}
          tone="danger"
          hint={`${stats?.rejectionRate ?? 0}% rejection rate`}
        />
        <StatsCard label="Avg Review Time" value={stats?.avgReviewTime ?? "—"} icon={Timer} tone="info" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BarChart
            title="Review Outcomes"
            subtitle="Approved vs rejected by you"
            data={[{ label: "You", approved, rejected }]}
            series={[
              { key: "approved", label: "Approved", color: "bg-primary" },
              { key: "rejected", label: "Rejected", color: "bg-destructive/60" },
            ]}
          />
        </div>
        <div className="space-y-4">
          <ProgressCard
            title="Approval Rate"
            subtitle={`${approved} of ${reviewedTotal} reviewed`}
            percent={reviewedTotal ? Math.round((approved / reviewedTotal) * 100) : 0}
            tone="success"
            footer={`${stats?.pendingInQueue ?? 0} records still pending`}
          />
          <div className="surface p-5">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <ul className="mt-4 space-y-3">
              {activity.slice(0, 4).map((a, i) => (
                <li key={i} className="flex gap-3 text-xs">
                  <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                  <span>
                    <span className="text-foreground">{a.text}</span>
                    <span className="block text-muted-foreground">{a.time}</span>
                  </span>
                </li>
              ))}
              {!activity.length ? (
                <li className="text-xs text-muted-foreground">No recent activity</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Top Priority Records</h2>
        <DataTable columns={columns} rows={queue} />
      </div>
    </AppLayout>
  );
}

export default VerifierDashboard;
