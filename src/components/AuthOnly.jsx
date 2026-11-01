import { useAuth } from "../context/AuthContext";

/* Menampilkan isinya hanya saat pengguna sudah masuk.
   Selama sesi masih diperiksa, tidak menampilkan apa pun (agar tidak berkedip).
   Contoh: <AuthOnly><Navbar /></AuthOnly> */
export default function AuthOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return children;
}