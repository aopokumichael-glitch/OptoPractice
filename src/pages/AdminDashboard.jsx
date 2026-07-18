import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const colors = {
  navy: "#0B1F3A",
  blue: "#1A6FB8",
  teal: "#15B89A",
  amber: "#C9821A",
  red: "#C6373F",
  border: "#D4E4F0",
  textSecondary: "#4A6080",
  textMuted: "#7A90A8",
  offWhite: "#F5F8FB",
};

const s = {
  wrap: { padding: "56px 5% 88px", backgroundColor: colors.offWhite, minHeight: "60vh" },
  h1: { fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 800, color: colors.navy, margin: "0 0 6px" },
  sub: { fontSize: "14px", color: colors.textSecondary, margin: "0 0 32px" },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "16px",
    marginBottom: "36px",
  },
  statCard: {
    backgroundColor: "#fff",
    border: `1px solid ${colors.border}`,
    borderRadius: "14px",
    padding: "18px 20px",
  },
  statLabel: { fontSize: "12px", color: colors.textMuted, fontWeight: 600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" },
  statValue: { fontSize: "26px", fontWeight: 800, color: colors.navy },
  section: {
    backgroundColor: "#fff",
    border: `1px solid ${colors.border}`,
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "24px",
  },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" },
  sectionTitle: { fontSize: "16px", fontWeight: 700, color: colors.navy, margin: 0 },
  searchInput: {
    padding: "9px 14px",
    borderRadius: "8px",
    border: `1px solid ${colors.border}`,
    fontSize: "13px",
    minWidth: "220px",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { textAlign: "left", padding: "10px 12px", color: colors.textMuted, fontWeight: 600, borderBottom: `1px solid ${colors.border}`, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.4px" },
  td: { padding: "12px", borderBottom: `1px solid ${colors.border}`, color: colors.navy, verticalAlign: "middle" },
  badge: { padding: "4px 10px", borderRadius: "100px", fontSize: "11.5px", fontWeight: 700 },
  roleBtn: {
    padding: "6px 12px",
    borderRadius: "7px",
    border: `1px solid ${colors.border}`,
    backgroundColor: "#fff",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  empty: { padding: "24px", textAlign: "center", color: colors.textSecondary, fontSize: "13px" },
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [payments, setPayments] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [roleUpdating, setRoleUpdating] = useState(null); // id of user being updated

  const loadUsers = useCallback((query) => {
    api
      .get(`/admin/users${query ? `?search=${encodeURIComponent(query)}` : ""}`)
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    api.get("/admin/stats").then((data) => setStats(data)).catch((err) => setError(err.message));
    api.get("/admin/payments").then((data) => setPayments(data.payments)).catch((err) => setError(err.message));
    loadUsers("");
  }, [loadUsers]);

  useEffect(() => {
    const t = setTimeout(() => loadUsers(search), 300); // debounce search
    return () => clearTimeout(t);
  }, [search, loadUsers]);

  async function toggleRole(targetUser) {
    const nextRole = targetUser.role === "admin" ? "student" : "admin";
    setRoleUpdating(targetUser.id);
    try {
      const data = await api.patch(`/admin/users/${targetUser.id}/role`, { role: nextRole });
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? data.user : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setRoleUpdating(null);
    }
  }

  return (
    <div style={s.wrap}>
      <h1 style={s.h1}>Admin Dashboard</h1>
      <p style={s.sub}>Platform-wide stats, user management, and payment history.</p>

      {error && (
        <div style={{ ...s.section, borderColor: colors.red, color: colors.red, marginBottom: "20px" }}>{error}</div>
      )}

      <div style={s.statsGrid}>
        {[
          { label: "Total Users", value: stats?.totalUsers ?? "—" },
          { label: "Premium Users", value: stats?.premiumUsers ?? "—" },
          { label: "Sim Attempts", value: stats?.totalAttempts ?? "—" },
          { label: "Graded Attempts", value: stats?.gradedAttempts ?? "—" },
          { label: "Avg Score", value: stats ? `${stats.averageScore}/100` : "—" },
          { label: "Revenue", value: stats ? `GHS ${stats.totalRevenueGHS.toFixed(2)}` : "—" },
        ].map((card) => (
          <div key={card.label} style={s.statCard}>
            <div style={s.statLabel}>{card.label}</div>
            <div style={s.statValue}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h3 style={s.sectionTitle}>Users</h3>
          <input
            style={s.searchInput}
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {users === null ? (
          <div style={s.empty}>Loading users…</div>
        ) : users.length === 0 ? (
          <div style={s.empty}>No users match your search.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Premium</th>
                  <th style={s.th}>Joined</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={s.td}>{u.fullName}</td>
                    <td style={s.td}>{u.email}</td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...s.badge,
                          backgroundColor: u.role === "admin" ? "rgba(201,130,26,0.12)" : "rgba(74,96,128,0.1)",
                          color: u.role === "admin" ? colors.amber : colors.textSecondary,
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={s.td}>{u.isPremium ? "⭐" : "—"}</td>
                    <td style={s.td}>{formatDate(u.createdAt)}</td>
                    <td style={s.td}>
                      <button
                        style={{ ...s.roleBtn, opacity: roleUpdating === u.id ? 0.6 : 1 }}
                        disabled={roleUpdating === u.id || u.id === user.id}
                        onClick={() => toggleRole(u)}
                        title={u.id === user.id ? "You can't change your own role" : ""}
                      >
                        {u.role === "admin" ? "Remove Admin" : "Make Admin"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h3 style={s.sectionTitle}>Recent Payments</h3>
        </div>

        {payments === null ? (
          <div style={s.empty}>Loading payments…</div>
        ) : payments.length === 0 ? (
          <div style={s.empty}>No payments yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>User</th>
                  <th style={s.th}>Amount</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Reference</th>
                  <th style={s.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={s.td}>{p.userFullName} <span style={{ color: colors.textMuted }}>({p.userEmail})</span></td>
                    <td style={s.td}>{p.currency} {p.amountGHS.toFixed(2)}</td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...s.badge,
                          backgroundColor: p.status === "success" ? "rgba(21,184,154,0.12)" : p.status === "failed" ? "rgba(198,55,63,0.1)" : "rgba(74,96,128,0.1)",
                          color: p.status === "success" ? colors.teal : p.status === "failed" ? colors.red : colors.textSecondary,
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontFamily: "monospace", fontSize: "11.5px" }}>{p.reference}</td>
                    <td style={s.td}>{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
