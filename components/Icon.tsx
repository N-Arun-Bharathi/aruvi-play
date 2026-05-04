import React from "react";
import Svg, { Path, Circle } from "react-native-svg";

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

export type IconName =
  | "play"
  | "pause"
  | "next"
  | "prev"
  | "shuffle"
  | "repeat"
  | "repeat-one"
  | "search"
  | "home"
  | "library"
  | "heart"
  | "heart-filled"
  | "chevron-down"
  | "more"
  | "music"
  | "folder";

export function Icon({ name, size = 24, color = "#FFFFFF" }: Props) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none" };
  switch (name) {
    case "play":
      return (
        <Svg {...props}>
          <Path d="M6 4l14 8-14 8V4z" fill={color} />
        </Svg>
      );
    case "pause":
      return (
        <Svg {...props}>
          <Path d="M6 4h4v16H6zM14 4h4v16h-4z" fill={color} />
        </Svg>
      );
    case "next":
      return (
        <Svg {...props}>
          <Path d="M5 4l11 8-11 8V4zM18 4h2v16h-2z" fill={color} />
        </Svg>
      );
    case "prev":
      return (
        <Svg {...props}>
          <Path d="M19 4L8 12l11 8V4zM4 4h2v16H4z" fill={color} />
        </Svg>
      );
    case "shuffle":
      return (
        <Svg {...props}>
          <Path
            d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "repeat":
      return (
        <Svg {...props}>
          <Path
            d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "repeat-one":
      return (
        <Svg {...props}>
          <Path
            d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3M11 15v-6l-2 1"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "search":
      return (
        <Svg {...props}>
          <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} />
          <Path d="M21 21l-4.3-4.3" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case "home":
      return (
        <Svg {...props}>
          <Path
            d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "library":
      return (
        <Svg {...props}>
          <Path
            d="M3 4h4v16H3zM10 4h4v16h-4zM17 6l4 14-4 1z"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "heart":
      return (
        <Svg {...props}>
          <Path
            d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 000-7.8z"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "heart-filled":
      return (
        <Svg {...props}>
          <Path
            d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 000-7.8z"
            fill={color}
          />
        </Svg>
      );
    case "chevron-down":
      return (
        <Svg {...props}>
          <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "more":
      return (
        <Svg {...props}>
          <Circle cx="5" cy="12" r="1.5" fill={color} />
          <Circle cx="12" cy="12" r="1.5" fill={color} />
          <Circle cx="19" cy="12" r="1.5" fill={color} />
        </Svg>
      );
    case "music":
      return (
        <Svg {...props}>
          <Path
            d="M9 18V5l12-2v13"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth={2} />
          <Circle cx="18" cy="16" r="3" stroke={color} strokeWidth={2} />
        </Svg>
      );
    case "folder":
      return (
        <Svg {...props}>
          <Path
            d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      );
  }
}
