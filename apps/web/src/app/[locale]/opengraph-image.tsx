import { ImageResponse } from "next/og";

export const alt = "myvisa — visas and travel documents from Riyadh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default share card for every page that doesn't bring its own image (destinations and guides use their
 * photos). Latin text only: the OG renderer can't shape Arabic, and broken Arabic is worse than English.
 */
export default function OgImage() {
  const gold = "#C8A24A";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#08131F",
          backgroundImage: "radial-gradient(circle at 15% 10%, rgba(15,94,90,0.75), transparent 55%), radial-gradient(circle at 90% 95%, rgba(200,162,74,0.35), transparent 50%)",
          color: "#F7F3EC",
          fontFamily: "sans-serif",
          padding: "72px 80px",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Route arc RUH → the world */}
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", inset: 0 }}>
          <path d="M 900 540 Q 960 330 1120 300" fill="none" stroke={gold} strokeWidth="3" strokeDasharray="10 12" opacity="0.8" />
          <circle cx="900" cy="540" r="9" fill={gold} />
          <circle cx="1120" cy="300" r="7" fill="#5FB3AC" />
        </svg>
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 64, letterSpacing: -1 }}>
          <span style={{ color: gold, fontStyle: "italic" }}>my</span>
          <span>visa</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
          <div style={{ fontSize: 66, lineHeight: 1.05, fontWeight: 600, letterSpacing: -2 }}>Visas and travel documents, done right.</div>
          <div style={{ fontSize: 28, color: "rgba(247,243,236,0.7)" }}>Transparent fees · Every step tracked · Riyadh</div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 90,
            top: 70,
            width: 190,
            height: 190,
            borderRadius: 999,
            border: `5px solid ${gold}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-12deg)",
            color: gold,
          }}
        >
          <span style={{ fontSize: 16, letterSpacing: 4 }}>DEPARTURE</span>
          <span style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.1 }}>RUH</span>
          <span style={{ fontSize: 16, letterSpacing: 4 }}>MYVISA</span>
        </div>
      </div>
    ),
    size,
  );
}
