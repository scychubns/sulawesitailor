import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* Membungkus halaman yang butuh login. Belum masuk -> diarahkan ke /masuk,
   lalu dikembalikan ke halaman semula (termasuk ?edit=... atau ?view=...). */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="auth-loading">Memuat...</p>;
  if (!user) return <Navigate to="/masuk" replace state={{ from: location }} />;

  return children ?? <Outlet />;
}