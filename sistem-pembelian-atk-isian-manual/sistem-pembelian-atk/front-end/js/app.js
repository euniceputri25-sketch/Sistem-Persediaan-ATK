const $ = (id) => document.getElementById(id);
const rupiah = (n) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 2
}).format(n);

let barangList = [];
let detail = [];

function tampilkanPesan(teks, error = false) {
  $("pesan").textContent = teks;
  $("pesan").style.color = error ? "#b42318" : "#16794b";
}

function buatSel(teks) {
  const td = document.createElement("td");
  td.textContent = String(teks ?? "");
  return td;
}

async function muatData() {
  const [b, t] = await Promise.all([
    db.from("persediaan")
      .select("id, kode_barang, nama_barang, satuan, harga_beli, stok")
      .order("nama_barang"),
    db.from("pembelian")
      .select("id, no_pembelian, tanggal, total, pemasok(nama_pemasok)")
      .order("tanggal", { ascending: false })
  ]);

  if (b.error || t.error) throw new Error(b.error?.message || t.error?.message);
  barangList = b.data || [];
  const transaksi = t.data || [];

  $("jumlahBarang").textContent = barangList.length;
  $("totalStok").textContent = barangList.reduce((sum, x) => sum + Number(x.stok), 0).toLocaleString("id-ID");
  $("totalPembelian").textContent = rupiah(transaksi.reduce((sum, x) => sum + Number(x.total), 0));

  const stokBody = $("daftarStok");
  stokBody.replaceChildren();
  barangList.forEach(x => {
    const tr = document.createElement("tr");
    tr.append(buatSel(x.kode_barang), buatSel(x.nama_barang), buatSel(x.satuan),
      buatSel(rupiah(Number(x.harga_beli))), buatSel(x.stok));
    stokBody.append(tr);
  });

  const riwayat = $("riwayat");
  riwayat.replaceChildren();
  transaksi.forEach(x => {
    const tr = document.createElement("tr");
    tr.append(buatSel(x.no_pembelian), buatSel(x.tanggal),
      buatSel(x.pemasok?.nama_pemasok || "-"), buatSel(rupiah(Number(x.total))));
    riwayat.append(tr);
  });
}

function hitungTotal() {
  $("grandTotal").textContent = rupiah(
    detail.reduce((sum, x) => sum + x.jumlah * x.harga_beli, 0)
  );
}

function tampilkanDetail() {
  const tbody = $("detailBarang");
  tbody.replaceChildren();

  detail.forEach((x, index) => {
    const tr = document.createElement("tr");
    tr.append(buatSel(x.nama_barang), buatSel(x.satuan), buatSel(x.jumlah),
      buatSel(rupiah(x.harga_beli)), buatSel(rupiah(x.jumlah * x.harga_beli)));

    const tdAksi = document.createElement("td");
    const hapus = document.createElement("button");
    hapus.type = "button";
    hapus.textContent = "Hapus";
    hapus.style.background = "#b42318";
    hapus.addEventListener("click", () => {
      detail.splice(index, 1);
      tampilkanDetail();
    });
    tdAksi.append(hapus);
    tr.append(tdAksi);
    tbody.append(tr);
  });
  hitungTotal();
}

function tanggalLokal() {
  const sekarang = new Date();
  return new Date(sekarang.getTime() - sekarang.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
}
$("tanggal").value = tanggalLokal();

$("tambahBarang").addEventListener("click", () => {
  const nama_barang = $("barang").value.trim();
  const satuan = $("satuan").value.trim() || "pcs";
  const jumlah = Number($("jumlah").value);
  const harga_beli = Number($("harga").value);

  if (!nama_barang) return tampilkanPesan("Nama barang wajib diisi.", true);
  if (!Number.isSafeInteger(jumlah) || jumlah <= 0)
    return tampilkanPesan("Jumlah harus bilangan bulat positif.", true);
  if (!Number.isFinite(harga_beli) || harga_beli < 0 ||
      Math.round(harga_beli * 100) !== harga_beli * 100)
    return tampilkanPesan("Harga tidak valid (maksimal 2 desimal).", true);
  if (detail.some(x => x.nama_barang.toLocaleLowerCase("id") === nama_barang.toLocaleLowerCase("id")))
    return tampilkanPesan("Barang dengan nama yang sama sudah ditambahkan.", true);

  detail.push({ nama_barang, satuan, jumlah, harga_beli });
  tampilkanDetail();
  tampilkanPesan("");
  $("barang").value = "";
  $("jumlah").value = "1";
  $("harga").value = "";
});

$("formPembelian").addEventListener("submit", async (event) => {
  event.preventDefault();

  const nama_pemasok = $("pemasok").value.trim();
  if (!nama_pemasok) return tampilkanPesan("Nama pemasok wajib diisi.", true);
  if (!detail.length) return tampilkanPesan("Tambahkan minimal satu barang.", true);

  const tombol = $("simpan");
  tombol.disabled = true;

  try {
    const { error } = await db.rpc("catat_pembelian_manual", {
      p_no_pembelian: $("noPembelian").value.trim(),
      p_tanggal: $("tanggal").value,
      p_nama_pemasok: nama_pemasok,
      p_items: detail
    });
    if (error) throw error;

    tampilkanPesan("Pembelian berhasil disimpan. Pemasok/barang baru akan dibuat otomatis jika belum ada.");
    detail = [];
    $("formPembelian").reset();
    $("tanggal").value = tanggalLokal();
    $("satuan").value = "pcs";
    tampilkanDetail();
    await muatData();
  } catch (err) {
    tampilkanPesan("Pembelian gagal: " + err.message, true);
  } finally {
    tombol.disabled = false;
  }
});

muatData().catch(err => tampilkanPesan(
  "Gagal memuat data dari Supabase: " + err.message +
  ". Periksa URL/key, koneksi, serta izin RLS tabel.", true
));
