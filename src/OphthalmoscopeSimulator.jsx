import { useState, useMemo, useCallback } from "react";
import { useAuth } from "./context/AuthContext";
import { api } from "./lib/api";

// =====================================================================
// CASE LIBRARY
// Each case defines a fundus finding: cup-to-disc ratio, disc margin,
// hemorrhage/exudate counts, and whether the disc/veins look swollen —
// enough to render a distinct, recognizable fundus and grade a real diagnosis.
// =====================================================================
const CASES = [
  {
    id: "normal",
    diagnosis: "Normal Fundus",
    cdr: 0.3,
    discMarginSharp: true,
    hemorrhages: 0,
    exudates: 0,
    veinEngorgement: false,
    discSwollen: false,
    explanation:
      "Sharp disc margins, a healthy pink neuroretinal rim, a cup-to-disc ratio within normal limits (under 0.4), and no hemorrhages or exudates.",
  },
  {
    id: "glaucoma",
    diagnosis: "Glaucomatous Cupping",
    cdr: 0.8,
    discMarginSharp: true,
    hemorrhages: 0,
    exudates: 0,
    veinEngorgement: false,
    discSwollen: false,
    explanation:
      "A markedly enlarged, pale cup with thinning of the neuroretinal rim — the classic sign of glaucomatous optic neuropathy.",
  },
  {
    id: "papilledema",
    diagnosis: "Papilledema",
    cdr: 0.1,
    discMarginSharp: false,
    hemorrhages: 2,
    exudates: 0,
    veinEngorgement: true,
    discSwollen: true,
    explanation:
      "Blurred, elevated disc margins with venous engorgement and obliteration of the cup — suggestive of raised intracranial pressure.",
  },
  {
    id: "npdr",
    diagnosis: "Diabetic Retinopathy (NPDR)",
    cdr: 0.3,
    discMarginSharp: true,
    hemorrhages: 6,
    exudates: 5,
    veinEngorgement: false,
    discSwollen: false,
    explanation:
      "A normal-looking disc, but scattered dot-and-blot hemorrhages plus hard exudates in the posterior pole — typical of non-proliferative diabetic retinopathy.",
  },
  {
    id: "crvo",
    diagnosis: "Central Retinal Vein Occlusion",
    cdr: 0.3,
    discMarginSharp: false,
    hemorrhages: 14,
    exudates: 0,
    veinEngorgement: true,
    discSwollen: true,
    explanation:
      'Diffuse hemorrhages in all four quadrants (the classic "blood and thunder" fundus) with tortuous, engorged veins and disc swelling.',
  },
];

// Extra wrong options so the multiple-choice list isn't a giveaway.
const DISTRACTOR_DIAGNOSES = ["Hypertensive Retinopathy", "Retinal Detachment"];

const APERTURES = [
  { id: "large", label: "Large Spot" },
  { id: "small", label: "Small Spot" },
  { id: "redfree", label: "Red-Free" },
];

function randomStep(min, max, step) {
  const steps = Math.round((max - min) / step);
  return +(min + Math.floor(Math.random() * (steps + 1)) * step).toFixed(2);
}

function pickRandomCase() {
  return CASES[Math.floor(Math.random() * CASES.length)];
}

// Hemorrhage/exudate dot positions are generated once per case and stored in
// state (not recomputed every render), so the fundus doesn't visually jitter
// while the student is examining it.
function generateVisual(caseData) {
  const dot = () => ({
    x: 60 + Math.random() * 120,
    y: 40 + Math.random() * 160,
    r: 3 + Math.random() * 4,
  });
  return {
    hemorrhageDots: Array.from({ length: caseData.hemorrhages }, dot),
    exudateDots: Array.from({ length: caseData.exudates }, dot),
  };
}

export default function OphthalmoscopeSimulator() {
  const { user } = useAuth();

  const [practiceMode, setPracticeMode] = useState(true);
  const [currentCase, setCurrentCase] = useState(() => pickRandomCase());
  const [correctDiopter, setCorrectDiopter] = useState(() => randomStep(-6, 6, 0.5));
  const [caseVisual, setCaseVisual] = useState(() => generateVisual(currentCase));

  const [diopter, setDiopter] = useState(0);
  const [aperture, setAperture] = useState("large");

  const [studentCDR, setStudentCDR] = useState(0.3);
  const [studentDiagnosis, setStudentDiagnosis] = useState("");
  const [gradeResult, setGradeResult] = useState(null);
  const [submitState, setSubmitState] = useState("idle");

  const diagnosisOptions = useMemo(() => {
    const all = [...CASES.map((c) => c.diagnosis), ...DISTRACTOR_DIAGNOSES];
    return all.sort(); // fixed alphabetical order so the list doesn't reshuffle mid-session
  }, []);

  const handleNewCase = useCallback(() => {
    const next = pickRandomCase();
    setCurrentCase(next);
    setCorrectDiopter(randomStep(-6, 6, 0.5));
    setCaseVisual(generateVisual(next));
    setDiopter(0);
    setStudentCDR(0.3);
    setStudentDiagnosis("");
    setGradeResult(null);
    setSubmitState("idle");
  }, []);

  const diopterError = Math.abs(diopter - correctDiopter);
  const blurAmount = Math.min(diopterError * 0.7, 10);
  const isFocused = diopterError <= 1;

  const handleSubmit = useCallback(async () => {
    const diagnosisOk = studentDiagnosis === currentCase.diagnosis;
    const cdrError = +(studentCDR - currentCase.cdr).toFixed(2);
    const cdrOk = Math.abs(cdrError) <= 0.1;

    const diagnosisScore = diagnosisOk ? 60 : 0;
    const cdrScore = cdrOk ? 40 : Math.max(0, 40 - (Math.abs(cdrError) - 0.1) * 100);
    const score = Math.round(diagnosisScore + cdrScore);
    const passed = diagnosisOk && cdrOk;

    const result = {
      mode: "graded",
      studentDiagnosis,
      studentCDR,
      actualDiagnosis: currentCase.diagnosis,
      actualCDR: currentCase.cdr,
      diagnosisOk,
      cdrOk,
      cdrError,
      score,
      passed,
      explanation: currentCase.explanation,
    };

    setGradeResult(result);

    if (!user) return;
    setSubmitState("submitting");
    try {
      await api.post("/simulations/attempts", {
        instrument: "ophthalmoscopy",
        inputs: { correctDiopter },
        result,
      });
      setSubmitState("idle");
    } catch {
      setSubmitState("error");
    }
  }, [studentDiagnosis, studentCDR, currentCase, user, correctDiopter]);

  const colors = {
    bg: "#070B14",
    panel: "#10182A",
    panelLight: "#16203A",
    border: "#243049",
    borderLight: "#324264",
    teal: "#15B89A",
    amber: "#E8A33D",
    red: "#E2545A",
    blue: "#4C8DFF",
    textPrimary: "#EAF1FA",
    textSecondary: "#8FA0BD",
    textMuted: "#5C6B85",
    white: "#FFFFFF",
  };

  const s = {
    page: {
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      backgroundColor: colors.bg,
      minHeight: "100vh",
      color: colors.textPrimary,
      padding: "28px 20px 50px",
      boxSizing: "border-box",
    },
    container: { maxWidth: "1240px", margin: "0 auto" },
    header: { marginBottom: "26px" },
    eyebrow: {
      display: "inline-block",
      fontSize: "11.5px",
      fontWeight: 700,
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      color: colors.amber,
      backgroundColor: "rgba(232,163,61,0.1)",
      border: "1px solid rgba(232,163,61,0.3)",
      borderRadius: "100px",
      padding: "5px 14px",
      marginBottom: "12px",
    },
    h1: { fontSize: "26px", fontWeight: 800, margin: "0 0 6px", color: colors.white, letterSpacing: "-0.3px" },
    sub: { fontSize: "14px", color: colors.textSecondary, margin: 0, maxWidth: "640px", lineHeight: 1.6 },
    grid: { display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: "22px", alignItems: "start" },
    viewportCard: {
      backgroundColor: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: "18px",
      padding: "26px",
      position: "sticky",
      top: "20px",
    },
    viewportLabel: {
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "1.2px",
      textTransform: "uppercase",
      color: colors.textMuted,
      marginBottom: "18px",
    },
    panelsCol: { display: "flex", flexDirection: "column", gap: "18px" },
    panel: { backgroundColor: colors.panel, border: `1px solid ${colors.border}`, borderRadius: "16px", padding: "22px 24px" },
    panelHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", flexWrap: "wrap", gap: "10px" },
    panelTitle: { fontSize: "15px", fontWeight: 700, color: colors.white, display: "flex", alignItems: "center", gap: "10px", margin: 0 },
    panelDot: { width: "8px", height: "8px", borderRadius: "50%" },
    controlRow: { marginBottom: "18px" },
    controlRowLast: { marginBottom: 0 },
    controlLabelRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" },
    controlLabel: { fontSize: "12.5px", fontWeight: 600, color: colors.textSecondary },
    controlValue: { fontSize: "13px", fontWeight: 700, color: colors.amber, fontVariantNumeric: "tabular-nums" },
    slider: {
      width: "100%",
      height: "5px",
      borderRadius: "100px",
      outline: "none",
      cursor: "pointer",
      appearance: "none",
      backgroundColor: colors.border,
      accentColor: colors.amber,
    },
    btnRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
    chipBtn: {
      padding: "7px 13px",
      fontSize: "11.5px",
      fontWeight: 600,
      borderRadius: "8px",
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.panelLight,
      color: colors.textSecondary,
      cursor: "pointer",
    },
    chipBtnActive: { borderColor: colors.amber, backgroundColor: "rgba(232,163,61,0.12)", color: colors.amber },
    footNote: { fontSize: "11px", color: colors.textMuted, lineHeight: 1.6 },
    select: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: "8px",
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.panelLight,
      color: colors.white,
      fontSize: "13px",
    },
  };

  // ---------------------------------------------------------------------
  // Fundus rendering: disc/cup geometry + hemorrhage/exudate dots + a
  // focus blur that scales with how far the diopter dial is from correct.
  // ---------------------------------------------------------------------
  const discR = 34;
  const discCx = 148;
  const discCy = 118;
  const cupR = discR * currentCase.cdr;
  const discFill = currentCase.discSwollen ? "#F0A868" : "#F2C89A";
  const cupFill = currentCase.discSwollen ? "#E8935A" : "#FBEBD3";
  const apertureRadius = aperture === "small" ? 62 : 108;
  const redFreeFilter =
    aperture === "redfree" ? "grayscale(1) sepia(0.4) hue-rotate(60deg) saturate(4) brightness(0.85)" : "none";

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <span style={s.eyebrow}>Advanced Clinical Simulation</span>
          <h1 style={s.h1}>Direct Ophthalmoscope Simulator — Fundus Examination</h1>
          <p style={s.sub}>
            Dial in focus on the ophthalmoscope's lens wheel to bring the fundus into view, choose your
            light aperture, then examine the disc and retina to determine cup-to-disc ratio and diagnosis.
            The true findings are hidden until you submit — just like a real exam.
          </p>
        </div>

        <div style={s.grid}>
          {/* VIEWPORT */}
          <div style={s.viewportCard}>
            <div style={s.viewportLabel}>Ophthalmoscope View</div>

            <svg viewBox="0 0 240 240" style={{ width: "100%", filter: redFreeFilter }}>
              <defs>
                <filter id="fundusBlur">
                  <feGaussianBlur stdDeviation={blurAmount} />
                </filter>
                <clipPath id="fundusClip">
                  <circle cx="120" cy="120" r={apertureRadius} />
                </clipPath>
                <radialGradient id="fundusBg" cx="45%" cy="45%" r="70%">
                  <stop offset="0%" stopColor="#C24A3C" />
                  <stop offset="100%" stopColor="#7A2418" />
                </radialGradient>
              </defs>

              {/* black surround = looking through the ophthalmoscope aperture */}
              <circle cx="120" cy="120" r="118" fill="#000" />

              <g clipPath="url(#fundusClip)" filter="url(#fundusBlur)">
                <circle cx="120" cy="120" r="118" fill="url(#fundusBg)" />

                {/* vessels radiating from the disc */}
                {[-60, -30, -10, 10, 30, 60, 150, 170, 190, 210].map((angle, i) => {
                  const rad = (angle * Math.PI) / 180;
                  const x2 = discCx + Math.cos(rad) * 110;
                  const y2 = discCy + Math.sin(rad) * 110;
                  const strokeColor = currentCase.veinEngorgement && i % 2 === 0 ? "#7A1616" : "#8C2A22";
                  const width = currentCase.veinEngorgement && i % 2 === 0 ? 4.5 : 2.5;
                  return (
                    <path
                      key={i}
                      d={`M ${discCx} ${discCy} Q ${(discCx + x2) / 2 + 10} ${(discCy + y2) / 2 - 10}, ${x2} ${y2}`}
                      stroke={strokeColor}
                      strokeWidth={width}
                      fill="none"
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* macula (subtle darker area, temporal to disc) */}
                <ellipse cx="70" cy="122" rx="16" ry="12" fill="#5A160F" opacity="0.4" />

                {/* optic disc */}
                <circle
                  cx={discCx}
                  cy={discCy}
                  r={discR}
                  fill={discFill}
                  stroke={currentCase.discMarginSharp ? "#C97A3E" : "none"}
                  strokeWidth={currentCase.discMarginSharp ? 1.5 : 0}
                  filter={currentCase.discMarginSharp ? "none" : "blur(4px)"}
                />
                {/* cup */}
                <circle cx={discCx} cy={discCy} r={Math.max(cupR, 2)} fill={cupFill} opacity="0.9" />

                {/* hemorrhages */}
                {caseVisual.hemorrhageDots.map((d, i) => (
                  <ellipse key={`h${i}`} cx={d.x} cy={d.y} rx={d.r} ry={d.r * 0.6} fill="#5A0C0C" opacity="0.85" />
                ))}
                {/* exudates */}
                {caseVisual.exudateDots.map((d, i) => (
                  <circle key={`e${i}`} cx={d.x} cy={d.y} r={d.r * 0.7} fill="#F2D94E" opacity="0.9" />
                ))}
              </g>

              {/* aperture ring */}
              <circle cx="120" cy="120" r={apertureRadius} fill="none" stroke="#1C2438" strokeWidth="3" />
            </svg>

            <div style={{ ...s.footNote, marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${colors.border}` }}>
              {isFocused
                ? "In focus — examine the disc, cup, vessels, and retina for findings."
                : `Out of focus — adjust the diopter dial. (${diopterError.toFixed(1)}D off)`}
              {aperture === "redfree" && (
                <div style={{ marginTop: "6px" }}>
                  Red-free (green) light absorbs into hemoglobin, making blood vessels and hemorrhages appear
                  darker and easier to spot — a real technique used to enhance contrast.
                </div>
              )}
              {aperture === "small" && (
                <div style={{ marginTop: "6px" }}>
                  Small aperture narrows your field of view — useful for undilated pupils, but you'll see
                  less of the periphery.
                </div>
              )}
            </div>
          </div>

          {/* CONTROLS */}
          <div style={s.panelsCol}>
            {/* OPHTHALMOSCOPE CONTROLS */}
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <h3 style={s.panelTitle}>
                  <span style={{ ...s.panelDot, backgroundColor: colors.amber }} />
                  Ophthalmoscope Controls
                </h3>
              </div>

              <div style={s.controlRow}>
                <div style={s.controlLabelRow}>
                  <span style={s.controlLabel}>Lens Wheel (Diopter)</span>
                  <span style={s.controlValue}>
                    {diopter > 0 ? "+" : ""}
                    {diopter.toFixed(1)} D
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={diopter}
                  onChange={(e) => setDiopter(parseFloat(e.target.value))}
                  style={s.slider}
                />
              </div>

              <div style={{ ...s.controlRow, ...s.controlRowLast }}>
                <div style={s.controlLabelRow}>
                  <span style={s.controlLabel}>Light Aperture</span>
                </div>
                <div style={s.btnRow}>
                  {APERTURES.map((a) => (
                    <button
                      key={a.id}
                      style={{ ...s.chipBtn, ...(aperture === a.id ? s.chipBtnActive : {}) }}
                      onClick={() => setAperture(a.id)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PATIENT CASE */}
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <h3 style={s.panelTitle}>
                  <span style={{ ...s.panelDot, backgroundColor: colors.blue }} />
                  {practiceMode ? "Patient Case (Hidden)" : "Case Answer (Setup Mode)"}
                </h3>
                <div style={s.btnRow}>
                  <button style={{ ...s.chipBtn, ...(practiceMode ? s.chipBtnActive : {}) }} onClick={() => setPracticeMode(true)}>
                    Practice
                  </button>
                  <button style={{ ...s.chipBtn, ...(!practiceMode ? s.chipBtnActive : {}) }} onClick={() => setPracticeMode(false)}>
                    Setup
                  </button>
                </div>
              </div>

              {practiceMode ? (
                <p style={{ ...s.footNote, margin: 0 }}>
                  This patient's true diagnosis is hidden. Focus the view, examine the fundus, and submit your
                  findings below.
                </p>
              ) : (
                <p style={{ ...s.footNote, margin: 0 }}>
                  Setup mode reveals the answer: <strong style={{ color: colors.white }}>{currentCase.diagnosis}</strong>,
                  {" "}CDR {currentCase.cdr.toFixed(2)}, correct focus {correctDiopter > 0 ? "+" : ""}
                  {correctDiopter.toFixed(1)}D.
                </p>
              )}

              <button
                onClick={handleNewCase}
                style={{
                  marginTop: "16px",
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: `1px solid ${colors.borderLight}`,
                  backgroundColor: colors.panelLight,
                  color: colors.white,
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                🎲 New Patient Case
              </button>
            </div>

            {/* FINDINGS */}
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <h3 style={s.panelTitle}>
                  <span style={{ ...s.panelDot, backgroundColor: colors.teal }} />
                  Record Your Findings
                </h3>
              </div>

              {!isFocused && (
                <p style={{ ...s.footNote, margin: "0 0 16px" }}>
                  Bring the fundus into focus first — findings are hard to assess through a blurred view.
                </p>
              )}

              <div style={s.controlRow}>
                <div style={s.controlLabelRow}>
                  <span style={s.controlLabel}>Cup-to-Disc Ratio</span>
                  <span style={s.controlValue}>{studentCDR.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={studentCDR}
                  onChange={(e) => setStudentCDR(parseFloat(e.target.value))}
                  style={s.slider}
                />
              </div>

              <div style={{ ...s.controlRow, ...s.controlRowLast }}>
                <div style={s.controlLabelRow}>
                  <span style={s.controlLabel}>Diagnosis</span>
                </div>
                <select style={s.select} value={studentDiagnosis} onChange={(e) => setStudentDiagnosis(e.target.value)}>
                  <option value="">Select a diagnosis…</option>
                  {diagnosisOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!isFocused || !studentDiagnosis || submitState === "submitting"}
                style={{
                  marginTop: "18px",
                  width: "100%",
                  padding: "13px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: !isFocused || !studentDiagnosis ? colors.borderLight : colors.teal,
                  color: !isFocused || !studentDiagnosis ? colors.textSecondary : "#04120E",
                  fontWeight: 700,
                  fontSize: "14.5px",
                  cursor: !isFocused || !studentDiagnosis ? "not-allowed" : "pointer",
                  opacity: submitState === "submitting" ? 0.7 : 1,
                }}
              >
                {submitState === "submitting" ? "Submitting…" : "Submit Findings for Grading"}
              </button>

              {!user && (
                <p style={{ fontSize: "12px", color: colors.textMuted, marginTop: "10px", textAlign: "center" }}>
                  Log in to save graded attempts to your dashboard.
                </p>
              )}
              {submitState === "error" && (
                <p style={{ fontSize: "12px", color: colors.red, marginTop: "10px", textAlign: "center" }}>
                  Grade calculated, but saving to your account failed.
                </p>
              )}

              {gradeResult && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "18px",
                    borderRadius: "12px",
                    backgroundColor: gradeResult.passed ? "rgba(21,184,154,0.1)" : "rgba(226,84,90,0.08)",
                    border: `1.5px solid ${gradeResult.passed ? colors.teal : colors.red}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
                    <span style={{ fontWeight: 800, fontSize: "16px", color: gradeResult.passed ? colors.teal : colors.red }}>
                      {gradeResult.passed ? "Correct ✓" : "Not Quite"}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: "20px", color: colors.white }}>{gradeResult.score}/100</span>
                  </div>

                  <div style={{ fontSize: "13px", marginBottom: "6px" }}>
                    <span style={{ color: colors.textSecondary }}>Actual diagnosis: </span>
                    <span style={{ color: colors.white, fontWeight: 700 }}>{gradeResult.actualDiagnosis}</span>
                  </div>
                  <div style={{ fontSize: "13px", marginBottom: "12px" }}>
                    <span style={{ color: colors.textSecondary }}>Actual CDR: </span>
                    <span style={{ color: colors.white, fontWeight: 700 }}>{gradeResult.actualCDR.toFixed(2)}</span>
                  </div>
                  <p style={{ fontSize: "12.5px", color: colors.textSecondary, lineHeight: 1.6, margin: "0 0 16px" }}>
                    {gradeResult.explanation}
                  </p>

                  <button
                    onClick={handleNewCase}
                    style={{
                      width: "100%",
                      padding: "11px",
                      borderRadius: "10px",
                      border: `1px solid ${colors.borderLight}`,
                      backgroundColor: colors.panelLight,
                      color: colors.white,
                      fontWeight: 700,
                      fontSize: "13.5px",
                      cursor: "pointer",
                    }}
                  >
                    🎲 Try a New Patient Case
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
