import { useState, useMemo, useCallback } from "react";
import { useAuth } from "./context/AuthContext";
import { api } from "./lib/api";

export default function RetinoscopySimulator() {
  const { user } = useAuth();
  // ---------- PATIENT PRESCRIPTION (the "ground truth" refractive error) ----------
  const [patientSphere, setPatientSphere] = useState(-2.0);
  const [patientCylinder, setPatientCylinder] = useState(-1.0);
  const [patientAxis, setPatientAxis] = useState(90);

  // ---------- RETINOSCOPE CONTROLS ----------
  const [streakAxis, setStreakAxis] = useState(0); // meridian being tested, 0-180
  const [brightness, setBrightness] = useState(70); // 0-100
  const [workingDistanceCm, setWorkingDistanceCm] = useState(67); // ~1.5 D lens equivalent
  const [scopeOffset, setScopeOffset] = useState(0); // horizontal sweep position, -1 to 1

  // ---------- TRIAL LENS (what the student dials in) ----------
  const [trialLens, setTrialLens] = useState(0.0);

  // ---------- COLOR PALETTE ----------
  const colors = {
    bg: "#070B14",
    panel: "#10182A",
    panelLight: "#16203A",
    border: "#243049",
    borderLight: "#324264",
    teal: "#15B89A",
    tealDim: "#0E7A68",
    amber: "#E8A33D",
    red: "#E2545A",
    blue: "#4C8DFF",
    textPrimary: "#EAF1FA",
    textSecondary: "#8FA0BD",
    textMuted: "#5C6B85",
    white: "#FFFFFF",
  };

  // =====================================================================
  // CORE RETINOSCOPY PHYSICS
  // =====================================================================
  // Working distance lens neutralizes the examiner's own distance from the patient.
  // A real retinoscopist must subtract this to get the true refractive error.
  const workingDistanceLensPower = useMemo(() => {
    return +(100 / workingDistanceCm).toFixed(2); // diopters, e.g. 67cm -> +1.49D
  }, [workingDistanceCm]);

  // Power of the patient's eye AT THE CURRENT STREAK MERIDIAN (streakAxis).
  // Astigmatic eyes have different power in different meridians:
  // power(meridian) = sphere + cylinder * sin^2(meridian - axis)
  // (cylinder written in minus-cyl convention, axis in degrees)
  const meridianPower = useMemo(() => {
    const angleDiff = ((streakAxis - patientAxis) * Math.PI) / 180;
    const cylContribution = patientCylinder * Math.pow(Math.sin(angleDiff), 2);
    return patientSphere + cylContribution;
  }, [streakAxis, patientAxis, patientSphere, patientCylinder]);

  // Net power = patient's power in this meridian, neutralized by the trial lens
  // the student has dialed in, and corrected for working distance.
  // This is the actual quantity that determines reflex motion.
  const netPower = useMemo(() => {
    return +(meridianPower - trialLens + workingDistanceLensPower).toFixed(2);
  }, [meridianPower, trialLens, workingDistanceLensPower]);

  // Reflex classification:
  //  netPower > +0.25  -> WITH motion  (hyperopic relative to examiner)
  //  netPower < -0.25  -> AGAINST motion (myopic relative to examiner)
  //  |netPower| <= 0.25 -> NEUTRAL
  const reflexState = useMemo(() => {
    if (netPower > 0.25) return "with";
    if (netPower < -0.25) return "against";
    return "neutral";
  }, [netPower]);

  const isNeutralized = reflexState === "neutral";

  // ---------- V2: CLINICAL PRACTICE MODE ----------
  // In practice mode the patient's real Rx is hidden — exactly like a real exam.
  // The student must find it via retinoscopy and submit their own findings for grading.
  const [practiceMode, setPracticeMode] = useState(true);
  const [recordedMeridians, setRecordedMeridians] = useState([]); // [{ axis, power }]
  const [studentSphere, setStudentSphere] = useState(0);
  const [studentCylinder, setStudentCylinder] = useState(0);
  const [studentAxis, setStudentAxis] = useState(90);
  const [gradeResult, setGradeResult] = useState(null);
  const [submitState, setSubmitState] = useState("idle"); // idle | submitting | error

  const randomStep = (min, max, step) => {
    const steps = Math.round((max - min) / step);
    return +(min + Math.floor(Math.random() * (steps + 1)) * step).toFixed(2);
  };

  // Generates a fresh, unseen patient case and resets the whole practice session.
  const handleNewPatientCase = useCallback(() => {
    setPatientSphere(randomStep(-6, 4, 0.25));
    setPatientCylinder(randomStep(-4, 0, 0.25)); // minus-cyl convention
    setPatientAxis(randomStep(0, 175, 5));
    setTrialLens(0);
    setRecordedMeridians([]);
    setStudentSphere(0);
    setStudentCylinder(0);
    setStudentAxis(90);
    setGradeResult(null);
    setSaveState("idle");
  }, []);

  // Records the neutralized trial lens power at the current meridian. Replaces any
  // existing record within 5° of the same meridian so re-testing overwrites cleanly.
  const handleRecordMeridian = useCallback(() => {
    setRecordedMeridians((prev) => {
      const filtered = prev.filter((m) => Math.abs(m.axis - streakAxis) > 5);
      return [...filtered, { axis: streakAxis, power: trialLens }].sort((a, b) => a.axis - b.axis);
    });
  }, [streakAxis, trialLens]);

  // Grades the student's final sphero-cylindrical prescription against the true patient
  // Rx using clinical tolerances, then reveals the answer and saves the graded attempt.
  const handleSubmitPrescription = useCallback(async () => {
    const sphereError = +(studentSphere - patientSphere).toFixed(2);
    const cylinderError = +(studentCylinder - patientCylinder).toFixed(2);
    // Axis tolerance widens for low cylinder power (clinically, axis barely matters below ~0.50D).
    const cylMag = Math.abs(patientCylinder);
    const axisTolerance = cylMag < 0.5 ? Infinity : cylMag < 1 ? 15 : cylMag < 2 ? 10 : 5;
    const rawAxisDiff = Math.abs(studentAxis - patientAxis) % 180;
    const axisError = Math.min(rawAxisDiff, 180 - rawAxisDiff);

    const sphereOk = Math.abs(sphereError) <= 0.25;
    const cylinderOk = Math.abs(cylinderError) <= 0.25;
    const axisOk = axisError <= axisTolerance;

    const sphereScore = Math.max(0, 40 - Math.abs(sphereError) * 40);
    const cylinderScore = Math.max(0, 30 - Math.abs(cylinderError) * 30);
    const axisScore = axisTolerance === Infinity ? 30 : Math.max(0, 30 - (axisError / axisTolerance) * 15);
    const score = Math.round(sphereScore + cylinderScore + axisScore);
    const passed = sphereOk && cylinderOk && axisOk;

    const result = {
      mode: "graded",
      recordedMeridians,
      studentRx: { sphere: studentSphere, cylinder: studentCylinder, axis: studentAxis },
      actualRx: { sphere: patientSphere, cylinder: patientCylinder, axis: patientAxis },
      componentResults: { sphereOk, cylinderOk, axisOk, sphereError, cylinderError, axisError },
      score,
      passed,
    };

    setGradeResult(result);

    if (!user) return; // still show the grade locally, just can't persist it
    setSubmitState("submitting");
    try {
      await api.post("/simulations/attempts", {
        instrument: "retinoscopy",
        inputs: { workingDistanceCm },
        result,
      });
      setSubmitState("idle");
    } catch (err) {
      setSubmitState("error");
    }
  }, [studentSphere, studentCylinder, studentAxis, patientSphere, patientCylinder, patientAxis, recordedMeridians, user, workingDistanceCm]);



  // Reflex speed/brightness/width scale with |netPower| — closer to neutral,
  // the reflex fills the pupil and moves slower; far from neutral, it's a
  // fast, narrow, dim sliver. This matches real clinical teaching.
  const reflexIntensity = useMemo(() => {
    const magnitude = Math.min(Math.abs(netPower) / 6, 1); // 0 (neutral) -> 1 (far off)
    return magnitude;
  }, [netPower]);

  const reflexWidthPct = useMemo(() => {
    // Near neutral: wide reflex filling most of pupil. Far off: narrow sliver.
    return Math.max(12, 100 - reflexIntensity * 78);
  }, [reflexIntensity]);

  const reflexBrightnessPct = useMemo(() => {
    // Brightness slider scales final visible brightness; reflex itself dims
    // as you move away from neutral (less light reflected back coherently).
    const baseBrightness = 100 - reflexIntensity * 55;
    return Math.max(8, (baseBrightness * brightness) / 100);
  }, [reflexIntensity, brightness]);

  const reflexSpeed = useMemo(() => {
    // Used for animation duration: far from neutral = fast sweep, near = slow.
    const speed = 2.6 - reflexIntensity * 1.9; // seconds per sweep
    return Math.max(0.5, speed);
  }, [reflexIntensity]);

  // Visual orientation of the reflex band: perpendicular to streak when testing
  // a principal meridian, but the BAND ITSELF is drawn along the streak axis,
  // exactly like the projected streak in real retinoscopy.
  const reflexRotationDeg = streakAxis;

  // Reflex center position shifts with scope horizontal sweep (scopeOffset -1..1)
  // and with reflex motion direction: with-motion reflex moves the SAME
  // direction as the sweep, against-motion moves OPPOSITE.
  const motionDirectionMultiplier = reflexState === "with" ? 1 : reflexState === "against" ? -1 : 0;
  const reflexShiftPx = scopeOffset * 26 * motionDirectionMultiplier;

  // ---------- HANDLERS ----------
  const adjustTrialLens = useCallback((delta) => {
    setTrialLens((prev) => {
      const next = +(prev + delta).toFixed(2);
      return Math.max(-20, Math.min(20, next));
    });
  }, []);

  const resetTrialLens = useCallback(() => setTrialLens(0), []);

  const meridianLabel = useMemo(() => {
    if (practiceMode) return `Testing at ${streakAxis}°`;
    const principal = Math.abs(((streakAxis - patientAxis + 90) % 180) - 90) < 5;
    return principal ? "Near a principal meridian" : "Off-axis meridian";
  }, [streakAxis, patientAxis, practiceMode]);

  // =====================================================================
  // STYLES
  // =====================================================================
  const s = {
    page: {
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      backgroundColor: colors.bg,
      minHeight: "100vh",
      color: colors.textPrimary,
      padding: "28px 20px 50px",
      boxSizing: "border-box",
    },
    container: {
      maxWidth: "1240px",
      margin: "0 auto",
    },
    header: {
      marginBottom: "26px",
    },
    eyebrow: {
      display: "inline-block",
      fontSize: "11.5px",
      fontWeight: 700,
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      color: colors.teal,
      backgroundColor: "rgba(21,184,154,0.1)",
      border: `1px solid rgba(21,184,154,0.3)`,
      borderRadius: "100px",
      padding: "5px 14px",
      marginBottom: "12px",
    },
    h1: {
      fontSize: "26px",
      fontWeight: 800,
      margin: "0 0 6px",
      color: colors.white,
      letterSpacing: "-0.3px",
    },
    sub: {
      fontSize: "14px",
      color: colors.textSecondary,
      margin: 0,
      maxWidth: "640px",
      lineHeight: 1.6,
    },

    grid: {
      display: "grid",
      gridTemplateColumns: "minmax(320px, 420px) 1fr",
      gap: "22px",
      alignItems: "start",
    },

    // ---- VIEWPORT (eye + reflex) ----
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
    eyeStage: {
      position: "relative",
      width: "100%",
      height: "260px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "20px",
    },
    eyeOuter: {
      position: "absolute",
      width: "230px",
      height: "230px",
      borderRadius: "50%",
      background: "radial-gradient(circle at 35% 30%, #2A3550, #11182A 70%)",
      border: `2px solid ${colors.borderLight}`,
    },
    iris: {
      position: "absolute",
      width: "150px",
      height: "150px",
      borderRadius: "50%",
      background: "radial-gradient(circle at 40% 35%, #4A6890, #1E3050 75%)",
      border: `2px solid rgba(255,255,255,0.08)`,
    },
    pupil: {
      position: "absolute",
      width: "92px",
      height: "92px",
      borderRadius: "50%",
      backgroundColor: "#020308",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "width 0.35s ease, height 0.35s ease",
    },
    reflexBand: {
      position: "absolute",
      borderRadius: "3px",
      transition: "width 0.35s ease, height 0.35s ease, opacity 0.35s ease, transform 0.25s linear, background-color 0.35s ease",
    },
    streakLine: {
      position: "absolute",
      width: "320px",
      height: "2px",
      transformOrigin: "center center",
      pointerEvents: "none",
    },

    readoutGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "10px",
      marginBottom: "16px",
    },
    readoutBox: {
      backgroundColor: colors.panelLight,
      border: `1px solid ${colors.border}`,
      borderRadius: "10px",
      padding: "10px 12px",
    },
    readoutLabel: {
      fontSize: "10px",
      color: colors.textMuted,
      fontWeight: 600,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      marginBottom: "4px",
    },
    readoutValue: {
      fontSize: "16px",
      fontWeight: 700,
      color: colors.white,
      fontVariantNumeric: "tabular-nums",
    },

    motionBanner: {
      borderRadius: "12px",
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      transition: "background-color 0.3s, border-color 0.3s",
      border: "1.5px solid transparent",
    },
    motionIconWrap: {
      width: "38px",
      height: "38px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      fontWeight: 800,
      flexShrink: 0,
    },
    motionTextTitle: {
      fontSize: "14px",
      fontWeight: 700,
      marginBottom: "2px",
    },
    motionTextSub: {
      fontSize: "11.5px",
      color: colors.textSecondary,
    },

    // ---- CONTROL PANELS ----
    panelsCol: {
      display: "flex",
      flexDirection: "column",
      gap: "18px",
    },
    panel: {
      backgroundColor: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: "16px",
      padding: "22px 24px",
    },
    panelHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "18px",
    },
    panelTitle: {
      fontSize: "15px",
      fontWeight: 700,
      color: colors.white,
      display: "flex",
      alignItems: "center",
      gap: "10px",
      margin: 0,
    },
    panelDot: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
    },
    controlRow: {
      marginBottom: "18px",
    },
    controlRowLast: {
      marginBottom: 0,
    },
    controlLabelRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: "8px",
    },
    controlLabel: {
      fontSize: "12.5px",
      fontWeight: 600,
      color: colors.textSecondary,
    },
    controlValue: {
      fontSize: "13px",
      fontWeight: 700,
      color: colors.teal,
      fontVariantNumeric: "tabular-nums",
    },
    slider: {
      width: "100%",
      height: "5px",
      borderRadius: "100px",
      outline: "none",
      cursor: "pointer",
      appearance: "none",
      backgroundColor: colors.border,
      accentColor: colors.teal,
    },
    scaleRow: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "6px",
      fontSize: "10px",
      color: colors.textMuted,
    },

    twoCol: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "14px",
    },

    btnRow: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
    },
    chipBtn: {
      padding: "7px 13px",
      fontSize: "11.5px",
      fontWeight: 600,
      borderRadius: "8px",
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.panelLight,
      color: colors.textSecondary,
      cursor: "pointer",
      transition: "all 0.15s",
    },
    chipBtnActive: {
      borderColor: colors.teal,
      backgroundColor: "rgba(21,184,154,0.12)",
      color: colors.teal,
    },

    // ---- TRIAL LENS PANEL ----
    lensDisplay: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "18px",
      marginBottom: "18px",
    },
    lensBtn: {
      width: "44px",
      height: "44px",
      borderRadius: "50%",
      border: `1.5px solid ${colors.borderLight}`,
      backgroundColor: colors.panelLight,
      color: colors.white,
      fontSize: "22px",
      fontWeight: 700,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.15s",
      flexShrink: 0,
    },
    lensValueWrap: {
      textAlign: "center",
      minWidth: "120px",
    },
    lensValue: {
      fontSize: "30px",
      fontWeight: 800,
      color: colors.white,
      letterSpacing: "-0.5px",
      fontVariantNumeric: "tabular-nums",
      lineHeight: 1,
    },
    lensValueLabel: {
      fontSize: "11px",
      color: colors.textMuted,
      marginTop: "4px",
      fontWeight: 600,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
    },
    resetLink: {
      display: "block",
      margin: "0 auto",
      fontSize: "11.5px",
      color: colors.textMuted,
      background: "none",
      border: "none",
      cursor: "pointer",
      textDecoration: "underline",
      padding: "4px 0",
    },

    neutIndicator: {
      borderRadius: "10px",
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "12.5px",
      fontWeight: 700,
      transition: "all 0.3s",
    },

    footNote: {
      fontSize: "11px",
      color: colors.textMuted,
      lineHeight: 1.6,
      marginTop: "20px",
      paddingTop: "16px",
      borderTop: `1px solid ${colors.border}`,
    },
  };

  const motionVisuals = {
    with: { bg: "rgba(76,141,255,0.1)", border: "rgba(76,141,255,0.4)", color: colors.blue, label: "WITH Motion", icon: "→" },
    against: { bg: "rgba(226,84,90,0.1)", border: "rgba(226,84,90,0.4)", color: colors.red, label: "AGAINST Motion", icon: "←" },
    neutral: { bg: "rgba(21,184,154,0.12)", border: "rgba(21,184,154,0.5)", color: colors.teal, label: "NEUTRALIZED", icon: "✓" },
  };
  const mv = motionVisuals[reflexState];

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* HEADER */}
        <div style={s.header}>
          <span style={s.eyebrow}>Advanced Clinical Simulation</span>
          <h1 style={s.h1}>Retinoscopy Simulator — Astigmatic Refraction</h1>
          <p style={s.sub}>
            Practice mode hides the patient's true prescription, just like a real exam. Sweep the
            streak through different meridians, neutralize the reflex, record your findings, and
            submit a final sphero-cylindrical prescription to see how close you got.
          </p>
        </div>

        <div style={s.grid}>
          {/* ===================== LEFT: VIEWPORT ===================== */}
          <div style={s.viewportCard}>
            <div style={s.viewportLabel}>Live Reflex View</div>

            <div style={s.eyeStage}>
              <div style={s.eyeOuter} />
              <div style={s.iris} />
              <div
                style={{
                  ...s.pupil,
                  width: isNeutralized ? "92px" : `${92 - reflexIntensity * 18}px`,
                  height: isNeutralized ? "92px" : `${92 - reflexIntensity * 18}px`,
                }}
              >
                <div
                  style={{
                    ...s.reflexBand,
                    width: isNeutralized ? "100%" : `${reflexWidthPct}%`,
                    height: "140%",
                    backgroundColor: mv.color,
                    opacity: reflexBrightnessPct / 100,
                    transform: `rotate(${reflexRotationDeg}deg) translateX(${reflexShiftPx}px)`,
                    boxShadow: `0 0 ${10 + reflexIntensity * 4}px ${mv.color}`,
                    animation: isNeutralized
                      ? "none"
                      : `sweep${reflexState === "with" ? "Right" : "Left"} ${reflexSpeed}s ease-in-out infinite alternate`,
                  }}
                />
              </div>
              {/* Streak projection line across the eye, shows tested meridian */}
              <div
                style={{
                  ...s.streakLine,
                  backgroundColor: `rgba(255,255,255,${0.08 + (brightness / 100) * 0.12})`,
                  transform: `rotate(${streakAxis}deg)`,
                }}
              />
            </div>

            <div style={s.readoutGrid}>
              <div style={s.readoutBox}>
                <div style={s.readoutLabel}>Streak Meridian</div>
                <div style={s.readoutValue}>{streakAxis}°</div>
              </div>
              <div style={s.readoutBox}>
                <div style={s.readoutLabel}>Net Power</div>
                <div style={{ ...s.readoutValue, color: isNeutralized ? colors.teal : colors.white }}>
                  {netPower > 0 ? "+" : ""}
                  {netPower.toFixed(2)} D
                </div>
              </div>
            </div>

            <div
              style={{
                ...s.motionBanner,
                backgroundColor: mv.bg,
                borderColor: mv.border,
              }}
            >
              <div style={{ ...s.motionIconWrap, backgroundColor: mv.bg, color: mv.color }}>{mv.icon}</div>
              <div>
                <div style={{ ...s.motionTextTitle, color: mv.color }}>{mv.label}</div>
                <div style={s.motionTextSub}>{meridianLabel}</div>
              </div>
            </div>

            <p style={s.footNote}>
              Net power accounts for the trial lens and your working-distance lens. When it reaches
              approximately zero, the reflex fills the pupil and stops moving — that's neutralization.
            </p>
          </div>

          {/* ===================== RIGHT: CONTROLS ===================== */}
          <div style={s.panelsCol}>
            {/* PATIENT CASE */}
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <h3 style={s.panelTitle}>
                  <span style={{ ...s.panelDot, backgroundColor: colors.amber }} />
                  {practiceMode ? "Patient Case (Hidden)" : "Patient Prescription (Setup Mode)"}
                </h3>
                <div style={s.btnRow}>
                  <button
                    style={{ ...s.chipBtn, ...(practiceMode ? s.chipBtnActive : {}) }}
                    onClick={() => setPracticeMode(true)}
                  >
                    Practice
                  </button>
                  <button
                    style={{ ...s.chipBtn, ...(!practiceMode ? s.chipBtnActive : {}) }}
                    onClick={() => setPracticeMode(false)}
                  >
                    Setup
                  </button>
                </div>
              </div>

              {practiceMode ? (
                gradeResult ? (
                  <div style={s.twoCol}>
                    <div style={s.readoutBox}>
                      <div style={s.readoutLabel}>Actual Sphere</div>
                      <div style={s.readoutValue}>{patientSphere > 0 ? "+" : ""}{patientSphere.toFixed(2)} D</div>
                    </div>
                    <div style={s.readoutBox}>
                      <div style={s.readoutLabel}>Actual Cylinder</div>
                      <div style={s.readoutValue}>{patientCylinder > 0 ? "+" : ""}{patientCylinder.toFixed(2)} D</div>
                    </div>
                    <div style={s.readoutBox}>
                      <div style={s.readoutLabel}>Actual Axis</div>
                      <div style={s.readoutValue}>{patientAxis}°</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ ...s.footNote, margin: "0 0 16px", paddingTop: 0, borderTop: "none" }}>
                      This patient's true prescription is hidden, just like a real exam. Sweep the
                      streak through different meridians, neutralize, and record your findings —
                      then submit your final prescription below to see how you did.
                    </p>
                    <button
                      onClick={handleNewPatientCase}
                      style={{
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
                  </>
                )
              ) : (
                <>
                  <p style={{ ...s.footNote, margin: "0 0 16px", paddingTop: 0, borderTop: "none" }}>
                    Setup mode shows and lets you edit the true Rx directly — useful for building a
                    specific teaching case. Switch back to Practice to test yourself blind.
                  </p>
                  <div style={s.twoCol}>
                    <div style={s.controlRow}>
                      <div style={s.controlLabelRow}>
                        <span style={s.controlLabel}>Sphere</span>
                        <span style={s.controlValue}>
                          {patientSphere > 0 ? "+" : ""}
                          {patientSphere.toFixed(2)} D
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        step="0.25"
                        value={patientSphere}
                        onChange={(e) => setPatientSphere(parseFloat(e.target.value))}
                        style={s.slider}
                      />
                    </div>

                    <div style={s.controlRow}>
                      <div style={s.controlLabelRow}>
                        <span style={s.controlLabel}>Cylinder</span>
                        <span style={s.controlValue}>
                          {patientCylinder > 0 ? "+" : ""}
                          {patientCylinder.toFixed(2)} D
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-6"
                        max="6"
                        step="0.25"
                        value={patientCylinder}
                        onChange={(e) => setPatientCylinder(parseFloat(e.target.value))}
                        style={s.slider}
                      />
                    </div>
                  </div>

                  <div style={s.controlRow}>
                    <div style={s.controlLabelRow}>
                      <span style={s.controlLabel}>Axis</span>
                      <span style={s.controlValue}>{patientAxis}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      step="5"
                      value={patientAxis}
                      onChange={(e) => setPatientAxis(parseInt(e.target.value))}
                      style={s.slider}
                    />
                    <div style={s.scaleRow}>
                      <span>0°</span>
                      <span>90°</span>
                      <span>180°</span>
                    </div>
                  </div>
                </>
              )}

              <div style={{ ...s.controlRow, ...s.controlRowLast, marginTop: "18px" }}>
                <div style={s.controlLabelRow}>
                  <span style={s.controlLabel}>Working Distance</span>
                  <span style={s.controlValue}>{workingDistanceCm} cm</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="1"
                  value={workingDistanceCm}
                  onChange={(e) => setWorkingDistanceCm(parseInt(e.target.value))}
                  style={s.slider}
                />
                <div style={s.scaleRow}>
                  <span>40 cm</span>
                  <span>WD lens: +{workingDistanceLensPower} D</span>
                  <span>100 cm</span>
                </div>
              </div>
            </div>


            {/* RETINOSCOPE CONTROLS */}
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <h3 style={s.panelTitle}>
                  <span style={{ ...s.panelDot, backgroundColor: colors.blue }} />
                  Retinoscope Controls
                </h3>
              </div>

              <div style={s.controlRow}>
                <div style={s.controlLabelRow}>
                  <span style={s.controlLabel}>Streak Axis (Meridian)</span>
                  <span style={s.controlValue}>{streakAxis}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="5"
                  value={streakAxis}
                  onChange={(e) => setStreakAxis(parseInt(e.target.value))}
                  style={s.slider}
                />
                <div style={s.btnRow} >
                  {[0, 45, 90, 135, 180].map((deg) => (
                    <button
                      key={deg}
                      onClick={() => setStreakAxis(deg)}
                      style={{
                        ...s.chipBtn,
                        ...(streakAxis === deg ? s.chipBtnActive : {}),
                        marginTop: "10px",
                      }}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              <div style={s.twoCol}>
                <div style={s.controlRow}>
                  <div style={s.controlLabelRow}>
                    <span style={s.controlLabel}>Brightness</span>
                    <span style={s.controlValue}>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    style={s.slider}
                  />
                </div>

                <div style={s.controlRow}>
                  <div style={s.controlLabelRow}>
                    <span style={s.controlLabel}>Horizontal Sweep</span>
                    <span style={s.controlValue}>{scopeOffset.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={scopeOffset}
                    onChange={(e) => setScopeOffset(parseFloat(e.target.value))}
                    style={s.slider}
                  />
                </div>
              </div>

              <div style={{ ...s.controlRow, ...s.controlRowLast }}>
                <div style={s.controlLabelRow}>
                  <span style={s.controlLabel}>Scope Working Distance</span>
                  <span style={s.controlValue}>{workingDistanceCm} cm</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="1"
                  value={workingDistanceCm}
                  onChange={(e) => setWorkingDistanceCm(parseInt(e.target.value))}
                  style={s.slider}
                />
              </div>
            </div>

            {/* TRIAL LENS */}
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <h3 style={s.panelTitle}>
                  <span style={{ ...s.panelDot, backgroundColor: colors.teal }} />
                  Trial Lens
                </h3>
              </div>

              <div style={s.lensDisplay}>
                <button
                  style={s.lensBtn}
                  onClick={() => adjustTrialLens(-0.25)}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  aria-label="Decrease lens power"
                >
                  −
                </button>
                <div style={s.lensValueWrap}>
                  <div style={s.lensValue}>
                    {trialLens > 0 ? "+" : ""}
                    {trialLens.toFixed(2)}
                  </div>
                  <div style={s.lensValueLabel}>Diopters</div>
                </div>
                <button
                  style={s.lensBtn}
                  onClick={() => adjustTrialLens(0.25)}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  aria-label="Increase lens power"
                >
                  +
                </button>
              </div>

              <button style={s.resetLink} onClick={resetTrialLens}>
                Reset to 0.00 D
              </button>

              <div
                style={{
                  ...s.neutIndicator,
                  backgroundColor: isNeutralized ? "rgba(21,184,154,0.14)" : colors.panelLight,
                  border: `1.5px solid ${isNeutralized ? colors.teal : colors.border}`,
                  color: isNeutralized ? colors.teal : colors.textSecondary,
                  marginTop: "16px",
                }}
              >
                <span style={{ fontSize: "16px" }}>{isNeutralized ? "✓" : "○"}</span>
                {isNeutralized
                  ? `Neutralized at ${streakAxis}° — record this lens power`
                  : `Not neutralized — reflex moving ${reflexState}`}
              </div>

              {isNeutralized && (
                <button
                  onClick={handleRecordMeridian}
                  style={{
                    marginTop: "12px",
                    width: "100%",
                    padding: "11px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: colors.teal,
                    color: "#04120E",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  ✓ Record Meridian at {streakAxis}°
                </button>
              )}
            </div>

            {/* RECORDED MERIDIANS */}
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <h3 style={s.panelTitle}>
                  <span style={{ ...s.panelDot, backgroundColor: colors.blue }} />
                  Recorded Meridians
                </h3>
                <span style={{ fontSize: "12px", color: colors.textMuted }}>
                  {recordedMeridians.length} recorded{recordedMeridians.length < 2 ? " (need 2+)" : ""}
                </span>
              </div>

              {recordedMeridians.length === 0 ? (
                <p style={{ ...s.footNote, margin: 0, paddingTop: 0, borderTop: "none" }}>
                  Neutralize the reflex at two or more different meridians, then click "Record Meridian"
                  above. Real astigmatic refraction needs at least two principal meridians to determine
                  sphere, cylinder, and axis.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {recordedMeridians.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: colors.panelLight,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                        padding: "9px 14px",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ color: colors.textSecondary }}>Meridian {m.axis}°</span>
                      <span style={{ fontWeight: 700, color: colors.white }}>
                        {m.power > 0 ? "+" : ""}
                        {m.power.toFixed(2)} D
                      </span>
                      <button
                        onClick={() => setRecordedMeridians((prev) => prev.filter((_, idx) => idx !== i))}
                        style={{
                          background: "none",
                          border: "none",
                          color: colors.textMuted,
                          cursor: "pointer",
                          fontSize: "16px",
                          lineHeight: 1,
                        }}
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FINAL PRESCRIPTION */}
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <h3 style={s.panelTitle}>
                  <span style={{ ...s.panelDot, backgroundColor: colors.amber }} />
                  Determine Final Prescription
                </h3>
              </div>

              <p style={{ ...s.footNote, margin: "0 0 16px", paddingTop: 0, borderTop: "none" }}>
                Using your recorded meridians, work out the patient's sphere, cylinder, and axis —
                the same way you would convert cross-cylinder retinoscopy findings into a final Rx.
              </p>

              <div style={s.twoCol}>
                <div style={s.controlRow}>
                  <div style={s.controlLabelRow}>
                    <span style={s.controlLabel}>Sphere (D)</span>
                  </div>
                  <input
                    type="number"
                    step="0.25"
                    value={studentSphere}
                    onChange={(e) => setStudentSphere(parseFloat(e.target.value) || 0)}
                    style={{ ...s.slider, height: "38px", padding: "0 10px", color: colors.white, backgroundColor: colors.panelLight, border: `1px solid ${colors.border}` }}
                  />
                </div>
                <div style={s.controlRow}>
                  <div style={s.controlLabelRow}>
                    <span style={s.controlLabel}>Cylinder (D)</span>
                  </div>
                  <input
                    type="number"
                    step="0.25"
                    value={studentCylinder}
                    onChange={(e) => setStudentCylinder(parseFloat(e.target.value) || 0)}
                    style={{ ...s.slider, height: "38px", padding: "0 10px", color: colors.white, backgroundColor: colors.panelLight, border: `1px solid ${colors.border}` }}
                  />
                </div>
              </div>

              <div style={{ ...s.controlRow, ...s.controlRowLast }}>
                <div style={s.controlLabelRow}>
                  <span style={s.controlLabel}>Axis (°)</span>
                </div>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="180"
                  value={studentAxis}
                  onChange={(e) => setStudentAxis(parseInt(e.target.value) || 0)}
                  style={{ ...s.slider, height: "38px", padding: "0 10px", color: colors.white, backgroundColor: colors.panelLight, border: `1px solid ${colors.border}` }}
                />
              </div>

              <button
                onClick={handleSubmitPrescription}
                disabled={recordedMeridians.length < 2 || submitState === "submitting"}
                style={{
                  marginTop: "18px",
                  width: "100%",
                  padding: "13px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: recordedMeridians.length < 2 ? colors.borderLight : colors.blue,
                  color: colors.white,
                  fontWeight: 700,
                  fontSize: "14.5px",
                  cursor: recordedMeridians.length < 2 ? "not-allowed" : "pointer",
                  opacity: submitState === "submitting" ? 0.7 : 1,
                }}
              >
                {submitState === "submitting" ? "Submitting…" : "Submit Prescription for Grading"}
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
                      {gradeResult.passed ? "Within Clinical Tolerance ✓" : "Outside Clinical Tolerance"}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: "20px", color: colors.white }}>{gradeResult.score}/100</span>
                  </div>

                  {[
                    { label: "Sphere", ok: gradeResult.componentResults.sphereOk, error: gradeResult.componentResults.sphereError, unit: "D" },
                    { label: "Cylinder", ok: gradeResult.componentResults.cylinderOk, error: gradeResult.componentResults.cylinderError, unit: "D" },
                    { label: "Axis", ok: gradeResult.componentResults.axisOk, error: gradeResult.componentResults.axisError, unit: "°" },
                  ].map((row) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px" }}>
                      <span style={{ color: colors.textSecondary }}>{row.label}</span>
                      <span style={{ color: row.ok ? colors.teal : colors.red, fontWeight: 700 }}>
                        {row.ok ? "✓ Correct" : `Off by ${Math.abs(row.error).toFixed(row.unit === "D" ? 2 : 0)}${row.unit}`}
                      </span>
                    </div>
                  ))}

                  <button
                    onClick={handleNewPatientCase}
                    style={{
                      marginTop: "16px",
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

      <style>{`
        @keyframes sweepRight {
          0% { margin-left: -10px; }
          100% { margin-left: 10px; }
        }
        @keyframes sweepLeft {
          0% { margin-left: 10px; }
          100% { margin-left: -10px; }
        }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #15B89A;
          cursor: pointer;
          border: 2px solid #070B14;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #15B89A;
          cursor: pointer;
          border: 2px solid #070B14;
        }
        @media (max-width: 880px) {
          .opto-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}