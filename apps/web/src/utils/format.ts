export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return "";
  }
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
