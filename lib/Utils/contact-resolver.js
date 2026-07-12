"use strict";
/**
 * contact-resolver.js
 * ------------------------------------------------------------------
 * Tambahan untuk julzkagenou-baileys.
 *
 * 1. getName()
 *    Resolusi nama tampilan untuk sebuah JID dengan urutan prioritas
 *    yang benar, supaya bot tidak "kebobolan" menampilkan LID mentah
 *    (angka internal WhatsApp yang tidak berarti apa-apa buat manusia)
 *    atau nomor telepon padahal nama aslinya sebenarnya tersedia.
 *    Sengaja SINKRON & tanpa panggilan jaringan — resolusi nama
 *    dipakai di hot-path (format setiap pesan masuk), jadi tidak boleh
 *    bergantung ke request yang bisa lambat/timeout.
 *
 * 2. getProfilePicture()
 *    Pembungkus aman untuk profilePictureUrl() yang TIDAK throw saat
 *    foto profil target di-private, dan membedakan dengan jelas antara
 *    "memang tidak ada foto" vs "private" vs error lain. Sesuai yang
 *    diminta: foto profil tetap bisa dideteksi walau target belum
 *    menyimpan nomor kita, KECUALI dia memang mem-private foto
 *    profilnya — dalam kondisi itu, hasilnya ditandai jelas sebagai
 *    'privacy_restricted', bukan exception yang bisa mem-bug-kan bot.
 * ------------------------------------------------------------------
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getName = exports.getProfilePicture = void 0;

const WABinary_1 = require("../WABinary");

let _libphonenumber = null;
try {
    // dependency ini sudah ada di package.json fork ini; dibungkus try/catch
    // supaya modul ini tetap jalan walau paketnya entah kenapa tidak
    // ter-resolve di suatu instalasi (defensif, bukan hard requirement).
    _libphonenumber = require('libphonenumber-js');
}
catch (_e) {
    _libphonenumber = null;
}

const formatPhoneNumber = (userPart) => {
    const raw = `+${userPart}`;
    if (_libphonenumber) {
        try {
            const parsed = _libphonenumber.parsePhoneNumber(raw);
            if (parsed && parsed.isValid()) {
                return parsed.formatInternational();
            }
        }
        catch (_e) {
            // fall through ke format manual di bawah
        }
    }
    return raw;
};

/**
 * @param {import('../Types').WASocket} sock
 * @param {string} jid JID target (boleh JID biasa @s.whatsapp.net atau @lid)
 * @param {{
 *   msg?: object,           // objek pesan mentah (opsional) untuk ambil pushName/verifiedBizName
 *   store?: object,         // instance makeInMemoryStore() (opsional) untuk lookup contacts[]
 *   fallbackLabel?: string  // label default kalau JID adalah LID & sama sekali tidak ada info nama
 * }} [opts]
 * @returns {string} nama terbaik yang bisa ditemukan
 */
const getName = (sock, jid, opts = {}) => {
    if (!jid) {
        return opts.fallbackLabel || 'Pengguna';
    }
    const normalized = WABinary_1.jidNormalizedUser(jid);
    const decoded = WABinary_1.jidDecode(normalized) || {};
    const isLid = decoded.server === 'lid';

    // 1) kalau ini JID akun bot sendiri, langsung pakai pushName/nama akun
    const meId = sock && sock.user && sock.user.id ? WABinary_1.jidNormalizedUser(sock.user.id) : undefined;
    if (meId && meId === normalized && sock.user.name) {
        return sock.user.name;
    }

    // 2) store (kalau di-bind & disediakan) — prioritas tertinggi karena
    //    biasanya berisi nama yang sudah tervalidasi/tersimpan dari waktu ke waktu
    const store = opts.store || sock.store;
    if (store && store.contacts) {
        const c = store.contacts[normalized];
        if (c) {
            const fromStore = c.name || c.notify || c.verifiedName;
            if (fromStore) return fromStore;
        }
    }

    // 3) pushName / verifiedBizName dari objek pesan yang sedang diproses —
    //    ini SELALU dikirim WhatsApp untuk setiap pesan masuk, termasuk dari
    //    nomor yang belum tersimpan sebagai kontak. Ini yang paling sering
    //    kelewat dicek oleh bot lain, padahal ini sumber nama paling andal
    //    untuk kontak yang belum di-save.
    const msg = opts.msg;
    if (msg) {
        if (msg.verifiedBizName) return msg.verifiedBizName;
        if (msg.pushName) return msg.pushName;
    }

    // 4) tidak ada info nama sama sekali → fallback yang jujur & tidak
    //    membingungkan:
    //    - kalau JID biasa (nomor telepon): format nomornya (persis seperti
    //      perilaku WhatsApp asli untuk kontak yang belum disimpan)
    //    - kalau LID: JANGAN tampilkan angka LID mentah (tidak berarti
    //      apa-apa buat manusia & justru inilah bug yang ingin dihindari) —
    //      pakai label generik.
    if (isLid) {
        return opts.fallbackLabel || 'Pengguna WhatsApp';
    }
    if (decoded.user && /^\d+$/.test(decoded.user)) {
        return formatPhoneNumber(decoded.user);
    }
    return opts.fallbackLabel || 'Pengguna';
};
exports.getName = getName;

/**
 * Ambil foto profil target dengan aman — tidak pernah throw untuk kasus
 * "private"/"tidak ada foto", supaya tidak mem-bug-kan alur bot.
 *
 * @param {import('../Types').WASocket} sock
 * @param {string} jid
 * @param {'preview'|'image'} [type='preview'] 'image' = resolusi penuh
 * @param {number} [timeoutMs]
 * @returns {Promise<{ url: string|null, status: 'ok'|'no_picture'|'privacy_restricted'|'error', error?: any }>}
 */
const getProfilePicture = async (sock, jid, type = 'preview', timeoutMs) => {
    try {
        const url = await sock.profilePictureUrl(jid, type, timeoutMs);
        return { url: url || null, status: url ? 'ok' : 'no_picture' };
    }
    catch (err) {
        // WA mengirim kode error di dalam <error code="..."> node; di fork ini
        // assertNodeErrorFree() menaruhnya di err.data (lihat WABinary/generic-utils.js)
        const code = Number((err && err.data) != null ? err.data : (err && err.output && err.output.statusCode));
        if (code === 401 || code === 403) {
            // target mem-private foto profilnya dari kita — ini SATU-SATUNYA
            // kondisi yang memang tidak bisa (dan tidak seharusnya bisa)
            // ditembus, sesuai pengaturan privasi WhatsApp itu sendiri.
            return { url: null, status: 'privacy_restricted' };
        }
        if (code === 404) {
            return { url: null, status: 'no_picture' };
        }
        return { url: null, status: 'error', error: err };
    }
};
exports.getProfilePicture = getProfilePicture;
