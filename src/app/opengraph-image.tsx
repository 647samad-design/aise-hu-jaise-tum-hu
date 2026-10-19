import { ImageResponse } from "next/og";

export const alt = "1Rupya — lucky draws from PKR 1";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#103f34", color: "#faf8ed", padding: 72, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 64, borderRadius: "16px 4px 16px 4px", background: "#e8cf94", color: "#103f34", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>1</div>
            <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -2 }}>Rupya</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -3 }}>A little rupya.</div>
            <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -3, color: "#e8cf94" }}>Big possibilities.</div>
            <div style={{ fontSize: 28, color: "#c5d2c7", marginTop: 28 }}>Tickets from PKR 1 · EasyPaisa & JazzCash · Verifiable winners</div>
          </div>
        </div>
        <div style={{ position: "absolute", right: 90, top: 140, width: 330, height: 360, borderRadius: 22, background: "linear-gradient(120deg,#f4e4ba,#d5b875)", color: "#244638", display: "flex", flexDirection: "column", padding: 32, transform: "rotate(-9deg)", boxShadow: "30px 40px 60px rgba(7,29,43,.45)" }}>
          <div style={{ fontSize: 18, letterSpacing: 4, fontWeight: 700 }}>1RUPYA</div>
          <div style={{ fontSize: 14, letterSpacing: 4, marginTop: 40 }}>FROM PKR</div>
          <div style={{ display: "flex", alignItems: "flex-end", fontSize: 150, lineHeight: 1, letterSpacing: -8 }}>1<span style={{ fontSize: 50 }}>.00</span></div>
          <div style={{ marginTop: "auto", borderTop: "2px dashed rgba(36,70,56,.4)", paddingTop: 16, fontSize: 13, letterSpacing: 3 }}>YOUR POSSIBILITY STARTS HERE</div>
        </div>
      </div>
    ),
    size,
  );
}
