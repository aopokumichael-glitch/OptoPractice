import { useState } from "react";
import RetinoscopySimulator from "./RetinoscopySimulator";
import OphthalmoscopeSimulator from "./OphthalmoscopeSimulator";
import AuthModal from "./components/AuthModal";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PaymentCallback from "./pages/PaymentCallback";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  // Paystack redirects the browser to /payment/callback after checkout (a real page
  // load, not a client-side route change), so we check the URL directly on mount.
  const [view, setView] = useState(
    window.location.pathname === "/payment/callback" ? "payment-callback" : "landing"
  );
  const { user, logout } = useAuth();

  const returnFromPaymentCallback = () => {
    window.history.replaceState({}, "", "/");
    setView("dashboard");
  };

  // Nav links like "Features" or "Team" are anchors within the landing page. If we're
  // currently on a different tab (e.g. the simulator), switch to landing first, then
  // scroll — otherwise the target section wouldn't be in the DOM yet.
  const goToLandingSection = (id) => {
    const wasOnLanding = view === "landing";
    setView("landing");
    setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }),
      wasOnLanding ? 0 : 60
    );
  };

  const colors = {
    navy: "#0B1F3A",
    navyLight: "#132C52",
    blue: "#1A6FB8",
    blueLight: "#2A85D8",
    ice: "#E8F3FC",
    iceDeep: "#C9E2F5",
    white: "#FFFFFF",
    offWhite: "#F5F8FB",
    textPrimary: "#0B1F3A",
    textSecondary: "#4A6080",
    textMuted: "#7A90A8",
    border: "#D4E4F0",
  };

  const navLinks = ["Home", "Features", "About", "Simulators", "Team", "Contact"];

  const features = [
    {
      icon: "🔬",
      title: "Retinoscopy Simulator",
      desc: "Practice real streak retinoscopy on a hidden patient case. Sweep meridians, neutralize the reflex, and determine a full sphero-cylindrical prescription — just like a real exam.",
    },
    {
      icon: "👁",
      title: "Ophthalmoscope Simulator",
      desc: "Focus the fundus, choose your light aperture, and identify real clinical findings — from normal discs to papilledema and diabetic retinopathy.",
    },
    {
      icon: "✅",
      title: "Clinically-Calibrated Grading",
      desc: "Every submission is graded against real clinical tolerances, not a guess — so a passing score actually means something.",
    },
    {
      icon: "📊",
      title: "Progress Dashboard",
      desc: "Every graded attempt is saved to your account, so you can track your accuracy and improvement over time.",
    },
    {
      icon: "🎓",
      title: "Practice & Setup Modes",
      desc: "Practice Mode hides the answer for real self-testing. Setup Mode reveals and lets you edit the case — useful for lecturers building teaching examples.",
    },
    {
      icon: "🔒",
      title: "Secure Accounts",
      desc: "Password hashing, JWT-based sessions, and rate-limited login — your account and progress are protected.",
    },
  ];

  const stats = [
    { value: "2", label: "Clinical Simulators" },
    { value: "100%", label: "Free During Beta" },
    { value: "Real-Time", label: "Clinical Grading" },
    { value: "24/7", label: "Practice Access" },
  ];

  // Placeholder roster — replace with real names/roles/photos. Avatars fall back to
  // initials until a photo is provided (see the `photo` field).
  const team = [
    { name: "Add Team Lead Name", role: "Team Leader", photo: null },
    { name: "Add Member Name", role: "Contributor", photo: null },
    { name: "Add Member Name", role: "Contributor", photo: null },
    { name: "Add Member Name", role: "Contributor", photo: null },
  ];

  const s = {
    root: {
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      color: colors.textPrimary,
      backgroundColor: colors.white,
      margin: 0,
      padding: 0,
    },

    // NAV
    nav: {
      position: "sticky",
      top: 0,
      zIndex: 100,
      backgroundColor: colors.navy,
      padding: "0 5%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "68px",
      boxShadow: "0 1px 12px rgba(0,0,0,0.18)",
    },
    navBrand: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      textDecoration: "none",
    },
    navLogo: {
      width: "36px",
      height: "36px",
      borderRadius: "8px",
      backgroundColor: colors.blue,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "18px",
    },
    navBrandText: {
      fontSize: "20px",
      fontWeight: "700",
      color: colors.white,
      letterSpacing: "-0.3px",
    },
    navBrandSpan: {
      color: colors.blueLight,
    },
    navLinks: {
      display: "flex",
      gap: "32px",
      listStyle: "none",
      margin: 0,
      padding: 0,
    },
    navLink: {
      color: "rgba(255,255,255,0.78)",
      textDecoration: "none",
      fontSize: "15px",
      fontWeight: "500",
      transition: "color 0.2s",
    },
    navCta: {
      backgroundColor: colors.blue,
      color: colors.white,
      border: "none",
      borderRadius: "8px",
      padding: "9px 22px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      letterSpacing: "0.2px",
    },
    hamburger: {
      display: "none",
      flexDirection: "column",
      gap: "5px",
      cursor: "pointer",
      background: "none",
      border: "none",
      padding: "4px",
    },
    hamburgerBar: {
      width: "24px",
      height: "2px",
      backgroundColor: colors.white,
      borderRadius: "2px",
    },
    mobileMenu: {
      backgroundColor: colors.navyLight,
      padding: "16px 5% 24px",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    mobileLink: {
      color: "rgba(255,255,255,0.85)",
      textDecoration: "none",
      fontSize: "15px",
      padding: "10px 0",
      borderBottom: `1px solid rgba(255,255,255,0.08)`,
      fontWeight: "500",
    },

    // HERO
    hero: {
      background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 55%, #1A3A60 100%)`,
      padding: "96px 5% 88px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "48px",
      flexWrap: "wrap",
    },
    heroLeft: {
      flex: "1 1 420px",
      maxWidth: "580px",
    },
    heroEyebrow: {
      display: "inline-block",
      backgroundColor: "rgba(42,133,216,0.18)",
      color: colors.blueLight,
      fontSize: "13px",
      fontWeight: "600",
      letterSpacing: "1px",
      textTransform: "uppercase",
      padding: "6px 14px",
      borderRadius: "100px",
      marginBottom: "24px",
      border: `1px solid rgba(42,133,216,0.3)`,
    },
    heroH1: {
      fontSize: "clamp(32px, 5vw, 52px)",
      fontWeight: "800",
      color: colors.white,
      lineHeight: "1.12",
      letterSpacing: "-1px",
      margin: "0 0 20px",
    },
    heroH1Span: {
      color: colors.blueLight,
    },
    heroSub: {
      fontSize: "17px",
      color: "rgba(255,255,255,0.68)",
      lineHeight: "1.7",
      margin: "0 0 36px",
      maxWidth: "460px",
    },
    heroActions: {
      display: "flex",
      gap: "14px",
      flexWrap: "wrap",
    },
    heroBtnPrimary: {
      backgroundColor: colors.blue,
      color: colors.white,
      border: "none",
      borderRadius: "10px",
      padding: "14px 28px",
      fontSize: "16px",
      fontWeight: "700",
      cursor: "pointer",
      letterSpacing: "0.2px",
    },
    heroBtnSecondary: {
      backgroundColor: "transparent",
      color: colors.white,
      border: `1.5px solid rgba(255,255,255,0.35)`,
      borderRadius: "10px",
      padding: "14px 28px",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
    },
    heroRight: {
      flex: "1 1 300px",
      maxWidth: "400px",
    },
    heroCard: {
      backgroundColor: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.13)",
      borderRadius: "20px",
      padding: "32px",
      backdropFilter: "blur(12px)",
    },
    heroCardTitle: {
      color: colors.white,
      fontSize: "15px",
      fontWeight: "600",
      marginBottom: "20px",
      opacity: 0.9,
    },
    heroCardRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 0",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    heroCardLabel: {
      color: "rgba(255,255,255,0.55)",
      fontSize: "13px",
    },
    heroCardValue: {
      color: colors.white,
      fontSize: "14px",
      fontWeight: "600",
    },
    heroBadge: {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: "100px",
      fontSize: "12px",
      fontWeight: "600",
    },

    // STATS BAR
    statsBar: {
      backgroundColor: colors.ice,
      borderTop: `1px solid ${colors.border}`,
      borderBottom: `1px solid ${colors.border}`,
      padding: "36px 5%",
      display: "flex",
      justifyContent: "space-around",
      flexWrap: "wrap",
      gap: "24px",
    },
    statItem: {
      textAlign: "center",
      flex: "1 1 120px",
    },
    statValue: {
      fontSize: "30px",
      fontWeight: "800",
      color: colors.blue,
      letterSpacing: "-0.5px",
    },
    statLabel: {
      fontSize: "13px",
      color: colors.textSecondary,
      marginTop: "4px",
      fontWeight: "500",
    },

    // FEATURES
    features: {
      backgroundColor: colors.white,
      padding: "88px 5%",
    },
    sectionEyebrow: {
      textAlign: "center",
      fontSize: "12px",
      fontWeight: "700",
      letterSpacing: "1.4px",
      textTransform: "uppercase",
      color: colors.blue,
      marginBottom: "12px",
    },
    sectionH2: {
      textAlign: "center",
      fontSize: "clamp(26px, 3.5vw, 40px)",
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: "-0.5px",
      margin: "0 auto 12px",
      maxWidth: "560px",
    },
    sectionSub: {
      textAlign: "center",
      fontSize: "16px",
      color: colors.textSecondary,
      maxWidth: "500px",
      margin: "0 auto 56px",
      lineHeight: "1.7",
    },
    featureGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "24px",
    },
    featureCard: {
      backgroundColor: colors.offWhite,
      border: `1px solid ${colors.border}`,
      borderRadius: "16px",
      padding: "28px 28px 32px",
      transition: "border-color 0.2s",
    },
    featureIcon: {
      fontSize: "28px",
      marginBottom: "16px",
      display: "block",
    },
    featureTitle: {
      fontSize: "17px",
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: "10px",
    },
    featureDesc: {
      fontSize: "14px",
      color: colors.textSecondary,
      lineHeight: "1.7",
      margin: 0,
    },

    // ABOUT
    about: {
      backgroundColor: colors.offWhite,
      borderTop: `1px solid ${colors.border}`,
      padding: "88px 5%",
      display: "flex",
      gap: "64px",
      alignItems: "center",
      flexWrap: "wrap",
    },
    aboutLeft: {
      flex: "1 1 340px",
    },
    aboutRight: {
      flex: "1 1 320px",
    },
    aboutH2: {
      fontSize: "clamp(26px, 3.5vw, 38px)",
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: "-0.5px",
      margin: "0 0 20px",
      lineHeight: "1.2",
    },
    aboutP: {
      fontSize: "15px",
      color: colors.textSecondary,
      lineHeight: "1.8",
      margin: "0 0 16px",
    },
    aboutList: {
      listStyle: "none",
      padding: 0,
      margin: "24px 0 32px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    aboutListItem: {
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      fontSize: "14px",
      color: colors.textSecondary,
      lineHeight: "1.6",
    },
    aboutCheck: {
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      backgroundColor: colors.blue,
      color: colors.white,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "11px",
      fontWeight: "700",
      flexShrink: 0,
      marginTop: "1px",
    },
    aboutCard: {
      backgroundColor: colors.navy,
      borderRadius: "20px",
      padding: "36px",
      color: colors.white,
    },
    aboutCardH3: {
      fontSize: "20px",
      fontWeight: "700",
      marginBottom: "8px",
      color: colors.white,
    },
    aboutCardP: {
      fontSize: "14px",
      color: "rgba(255,255,255,0.62)",
      lineHeight: "1.7",
      margin: "0 0 28px",
    },
    aboutCardDivider: {
      borderTop: "1px solid rgba(255,255,255,0.1)",
      margin: "20px 0",
    },
    aboutMetaRow: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "12px",
    },
    aboutMetaLabel: {
      fontSize: "13px",
      color: "rgba(255,255,255,0.5)",
    },
    aboutMetaValue: {
      fontSize: "13px",
      color: colors.blueLight,
      fontWeight: "600",
    },

    // FOOTER
    footer: {
      backgroundColor: colors.navy,
      padding: "56px 5% 32px",
      color: "rgba(255,255,255,0.55)",
    },
    footerTop: {
      display: "flex",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "40px",
      paddingBottom: "40px",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      marginBottom: "28px",
    },
    footerBrand: {
      flex: "1 1 220px",
    },
    footerBrandName: {
      fontSize: "20px",
      fontWeight: "700",
      color: colors.white,
      marginBottom: "10px",
    },
    footerTagline: {
      fontSize: "13px",
      lineHeight: "1.7",
      maxWidth: "220px",
    },
    footerCol: {
      flex: "1 1 140px",
    },
    footerColTitle: {
      fontSize: "13px",
      fontWeight: "700",
      color: colors.white,
      textTransform: "uppercase",
      letterSpacing: "0.8px",
      marginBottom: "14px",
    },
    footerColList: {
      listStyle: "none",
      padding: 0,
      margin: 0,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    },
    footerLink: {
      color: "rgba(255,255,255,0.5)",
      textDecoration: "none",
      fontSize: "14px",
    },
    footerBottom: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "12px",
      fontSize: "13px",
    },
    footerBottomRight: {
      display: "flex",
      gap: "24px",
    },
  };

  return (
    <div style={s.root}>
      {/* NAVBAR */}
      <nav style={s.nav}>
        <a
          href="#"
          style={s.navBrand}
          onClick={(e) => { e.preventDefault(); setView("landing"); }}
        >
          <div style={s.navLogo}>👁</div>
          <span style={s.navBrandText}>
            Opto<span style={s.navBrandSpan}>Practice</span>
          </span>
        </a>

        {/* Desktop links */}
        <ul
          style={{
            ...s.navLinks,
            "@media (max-width: 768px)": { display: "none" },
          }}
          className="desktop-nav"
        >
          {navLinks.map((l) => (
            <li key={l}>
              <a
                href={`#${l.toLowerCase()}`}
                style={s.navLink}
                onClick={(e) => { e.preventDefault(); goToLandingSection(l.toLowerCase()); }}
              >
                {l}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#"
              style={{ ...s.navLink, color: view === "retinoscopy" ? "#fff" : s.navLink.color }}
              onClick={(e) => { e.preventDefault(); setView("retinoscopy"); }}
            >
              Retinoscopy
            </a>
          </li>
          <li>
            <a
              href="#"
              style={{ ...s.navLink, color: view === "ophthalmoscope" ? "#fff" : s.navLink.color }}
              onClick={(e) => { e.preventDefault(); setView("ophthalmoscope"); }}
            >
              Ophthalmoscope
            </a>
          </li>
        </ul>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "14px" }}>
                Hi, {user.fullName.split(" ")[0]}{user.isPremium ? " ⭐" : ""}
              </span>
              <button
                style={{ ...s.navCta, backgroundColor: view === "dashboard" ? colors.blueLight : s.navCta.backgroundColor }}
                onClick={() => setView(view === "dashboard" ? "landing" : "dashboard")}
              >
                {view === "dashboard" ? "Home" : "Dashboard"}
              </button>
              {user.role === "admin" && (
                <button
                  style={{ ...s.navCta, backgroundColor: view === "admin" ? colors.blueLight : s.navCta.backgroundColor }}
                  onClick={() => setView(view === "admin" ? "landing" : "admin")}
                >
                  {view === "admin" ? "Home" : "Admin"}
                </button>
              )}
              <button style={s.navCta} onClick={() => { logout(); setView("landing"); }}>Log Out</button>
            </div>
          ) : (
            <button style={s.navCta} onClick={() => setAuthOpen(true)}>Get Started</button>
          )}
          <button
            style={s.hamburger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span style={s.hamburgerBar} />
            <span style={s.hamburgerBar} />
            <span style={s.hamburgerBar} />
          </button>
        </div>
      </nav>

      {menuOpen && (
  <div style={s.mobileMenu}>
    {navLinks.map((l) => (
      <a
        key={l}
        href={`#${l.toLowerCase()}`}
        style={s.mobileLink}
        onClick={(e) => { e.preventDefault(); goToLandingSection(l.toLowerCase()); setMenuOpen(false); }}
      >
        {l}
      </a>
    ))}
    <a href="#" style={s.mobileLink} onClick={() => { setView("retinoscopy"); setMenuOpen(false); }}>
      Retinoscopy Simulator
    </a>
    <a href="#" style={s.mobileLink} onClick={() => { setView("ophthalmoscope"); setMenuOpen(false); }}>
      Ophthalmoscope Simulator
    </a>
  </div>
)}

      {view === "payment-callback" ? (
        <PaymentCallback onDone={returnFromPaymentCallback} />
      ) : view === "admin" && user?.role === "admin" ? (
        <AdminDashboard />
      ) : view === "retinoscopy" ? (
        <RetinoscopySimulator />
      ) : view === "ophthalmoscope" ? (
        <OphthalmoscopeSimulator />
      ) : view === "dashboard" && user ? (
        <Dashboard onGoToSimulator={() => setView("retinoscopy")} />
      ) : (
        <>
      {/* HERO */}
      <section id="home" style={s.hero}>
        <div style={s.heroLeft}>
          <span style={s.heroEyebrow}>Optometry Training Simulators</span>
          <h1 style={s.heroH1}>
            Master Clinical Skills,{" "}
            <span style={s.heroH1Span}>Risk-Free</span>
            <br />
            Before You Ever Touch a Patient
          </h1>
          <p style={s.heroSub}>
            OptoPractice is a virtual training platform for optometry students — practice real
            retinoscopy and ophthalmoscopy on hidden clinical cases, get graded against real
            clinical tolerances, and track your progress over time.
          </p>
          <div style={s.heroActions}>
            <button style={s.heroBtnPrimary} onClick={() => setView("retinoscopy")}>
              Try the Retinoscopy Simulator
            </button>
            <button style={s.heroBtnSecondary} onClick={() => setView("ophthalmoscope")}>
              Try the Ophthalmoscope Simulator
            </button>
          </div>
        </div>

        <div style={s.heroRight}>
          <div style={s.heroCard}>
            <p style={s.heroCardTitle}>Your Simulator Progress</p>
            {[
              { label: "Retinoscopy attempts", value: "12 saved", badge: null },
              {
                label: "Best retinoscopy score",
                value: null,
                badge: { text: "94/100", bg: "rgba(29,158,117,0.2)", color: "#5DCAA5" },
              },
              { label: "Ophthalmoscope attempts", value: "7 saved", badge: null },
              {
                label: "Account status",
                value: null,
                badge: { text: "Free Beta Access", bg: "rgba(26,111,184,0.2)", color: "#2A85D8" },
              },
              { label: "Last practice session", value: "Today", badge: null },
            ].map((row, i) => (
              <div key={i} style={s.heroCardRow}>
                <span style={s.heroCardLabel}>{row.label}</span>
                {row.badge ? (
                  <span
                    style={{
                      ...s.heroBadge,
                      backgroundColor: row.badge.bg,
                      color: row.badge.color,
                    }}
                  >
                    {row.badge.text}
                  </span>
                ) : (
                  <span style={s.heroCardValue}>{row.value}</span>
                )}
              </div>
            ))}
            <p style={{ fontSize: "11px", color: colors.textMuted, margin: "12px 0 0", textAlign: "center" }}>
              Example dashboard — sign up to start tracking your own attempts.
            </p>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div style={s.statsBar}>
        {stats.map((st) => (
          <div key={st.label} style={s.statItem}>
            <div style={s.statValue}>{st.value}</div>
            <div style={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <section id="features" style={s.features}>
        <p style={s.sectionEyebrow}>Platform Features</p>
        <h2 style={s.sectionH2}>Everything your practice needs</h2>
        <p style={s.sectionSub}>
          Built with input from optometrists across independent clinics and
          multi-site practices.
        </p>
        <div style={s.featureGrid}>
          {features.map((f) => (
            <div key={f.title} style={s.featureCard}>
              <span style={s.featureIcon}>{f.icon}</span>
              <h3 style={s.featureTitle}>{f.title}</h3>
              <p style={s.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={s.about}>
        <div style={s.aboutLeft}>
          <p style={{ ...s.sectionEyebrow, textAlign: "left", marginBottom: "12px" }}>
            About OptoPractice
          </p>
          <h2 style={s.aboutH2}>Built by Group Seven, Innovating Optometry Education Through Technology</h2>
          <p style={s.aboutP}>
            OptoPractice was developed by Group Seven, a team of Optometry students from the University of Cape Coast, as part of an entreprenuership and innovtion project focused on advancing clinical training through technology.
          </p>
          <p style={s.aboutP}>
            Our goal is to bridge the gap between classroom learning and real clinical experience by creating interactive simulation tools that help students build confidence, improve diagnostic skills, and practice Opthalmic instrument in a safe virtual environment.
          </p>
          <ul style={s.aboutList}>
            {[
              "The platform combines optometry education, simulation, technology, and modern wed development to create an accessible learning experience for students, lecturers, and eye care professionals. Designed specifically for optometry workflows"
            ].map((item) => (
              <li key={item} style={s.aboutListItem}>
                <span style={s.aboutCheck}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <button
            style={{ ...s.navCta, padding: "13px 26px", fontSize: "15px" }}
            onClick={() => document.getElementById("team")?.scrollIntoView({ behavior: "smooth" })}
          >
            Meet The Team
          </button>
        </div>

        <div style={s.aboutRight}>
          <div style={s.aboutCard}>
            <h3 style={s.aboutCardH3}>Why students choose OptoPractice</h3>
            <p style={s.aboutCardP}>
              Built for real self-testing, not just click-through practice.
            </p>
            {[
              { label: "Grading tolerance (sphere/cylinder)", value: "±0.25 D" },
              { label: "Cost during beta", value: "Free" },
              { label: "Equipment needed to start", value: "None" },
              { label: "Access", value: "24/7 online" },
            ].map((m, i) => (
              <div key={m.label}>
                {i > 0 && <div style={s.aboutCardDivider} />}
                <div style={s.aboutMetaRow}>
                  <span style={s.aboutMetaLabel}>{m.label}</span>
                  <span style={s.aboutMetaValue}>{m.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIMULATORS SHOWCASE */}
      <section id="simulators" style={s.features}>
        <p style={s.sectionEyebrow}>Try It Now</p>
        <h2 style={s.sectionH2}>Two clinical simulators, free to try</h2>
        <p style={s.sectionSub}>Practice mode hides the answer. Submit your findings to get graded.</p>
        <div style={{ ...s.featureGrid, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <div style={s.featureCard}>
            <svg viewBox="0 0 100 100" style={{ width: "56px", height: "56px", marginBottom: "14px" }}>
              <rect x="44" y="10" width="12" height="46" rx="6" fill={colors.blue} />
              <circle cx="50" cy="62" r="16" fill="none" stroke={colors.blue} strokeWidth="5" />
              <circle cx="50" cy="62" r="6" fill={colors.blue} />
              <rect x="40" y="78" width="20" height="10" rx="3" fill={colors.textMuted} />
            </svg>
            <h3 style={s.featureTitle}>Retinoscopy Simulator</h3>
            <p style={s.featureDesc}>
              Sweep the streak, neutralize the reflex, and determine a full prescription on a
              hidden patient case.
            </p>
            <button
              style={{ ...s.navCta, marginTop: "14px", backgroundColor: colors.blue }}
              onClick={() => setView("retinoscopy")}
            >
              Open Simulator
            </button>
          </div>

          <div style={s.featureCard}>
            <svg viewBox="0 0 100 100" style={{ width: "56px", height: "56px", marginBottom: "14px" }}>
              <circle cx="50" cy="38" r="22" fill="none" stroke={colors.blue} strokeWidth="5" />
              <circle cx="50" cy="38" r="9" fill={colors.blue} />
              <rect x="44" y="58" width="12" height="30" rx="5" fill={colors.blue} />
              <circle cx="50" cy="92" r="7" fill={colors.textMuted} />
            </svg>
            <h3 style={s.featureTitle}>Ophthalmoscope Simulator</h3>
            <p style={s.featureDesc}>
              Focus the fundus, choose your light aperture, and identify real clinical findings —
              from normal discs to papilledema.
            </p>
            <button
              style={{ ...s.navCta, marginTop: "14px", backgroundColor: colors.blue }}
              onClick={() => setView("ophthalmoscope")}
            >
              Open Simulator
            </button>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section id="team" style={s.about}>
        <div style={{ width: "100%" }}>
          <p style={{ ...s.sectionEyebrow, marginBottom: "12px" }}>Meet The Team</p>
          <h2 style={{ ...s.sectionH2, textAlign: "left" }}>Group Seven</h2>
          <p style={{ ...s.sectionSub, textAlign: "left", margin: "0 0 32px" }}>
            Optometry students at the University of Cape Coast, building OptoPractice as an
            entrepreneurship &amp; innovation project.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "24px" }}>
            {team.map((member, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "88px",
                    height: "88px",
                    borderRadius: "50%",
                    margin: "0 auto 14px",
                    backgroundColor: colors.ice,
                    border: `2px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "26px",
                    fontWeight: 800,
                    color: colors.blue,
                    overflow: "hidden",
                  }}
                >
                  {member.photo ? (
                    <img src={member.photo} alt={member.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    "?"
                  )}
                </div>
                <p style={{ fontWeight: 700, fontSize: "14px", margin: "0 0 2px", color: colors.textPrimary }}>
                  {member.name}
                </p>
                <p style={{ fontSize: "12.5px", color: colors.textMuted, margin: 0 }}>{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
        </>
      )}
      {/* FOOTER */}
      <footer id="contact" style={s.footer}>
        <div style={s.footerTop}>
          <div style={s.footerBrand}>
            <div style={s.footerBrandName}>👁 OptoPractice</div>
            <p style={s.footerTagline}>
              A virtual training platform for optometry students, built as an
              entrepreneurship &amp; innovation project by Group Seven, University of Cape Coast.
            </p>
          </div>

          {[
            {
              title: "Product",
              links: [
                { label: "Retinoscopy Simulator", action: () => setView("retinoscopy") },
                { label: "Ophthalmoscope Simulator", action: () => setView("ophthalmoscope") },
                { label: "Features", action: () => goToLandingSection("features") },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "About", action: () => goToLandingSection("about") },
                { label: "Team", action: () => goToLandingSection("team") },
                { label: "Contact", action: () => goToLandingSection("contact") },
              ],
            },
          ].map((col) => (
            <div key={col.title} style={s.footerCol}>
              <p style={s.footerColTitle}>{col.title}</p>
              <ul style={s.footerColList}>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href="#" style={s.footerLink} onClick={(e) => { e.preventDefault(); l.action(); }}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={s.footerBottom}>
          <span>© 2026 OptoPractice — a student project, University of Cape Coast.</span>
        </div>
      </footer>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}