/* Mengubah pesan error Supabase Auth menjadi bahasa Indonesia. */
export function authErrorMessage(error) {
  const msg = String(error?.message ?? "").toLowerCase();

  if (msg.includes("invalid login credentials")) return "Email atau kata sandi salah.";
  if (msg.includes("email not confirmed")) return "Email belum dikonfirmasi. Cek kotak masuk email Anda.";
  if (msg.includes("user already registered")) return "Email ini sudah terdaftar. Silakan masuk.";
  if (msg.includes("password should be at least")) return "Kata sandi terlalu pendek.";
  if (msg.includes("unable to validate email") || msg.includes("invalid email")) return "Format email tidak valid.";
  if (msg.includes("rate limit") || msg.includes("for security purposes")) {
    return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
  }
  return error?.message || "Terjadi kesalahan. Coba lagi.";
}