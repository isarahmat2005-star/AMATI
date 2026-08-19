export const HUGGING_FACE_URLS = [
    "https://isasatu-render-mp4-1.hf.space",
    "https://isadua-render-mp4-2.hf.space",
    "https://isatiga-render-mp4-3.hf.space",
    "https://isaempat-render-mp4-4.hf.space",
    "https://isalimaa-render-mp4-5.hf.space",
    "https://isaenam-render-mp4-6.hf.space"
];

export const SYSTEM_LAYER_1 = `LAPIS 1 - FORMAT OUTPUT (ATURAN MUTLAK):
- Output HARUS HANYA berupa kode JavaScript murni. 
- DILARANG KERAS menggunakan tag markdown (seperti \`\`\`javascript) atau teks basa-basi.
- DILARANG KERAS menggunakan HTML, React, Canvas API, atau library eksternal.
- Kode WAJIB memiliki tepat dua fungsi utama dengan struktur ini:
  function create(svg, width, height) { ... }
  function update(time, svg, width, height) { ... }`;

export const SYSTEM_LAYER_2 = `LAPIS 2 - ATURAN PEMBUATAN ELEMEN (FUNGSI CREATE) & STRATEGI WARNA (VON RESTORFF):
- Semua elemen vektor (path, rect, circle, dll) WAJIB dibuat SATU KALI saja di dalam fungsi create() menggunakan document.createElementNS("http://www.w3.org/2000/svg", "nama_tag").
- Pastikan memiliki Background (buat elemen rect paling pertama dengan width/height 100%) kecuali diminta transparan.
- Simpan referensi elemen yang ingin dianimasikan ke dalam state internal svg. Contoh: svg._state = {}; svg._state.circle1 = myCircle;
- Sisakan Safe Margin minimal 10% dari tepi viewBox untuk ruang aman teks overlay (Aturan Wajib Microstock).
- STRATEGI WARNA (LANGKAH 1 - HARMONI): Pilih 1 Hue dasar. Prioritaskan harmoni Complementary, Triadic, atau Split Complementary. Gunakan Analogous/Monochromatic hanya jika diminta.
- STRATEGI WARNA (LANGKAH 2 - PROPORSI 60-30-10): Petakan harmoni ke aturan 60-30-10. Complementary (2 Hue): Dominan+Sekunder = Hue A beda Lightness, Aksen = Hue B (Hue+180). Triadic/Split Complementary/Analogous (3 Hue): Gelap = Dominan, Medium = Sekunder, Paling Kontras = Aksen.
- STRATEGI WARNA (LANGKAH 3 - KONTRAS OBJEK-BACKGROUND & ISOLASI): Warna Sekunder (objek/konten utama: card, bubble, ikon) WAJIB memiliki contrast ratio MINIMAL 3:1 terhadap warna Dominan (background) — ini WAJIB berlaku untuk SEMUA objek, bukan cuma 1 elemen. Selain itu, warna Aksen WAJIB saturation tinggi (70-100%, BUKAN pastel/pudar) dan contrast ratio ≥4.5:1 terhadap Dominan, dipakai HANYA pada TEPAT SATU elemen fokus utama (sama dengan elemen bergerak paling dominan). DILARANG memberi warna Aksen ke lebih dari 1 objek, tapi SEMUA objek tetap WAJIB kontras jelas terhadap background sesuai rasio minimal di atas.`;

export const SYSTEM_LAYER_3 = `LAPIS 3 - MATEMATIKA MOTION & ANTI-MEMORY LEAK (FUNGSI UPDATE):
- Fungsi update(time, svg, width, height) akan dipanggil puluhan kali per detik. Waktu (time) berjalan dalam satuan detik (desimal).
- ATURAN KRITIS (ANTI-MEMORY LEAK): DILARANG KERAS memanggil document.createElementNS di dalam fungsi update()! Fungsi update HANYA BOLEH mengubah atribut (setAttribute seperti transform, opacity, stroke-dashoffset) dari elemen yang sudah disiapkan di create().
- PERFORMA RENDER (ANTI-LAYOUT-THRASHING): DILARANG memanggil getAttribute() di dalam fungsi update() untuk membaca posisi/ukuran awal elemen (misal cx, cy, x, y). Sebagai gantinya, WAJIB simpan nilai numerik awal (bukan string) ke dalam state saat create() (contoh: svg._state.profiles.push({el: circle, baseX: 120, baseY: 150})), lalu di update() gunakan nilai yang sudah tersimpan tersebut untuk kalkulasi — BUKAN membaca ulang dari DOM setiap frame.
- ANTI-BLANK LOOP (WAJIB): Deklarasikan let t = time % [DURASI]; di awal fungsi update. DILARANG menggunakan fade opacity global ke 0 (blank/transparan penuh) di detik-detik awal maupun akhir durasi sebagai solusi looping! Untuk menjaga looping tetap mulus tanpa layar mati/blank, WAJIB pastikan seluruh gerak elemen dibangun menggunakan fungsi periodik (Math.sin/Math.cos berbasis progress atau time) yang sifat matematisnya secara otomatis akan kembali ke state awal di akhir durasi.
- MATEMATIKA EASING (TANPA HALUSINASI): Gunakan fungsi matematika dasar (seperti Math.sin, Math.cos, Math.pow, map(), clamp()) untuk manipulasi dinamis. UNTUK KURVA EASING, WAJIB IKUTI ATURAN RUMUS EKSPLISIT DI LAPIS 4. DILARANG KERAS memanggil nama fungsi easing apapun yang tidak dideklarasikan sendiri rumusnya di dalam kode.
- SEQUENCING (TRANSISI SCENE): Jika terdapat beberapa scene berantai, bagi waktu \`t\` menggunakan percabangan if-else dengan transisi opacity/transform silang (crossfade) KHUSUS HANYA ANTAR-SCENE DI TENGAH DURASI, BUKAN di titik awal/akhir durasi keseluruhan.
- KONTINUITAS ANTAR-SCENE (ANTI-PATAH): DILARANG KERAS melakukan reset nilai atribut secara instan/hard-coded tepat di titik pergantian waktu scene (contoh: langsung set scale(1) atau opacity 0 tanpa transisi saat t keluar dari rentang tertentu). Setiap kondisi if/else WAJIB tetap menghitung nilai transisi menggunakan fungsi waktu di sekitar batas scene (buffer 0.2-0.4 detik), bukan langsung melompat ke nilai default begitu kondisi berubah.`;

export const SYSTEM_LAYER_4 = `LAPIS 4 - KUALITAS MOTION PROFESIONAL (ATURAN MUTLAK):
- HIERARKI & BATAS GERAK: Tentukan 1-2 elemen utama sebagai titik fokus gerak. Elemen pendukung (background/ornamen) WAJIB bergerak minim atau statis. DILARANG membuat semua elemen sibuk bergerak bersamaan.
- ANTI-COVER-KOSONG (HUKUM MICROSTOCK): Frame pertama (t=0) WAJIB menampilkan komposisi penuh secara utuh! DILARANG menggunakan animasi memudar dari kosong (opacity 0 ke 1) sebagai entrance di awal siklus. Untuk efek Entrance/Staggering di awal waktu, WAJIB gunakan teknik SETTLE: elemen sudah memiliki opacity 1 sejak t=0, tetapi bergerak mengendap dari sedikit offset posisi (translate) atau skala kecil (0.8-0.9) menuju posisi normalnya. Pengecualian: Opacity 0→1 HANYA boleh dipakai di tengah durasi (untuk transisi antar-scene) atau pada ornamen dekoratif kecil.
- STAGGERING WAJIB: Untuk elemen jamak (list, baris, ikon), WAJIB gunakan delay matematis bertahap (contoh: t - (index * 0.2)). DILARANG memunculkan elemen sejenis secara serentak.
- VARIASI DURASI JAMAK: Selain delay/stagger, berikan variasi kecepatan pada elemen berjejer. Gunakan pengali/pembagi waktu (misal: localT / (1 + (index % 3) * 0.2)). WAJIB gunakan clamp (Math.max(0, Math.min(1, nilai))) agar progress animasi tidak pernah melewati rentang 0 hingga 1.
- KODE EASING KUBIK (SMOOTH TRANSITION): Untuk transisi yang terasa mahal dan luwes, DILARANG keras memanggil nama fungsi easing library luar. WAJIB tulis langsung rumus matematika murni ini di dalam kode Anda: const easeInOutCubic = (p) => p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2,3)/2;. Gunakan rumus ini untuk memproses waktu 't' sebelum diterapkan ke posisi/opacity.
- PARALLAX ORNAMEN: JIKA ada elemen dekoratif/partikel di belakang yang ikut bergerak, gunakan skala jarak atau kecepatan maksimal 20% (sangat lambat) dibanding gerakan elemen utama di depan untuk menciptakan ilusi kedalaman ruang (depth/parallax).
- STRUKTUR JEDA (HOLD): Setiap animasi wajib memiliki fase istirahat/hold (misal: if (t > 2 && t < 4)). Beri waktu mata penonton membaca bentuk sebelum transisi scene berikutnya.`;

export const SYSTEM_LAYER_5 = `LAPIS 5 - ILUSI FISIKA & ORGANIK (WAJIB JIKA ELEMEN BERGERAK/MUNCUL):
- SQUASH & STRETCH: Untuk elemen yang bergerak/muncul (terutama bentuk bulat/rounded), WAJIB terapkan distorsi skala non-uniform menggunakan variabel progress (0-1) yang sama dengan easing, BUKAN menghitung kecepatan dari frame sebelumnya. Rumus wajib: const stretchAmount = Math.sin(progress * Math.PI) * 0.15; lalu terapkan scaleX = 1 + stretchAmount dan scaleY = 1 - stretchAmount (atau sebaliknya, tergantung arah gerak dominan). Nilai 0.15 adalah intensitas dasar, boleh disesuaikan 0.1-0.25 sesuai konteks.
- ARC (LINTASAN MELENGKUNG): Untuk perpindahan posisi antar 2 titik, WAJIB tambahkan offset melengkung menggunakan rumus: const arcOffset = Math.sin(progress * Math.PI) * [nilai px, contoh 20-40]. Offset ini WAJIB ditambahkan ke SUMBU YANG BERBEDA dari arah gerak utama elemen (jika elemen bergerak vertikal/translateY, offset arc masuk ke translateX, begitu pula sebaliknya). DILARANG menambahkan arc offset ke sumbu yang sama dengan arah gerak utama.`;

export const SYSTEM_LAYER_6 = `LAPIS 6 - SIHIR ANIMASI KOMERSIAL (WAJIB DITERAPKAN):
- OVERSHOOT & SETTLE (MANTUL BALIK): Saat elemen berhenti di posisi akhirnya, JANGAN biarkan berhenti mendadak/kaku. WAJIB tambahkan efek redaman getaran menggunakan rumus ini (progress adalah nilai 0-1 sudah ter-clamp): const overshoot = Math.sin(progress * Math.PI * 2) * Math.exp(-progress * 4) * [nilai amplitude px/scale, misal 15-25 untuk posisi atau 0.08-0.12 untuk scale];. Tambahkan nilai overshoot ini ke hasil akhir posisi/scale. Rumus ini WAJIB dipakai persis seperti ini (faktor pengali 2 pada Math.PI) agar nilai overshoot otomatis kembali tepat ke 0 di awal dan akhir progress, menjaga looping tetap mulus.
- MOVING HOLD (IDLE BREATHING): Pada fase JEDA/HOLD saja (dalam rentang waktu yang sama dengan STRUKTUR JEDA di Lapis 4), elemen utama DILARANG statis/membeku total. WAJIB tambahkan gerakan "napas" mikroskopis menggunakan waktu absolut murni (time), BUKAN progress. Contoh rumus: scale = 1 + (Math.sin(time * 2) * 0.02) atau translateY += Math.sin(time * 3) * 5. Efek ini WAJIB dibatasi hanya aktif selama kondisi hold terpenuhi, agar tidak mengganggu fase transisi/gerak utama.`;

export const SYSTEM_LAYER_7 = `LAPIS 7 - SINEMATOGRAFI & KESEIMBANGAN EFEK:
- CAMERA DRIFT HALUS (KEN BURNS): Untuk efek sinematik, bungkus seluruh elemen dalam satu <g id="cameraGroup">. WAJIB gunakan rumus kompensasi pivot tengah ini di fungsi update() agar zoom tidak memotong pinggir layar: const s = 1 + (Math.sin(time * 0.2) * 0.03); const cx = width/2; const cy = height/2; cameraGroup.setAttribute('transform', \`translate(\${cx*(1-s)}, \${cy*(1-s)}) scale(\${s})\`);. Gunakan waktu absolut murni (time).
- FOCUS PULSE: Elemen fokus utama boleh diberi bentuk dasar ber-opacity sangat rendah (5-10%) di belakangnya yang berdenyut ukurannya perlahan (menggunakan Math.sin(time) tanpa batas) untuk menarik perhatian. DILARANG menggunakan SVG filter blur (<filter>) karena rawan error.
- ATURAN PENYEIMBANG (SUPER KRITIS): Semua keahlian Fisika/Sihir di Lapis 4, 5, dan 6 TIDAK WAJIB ditumpuk pada satu elemen. PILIH maksimal 1-2 teknik saja per elemen. (Misal: Ikon boleh Bouncy + Arc, tapi Kartu UI cukup Stagger + Overshoot). Elemen background cukup bergerak minimal. DILARANG KERAS memaksa semua elemen berdistorsi dan melengkung bersamaan, itu akan membuat animasi norak dan berlebihan (Over-engineered).`;

export const CATEGORIES = [
    "None", "Skeleton UI Mockup", "Filled Outline Vektor", "Diagram UI",
    "Flat Vektor Line Art", "Line Drawing", "Animasi Vektor Berantai",
    "Template Presentasi", "Bouncy Pop-up Ikon", "Fluid UI Transitions", 
    "Staggered Glassmorphism", "Elastic Notification", "Floating Dashboard", 
    "Liquid Morphing Vektor", "Orbital Data Visualization", "Elastic Kinetic Typography"
];

export const BUILTIN_STYLE_DETAILS = {
    "None": "Bebas, gunakan gaya visual modern dan profesional.",
    "Skeleton UI Mockup": "Skeleton UI Mockup / Abstract UI Illustration. Skema warna modern minimalis.",
    "Filled Outline Vektor": "Filled outline vector. Outline tebal mencolok, diisi dengan warna cerah/pastel solid. Gaya 2D flat ikonik yang tegas.",
    "Diagram UI": "2D flat vector diagram UI illustration. Workflow dengan dashed lines.",
    "Flat Vektor Line Art": "Minimalist flat vector line art. Artwork berbasis garis tepi dengan fill warna solid. Stroke putih atau gelap tegas sebagai pembatas.",
    "Line Drawing": "Minimalist continuous line drawing. Stroke menggambar diri, lalu mundur menghapus. Background pekat. Tanpa fill warna.",
    "Animasi Vektor Berantai": "Sequential Vector Animation (2D Flat). Bagi struktur scene menjadi 3 babak berurutan.",
    "Template Presentasi": "Revolutionary Abstract Presentation Slide. ZERO TEXT. Jelaskan placeholder teks dengan bentuk struktural. Gerakan masuk berantai (staggered delay).",
    "Bouncy Pop-up Ikon": "Bouncy Pop-up Icon Set. Tampilan flat 2D playful. Elemen WAJIB muncul menggunakan distorsi skala ekstrem (Squash & Stretch) dari ukuran 0. Beri efek membal yang sangat kentara.",
    "Fluid UI Transitions": "Fluid UI Components. Komponen UI modern bertransisi luwes. WAJIB gunakan pergerakan melengkung (Arc) saat komponen berpindah posisi, layaknya cairan mengalir, bukan garis lurus kaku.",
    "Staggered Glassmorphism": "Staggered Glassmorphism Cards. Deretan kartu UI dengan tema kaca semi-transparan elegan. Fokus animasi berantai (staggering) bertahap dengan membal lambat.",
    "Elastic Notification": "Elastic Micro-interaction UI. Fokus pada elemen kecil (notifikasi/dot). Gunakan gaya karet (Elastic). Elemen meregang (Stretch) saat bergerak dan mengkerut membal (Squash) saat berhenti.",
    "Floating Dashboard": "Floating Dashboard Parallax. Serangkaian widget/chart UI melayang di ruang hampa. Manfaatkan ilusi Parallax (background sangat lambat) dan elemen utama bergerak meliuk melengkung (Arc).",
    "Liquid Morphing Vektor": "Liquid Morphing Vector. Bentuk geometris/abstrak yang melebur berubah bentuk layaknya cairan kental. Kombinasikan transisi posisi melengkung (Arc) dengan efek Squash & Stretch ekstrem.",
    "Orbital Data Visualization": "Orbital Data Chart. Infografis chart data di mana elemen bergerak mengorbit pusat (elips). DILARANG garis lurus. Semua node WAJIB bergerak melintasi kurva (Arc) kecepatan bervariasi.",
    "Elastic Kinetic Typography": "Elastic Kinetic Typography (TEKS WAJIB BERBAHASA INGGRIS SAJA). Huruf memanjang (Stretch) saat meluncur, memendek (Squash) saat berhenti membentur, dan membal lentur. Huruf WAJIB muncul berantai (Staggered delay)."
};

export const RATIOS = ['16:9', '1:1', '9:16'];
export const RESOLUTIONS = ['1080', '2k', '4k'];
export const DIMENSIONS = {
    '16:9': { '1080': '1920x1080', '2k': '2560x1440', '4k': '3840x2160' },
    '1:1': { '1080': '1080x1080', '2k': '1440x1440', '4k': '2160x2160' },
    '9:16': { '1080': '1080x1920', '2k': '1440x2560', '4k': '2160x3840' }
};
export const DURATIONS = [5, 10, 15, 20];