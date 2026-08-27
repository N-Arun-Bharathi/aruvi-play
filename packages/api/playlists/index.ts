export function createPlaylistMock(name: string) {
  return { id: `pl_${Date.now()}`, name, songs: [] };
}
