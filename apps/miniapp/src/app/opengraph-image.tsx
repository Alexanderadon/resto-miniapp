import { ImageResponse } from "next/og";

export const alt = "Апорт — кафе в Алматы. Заказ в Telegram";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #C2410C 0%, #A83A0B 100%)",
          color: "#FFFFFF",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, marginBottom: 24 }}>Апорт</div>
        <div style={{ fontSize: 40, opacity: 0.92, marginBottom: 12 }}>
          Кафе в Алматы — заказ прямо в Telegram
        </div>
        <div style={{ fontSize: 28, opacity: 0.75 }}>
          меню ・ корзина ・ самовывоз ・ подтверждение ботом
        </div>
      </div>
    ),
    size,
  );
}
