import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const colors = {
  navy: "#0B1F3A",
  blue: "#1A6FB8",
  teal: "#15B89A",
  red: "#C6373F",
  textSecondary: "#4A6080",
  offWhite: "#F5F8FB",
};

const s = {
  wrap: {
    minHeight: "70vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.offWhite,
    padding: "40px 20px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "40px",
    maxWidth: "420px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 10px 40px rgba(11,31,58,0.08)",
  },
  title: { fontSize: "20px", fontWeight: 800, margin: "16px 0 8px" },
  sub: { fontSize: "14px", color: colors.textSecondary, margin: "0 0 24px", lineHeight: 1.6 },
  btn: {
    padding: "12px 28px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: colors.blue,
    color: "#fff",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: `3px solid ${colors.offWhite}`,
    borderTopColor: colors.blue,
    borderRadius: "50%",
    margin: "0 auto",
    animation: "spin 0.8s linear infinite",
  },
};

// Paystack redirects the browser here after checkout (a real navigation, not a client-side
// route change), so this reads the reference straight from the URL query string.
export default function PaymentCallback({ onDone }) {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState("verifying"); // verifying | success | failed

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");

    if (!reference) {
      setStatus("failed");
      return;
    }

    api
      .get(`/payments/verify/${encodeURIComponent(reference)}`)
      .then(async () => {
        await refreshUser();
        setStatus("success");
      })
      .catch(() => setStatus("failed"));
  }, [refreshUser]);

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        {status === "verifying" && (
          <>
            <div style={s.spinner} />
            <h2 style={{ ...s.title, color: colors.navy }}>Confirming your payment…</h2>
            <p style={s.sub}>This only takes a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: "40px" }}>✓</div>
            <h2 style={{ ...s.title, color: colors.teal }}>You're Premium!</h2>
            <p style={s.sub}>Your payment was confirmed and your account has been upgraded.</p>
            <button style={s.btn} onClick={onDone}>Go to Dashboard</button>
          </>
        )}

        {status === "failed" && (
          <>
            <div style={{ fontSize: "40px" }}>✕</div>
            <h2 style={{ ...s.title, color: colors.red }}>Payment not confirmed</h2>
            <p style={s.sub}>
              We couldn't confirm this payment. If money left your account, contact support — otherwise
              you can safely try again.
            </p>
            <button style={s.btn} onClick={onDone}>Back to OptoPractice</button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
