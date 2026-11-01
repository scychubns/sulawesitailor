
import { supabase } from "../lib/supabase";

export const createDefaultDesign = () => ({
  model: "",
  pocket: "Tanpa kantong",
  color: "#ffffff",
  motifImage: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createEmptyMeasurements = () => ({
  waist: "",
  hip: "",
  skirtLength: "",
  notes: "",
});

// Ambil pelanggan
export async function getCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Ambil seluruh desain
export async function getDesigns() {
  const { data, error } = await supabase
    .from("saved_designs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Ambil satu desain berdasarkan ID
export async function getDesignById(id) {
  const { data, error } = await supabase
    .from("saved_designs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// Hitung jumlah desain pelanggan
export async function getDesignCount(customerId) {
  if (!customerId) return 0;

  const { count, error } = await supabase
    .from("saved_designs")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customerId);

  if (error) throw error;
  return count ?? 0;
}

// Ambil pelanggan berdasarkan ID
export async function getCustomerById(id) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}


export async function saveDesignToDatabase({
  designId,
  title,
  customer,
  customerId,
  design,
  measurements,
  status,
}) {
  const payload = {
    title,
    customer,
    customer_id: customerId,
    design,
    measurements,
    status,
  };

  if (designId) {
    // Perbarui desain yang sudah ada
    const { data, error } = await supabase
      .from("saved_designs")
      .update(payload)
      .eq("id", designId)
      .select("*");

    if (error) {
      console.error("Error update Supabase:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error(
        `Update desain ID ${designId} tidak menghasilkan data. ` +
        "Periksa apakah ID tersedia dan kebijakan UPDATE/SELECT RLS mengizinkan operasi ini."
      );
    }

    return data[0];
  }

  // Tambahkan desain baru
  const { data, error } = await supabase
    .from("saved_designs")
    .insert(payload)
    .select("*");

  if (error) {
    console.error("Error insert Supabase:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("Desain baru tidak berhasil disimpan.");
  }

  return data[0];
}
