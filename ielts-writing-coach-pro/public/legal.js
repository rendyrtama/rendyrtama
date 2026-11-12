// Contact, Terms, Refund and Privacy pages (Bahasa Indonesia first, English below).
// ▶ Fill in COMPANY. Empty fields are hidden on the site, so nothing half-filled is shown.
import { PACKAGES, FREE_TESTS, rupiah, esc } from "./core.js";

export const COMPANY = {
  legalName: "PT Nara Tama Jaya",
  brand: "Writing Coach",
  address: "Jl. Tegojuran",
  city: "Tulungagung, Jawa Timur, Indonesia",
  email: "naratamajaya11@gmail.com",
  whatsapp: "+62 812-3355-4732",
  hours: "Senin–Jumat, 09.00–17.00 WIB",
  hoursEn: "Monday–Friday, 09:00–17:00 WIB (UTC+7)",
  updated: "12 November 2026",
};

export const LEGAL_PAGES = { contact: "Kontak", terms: "Syarat & Ketentuan", refund: "Kebijakan Refund", privacy: "Kebijakan Privasi" };

const contactLines = (en) => [
  `<b>${esc(COMPANY.legalName)}</b>`,
  COMPANY.address && esc(COMPANY.address),
  esc(COMPANY.city),
  COMPANY.email && `${en ? "Email" : "Email"}: <a href="mailto:${esc(COMPANY.email)}">${esc(COMPANY.email)}</a>`,
  COMPANY.whatsapp && `WhatsApp: <a href="https://wa.me/${COMPANY.whatsapp.replace(/\D/g, "")}" target="_blank" rel="noopener noreferrer">${esc(COMPANY.whatsapp)}</a>`,
  `${en ? "Support hours" : "Jam layanan"}: ${esc(en ? COMPANY.hoursEn : COMPANY.hours)}`,
].filter(Boolean).join("<br>");
const reach = (en) => {
  const ch = [COMPANY.email && (en ? `email ${esc(COMPANY.email)}` : `email ${esc(COMPANY.email)}`), COMPANY.whatsapp && `WhatsApp ${esc(COMPANY.whatsapp)}`].filter(Boolean);
  return ch.length ? ch.join(en ? " or " : " atau ") : (en ? "the contact details on the Contact page" : "kontak di halaman Kontak");
};
const priceList = (en) => `<ul>${Object.values(PACKAGES).map(p => `<li>${esc(p.label)}: ${p.credits} ${en ? (p.credits > 1 ? "credits" : "credit") : "kredit"}, ${rupiah(p.idr)}${p.usd ? ` ${en ? "or" : "atau"} US$${p.usd} (PayPal)` : ""}</li>`).join("")}</ul>`;

const PAGES = {
  contact: {
    id: `<h2>Kontak</h2>
      <p>${COMPANY.brand} adalah layanan latihan menulis IELTS yang dikelola oleh:</p>
      <p class="addr">${contactLines(false)}</p>
      <p>Untuk pertanyaan, kendala pembayaran, atau permintaan refund, hubungi kami melalui ${reach(false)}. Sertakan nomor pesanan (dimulai dengan <code>WC-</code>) jika terkait pembayaran. Kami membalas dalam 1×24 jam pada hari kerja.</p>`,
    en: `<h2>Contact</h2>
      <p>${COMPANY.brand} is an IELTS writing practice service operated by:</p>
      <p class="addr">${contactLines(true)}</p>
      <p>For questions, payment problems or refund requests, contact us via ${reach(true)}. Include your order number (starting with <code>WC-</code>) for payment issues. We reply within 24 hours on working days.</p>`,
  },
  terms: {
    id: `<h2>Syarat &amp; Ketentuan</h2>
      <h3>1. Layanan</h3><p>${COMPANY.brand} ("Layanan") dioperasikan oleh ${esc(COMPANY.legalName)}. Layanan menyediakan soal latihan IELTS Writing (Academic dan General Training), pengatur waktu, panduan struktur, serta penilaian otomatis berbasis kecerdasan buatan (AI) terhadap jawaban Anda.</p>
      <h3>2. Akun</h3><p>Anda masuk menggunakan akun Google. Satu orang hanya boleh menggunakan satu akun. Anda bertanggung jawab atas aktivitas pada akun Anda.</p>
      <h3>3. Tes gratis dan kredit</h3><p>Setiap akun baru mendapat ${FREE_TESTS} tes gratis. Setelah itu, penilaian menggunakan kredit: 1 kredit menilai 1 task (Task 1 atau Task 2); satu tes lengkap (Task 1 + Task 2) memakai 2 kredit. Harga paket:</p>${priceList(false)}
      <p>Harga dalam Rupiah sudah termasuk biaya pembayaran. Kredit tidak memiliki masa kedaluwarsa, tidak dapat dipindahtangankan, dan tidak dapat ditukar dengan uang kecuali sebagaimana diatur dalam Kebijakan Refund. Kredit dipotong saat tes dimulai.</p>
      <h3>4. Pembayaran</h3><p>Pembayaran QRIS diproses oleh Midtrans; pembayaran PayPal (dalam US$, khusus paket bundel) diproses oleh PayPal. Kami tidak menyimpan data kartu atau rekening Anda. Kredit ditambahkan otomatis setelah pembayaran terkonfirmasi.</p>
      <h3>5. Hasil penilaian</h3><p>Band score dan umpan balik dibuat oleh AI berdasarkan IELTS Writing Band Descriptors yang dipublikasikan. Hasil tersebut merupakan <b>perkiraan untuk latihan</b>, bukan skor resmi IELTS, dan dapat berbeda dari penilaian penguji resmi. Layanan ini tidak berafiliasi dengan atau didukung oleh IELTS, British Council, IDP, maupun Cambridge University Press &amp; Assessment.</p>
      <h3>6. Konten Anda</h3><p>Esai yang Anda tulis tetap milik Anda. Anda memberi kami izin untuk memproses dan menyimpannya guna memberikan penilaian dan riwayat latihan. Jangan mengirimkan konten milik orang lain atau konten yang melanggar hukum.</p>
      <h3>7. Penggunaan yang dilarang</h3><p>Dilarang membuat banyak akun untuk mendapatkan tes gratis, menyalahgunakan sistem pembayaran, mengganggu Layanan, atau menggunakan Layanan untuk tujuan selain latihan menulis. Kami dapat menangguhkan akun yang melanggar.</p>
      <h3>8. Ketersediaan dan tanggung jawab</h3><p>Kami berupaya agar Layanan selalu tersedia, namun tidak menjamin bebas gangguan. Jika penilaian gagal karena kendala teknis, Anda dapat mencoba lagi hingga 3 kali per task tanpa biaya tambahan. Sejauh diizinkan hukum, tanggung jawab kami terbatas pada nilai kredit yang Anda bayarkan.</p>
      <h3>9. Perubahan dan hukum yang berlaku</h3><p>Kami dapat memperbarui ketentuan ini; perubahan berlaku sejak dipublikasikan di halaman ini. Ketentuan ini tunduk pada hukum Republik Indonesia.</p>
      <h3>10. Kontak</h3><p>Hubungi kami melalui ${reach(false)}.</p>`,
    en: `<h2>Terms &amp; Conditions</h2>
      <h3>1. Service</h3><p>${COMPANY.brand} (the "Service") is operated by ${esc(COMPANY.legalName)}. It provides IELTS Writing practice questions (Academic and General Training), timers, structure guides and automated AI marking of your answers.</p>
      <h3>2. Account</h3><p>You sign in with a Google account. One person may use only one account. You are responsible for activity on your account.</p>
      <h3>3. Free tests and credits</h3><p>Each new account receives ${FREE_TESTS} free tests. After that, marking uses credits: 1 credit marks 1 task (Task 1 or Task 2); a full test (Task 1 + Task 2) uses 2 credits. Packages:</p>${priceList(true)}
      <p>Rupiah prices include payment fees. Credits do not expire, cannot be transferred, and cannot be exchanged for money except as set out in the Refund Policy. Credits are deducted when a test starts.</p>
      <h3>4. Payments</h3><p>QRIS payments are processed by Midtrans; PayPal payments (in US$, bundles only) are processed by PayPal. We do not store your card or bank details. Credits are added automatically once payment is confirmed.</p>
      <h3>5. Marking results</h3><p>Band scores and feedback are generated by AI based on the published IELTS Writing Band Descriptors. They are <b>practice estimates</b>, not official IELTS scores, and may differ from an official examiner's marking. The Service is not affiliated with or endorsed by IELTS, the British Council, IDP or Cambridge University Press &amp; Assessment.</p>
      <h3>6. Your content</h3><p>Essays you write remain yours. You allow us to process and store them to provide marking and your practice history. Do not submit content that belongs to others or is unlawful.</p>
      <h3>7. Prohibited use</h3><p>Do not create multiple accounts to obtain free tests, abuse the payment system, disrupt the Service, or use it for anything other than writing practice. We may suspend accounts that break these rules.</p>
      <h3>8. Availability and liability</h3><p>We aim to keep the Service available but do not guarantee it will be uninterrupted. If marking fails for technical reasons, you can retry up to 3 times per task at no extra cost. To the extent permitted by law, our liability is limited to the value of the credits you paid for.</p>
      <h3>9. Changes and governing law</h3><p>We may update these terms; changes apply once published on this page. These terms are governed by the laws of the Republic of Indonesia.</p>
      <h3>10. Contact</h3><p>Contact us via ${reach(true)}.</p>`,
  },
  refund: {
    id: `<h2>Kebijakan Refund</h2>
      <p>Kredit adalah produk digital yang langsung dapat digunakan setelah pembayaran. Karena itu, <b>kredit yang sudah dibeli tidak dapat dikembalikan dalam bentuk uang</b>, kecuali pada kondisi berikut:</p>
      <ul>
        <li><b>Tagihan ganda:</b> Anda membayar dua kali untuk pesanan yang sama. Kami mengembalikan pembayaran yang berlebih secara penuh.</li>
        <li><b>Kredit tidak masuk:</b> pembayaran berhasil tetapi kredit tidak bertambah dalam 1×24 jam. Kami menambahkan kredit Anda, atau mengembalikan dana penuh jika Anda memintanya.</li>
        <li><b>Jumlah tagihan salah:</b> Anda ditagih tidak sesuai harga paket. Kami mengembalikan selisihnya.</li>
      </ul>
      <p><b>Penilaian gagal:</b> jika penilaian gagal karena kendala teknis, gunakan tombol "Try again" (hingga 3 kali per task, gratis). Jika tetap gagal, hubungi kami dan kredit untuk task tersebut akan dikembalikan ke akun Anda.</p>
      <h3>Cara mengajukan</h3><p>Hubungi kami melalui ${reach(false)} dalam waktu 7 hari sejak pembayaran. Sertakan email akun Google Anda, nomor pesanan (<code>WC-…</code>) dan bukti pembayaran. Refund yang disetujui diproses ke metode pembayaran asal dalam 14 hari kerja.</p>`,
    en: `<h2>Refund Policy</h2>
      <p>Credits are a digital product that can be used immediately after payment. <b>Purchased credits are therefore not refundable as money</b>, except in these cases:</p>
      <ul>
        <li><b>Double charge:</b> you paid twice for the same order. We refund the extra payment in full.</li>
        <li><b>Credits not received:</b> the payment succeeded but credits were not added within 24 hours. We add your credits, or refund in full if you prefer.</li>
        <li><b>Wrong amount:</b> you were charged more than the package price. We refund the difference.</li>
      </ul>
      <p><b>Failed marking:</b> if marking fails for technical reasons, use "Try again" (up to 3 times per task, free). If it still fails, contact us and the credit for that task is returned to your account.</p>
      <h3>How to request</h3><p>Contact us via ${reach(true)} within 7 days of payment. Include your Google account email, order number (<code>WC-…</code>) and proof of payment. Approved refunds are paid to the original payment method within 14 working days.</p>`,
  },
  privacy: {
    id: `<h2>Kebijakan Privasi</h2>
      <p>${esc(COMPANY.legalName)} menghormati privasi Anda dan memproses data pribadi sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.</p>
      <h3>Data yang kami kumpulkan</h3><ul>
        <li>Nama dan alamat email dari akun Google Anda saat masuk.</li>
        <li>Soal, jawaban esai, dan hasil penilaian Anda.</li>
        <li>Catatan pesanan: paket, jumlah, status, dan nomor transaksi. Data kartu atau rekening diproses langsung oleh Midtrans/PayPal dan tidak kami simpan.</li>
        <li>Penyimpanan lokal di browser (draf dan riwayat latihan) di perangkat Anda.</li></ul>
      <h3>Tujuan penggunaan</h3><p>Menyediakan akun dan kredit, menilai esai, menampilkan riwayat latihan, memproses pembayaran, mencegah penyalahgunaan, dan memberikan dukungan.</p>
      <h3>Pihak yang memproses data</h3><ul>
        <li><b>Anthropic</b> (model AI Claude): menerima soal dan esai untuk dinilai.</li>
        <li><b>Supabase</b> (basis data dan login) dan <b>Vercel</b> (hosting).</li>
        <li><b>Google</b> (login), <b>Midtrans</b> dan <b>PayPal</b> (pembayaran).</li></ul>
      <p>Kami tidak menjual data pribadi Anda.</p>
      <h3>Penyimpanan dan hak Anda</h3><p>Data disimpan selama akun Anda aktif. Anda dapat meminta salinan data, koreksi, atau penghapusan akun dan esai Anda dengan menghubungi ${reach(false)}. Kami memproses permintaan dalam 14 hari kerja.</p>`,
    en: `<h2>Privacy Policy</h2>
      <p>${esc(COMPANY.legalName)} respects your privacy and processes personal data in line with Indonesian Law No. 27 of 2022 on Personal Data Protection.</p>
      <h3>Data we collect</h3><ul>
        <li>Your name and email address from your Google account when you sign in.</li>
        <li>Your questions, essay answers and marking results.</li>
        <li>Order records: package, amount, status and transaction number. Card or bank details are handled by Midtrans/PayPal and are not stored by us.</li>
        <li>Browser storage (drafts and practice history) on your own device.</li></ul>
      <h3>How we use it</h3><p>To provide your account and credits, mark essays, show your practice history, process payments, prevent abuse and give support.</p>
      <h3>Who processes data for us</h3><ul>
        <li><b>Anthropic</b> (Claude AI): receives questions and essays to mark them.</li>
        <li><b>Supabase</b> (database and sign-in) and <b>Vercel</b> (hosting).</li>
        <li><b>Google</b> (sign-in), <b>Midtrans</b> and <b>PayPal</b> (payments).</li></ul>
      <p>We do not sell your personal data.</p>
      <h3>Retention and your rights</h3><p>Data is kept while your account is active. You can request a copy, a correction, or deletion of your account and essays by contacting ${reach(true)}. We handle requests within 14 working days.</p>`,
  },
};

export function legalHTML(page) {
  const p = PAGES[page];
  return `<main class="wrap legal"><div class="eyebrow">${esc(COMPANY.brand)} · ${esc(COMPANY.legalName)}</div>
    <nav class="legal-tabs" aria-label="Legal pages">${Object.entries(LEGAL_PAGES).map(([k, l]) => `<a href="/${k}" data-legal="${k}" ${k === page ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
    <article lang="id">${p.id}</article>
    <article lang="en" class="en"><div class="eyebrow">English</div>${p.en}</article>
    <p class="muted" style="font-size:13px">Terakhir diperbarui / Last updated: ${esc(COMPANY.updated)}</p></main>`;
}

export function footerHTML() {
  return `<div class="wrap"><span>© 2026 ${esc(COMPANY.legalName)} · ${esc(COMPANY.city)}</span>
    <nav aria-label="Footer">${Object.entries(LEGAL_PAGES).map(([k, l]) => `<a href="/${k}" data-legal="${k}">${l}</a>`).join("")}</nav></div>`;
}
