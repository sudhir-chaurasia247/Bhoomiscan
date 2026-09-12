import { useEffect, useState } from "react";
import AppLayout from "../../layouts/AppLayout";
import MetricCard from "../../components/cards/MetricCard";
import BarChart from "../../components/dashboard/BarChart";
import LineChart from "../../components/dashboard/LineChart";
import api from "../../services/api";

function Analytics() {
  const [adminStats, setAdminStats] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [monthlyUploads, setMonthlyUploads] = useState([]);

  useEffect(() => {
    let active = true;
    api
      .get("/admin/analytics")
      .then((res) => {
        if (!active) return;
        const { stats, districts: d, monthlyUploads: m } = res.data.data;
        setAdminStats(stats);
        setDistricts(d || []);
        setMonthlyUploads(m || []);
      })
      .catch(() => {
        if (active) {
          setAdminStats(null);
          setDistricts([]);
          setMonthlyUploads([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!adminStats) {
    return (
      <AppLayout role="admin" title="Analytics" subtitle="Pipeline accuracy and throughput insights">
        <div className="surface p-5">
          <p>Loading analytics...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="admin" title="Analytics" subtitle="Pipeline accuracy and throughput insights">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="OCR Accuracy" value={adminStats.ocrAccuracy} unit="%" progress={adminStats.ocrAccuracy} description="Average confidence across processed pages" />
        <MetricCard label="AI Extraction Accuracy" value={adminStats.aiAccuracy} unit="%" progress={adminStats.aiAccuracy} description="Gemini structured field mapping" />
        <MetricCard label="Verification Rate" value={adminStats.verificationRate} unit="%" progress={adminStats.verificationRate} description="Records verified out of total" />
        <MetricCard label="Duplicate Detection Rate" value={adminStats.duplicateRate} unit="%" progress={adminStats.duplicateRate} description="Records auto-flagged as duplicates" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <BarChart
          title="Monthly Upload Trend"
          subtitle="Scanned records ingested per month"
          data={monthlyUploads.map((m) => ({ ...m, label: m.month }))}
          series={[{ key: "uploads", label: "Uploads", color: "bg-primary" }]}
        />
        <LineChart
          title="OCR Accuracy Trend"
          subtitle="Model accuracy improvement over time"
          data={monthlyUploads}
          valueKey="accuracy"
          suffix="%"
        />
        <BarChart
          title="Verification Trend"
          subtitle="Verified records per month"
          data={monthlyUploads.map((m) => ({ ...m, label: m.month }))}
          series={[{ key: "verified", label: "Verified", color: "bg-info/70" }]}
        />
        <BarChart
          title="District Performance"
          subtitle="Accuracy by district (%)"
          data={districts.map((d) => ({ label: d.name, accuracy: d.accuracy }))}
          series={[{ key: "accuracy", label: "Accuracy", color: "bg-success/75" }]}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Average Processing Time" value={adminStats.avgProcessingTime} description="OCR + AI + validation per record" />
        <MetricCard label="Records Processed Today" value={adminStats.processedToday} description="Documents completed since midnight" />
        <MetricCard label="Pending Reviews" value={adminStats.pending.toLocaleString()} description="Awaiting verifier action" />
        <MetricCard label="Rejected Records" value={adminStats.rejected.toLocaleString()} description="Sent back to operators" />
      </div>
    </AppLayout>
  );
}

export default Analytics;
