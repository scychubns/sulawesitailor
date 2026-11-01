import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.svg";

const menus = [
  { path: "/konfigurasi", label: "Konfigurasi Desain 2D" },
  { path: "/pelanggan", label: "Daftar Pelanggan" },
];

export default function Navbar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await signOut();
    setSigningOut(false);

    if (error) {
      alert(`Gagal keluar: ${error.message}`);
      return;
    }
    // replace: halaman sebelumnya tidak ikut tersimpan sebagai tujuan setelah masuk lagi
    navigate("/masuk", { replace: true });
  }

  return (
    <nav className="navbar" aria-label="Navigasi utama">
      <div className="navbar-inner">
        <div className="brand">
          <div className="brand-icon">
            <NavLink to="/" end>
              <img src={logo} alt="Logo Sulawesi Tailor" />
            </NavLink>
          </div>
        </div>

        <div className="nav-menu">
          {menus.map((menu) => (
            <NavLink
              key={menu.path}
              to={menu.path}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {menu.label}
            </NavLink>
          ))}

          <button
            type="button"
            className="nav-link nav-logout"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{ background: "none", border: "none", font: "inherit", cursor: "pointer", color: "red"}}
          >
            {signingOut ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </div>
    </nav>
  );
}