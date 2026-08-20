# Perubahan pada julzkagenou-baileys

Dokumen ini menjelaskan persis apa yang ditambahkan/diubah, kenapa, dan apa yang **tidak** saya kerjakan.

## 1. Stabilitas koneksi (`lib/Socket/socket.js`)

**Masalah:** kalau ada satu saja listener event yang melempar error saat sedang memproses frame dari WhatsApp (bisa dari lib ini sendiri, atau dari handler pesan di kode bot kamu), error itu jadi *uncaught exception* dan bisa mematikan seluruh proses Node — bukan cuma koneksi WA-nya. Ini salah satu penyebab paling umum bot "mati sendiri" tanpa log yang jelas.

**Perubahan:** seluruh proses dispatch frame di `onMessageReceived` sekarang dibungkus `try/catch`, dan error yang tertangkap diteruskan ke `onUnexpectedError` (mekanisme pemulihan yang sudah ada di lib ini untuk kasus seperti bad-mac/rate-limit). Tidak mengubah perilaku normal sama sekali — hanya mencegah satu error kecil menjatuhkan semuanya.

## 2. Reaksi status WhatsApp — personal & grup (`lib/Utils/status-helper.js`)

Fungsi baru: `reactToStatus(sock, statusMsg, emoji, opts)`

Kenapa dibuat sebagai helper terpisah: reaksi status di Baileys **wajib** menyertakan `statusJidList` (daftar JID yang berhak menerima reaksi terenkripsi tsb). Ini detail yang paling sering terlewat — akibatnya reaksi "terkirim" di log tapi tidak pernah muncul di HP pemilik status. Helper ini otomatis mengisi `statusJidList` dengan benar (pemilik status + akun bot sendiri), jadi berfungsi baik untuk status personal maupun status yang kamu lihat lewat notifikasi grup.

Fungsi tambahan: `postTextStatus`, `postMediaStatus` — posting status dari akun bot. **Catatan penting:** `statusJidList` di sini harus diisi daftar kontak asli (dari store kamu), bukan daftar sembarang nomor — begitu cara WhatsApp menentukan siapa yang boleh lihat status kamu, sama seperti WhatsApp asli.

## 3. Channel/Saluran (`lib/Utils/status-helper.js`)

`postChannelUpdate(sock, newsletterJid, content)` — posting ke channel yang kamu kelola (secara protokol ini memang cuma `sendMessage` biasa ke JID `@newsletter`, lib ini sudah mendukungnya; helper ini cuma menambah validasi JID supaya error kelihatan jelas kalau salah pakai).

`reactToChannelMessage(sock, newsletterJid, serverMessageId, emoji)` — pembungkus untuk `sock.newsletterReactMessage` yang sudah ada di lib ini.

## 4. Foto profil — aman terhadap privasi (`lib/Utils/contact-resolver.js`)

Fungsi baru: `getProfilePicture(sock, jid, type, timeoutMs)`

**Masalah sebelumnya:** `profilePictureUrl` bawaan akan **throw error** kalau target mem-private foto profilnya — kalau tidak di-try/catch dengan benar di kode bot, ini bisa bikin bot "ngebug"/crash.

**Perubahan:** helper baru ini tidak pernah throw. Hasilnya selalu objek `{ url, status }` dengan `status` berupa `'ok' | 'no_picture' | 'privacy_restricted' | 'error'`. Kasus `privacy_restricted` ini **satu-satunya** kondisi yang memang tidak bisa ditembus — sesuai pengaturan privasi WhatsApp itu sendiri, seperti yang kamu sebutkan sendiri di permintaan awal.

## 5. Resolusi nama — bukan LID/nomor mentah (`lib/Utils/contact-resolver.js`)

Fungsi baru: `getName(sock, jid, opts)`

Urutan prioritas: nama akun sendiri → nama tersimpan di `store.contacts` (kalau kamu pakai `makeInMemoryStore`) → `pushName`/`verifiedBizName` dari pesan yang sedang diproses (ini dikirim WhatsApp untuk **setiap** pesan masuk, termasuk dari nomor yang belum kamu simpan — ini sumber nama paling sering kelewat dicek) → fallback.

Untuk fallback saat benar-benar tidak ada info: kalau JID-nya nomor telepon biasa, diformat rapi jadi nomor (persis seperti WhatsApp asli untuk kontak yang belum disimpan). Kalau JID-nya **LID**, sengaja **tidak** menampilkan angka LID mentah (angka itu ID internal WhatsApp, tidak berarti apa-apa buat manusia dan justru itulah bug yang kamu keluhkan) — dipakai label generik yang bisa kamu kustomisasi lewat `opts.fallbackLabel`.

Resolusi LID→nomor telepon penuh (kebalikan dari `onWhatsApp`) butuh query protokol yang belum bisa saya pastikan didukung server WhatsApp di fork ini tanpa akses jaringan untuk menguji — jadi saya tidak menebak-nebak implementasinya. Yang saya buat adalah fallback chain yang benar dan sudah teruji secara lokal.

## Semua ini sudah diuji logikanya (bukan cuma cek syntax)

Karena sandbox saya tidak ada akses internet (tidak bisa konek ke WhatsApp beneran), saya membuat mock socket & data untuk menguji setiap cabang logika (nama dari pushName, dari store, fallback LID, fallback nomor, profil private/tidak ada/error, validasi input, dan `statusJidList` terisi benar) — semua lolos. Seluruh file di `lib/` juga sudah di-syntax-check ulang setelah patch (`node -c`), tidak ada yang rusak.

**Yang belum bisa saya uji:** koneksi live ke WhatsApp beneran (butuh internet + scan QR yang tidak bisa saya lakukan dari sini). Tolong uji dulu di akun/nomor cadangan sebelum pakai di nomor utama.

---

## Soal "supaya tidak terdeteksi sebagai bot"

Saya jujur soal ini: saya tidak bisa dan tidak akan membuat sesuatu yang secara spesifik dirancang untuk mengelabui sistem deteksi anti-spam/anti-otomasi WhatsApp. Baileys sendiri secara resmi adalah client tidak resmi (bukan WhatsApp Business API) — jadi tidak ada perubahan kode yang bisa memberi jaminan 100% "tidak akan kena banned", siapa pun yang bilang begitu.

Yang benar-benar menurunkan risiko (dan sudah tercermin di perubahan di atas + konfigurasi yang sudah ada di `jadibot-manager.js` kamu):
- Fingerprint browser yang wajar & konsisten (sudah ada: `Browsers('Chrome')` / config custom kamu)
- Versi WhatsApp Web yang selalu terbaru (`fetchLatestBaileysVersion()` — sudah dipakai)
- Tidak crash & reconnect bertubi-tubi (koneksi yang sering putus-nyambung terlihat mencurigakan di sisi server)
- Tidak mengirim pesan massal ke non-kontak / rate limiting yang wajar
- Menghormati privasi (seperti `privacy_restricted` di atas)

Ini bukan trik untuk "menipu" WhatsApp — ini memang cara kerja yang benar dan stabil.

## Yang TIDAK saya kerjakan

Saya fokus di layer library (`julzkagenou-baileys`) saja, **tidak** menyentuh `index.js` atau plugin-plugin di `ShadowBotz`. Saat meninjau `index.js`, saya menemukan bahwa file itu (217KB, praktis satu baris) di-obfuscate berat — nama variabel pakai karakter unicode tak-terlihat yang menyamar sebagai keyword JavaScript, dan strukturnya dipecah lewat lookup-table + switch raksasa. Di dalamnya ada pola pendaftaran ke server eksternal (`/api/bot/register`, `/api/bot/ping`) yang lalu **mengambil dan menjalankan "pending commands" dari server itu secara otomatis** (`/api/bot/commands/pending`, `/api/bot/command/result`).

Saya sengaja berhenti di titik ini dan tidak menganalisis atau mengubah bagian itu, karena:
1. Kode yang di-obfuscate seberat itu tidak bisa saya audit dengan aman — saya tidak bisa memastikan apa yang sebenarnya dijalankan.
2. Pola "daftar ke server → ambil perintah dari server → jalankan perintah itu otomatis" pada dasarnya memberi siapa pun yang mengendalikan server itu kendali jarak jauh atas tiap nomor yang menjalankan kode ini. Itu benar meskipun maksudnya legitimate (misal panel kontrol untuk layanan hosting bot kamu) — saya tidak bisa membedakan itu dari sekadar melihat kodenya.

Ini bukan tuduhan — bisa saja ini memang panel kontrol resmi untuk bisnis hosting bot kamu sendiri. Tapi kalau bagian itu bukan kode yang kamu tulis sendiri (misal berasal dari template/source yang kamu dapat dari orang lain), saya sarankan cari tahu persis server mana yang dihubungi (cari variable `await‌‌` di dekat `require('@whiskeysockets/baileys')`) dan perintah apa saja yang bisa diterima — supaya kamu tahu persis kendali apa yang dipegang pihak lain atas bot (dan nomor-nomor) yang kamu jalankan.

Saya tetap bisa bantu apa pun di luar bagian itu — termasuk mengintegrasikan fungsi-fungsi baru di atas ke `handler.js`/plugin kamu, atau hal lain sama sekali.
