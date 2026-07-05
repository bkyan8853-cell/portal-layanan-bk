import { Siswa, Pelanggaran, Pencatatan, Pembinaan, AppSettings, DashboardStats, User, UserRole, Remisi, Absensi } from "../types";

const API_BASE = "/api";

// Helper untuk mengambil token dari localStorage
export function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export function formatDisplayDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  try {
    let cleanStr = dateStr.toString().trim();
    
    // 1. If already formatted in Indonesian (contains month name), return as-is
    for (const m of MONTHS_ID) {
      if (cleanStr.toLowerCase().includes(m.toLowerCase())) {
        return cleanStr;
      }
    }

    // 2. Handle ISO timestamps
    if (cleanStr.includes("T")) {
      cleanStr = cleanStr.split("T")[0];
    }

    // 3. Handle dash format (YYYY-MM-DD or DD-MM-YYYY)
    if (cleanStr.includes("-")) {
      const parts = cleanStr.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const year = parts[0];
          const monthIdx = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
            return `${day} ${MONTHS_ID[monthIdx]} ${year}`;
          }
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          const day = parseInt(parts[0], 10);
          const monthIdx = parseInt(parts[1], 10) - 1;
          const year = parts[2];
          if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
            return `${day} ${MONTHS_ID[monthIdx]} ${year}`;
          }
        }
      }
    }

    // 4. Handle slash format (DD/MM/YYYY or YYYY/MM/DD)
    if (cleanStr.includes("/")) {
      const parts = cleanStr.split("/");
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          const day = parseInt(parts[0], 10);
          const monthIdx = parseInt(parts[1], 10) - 1;
          const year = parts[2];
          if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
            return `${day} ${MONTHS_ID[monthIdx]} ${year}`;
          }
        } else if (parts[0].length === 4) {
          // YYYY/MM/DD
          const year = parts[0];
          const monthIdx = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
            return `${day} ${MONTHS_ID[monthIdx]} ${year}`;
          }
        }
      }
    }

    // 5. Fallback using native Date object
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const monthIdx = d.getMonth();
      const year = d.getFullYear();
      return `${day} ${MONTHS_ID[monthIdx]} ${year}`;
    }

    return dateStr;
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateStr;
  }
}

// Custom fetch wrapper yang menyertakan token autentikasi otomatis
async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Sesi habis, bersihkan storage dan paksa login kembali
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-change"));
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `HTTP Error: ${response.status}`);
  }

  const result = await response.json();
  return result;
}

export const googleSheetApi = {
  // Authentication
  async login(username: string, password: string, role: UserRole): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal masuk. Silakan periksa kredensial Anda.");
    }
    
    const data = await res.json();
    if (data.success && data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("auth-change"));
    }
    return data;
  },

  logout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-change"));
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await fetchWithAuth<{ success: boolean; settings: AppSettings }>(`${API_BASE}/settings`);
    return res.settings;
  },

  async saveSettings(settings: AppSettings): Promise<{ success: boolean; message: string; settings: AppSettings }> {
    return await fetchWithAuth(`${API_BASE}/settings`, {
      method: "POST",
      body: JSON.stringify(settings)
    });
  },

  async triggerSync(): Promise<{ success: boolean; message: string }> {
    return await fetchWithAuth(`${API_BASE}/settings/sync`, { method: "POST" });
  },

  // Students (Siswa)
  async getStudents(): Promise<Siswa[]> {
    const res = await fetchWithAuth<{ success: boolean; data: Siswa[] }>(`${API_BASE}/students`);
    return res.data;
  },

  async addStudent(student: Partial<Siswa>): Promise<Siswa> {
    const res = await fetchWithAuth<{ success: boolean; data: Siswa }>(`${API_BASE}/students`, {
      method: "POST",
      body: JSON.stringify(student)
    });
    return res.data;
  },

  async deleteStudent(id: string): Promise<void> {
    await fetchWithAuth(`${API_BASE}/students/${id}`, {
      method: "DELETE"
    });
  },

  // Violations (Master Pelanggaran)
  async getViolations(): Promise<Pelanggaran[]> {
    const res = await fetchWithAuth<{ success: boolean; data: Pelanggaran[] }>(`${API_BASE}/violations`);
    return res.data;
  },

  async addViolation(violation: Partial<Pelanggaran>): Promise<Pelanggaran> {
    const res = await fetchWithAuth<{ success: boolean; data: Pelanggaran }>(`${API_BASE}/violations`, {
      method: "POST",
      body: JSON.stringify(violation)
    });
    return res.data;
  },

  async deleteViolation(id: string): Promise<void> {
    await fetchWithAuth(`${API_BASE}/violations/${id}`, {
      method: "DELETE"
    });
  },

  // Records (Pencatatan)
  async getRecords(): Promise<Pencatatan[]> {
    const res = await fetchWithAuth<{ success: boolean; data: Pencatatan[] }>(`${API_BASE}/records`);
    return res.data;
  },

  async addRecord(record: Partial<Pencatatan>): Promise<{ data: Pencatatan; guidance?: Pembinaan }> {
    const res = await fetchWithAuth<{ success: boolean; data: Pencatatan; guidance?: Pembinaan }>(`${API_BASE}/records`, {
      method: "POST",
      body: JSON.stringify(record)
    });
    return { data: res.data, guidance: res.guidance };
  },

  async deleteRecord(id: string): Promise<void> {
    await fetchWithAuth(`${API_BASE}/records/${id}`, {
      method: "DELETE"
    });
  },

  // Guidance (Pembinaan)
  async getGuidance(): Promise<Pembinaan[]> {
    const res = await fetchWithAuth<{ success: boolean; data: Pembinaan[] }>(`${API_BASE}/guidance`);
    return res.data;
  },

  // Dashboard Statistics
  async getDashboardStats(force = false): Promise<DashboardStats> {
    const res = await fetchWithAuth<{ success: boolean; stats: DashboardStats }>(`${API_BASE}/dashboard${force ? "?force=true" : ""}`);
    return res.stats;
  },

  // Remisi
  async getRemisi(): Promise<Remisi[]> {
    const res = await fetchWithAuth<{ success: boolean; data: Remisi[] }>(`${API_BASE}/remisi`);
    return res.data || [];
  },

  async addRemisi(remisi: Partial<Remisi>): Promise<Remisi> {
    const res = await fetchWithAuth<{ success: boolean; data: Remisi }>(`${API_BASE}/remisi`, {
      method: "POST",
      body: JSON.stringify(remisi)
    });
    return res.data;
  },

  async deleteRemisi(id: string): Promise<void> {
    await fetchWithAuth(`${API_BASE}/remisi/${id}`, {
      method: "DELETE"
    });
  },

  // Attendance (Absensi)
  async getAttendance(tanggal?: string, kelas?: string): Promise<Absensi[]> {
    let url = `${API_BASE}/attendance`;
    const params = new URLSearchParams();
    if (tanggal) params.append("tanggal", tanggal);
    if (kelas) params.append("kelas", kelas);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const res = await fetchWithAuth<{ success: boolean; data: Absensi[] }>(url);
    return res.data || [];
  },

  async saveAttendance(records: Partial<Absensi>[]): Promise<Absensi[]> {
    const res = await fetchWithAuth<{ success: boolean; data: Absensi[] }>(`${API_BASE}/attendance`, {
      method: "POST",
      body: JSON.stringify(records)
    });
    return res.data;
  }
};
