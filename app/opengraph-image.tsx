import { ImageResponse } from "next/og";
export const alt = "Ardi — Full Stack Developer. Building | Debugging | Improving.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "#080c17", color: "#f7f9fc", width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, borderLeft: "12px solid #c67ce8" }}>
      <div style={{ fontSize: 28, color: "#c67ce8", marginBottom: 42 }}>mohammadardi.online</div>
      <div style={{ fontSize: 90, fontWeight: 700 }}>Hi, I’m Ardi</div>
      <div style={{ fontSize: 36, color: "#bbc5d8", marginTop: 26 }}>Building | Debugging | Improving</div>
      <div style={{ fontSize: 26, color: "#c67ce8", marginTop: 54 }}>Full Stack Developer</div>
    </div>, size,
  );
}
