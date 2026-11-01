import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authErrorMessage } from "../utils/authMessages";
import bg from "../assets/bg.jpg";
import logo from "../assets/logo.svg";

const MIN_PASSWORD = 8;

export default function RegisterPage() {
  const { user, loading, signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && !needsConfirmation) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!name.trim()) return setError("Isi nama lengkap.");
    if (!email.trim()) return setError("Isi email.");
    if (password.length < MIN_PASSWORD) {
      return setError(`Kata sandi minimal ${MIN_PASSWORD} karakter.`);
    }
    if (password !== confirm) return setError("Konfirmasi kata sandi tidak sama.");

    setSubmitting(true);
    const { data, error: signUpError } = await signUp(name.trim(), email.trim(), password);
    setSubmitting(false);

    if (signUpError) {
      setError(authErrorMessage(signUpError));
      return;
    }

    // Email yang sudah terdaftar: Supabase tidak memberi error, tetapi identities kosong
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError("Email ini sudah terdaftar. Silakan masuk.");
      return;
    }

    // Tanpa sesi = proyek mewajibkan konfirmasi email
    if (!data.session) {
      setNeedsConfirmation(true);
      return;
    }

    navigate("/", { replace: true });
  }

  if (needsConfirmation) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <img className="auth-logo" src={logo} alt="bg Sulawesi Tailor" />
          <h1>Periksa email Anda</h1>
          <p className="auth-sub">
            Kami mengirim tautan konfirmasi ke <strong>{email}</strong>. Buka email tersebut,
            lalu masuk dengan akun Anda.
          </p>
          <Link to="/masuk" className="auth-submit auth-link-button">
            Ke halaman masuk
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <img className="auth-logo" src={logo} alt="bg Sulawesi Tailor" />
        <h1>Daftar</h1>
        <p className="auth-sub">Buat akun untuk menyimpan pelanggan dan desain rok.</p>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <label className="auth-field">
          Nama lengkap
          <input
            type="text"
            autoComplete="name"
            value={name}
            disabled={submitting}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

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
              autoComplete="new-password"
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
          <span className="auth-hint">Minimal {MIN_PASSWORD} karakter.</span>
        </label>

        <label className="auth-field">
          Ulangi kata sandi
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            disabled={submitting}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? "Memproses..." : "Daftar"}
        </button>

        <p className="auth-switch">
          Sudah punya akun? <Link to="/masuk">Masuk</Link>
        </p>
      </form>
    </main>
  );
}