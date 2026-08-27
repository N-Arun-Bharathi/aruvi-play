import { Song } from "../types/song";

export interface SongContext {
  language: string;
  energy: "high" | "medium" | "low";
  type: "item" | "melody" | "folk" | "gaana" | "sad" | "theme" | "unknown";
  mood: "dance" | "romantic" | "spiritual" | "chill" | "intense" | "unknown";
  keywords: string[];
}

const KEYWORDS = {
  item: ["mama", "item", "dance", "mass", "kuthu", "dappan", "mela", "rowdy", "vaathi", "arabic", "donu"],
  melody: ["melody", "kanmani", "vizhi", "anbe", "kadhal", "love", "romance", "thaensudare", "minnal"],
  gaana: ["gaana", "local", "slum", "chennai", "pullingo"],
  folk: ["folk", "thiruvizha", "gramathu", "village", "oora", "man", "mannu"],
  sad: ["sad", "breakup", "pain", "kanneer", "tholai", "pirivu", "vali"],
  theme: ["theme", "bgm", "instrumental", "intro"],
};

export function detectSongContext(song: Song): SongContext {
  const title = song.title.toLowerCase();
  const artist = song.artist.toLowerCase();
  const fullText = `${title} ${artist}`;

  const context: SongContext = {
    language: "tamil",
    energy: "medium",
    type: "unknown",
    mood: "unknown",
    keywords: [],
  };

  for (const [type, keys] of Object.entries(KEYWORDS)) {
    if (keys.some(k => fullText.includes(k))) {
      context.type = type as any;
      context.keywords.push(...keys.filter(k => fullText.includes(k)));
      break;
    }
  }

  if (context.type === "item" || context.type === "gaana") {
    context.energy = "high";
    context.mood = "dance";
  } else if (context.type === "melody" || context.type === "sad") {
    context.energy = "low";
    context.mood = context.type === "melody" ? "romantic" : "chill";
  } else if (context.type === "theme") {
    context.energy = "high";
    context.mood = "intense";
  }

  return context;
}

export function buildSmartQuery(context: SongContext, originalSong: Song): string {
  const base = originalSong.artist.split(/[;,]/)[0].trim();
  let query = `${base} ${context.type !== "unknown" ? context.type : ""} tamil songs`;
  
  if (context.type === "item") {
    query = "tamil high energy kuthu item songs dance";
  } else if (context.type === "melody") {
    query = "tamil melody love romantic hits";
  } else if (context.type === "gaana") {
    query = "tamil gaana local kuthu songs";
  } else if (context.type === "sad") {
    query = "tamil sad breakup melody songs";
  }

  return query;
}
