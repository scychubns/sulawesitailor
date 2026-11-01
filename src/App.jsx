import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { supabase } from "./lib/supabase";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import ConfigurationPage from "./pages/ConfigurationPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerDesign from "./pages/CustomerDesign";
import DesignDetailPage from "./pages/DesignDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthOnly from "./components/AuthOnly";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  createDefaultDesign,
  createEmptyMeasurements,
  getCustomers,
  getDesigns,
  getDesignById,
  getCustomerById,
  getDesignCount,
  saveDesignToDatabase,
} from "./services/designServices.js";

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const params = new URLSearchParams(location.search);
  const isViewMode = params.has("view");

  const [designId, setDesignId] = useState(null);
  const [designTitle, setDesignTitle] = useState("");
  const [totalDesain, setTotalDesain] = useState(0);

  const [customer, setCustomer] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [hasEditedConfiguration, setHasEditedConfiguration] = useState(false);
  const [design, setDesign] = useState(createDefaultDesign);
  const [measurements, setMeasurements] = useState(
    createEmptyMeasurements
  );
  const [status, setStatus] = useState("Draft");
  const [savedDesigns, setSavedDesigns] = useState([]);

  const listCustomer = customers.map((item) => item.name);

  // Navigasi halaman
  function handleNavigate(page) {
    const paths = {
      beranda: "/",
      konfigurasi: "/konfigurasi",
      pelanggan: "/pelanggan",
    };

    navigate(paths[page] || "/");
  }

  // Menghitung total desain berdasarkan pelanggan
  async function fetchTotalDesain() {
    const { data, error } = await supabase
      .from("saved_designs")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Gagal menghitung id:", error);
      throw error;
    }
    const lastId = data?.id ?? 0;
    return Number(lastId) ?? 0;
  }

  // Reset formulir untuk membuat desain baru
  function resetNewDesign() {
    setDesignId(null);
    setDesign(createDefaultDesign());
    setMeasurements(createEmptyMeasurements());
    setStatus("Draft");
    setDesignTitle("");
    setHasEditedConfiguration(false);
  }

  // Memuat satu desain berdasarkan ID database
  async function loadDesignForEdit(id) {
    try {
      const data = await getDesignById(id);
      const customerData = await getCustomerById(
        data.customer_id
      );

      setDesignId(data.id);
      setDesignTitle(data.title || "Desain");
      setCustomerId(data.customer_id);
      setCustomer(customerData?.name || data.customer || "");

      setDesign({
        ...createDefaultDesign(),
        ...(data.design ?? {}),
      });

      setMeasurements({
        ...createEmptyMeasurements(),
        ...(data.measurements ?? {}),
      });

      setStatus(data.status || "Draft");
      setTotalDesain(
        await getDesignCount(data.customer_id)
      );
    } catch (error) {
      console.error("Gagal memuat desain:", error.message);
      alert("Desain tidak dapat dimuat.");
    }
  }

  // Memuat daftar pelanggan dan seluruh desain tersimpan.
  // Hanya setelah login; dikosongkan saat keluar agar data tidak tersisa untuk akun lain.
  useEffect(() => {
    if (!user) {
      setCustomers([]);
      setSavedDesigns([]);
      setCustomer("");
      setCustomerId(null);
      resetNewDesign();
      return undefined;
    }

    let cancelled = false;

    async function loadCustomers() {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error(
          "Gagal mengambil pelanggan:",
          error.message
        );
        return;
      }

      if (!cancelled) {
        setCustomers(data ?? []);
      }
    }

    async function loadDesigns() {
      const { data, error } = await supabase
        .from("saved_designs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error(
          "Gagal mengambil data desain:",
          error.message
        );
        return;
      }

      if (cancelled) return;

      setSavedDesigns(
        (data ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          customer: item.customer,
          customerId: item.customer_id,
          design: item.design,
          measurements: item.measurements,
          status: item.status,
          date: item.created_at
            ? new Date(item.created_at).toLocaleDateString(
                "id-ID"
              )
            : "",
        }))
      );
    }

    loadCustomers();
    loadDesigns();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  useEffect(() => {
    async function loadNewDesignTitle() {
      if (!user) return;

      const params = new URLSearchParams(location.search);

      // Jangan mengubah judul ketika sedang mengedit desain.
      if (params.has("edit") || designId) return;

      // Hanya jalankan untuk halaman konfigurasi.
      if (location.pathname !== "/konfigurasi") return;

      try {
        const lastId = await fetchTotalDesain();

        setDesignTitle(`Desain ${lastId + 1}`);
      } catch (error) {
        console.error("Gagal menentukan judul desain:", error);
      }
    }

    loadNewDesignTitle();
  }, [location.pathname, location.search, designId, user?.id]);

  // Memproses URL ketika konfigurasi dibuka
  useEffect(() => {
    if (!user) return;
    if (location.pathname !== "/konfigurasi") return;

    let cancelled = false;
    const params = new URLSearchParams(location.search);
    const id = params.get("edit");
    const viewId = params.get("view");

    async function loadPage() {
      const selectedCustomerId = params.get("customerId");
      if (viewId) {
        await loadDesignForEdit(viewId);
        return;
      }
      try {
        if (id) {
          // Membuka desain tertentu untuk diedit
          await loadDesignForEdit(id);
          return;
        }

        if (selectedCustomerId) {
          // Membuat desain baru untuk pelanggan tertentu
          const { data, error } = await supabase
            .from("customers")
            .select("id, name")
            .eq("id", selectedCustomerId)
            .single();
          if (error) {
            console.error("Gagal memuat pelanggan:", error);
            return;
          }
          if (cancelled) return;

          resetNewDesign();
          setCustomerId(data.id);
          setCustomer(data.name);
          // await fetchTotalDesain(data.id);
          return;
        }

        // Membuka konfigurasi kosong
        // if (cancelled) return;

        resetNewDesign();
        setCustomer("");
        setCustomerId(null);
        // setTotalDesain(0);
        // setMeasurements(createEmptyMeasurements());
        // setDesignTitle(null);
      } 
      
      catch (error) {
        if (!cancelled) {
          console.error("Gagal membuka konfigurasi:", error);
        }
      }
      
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, user?.id]);

  // Memilih pelanggan
  async function handleSelectCustomer(name) {
    const selectedCustomer = customers.find(
      (item) => item.name === name
    );

    setCustomer(name);
    setCustomerId(selectedCustomer?.id ?? null);
    // resetNewDesign();

    if (!selectedCustomer) {
      setTotalDesain(0);
      setDesignTitle("Desain 1");
      setMeasurements(createEmptyMeasurements());
      return;
    }

    try {
      await fetchTotalDesain(selectedCustomer.id);

      const { data, error } = await supabase
        .from("saved_designs")
        .select("measurements")
        .eq("customer_id", selectedCustomer.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setMeasurements({
        ...createEmptyMeasurements(),
        ...(data?.measurements ?? {}),
      });
    } catch (error) {
      console.error(
        "Gagal mengambil data pelanggan:",
        error.message
      );
    }
  }
  
  async function handleCustomerChange(customerName) {
    if (!customerName) return;

    const selectedCustomer = customers.find(
      (item) => item.name === customerName
    );

    if (!selectedCustomer) return;

    // Selalu perbarui identitas pelanggan.
    setCustomer(selectedCustomer.name);
    setCustomerId(selectedCustomer.id);

    // Jika konfigurasi sudah diubah, pertahankan semua isian.
    if (hasEditedConfiguration) {
  try {
    const { data, error } = await supabase
      .from("saved_designs")
      .select("measurements")
      .eq("customer_id", selectedCustomer.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    // Hanya mengganti ukuran pelanggan.
    // Desain, judul, warna, dan motif tetap dipertahankan.
    if (data?.measurements) {
      setMeasurements({
        ...createEmptyMeasurements(),
        ...data.measurements,
      });
    }

    return;
  } catch (error) {
    console.error("Gagal memuat ukuran pelanggan:", error);
    alert(`Gagal memuat ukuran pelanggan: ${error.message}`);
    return;
  }
}

    try {
      // Ambil desain terakhir milik pelanggan.
      const { data, error } = await supabase
        .from("saved_designs")
        .select("*")
        .eq("customer_id", selectedCustomer.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDesignId(null);

        setDesign({
          ...createDefaultDesign(),
          ...(data.design ?? {}),
          motifFile: null,
        });

        setMeasurements({
          ...createEmptyMeasurements(),
          ...(data.measurements ?? {}),
        });

        setDesignTitle(data.title || "");
        setStatus("Draft");
      } else {
        // Pelanggan belum mempunyai desain tersimpan.
        setDesignId(null);
        setDesign(createDefaultDesign());
        setMeasurements(createEmptyMeasurements());
        setStatus("Draft");

        const lastId = await fetchTotalDesain();
        setDesignTitle(`Desain ${lastId + 1}`);
      }
    } catch (error) {
      console.error("Gagal memuat desain pelanggan:", error);
      alert(`Gagal memuat desain: ${error.message}`);
    }
  }

  // Menambahkan pelanggan baru
  async function handleAddCustomer(name) {
    const cleanName = name.trim();

    if (!cleanName) {
      alert("Masukkan nama pelanggan.");
      return;
    }

    const existingCustomer = customers.find(
      (item) =>
        item.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (existingCustomer) {
      await handleCustomerChange(existingCustomer.name);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("customers")
        .insert([{ name: cleanName }])
        .select("id, name")
        .single();
      if (error) throw error;

      setCustomers((current) =>
        [...current, data].sort((a, b) =>
          a.name.localeCompare(b.name, "id")
        )
      );

      setCustomer(data.name);
      setCustomerId(data.id);
      alert("Pelanggan berhasil ditambahkan.");
    } catch (error) {
      console.error("Gagal menambahkan pelanggan:", error);
      alert(`Pelanggan gagal ditambahkan: ${error.message}`);
    }
  }

  // Mengubah pilihan desain
  function updateDesign(key, value) {
  setDesign((current) => ({
    ...current,
    [key]: value,
    updatedAt: new Date().toISOString(),
  }));

  setHasEditedConfiguration(true);
  setStatus("Draft");
  }

  function updateMeasurements(key, value) {
    setMeasurements((current) => ({
      ...current,
      [key]: value,
    }));

    setHasEditedConfiguration(true);
    setStatus("Draft");
  }
  function handleTitleChange(value) {
    setDesignTitle(value);
    setHasEditedConfiguration(true);
  }

  // Menyimpan desain baru atau memperbarui desain lama
  async function saveDesign(statusBaru) {
    if (!customerId) {
      alert("Pilih pelanggan terlebih dahulu.");
      return;
    }

    try {
      let title = designTitle;
      // Nomor desain baru dihitung langsung dari database
      if (!title?.trim()) {
      const lastId = await fetchTotalDesain();
      title = `Desain ${lastId + 1}`;
    }

      // Mengunggah motif apabila ada file baru
    let motifUrl = design.motifImage || "";

    if (design.motifFile instanceof File) {
      const file = design.motifFile;
      const filePath =
        `${customerId}/${crypto.randomUUID()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("motif-rok")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("motif-rok")
        .getPublicUrl(filePath);

      motifUrl = urlData.publicUrl;
    }

    const designToSave = {
      ...design,
      motifType: motifUrl ? "image" : design.motifType,
      motifImage: motifUrl,
      updatedAt: new Date().toISOString(),
    };

    delete designToSave.motifFile;
      
    const selectedCustomer = customers.find(
      (item) => String(item.id) === String(customerId)
    );

    const customerName = selectedCustomer?.name || customer;

    if (!customerName?.trim()) {
      throw new Error("Nama pelanggan tidak ditemukan.");
    }
      const data = await saveDesignToDatabase({
        designId,
        title,
        customer: customerName,
        customerId,
        design: designToSave,
        measurements,
        status: statusBaru,
      });
      setDesignId(data.id);
      setDesignTitle(data.title);
      setCustomerId(data.customer_id);
      setStatus(data.status);
      setHasEditedConfiguration(false);
      setDesign({
        ...createDefaultDesign(),
        ...(data.design ?? {}),
      });

      setMeasurements({
        ...createEmptyMeasurements(),
        ...(data.measurements ?? {}),
      });

      // Perbarui daftar desain tanpa membuat duplikat
      const record = {
        id: data.id,
        title: data.title,
        customer: data.customer,
        customerId: data.customer_id,
        design: data.design,
        measurements: data.measurements,
        status: data.status,
        date: data.created_at
          ? new Date(data.created_at).toLocaleDateString(
              "id-ID"
            )
          : "",
      };

      setSavedDesigns((current) => [
        record,
        ...current.filter((item) => item.id !== data.id),
      ]);

      await fetchTotalDesain(data.customer_id, false);
        if (statusBaru === "Draft") {
        // Draft berhasil disimpan, tetap di halaman konfigurasi
        alert("Draft berhasil disimpan.");

        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "auto",
        });
      } else {
        alert("Desain berhasil diselesaikan.");
        navigate(
          `/pelanggan/${encodeURIComponent(data.customer_id)}/desain`
        );
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "auto",
        });
      }
    } catch (error) {
      console.error("Gagal menyimpan desain:", error);
      alert(`Desain gagal disimpan: ${error.message}`);
    }
  }

  return (
    <>
      {/* Navbar hanya tampil setelah login */}
      <AuthOnly>
        <Navbar />
      </AuthOnly>

      <Routes>
        {/* Satu-satunya halaman yang boleh dibuka tanpa login */}
        <Route path="/masuk" element={<LoginPage />} />
        <Route path="/daftar" element={<RegisterPage />} />

        {/* Semua halaman lain wajib login; belum masuk -> diarahkan ke /masuk */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={
              <HomePage
                onNavigate={handleNavigate}
                savedDesigns={savedDesigns}
              />
            }
          />
          <Route
            path="/konfigurasi"
            element={
              <ConfigurationPage
                customer={customer}
                listCustomer={listCustomer}
                onCustomerChange={handleCustomerChange}
                onAddCustomer={handleAddCustomer}
                design={design}
                designTitle={designTitle}
                onTitleChange={handleTitleChange}
                nextDesignNumber={totalDesain + 1}
                onDesignChange={updateDesign}
                measurements={measurements}
                onMeasurementChange={updateMeasurements}
                status={status}
                onSave={saveDesign}
                readOnly={isViewMode}
              />
            }
          />
          <Route
            path="/pelanggan"
            element={
              <CustomersPage
                savedDesigns={savedDesigns}
                onNavigate={handleNavigate}
              />
            }
          />
          <Route
            path="/pelanggan/:customerId/desain"
            element={
              <CustomerDesign
                savedDesigns={savedDesigns}
                onDesignDeleted={(id) =>
                  setSavedDesigns((current) =>
                    current.filter((item) => item.id !== id)
                  )
                }
              />
            }
          />
          <Route
            path="/pelanggan/:customerId/desain/:designId"
            element={
              <DesignDetailPage
                savedDesigns={savedDesigns}
              />
            }
          />
        </Route>

        {/* Alamat yang tidak dikenal: ke beranda (dan ke /masuk bila belum login) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}