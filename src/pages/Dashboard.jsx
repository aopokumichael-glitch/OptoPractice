import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const colors = {
  navy: "#0B1F3A",
  blue: "#1A6FB8",
  blueLight: "#2A85D8",
  ice: "#E8F3FC",
  border: "#D4E4F0",
  textSecondary: "#4A6080",
  textMuted: "#7A90A8",
  teal: "#15B89A",
  red: "#C6373F",
  offWhite: "#F5F8FB",
};

const s = {
  wrap: { padding: "56px 5% 88px", backgroundColor: colors.offWhite, minHeight: "60vh" },
  header: { marginBottom: "32px" },
  h1: { fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 800, color: colors.navy, margin: "0 0 6px" },
  sub: { fontSize: "14px", color: colors.textSecondary, margin: 0 },
  grid: { display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px", alignItems: "start" },
  card: {
    backgroundColor: "#fff",
    border: `1px solid ${colors.border}`,
    borderRadius: "16px",
    padding: "24px",
  },
  profileName: { fontSize: "18px", fontWeight: 700, color: colors.navy, margin: "0 0 4px" },
  profileEmail: { fontSize: "13px", color: colors.textSecondary, margin: "0 0 16px" },
  profileRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderTop: `1px solid ${colors.border}`,
    fontSize: "13px",
  },
  profileLabel: { color: colors.textMuted },
  profileValue: { color: colors.navy, fontWeight: 600 },
  sectionTitle: { fontSize: "16px", fontWeight: 700, color: colors.navy, margin: "0 0 16px" },
  attemptCard: {
    backgroundColor: "#fff",
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  attemptLeft: { display: "flex", flexDirection: "column", gap: "4px" },
  attemptInstrument: { fontSize: "13px", fontWeight: 700, color: colors.blue, textTransform: "uppercase", letterSpacing: "0.5px" },
  attemptDetail: { fontSize: "14px", color: colors.navy },
  attemptDate: { fontSize: "12px", color: colors.textMuted },
  badge: {
    padding: "5px 12px",
    borderRadius: "100px",
    fontSize: "12px",
    fontWeight: 700,
  },
  empty: {
    textAlign: "center",
    padding: "48px 24px",
    color: colors.textSecondary,
    fontSize: "14px",
  },
  loading: { padding: "48px 24px", textAlign: "center", color: colors.textSecondary },
  errorBox: {
    backgroundColor: "#FDEDEE",
    border: "1px solid #F3C6C9",
    color: colors.red,
    borderRadius: "10px",
    padding: "14px 16px",
    fontSize: "13px",
  },
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard({ onGoToSimulator }) {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/simulations/attempts")
      .then((data) => setAttempts(data.attempts))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h1 style={s.h1}>Welcome back, {user.fullName.split(" ")[0]}</h1>
        <p style={s.sub}>Here's your practice history and account details.</p>
      </div>

      <div style={s.grid} className="dashboard-grid">
        {/* Profile card */}
        <div style={s.card}>
          <p style={s.profileName}>{user.fullName}</p>
          <p style={s.profileEmail}>{user.email}</p>
          <div style={s.profileRow}>
            <span style={s.profileLabel}>Role</span>
            <span style={s.profileValue}>{user.role === "admin" ? "Admin" : "Student"}</span>
          </div>
          <div style={s.profileRow}>
            <span style={s.profileLabel}>Member since</span>
            <span style={s.profileValue}>{formatDate(user.createdAt)}</span>
          </div>
          <div style={s.profileRow}>
            <span style={s.profileLabel}>Total attempts</span>
            <span style={s.profileValue}>{attempts ? attempts.length : "—"}</span>
          </div>
        </div>

        {/* Attempts list */}
        <div>
          <p style={s.sectionTitle}>Simulation history</p>

          {error && <div style={s.errorBox}>Couldn't load your history: {error}</div>}

          {!error && attempts === null && <div style={s.loading}>Loading your attempts…</div>}

          {!error && attempts && attempts.length === 0 && (
            <div style={{ ...s.card, ...s.empty }}>
              <p style={{ margin: "0 0 16px" }}>You haven't saved any practice attempts yet.</p>
              <button
                onClick={onGoToSimulator}
                style={{
                  padding: "10px 22px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: colors.blue,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Try the Retinoscopy Simulator
              </button>
            </div>
          )}

          {!error &&
            attempts &&
            attempts.map((a) => {
              const graded = a.result?.mode === "graded";
              return (
                <div key={a.id} style={s.attemptCard}>
                  <div style={s.attemptLeft}>
                    <span style={s.attemptInstrument}>{a.instrument}</span>
                    {graded ? (
                      <span style={s.attemptDetail}>
                        Your Rx: {a.result.studentRx.sphere.toFixed(2)} / {a.result.studentRx.cylinder.toFixed(2)} ×{" "}
                        {a.result.studentRx.axis}° &nbsp;•&nbsp; Actual: {a.result.actualRx.sphere.toFixed(2)} /{" "}
                        {a.result.actualRx.cylinder.toFixed(2)} × {a.result.actualRx.axis}°
                      </span>
                    ) : (
                      <span style={s.attemptDetail}>
                        Patient Rx: {a.inputs?.patientSphere ?? "—"} / {a.inputs?.patientCylinder ?? "—"} ×{" "}
                        {a.inputs?.patientAxis ?? "—"}° &nbsp;•&nbsp; Tested at {a.inputs?.streakAxis ?? "—"}°
                      </span>
                    )}
                    <span style={s.attemptDate}>{formatDate(a.created_at)}</span>
                  </div>
                  <span
                    style={{
                      ...s.badge,
                      backgroundColor: (graded ? a.result.passed : a.result?.isNeutralized)
                        ? "rgba(21,184,154,0.14)"
                        : "rgba(198,55,63,0.1)",
                      color: (graded ? a.result.passed : a.result?.isNeutralized) ? colors.teal : colors.red,
                    }}
                  >
                    {graded ? `${a.result.score}/100` : a.result?.isNeutralized ? "Neutralized" : "Not neutralized"}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
