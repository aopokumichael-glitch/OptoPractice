import { useState, useMemo, useCallback } from "react";

export default function RetinoscopySimulator() {
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
    const principal = Math.abs(((streakAxis - patientAxis + 90) % 180) - 90) < 5;
    return principal ? "Near a principal meridian" : "Off-axis meridian";
  }, [streakAxis, patientAxis]);

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
            Set a patient prescription, sweep the streak through different meridians, and dial in trial
            lenses to find the neutralization point — just like real streak retinoscopy.
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
            {/* PATIENT PRESCRIPTION */}
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <h3 style={s.panelTitle}>
                  <span style={{ ...s.panelDot, backgroundColor: colors.amber }} />
                  Patient Prescription (Ground Truth)
                </h3>
              </div>

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

              <div style={{ ...s.controlRow, ...s.controlRowLast }}>
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