import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Song } from "../types/song";

export async function pickLocalSongs(): Promise<Song[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];

  const files = result.assets ?? [];
  return files.map((f) => ({
    id: `local:${f.uri}`,
    title: stripExt(f.name ?? "Unknown"),
    artist: "Local file",
    url: f.uri,
    source: "local" as const,
  }));
}

function stripExt(name: string): string {
  return name.replace(/\.[^/.]+$/, "");
}

export async function ensureLocalCached(uri: string): Promise<string> {
  if (uri.startsWith("file://")) return uri;
  return uri;
}
