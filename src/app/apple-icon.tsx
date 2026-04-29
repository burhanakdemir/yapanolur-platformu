import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Safari / iOS ana ekran için PNG; `icon.svg` ile aynı görsel dil. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
          borderRadius: 39,
        }}
      >
        <svg width="112" height="112" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M18 40L30 22L38 34L44 26L50 40H18Z"
            fill="white"
            fillOpacity="0.95"
          />
          <circle cx="22" cy="20" r="4" fill="white" fillOpacity="0.95" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
