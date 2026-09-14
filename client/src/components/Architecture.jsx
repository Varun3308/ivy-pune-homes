import React from "react";
export default function Architecture({ seed = 0, large = false }) {
  const palettes = [
    ["#e6e8dd", "#bdc9bc", "#e9e0cf", "#b2a492"],
    ["#e5e1d5", "#c7ccbd", "#eee5d9", "#b7a18e"],
    ["#dce7e3", "#b9cbbf", "#e6d9c4", "#a89a84"],
    ["#ece3d6", "#cdd0b6", "#eedccb", "#b9a496"],
  ];
  const [sky, backdrop, wall, shadow] = palettes[seed % 4];
  return (
    <svg
      className={`architecture ${large ? "large" : ""}`}
      viewBox="0 0 600 350"
      role="img"
      aria-label="Architectural illustration, not a photograph of this property"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="600" height="350" fill={sky} />
      <circle cx="475" cy="69" r="38" fill="#fbf6e7" opacity=".85" />
      <path
        d="M0 218 Q80 125 173 209 Q265 100 370 190 Q450 118 600 185 V350 H0Z"
        fill={backdrop}
      />
      <path
        d="M25 250V145H85V120H142V250M440 250V156H493V138H554V250"
        fill={shadow}
        opacity=".22"
      />
      <path d="M129 283V76L335 57V283Z" fill={wall} />
      <path d="M335 57L425 94V283H335Z" fill={shadow} />
      <path d="M117 77L336 53L437 93L425 101L335 68L129 88Z" fill="#f6f0e5" />
      {[0, 1, 2, 3].map((row) => (
        <g key={row}>
          {[0, 1, 2, 3].map((col) => (
            <g key={col}>
              <rect
                x={149 + col * 46}
                y={103 + row * 42}
                width="28"
                height="28"
                fill={col % 2 ? "#70887d" : "#567267"}
              />
              <rect
                x={153 + col * 46}
                y={106 + row * 42}
                width="9"
                height="22"
                fill="#a6b6a0"
                opacity=".55"
              />
            </g>
          ))}
          <path
            d={`M137 ${136 + row * 42}L331 ${125 + row * 42}V${133 + row * 42}L137 ${145 + row * 42}Z`}
            fill="#f9f3e9"
          />
          <path
            d={`M348 ${102 + row * 42}L409 ${123 + row * 42}V${149 + row * 42}L348 ${129 + row * 42}Z`}
            fill="#5d766a"
          />
          <path
            d={`M338 ${133 + row * 42}L421 ${161 + row * 42}V${167 + row * 42}L338 ${139 + row * 42}Z`}
            fill="#d6c9b5"
          />
        </g>
      ))}
      <rect x="204" y="258" width="56" height="43" fill="#4b6259" />
      <path d="M0 297Q181 277 600 300V350H0Z" fill="#abb69a" />
      <path d="M205 299L260 298L314 350H157Z" fill="#d7cbb6" />
      {[70, 104, 459, 505, 550].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 305v-56`} stroke="#66735c" strokeWidth="5" />
          <ellipse
            cx={x}
            cy={247 - (i % 2) * 22}
            rx={22 + (i % 2) * 8}
            ry={39 + (i % 2) * 8}
            fill={i % 2 ? "#6d8768" : "#809674"}
          />
          <path
            d={`M${x} 281v-39`}
            stroke="#b7c2a1"
            strokeWidth="2"
            opacity=".6"
          />
        </g>
      ))}
      <path
        d="M0 327Q70 311 155 326M352 323Q480 305 600 326"
        fill="none"
        stroke="#8e9e7e"
        strokeWidth="14"
      />
    </svg>
  );
}
