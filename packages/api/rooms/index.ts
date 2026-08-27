export function generateRoomCode(): string {
  const code = Math.floor(1000 + Math.random() * 9000);
  return `AP-${code}`;
}
