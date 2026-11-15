// User manual ("Panduan"), Bahasa Indonesia and English. Shown at /manual.
import { PACKAGES, FREE_TESTS, rupiah, esc } from "./core.js";

const priceRows = (en) => Object.values(PACKAGES).map(p =>
  `<li><b>${esc(p.label)}</b>: ${p.credits} ${en ? (p.credits > 1 ? "credits" : "credit") : "kredit"}, ${rupiah(p.idr)}${p.usd ? ` ${en ? "or" : "atau"} US$${p.usd} (PayPal)` : ""}</li>`).join("");

const ID = () => `
<section><h2>1. Mulai</h2><ol>
  <li>Klik <b>Sign in with Google</b> di kanan atas dan pilih akun Google Anda.</li>
  <li>Setiap akun baru mendapat <b>${FREE_TESTS} tes gratis</b>. Saldo Anda selalu terlihat di kanan atas, misalnya <i>2 free · 0 credits</i>.</li>
  <li>Setelah tes gratis habis, setiap penilaian memakai <b>kredit</b>: 1 kredit = 1 task. Tes lengkap (Task 1 + Task 2) memakai 2 kredit.</li></ol></section>
<section><h2>2. Memilih tes (menu Practice)</h2><ul>
  <li><b>Test module</b>: <i>Academic</i> (Task 1 berupa grafik, tabel, diagram atau peta) atau <i>General Training</i> (Task 1 berupa surat).</li>
  <li><b>Question source</b>: <i>Random question</i> dari bank soal, atau <i>My own question</i> untuk menempelkan soal yang Anda temukan sendiri. Untuk Task 1 Academic Anda bisa mengunggah gambar grafiknya.</li>
  <li><b>What to practise</b>: Task 1 saja (20 menit), Task 2 saja (30 menit), atau tes lengkap (50 menit). Anda juga bisa memilih jenis Task 1 dan jenis esai Task 2.</li>
  <li><b>Timing</b>: <i>Exam timing</i> (hitung mundur seperti ujian asli) atau <i>No time limit</i>.</li>
  <li><b>Structure help</b>: tampilkan rencana paragraf dan cek paragraf saat menulis, atau sembunyikan agar lebih mirip ujian.</li>
  <li>Klik <b>Start test</b>. Tes gratis atau kredit Anda dipakai saat tes dimulai.</li></ul></section>
<section><h2>3. Menulis</h2><ul>
  <li>Soal ada di kiri, lembar jawaban di kanan. Pada tes lengkap, pindah antara <b>Task 1</b> dan <b>Task 2</b> lewat tombol di atas.</li>
  <li>Jumlah kata dihitung otomatis (minimal 150 kata untuk Task 1, 250 kata untuk Task 2).</li>
  <li><b>Tulis setiap paragraf di baris baru.</b> Cek paragraf menghitung kalimat per paragraf dan membandingkannya dengan struktur yang disarankan.</li>
  <li>Jawaban tersimpan otomatis di browser. Jika halaman tertutup, buka lagi dan klik <b>Resume</b>.</li>
  <li>Saat waktu habis, lembar jawaban terkunci seperti di ujian. Klik <b>Submit for marking</b>.</li></ul></section>
<section><h2>4. Hasil penilaian</h2><ul>
  <li>Penilaian membutuhkan sekitar 30–90 detik.</li>
  <li>Anda mendapat band 0–9 untuk empat kriteria resmi (Task Achievement/Response, Coherence &amp; Cohesion, Lexical Resource, Grammatical Range &amp; Accuracy), band per task, dan band keseluruhan (Task 2 bernilai dua kali Task 1).</li>
  <li>Hasil juga berisi kutipan dari esai Anda, saran untuk naik satu band, kesalahan yang ditandai di esai, saran kosakata, dan cek struktur.</li>
  <li>Setiap task yang dinilai mendapat <b>1 contoh jawaban band 9</b>. Klik <b>Show a band 9 model answer</b>.</li>
  <li>Jika penilaian gagal, klik <b>Try again</b> (hingga 3 kali per task, gratis). Tes yang belum dinilai tetap tersimpan di <b>History</b> dengan label <i>Not marked</i>.</li>
  <li>Nilai adalah perkiraan dari penguji AI, bukan nilai resmi IELTS.</li></ul></section>
<section><h2>5. Membeli kredit</h2>
  <p>Buka menu <b>Credits</b> atau <b>Buy credits</b> di menu profil. Harga:</p><ul>${priceRows(false)}</ul>
  <ol><li><b>QRIS</b>: klik <b>Pay with QRIS</b>, lalu pindai kode QR dengan DANA, GoPay, OVO, ShopeePay, LinkAja atau aplikasi m-banking. Kode berlaku 15 menit. Kredit masuk otomatis begitu pembayaran diterima.</li>
  <li><b>PayPal</b> (khusus paket 5 dan 10 tes, dalam US$): klik tombol PayPal dan selesaikan pembayaran di jendela PayPal.</li></ol>
  <p>Kredit tidak memiliki masa kedaluwarsa. Semua pembayaran tercatat di <b>Purchase history</b>.</p></section>
<section><h2>6. Structure guide</h2><p>Menu <b>Structure guide</b> berisi rencana paragraf untuk setiap jenis soal, contoh jawaban, dan daftar periksa. Menu ini terbuka untuk akun yang masih memiliki tes gratis atau kredit.</p></section>
<section><h2>7. Akun dan riwayat</h2><p>Klik foto profil di kanan atas untuk membuka <b>Account</b> (profil dan saldo), <b>Purchase history</b> (semua pembayaran dan nomor pesanan <code>WC-…</code>), <b>Test history</b> (tes dan nilai Anda), dan <b>Sign out</b>.</p></section>
<section><h2>8. Tips belajar</h2><ul>
  <li>Kuasai satu jenis soal dulu, berlatih dengan 3–5 soal, baru pindah ke jenis berikutnya.</li>
  <li>Baca bagian <i>To reach band …</i> dan perbaiki tiga hal di <i>Fix these first</i> pada tes berikutnya.</li>
  <li>Gunakan <i>Exam timing</i> dan sembunyikan bantuan struktur saat mendekati hari ujian.</li></ul></section>
<section><h2>9. Bantuan</h2><p>Ada kendala pembayaran atau akun? Lihat halaman <a href="/contact" data-legal="contact">Kontak</a> dan sertakan nomor pesanan Anda. Ketentuan refund ada di <a href="/refund" data-legal="refund">Kebijakan Refund</a>.</p></section>`;

const EN = () => `
<section><h2>1. Getting started</h2><ol>
  <li>Click <b>Sign in with Google</b> at the top right and choose your Google account.</li>
  <li>Every new account gets <b>${FREE_TESTS} free tests</b>. Your balance is always shown at the top right, for example <i>2 free · 0 credits</i>.</li>
  <li>When your free tests are used, each marking uses <b>credits</b>: 1 credit = 1 task. A full test (Task 1 + Task 2) uses 2 credits.</li></ol></section>
<section><h2>2. Choosing a test (Practice)</h2><ul>
  <li><b>Test module</b>: <i>Academic</i> (Task 1 is a graph, table, diagram or map) or <i>General Training</i> (Task 1 is a letter).</li>
  <li><b>Question source</b>: <i>Random question</i> from the question bank, or <i>My own question</i> to paste a question you found. For Academic Task 1 you can upload a picture of the chart.</li>
  <li><b>What to practise</b>: Task 1 only (20 min), Task 2 only (30 min) or the full test (50 min). You can also pick the Task 1 type and the Task 2 essay type.</li>
  <li><b>Timing</b>: <i>Exam timing</i> (a countdown, like the real test) or <i>No time limit</i>.</li>
  <li><b>Structure help</b>: show the paragraph plan and the paragraph check while you write, or hide them to make it closer to the real exam.</li>
  <li>Click <b>Start test</b>. A free test or your credits are used when the test starts.</li></ul></section>
<section><h2>3. Writing</h2><ul>
  <li>The question is on the left and the answer sheet on the right. In a full test, switch between <b>Task 1</b> and <b>Task 2</b> with the buttons at the top.</li>
  <li>Words are counted as you type (at least 150 for Task 1 and 250 for Task 2).</li>
  <li><b>Start each paragraph on a new line.</b> The paragraph check counts sentences per paragraph and compares them with the recommended structure.</li>
  <li>Your answer is saved in your browser as you type. If the page closes, open it again and click <b>Resume</b>.</li>
  <li>When time runs out, the answer sheet locks, as in the exam. Click <b>Submit for marking</b>.</li></ul></section>
<section><h2>4. Your results</h2><ul>
  <li>Marking takes about 30–90 seconds.</li>
  <li>You get a band from 0 to 9 for each of the four official criteria (Task Achievement/Response, Coherence &amp; Cohesion, Lexical Resource, Grammatical Range &amp; Accuracy), a band for each task, and an overall band (Task 2 counts twice as much as Task 1).</li>
  <li>The results also include quotes from your essay, advice for reaching the next band, errors highlighted in your essay, vocabulary suggestions and a structure check.</li>
  <li>Each marked task includes <b>one band 9 model answer</b>. Click <b>Show a band 9 model answer</b>.</li>
  <li>If marking fails, click <b>Try again</b> (up to 3 times per task, free). An unmarked test stays in <b>History</b> labelled <i>Not marked</i>.</li>
  <li>Scores are estimates from an AI examiner, not official IELTS results.</li></ul></section>
<section><h2>5. Buying credits</h2>
  <p>Open <b>Credits</b>, or <b>Buy credits</b> in the profile menu. Prices:</p><ul>${priceRows(true)}</ul>
  <ol><li><b>QRIS</b>: click <b>Pay with QRIS</b> and scan the code with DANA, GoPay, OVO, ShopeePay, LinkAja or a mobile banking app. The code is valid for 15 minutes. Credits are added as soon as the payment arrives.</li>
  <li><b>PayPal</b> (5 and 10 test bundles only, in US$): click the PayPal button and finish paying in the PayPal window.</li></ol>
  <p>Credits don't expire. Every payment is listed in <b>Purchase history</b>.</p></section>
<section><h2>6. Structure guide</h2><p>The <b>Structure guide</b> has a paragraph plan for every question type, worked examples and checklists. It opens for accounts that still have free tests or credits.</p></section>
<section><h2>7. Account and history</h2><p>Click your profile picture at the top right to open <b>Account</b> (profile and balance), <b>Purchase history</b> (every payment, with its <code>WC-…</code> order number), <b>Test history</b> (your tests and bands) and <b>Sign out</b>.</p></section>
<section><h2>8. Study tips</h2><ul>
  <li>Master one question type with 3–5 questions before moving to the next.</li>
  <li>Read the <i>To reach band …</i> advice and work on the three items in <i>Fix these first</i> in your next test.</li>
  <li>Use <i>Exam timing</i> and hide the structure help as your exam date gets closer.</li></ul></section>
<section><h2>9. Help</h2><p>Problem with a payment or your account? See <a href="/contact" data-legal="contact">Contact</a> and include your order number. Refund rules are in the <a href="/refund" data-legal="refund">Refund Policy</a>.</p></section>`;

export function manualHTML(lang) {
  const en = lang === "en";
  return `<main class="wrap legal manual"><div class="eyebrow">${en ? "User manual" : "Panduan pengguna"}</div>
    <h1 style="font-size:30px;margin-top:4px">${en ? "How to use Writing Coach" : "Cara menggunakan Writing Coach"}</h1>
    <div class="legal-tabs" role="tablist" aria-label="Language">
      <button type="button" data-mlang="id" aria-current="${!en}">Bahasa Indonesia</button>
      <button type="button" data-mlang="en" aria-current="${en}">English</button>
    </div>
    <article lang="${en ? "en" : "id"}">${en ? EN() : ID()}</article></main>`;
}
