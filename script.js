
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

const fileForm = document.getElementById("fileForm");
const youtubeForm = document.getElementById("youtubeForm");

const fileStatus = document.getElementById("fileStatus");
const youtubeStatus = document.getElementById("youtubeStatus");

const historyList = document.getElementById("historyList");
const clearHistory = document.getElementById("clearHistory");
const themeBtn = document.getElementById("themeBtn");

// Ganti tab
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(item => item.classList.remove("active"));
    panels.forEach(panel => panel.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// Tema gelap
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const dark = document.body.classList.contains("dark");
  themeBtn.textContent = dark ? "☀" : "☾";

  localStorage.setItem("downlyTheme", dark ? "dark" : "light");
});

if (localStorage.getItem("downlyTheme") === "dark") {
  document.body.classList.add("dark");
  themeBtn.textContent = "☀";
}

// Riwayat lokal
let history = [];

try {
  history = JSON.parse(localStorage.getItem("downlyHistory") || "[]");
  if (!Array.isArray(history)) history = [];
} catch {
  history = [];
}

function showStatus(element, message) {
  element.textContent = message;
  element.classList.add("show");
}

function saveHistory(url, action) {
  history.unshift({
    url,
    action,
    time: new Date().toLocaleString("id-ID")
  });

  history = history.slice(0, 10);

  try {
    localStorage.setItem("downlyHistory", JSON.stringify(history));
  } catch {}

  renderHistory();
}

function renderHistory() {
  historyList.replaceChildren();

  if (history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Belum ada aktivitas.";
    historyList.appendChild(empty);
    return;
  }

  history.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";

    const url = document.createElement("div");
    url.textContent = item.url;

    const detail = document.createElement("small");
    detail.textContent = item.action + " · " + item.time;

    row.append(url, detail);
    historyList.appendChild(row);
  });
}

// Validasi URL
function getValidUrl(value) {
  try {
    const url = new URL(value.trim());

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    if (url.username || url.password) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

// Format ukuran file
function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Tidak diketahui";
  }

  if (bytes === 0) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, index);

  return size.toFixed(2) + " " + units[index];
}

// Ambil nama file
function getFileName(url, disposition) {
  if (disposition) {
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);

    if (encoded) {
      try {
        return decodeURIComponent(encoded[1].replace(/["']/g, ""));
      } catch {}
    }

    const normal = disposition.match(/filename="?([^";]+)"?/i);

    if (normal) return normal[1];
  }

  const name = url.pathname.split("/").pop();

  if (!name) return "Tidak diketahui";

  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

// File Inspector
async function inspectFile(url) {
  showStatus(fileStatus, "Sedang memeriksa informasi file...");

  try {
    const response = await fetch(url.href, {
      method: "HEAD",
      redirect: "follow"
    });

    if (!response.ok) {
      showStatus(
        fileStatus,
        "Server merespons dengan status " + response.status +
        ". Informasi file tidak bisa diperiksa."
      );
      return;
    }

    const type = response.headers.get("content-type") || "Tidak diketahui";
    const size = response.headers.get("content-length");
    const disposition = response.headers.get("content-disposition");

    const name = getFileName(response.url || url.href, disposition);
    const extension = name.includes(".")
      ? name.split(".").pop().toUpperCase()
      : "Tidak diketahui";

    const sizeText = size
      ? formatSize(Number(size))
      : "Tidak diketahui";

    showStatus(
      fileStatus,
      "FILE BERHASIL DIPERIKSA\n" +
      "Nama: " + name + "\n" +
      "Format: " + extension + "\n" +
      "Tipe: " + type + "\n" +
      "Ukuran: " + sizeText
    );

    saveHistory(url.href, "File diperiksa");

  } catch (error) {
    showStatus(
      fileStatus,
      "Gagal membaca metadata file. Kemungkinan server membatasi CORS " +
      "atau tidak mendukung pemeriksaan HEAD. Backend diperlukan untuk " +
      "pemeriksaan yang lebih andal."
    );
  }
}

// Form file
fileForm.addEventListener("submit", async event => {
  event.preventDefault();

  const url = getValidUrl(
    document.getElementById("fileUrl").value
  );

  if (!url) {
    showStatus(fileStatus, "Masukkan URL yang valid.");
    return;
  }

  await inspectFile(url);
});

// Form YouTube
youtubeForm.addEventListener("submit", event => {
  event.preventDefault();

  const url = getValidUrl(
    document.getElementById("youtubeUrl").value
  );

  if (!url) {
    showStatus(youtubeStatus, "Masukkan URL yang valid.");
    return;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  const isYouTube =
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtu.be" ||
    host === "music.youtube.com";

  if (!isYouTube) {
    showStatus(youtubeStatus, "Link tersebut bukan URL YouTube yang dikenali.");
    return;
  }

  const isVideo =
    (host === "youtu.be" && url.pathname.length > 1) ||
    (host.endsWith("youtube.com") && url.pathname === "/watch" &&
      url.searchParams.has("v")) ||
    url.pathname.startsWith("/shorts/") ||
    url.pathname.startsWith("/embed/");

  if (!isVideo) {
    showStatus(youtubeStatus, "Link dikenali, tetapi format video belum terverifikasi.");
    return;
  }

  showStatus(
    youtubeStatus,
    "Link video dikenali. Untuk informasi video dan opsi unduhan, " +
    "kita perlu menghubungkan layanan yang sesuai."
  );

  saveHistory(url.href, "Link YouTube diperiksa");
});

// Hapus riwayat
clearHistory.addEventListener("click", () => {
  history = [];

  try {
    localStorage.removeItem("downlyHistory");
  } catch {}

  renderHistory();
});

renderHistory();
