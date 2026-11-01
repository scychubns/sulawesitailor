export const formatTimeStamp = (timeStamp) => {
  if (!timeStamp) return "-";

  const date = new Date(timeStamp);

  const tanggal = date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const waktu = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${tanggal} ${waktu}`;
};