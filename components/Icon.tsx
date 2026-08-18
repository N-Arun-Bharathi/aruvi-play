import React from "react";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";

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
  | "chevron-right"
  | "more"
  | "music"
  | "plus"
  | "list"
  | "clock"
  | "folder"
  | "profile"
  | "share"
  | "lyrics"
  | "drag-handle"
  | "phone"
  | "lock"
  | "unlock"
  | "arrow-left"
  | "settings"
  | "trash"
  | "edit"
  | "close"
  | "image"
  | "room"
  | "queue"
  | "check"
  | "eye"
  | "eye-off"
  | "alert"
  | "sun"
  | "moon";

export function Icon({ name, size = 24, color = "#FFFFFF" }: Props) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none" };
  switch (name) {
    case "phone":
      return (
        <Svg {...props}>
          <Path
            d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "lock":
      return (
        <Svg {...props}>
          <Path
            d="M12 2a5 5 0 00-5 5v4H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 5a3 3 0 016 0v4H9V7zm3 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
            fill={color}
          />
        </Svg>
      );
    case "chevron-right":
      return (
        <Svg {...props}>
          <Path
            d="M9 18l6-6-6-6"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "profile":
      return (
        <Svg {...props}>
          <Path
            d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "share":
      return (
        <Svg {...props}>
          <Path
            d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "lyrics":
      return (
        <Svg {...props}>
          <Path
            d="M9 12h6M9 16h6M5 8h14M5 4h14M3 20h18"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
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
    case "list":
      return (
        <Svg {...props}>
          <Path
            d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "clock":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
          <Path d="M12 7v5l3 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "plus":
      return (
        <Svg {...props}>
          <Path
            d="M12 5v14M5 12h14"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
    case "drag-handle":
      return (
        <Svg {...props}>
          <Circle cx="9" cy="5" r="1.5" fill={color} />
          <Circle cx="9" cy="12" r="1.5" fill={color} />
          <Circle cx="9" cy="19" r="1.5" fill={color} />
          <Circle cx="15" cy="5" r="1.5" fill={color} />
          <Circle cx="15" cy="12" r="1.5" fill={color} />
          <Circle cx="15" cy="19" r="1.5" fill={color} />
        </Svg>
      );
    case "arrow-left":
      return (
        <Svg {...props}>
          <Path
            d="M19 12H5M12 19l-7-7 7-7"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "settings":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
          <Path
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "trash":
      return (
        <Svg {...props}>
          <Path
            d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "edit":
      return (
        <Svg {...props}>
          <Path
            d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "close":
      return (
        <Svg {...props}>
          <Path
            d="M18 6L6 18M6 6l12 12"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "image":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
          <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} />
          <Path
            d="M12 15c-4 0-6 2-6 2v.5a.5.5 0 00.5.5h11a.5.5 0 00.5-.5V17s-2-2-6-2z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "check":
      return (
        <Svg {...props}>
          <Path
            d="M20 6L9 17l-5-5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "room":
      return (
        <Svg {...props}>
          <Path
            d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "queue":
      return (
        <Svg {...props}>
          <Path
            d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "eye":
      return (
        <Svg {...props}>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "sun":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "moon":
      return (
        <Svg {...props}>
          <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "unlock":
      return (
        <Svg {...props}>
          <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M7 11V7a5 5 0 019.9-1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "eye-off":
      return (
        <Svg {...props}>
          <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "alert":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="12" y1="16" x2="12.01" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
  }
}

