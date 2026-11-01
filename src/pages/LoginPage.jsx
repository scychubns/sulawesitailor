import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authErrorMessage } from "../utils/authMessages";
import bg from "../assets/bg.jpg";
import logo from "../assets/logo.svg";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tujuan setelah masuk: halaman yang tadi dibuka, atau beranda
  const from = location.state?.from;
  const target = from ? `${from.pathname}${from.search ?? ""}` : "/";

  if (!loading && user) return <Navigate to={target} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Isi email dan kata sandi.");
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (signInError) {
      setError(authErrorMessage(signInError));
      return;
    }
    navigate(target, { replace: true });
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <img className="auth-logo" src={logo} alt="Logo Sulawesi Tailor" />
        <h1>Masuk</h1>
        <p className="auth-sub">Masuk untuk mengelola pelanggan dan desain rok.</p>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <label className="auth-field">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            disabled={submitting}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            required
          />
        </label>

        <label className="auth-field">
          Kata sandi
          <div className="auth-password">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              disabled={submitting}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="auth-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
            >
              {showPassword ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>
        </label>

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? "Memproses..." : "Masuk"}
        </button>

        <p className="auth-switch">
          Belum punya akun? <Link to="/daftar">Daftar</Link>
        </p>
      </form>
    </main>
  );
}