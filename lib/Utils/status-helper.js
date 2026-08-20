"use strict";
/**
 * status-helper.js
 * ------------------------------------------------------------------
 * Tambahan untuk julzkagenou-baileys.
 *
 * Berisi helper untuk:
 *   - Bereaksi ke status WhatsApp (status personal maupun status yang
 *     muncul/didorong lewat grup)
 *   - Memposting status (teks/gambar/video) dari akun bot
 *   - Memposting & bereaksi ke pesan Channel/Saluran (newsletter)
 *
 * Kenapa ini perlu dipisah jadi helper sendiri?
 * Baileys secara protokol MEMANG sudah bisa melakukan semua ini lewat
 * `sock.sendMessage(...)`, tapi ada satu detail yang sering terlewat
 * banyak bot: field `statusJidList`. Status di WhatsApp Multi-Device
 * dienkripsi per-penerima di sisi client (bukan di-broadcast server),
 * jadi kalau `statusJidList` tidak diisi dengan benar, reaksi/status
 * akan terlihat "terkirim" di log tapi tidak pernah muncul di HP
 * penerima. Helper di file ini memastikan field itu selalu diisi
 * dengan benar supaya fiturnya benar-benar jalan, bukan cuma
 * "tidak error" tapi juga "beneran nyampe".
 * ------------------------------------------------------------------
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactToStatus = exports.postTextStatus = exports.postMediaStatus = exports.postChannelUpdate = exports.reactToChannelMessage = void 0;

const WABinary_1 = require("../WABinary");

/**
 * Bereaksi ke status WhatsApp (story 24 jam).
 * Berfungsi untuk status personal (kontak biasa) MAUPUN status yang
 * kamu lihat notifikasinya lewat grup — selama kamu punya objek pesan
 * status yang valid (dari event `messages.upsert`, cek
 * `key.remoteJid === 'status@broadcast'`).
 *
 * @param {import('../Types').WASocket} sock instance dari makeWASocket()
 * @param {{ key: { remoteJid: string, id: string, participant?: string, fromMe?: boolean } }} statusMsg
 *        objek pesan status mentah (ambil dari messages.upsert)
 * @param {string} emoji contoh: '❤️', '😂', '👍'
 * @param {{ extraStatusJidList?: string[] }} [opts]
 * @returns {Promise<import('../Types').proto.WebMessageInfo>}
 */
const reactToStatus = async (sock, statusMsg, emoji, opts = {}) => {
    const key = statusMsg && statusMsg.key;
    if (!key || !key.remoteJid || !key.id) {
        throw makeError('reactToStatus: statusMsg.key tidak lengkap (butuh remoteJid & id)');
    }
    if (!WABinary_1.isJidStatusBroadcast(key.remoteJid)) {
        throw makeError('reactToStatus: pesan yang diberikan bukan status (key.remoteJid harus "status@broadcast")');
    }
    // pemilik status: kalau status milik orang lain, WA menaruh JID-nya di
    // key.participant. Kalau statusnya milik akun bot sendiri (fromMe),
    // fallback ke remoteJid.
    const statusOwnerJid = key.participant
        ? WABinary_1.jidNormalizedUser(key.participant)
        : WABinary_1.jidNormalizedUser(key.remoteJid);
    const meJid = sock && sock.user && sock.user.id ? WABinary_1.jidNormalizedUser(sock.user.id) : undefined;
    // statusJidList wajib memuat pemilik status supaya server tahu status
    // ini harus di-fanout/dienkripsi untuk dia. Menyertakan JID akun sendiri
    // juga aman & dianjurkan (beberapa versi WA memeriksa keberadaan pengirim).
    const statusJidList = Array.from(new Set([
        statusOwnerJid,
        meJid,
        ...((opts && opts.extraStatusJidList) || [])
    ].filter(Boolean)));
    return sock.sendMessage('status@broadcast', {
        react: {
            text: emoji,
            key
        }
    }, {
        statusJidList
    });
};
exports.reactToStatus = reactToStatus;

/**
 * Posting status teks dari akun bot.
 *
 * PENTING: `statusJidList` di sini adalah daftar JID kontak yang harus
 * bisa MELIHAT status ini (karena dienkripsi per-penerima di sisi
 * client). Ini BUKAN fitur untuk broadcast massal ke nomor yang bukan
 * kontak/tidak terkait dengan akun — isi dengan daftar kontak nyata
 * dari `store` kamu sendiri (atau minimal daftar kontak yang memang
 * berhak melihat status akun ini), supaya perilakunya sama seperti
 * WhatsApp asli: yang bisa lihat status kamu hanyalah kontakmu.
 *
 * @param {import('../Types').WASocket} sock
 * @param {string} text
 * @param {{ statusJidList: string[], backgroundColor?: string, font?: number }} opts
 */
const postTextStatus = async (sock, text, opts) => {
    if (!opts || !Array.isArray(opts.statusJidList) || opts.statusJidList.length === 0) {
        throw makeError('postTextStatus: opts.statusJidList wajib diisi (daftar JID kontak yang berhak melihat status ini)');
    }
    return sock.sendMessage('status@broadcast', {
        text,
        ...(opts.backgroundColor ? { backgroundColor: opts.backgroundColor } : {}),
        ...(opts.font !== undefined ? { font: opts.font } : {})
    }, {
        statusJidList: opts.statusJidList,
        backgroundColor: opts.backgroundColor,
        font: opts.font
    });
};
exports.postTextStatus = postTextStatus;

/**
 * Posting status gambar/video dari akun bot.
 * `media` mengikuti format konten media Baileys biasa, contoh:
 *   { image: { url: './foto.jpg' }, caption: 'halo' }
 *   { video: { url: './video.mp4' }, caption: 'halo' }
 *
 * @param {import('../Types').WASocket} sock
 * @param {object} media
 * @param {{ statusJidList: string[] }} opts lihat catatan di postTextStatus
 */
const postMediaStatus = async (sock, media, opts) => {
    if (!opts || !Array.isArray(opts.statusJidList) || opts.statusJidList.length === 0) {
        throw makeError('postMediaStatus: opts.statusJidList wajib diisi (daftar JID kontak yang berhak melihat status ini)');
    }
    return sock.sendMessage('status@broadcast', media, {
        statusJidList: opts.statusJidList
    });
};
exports.postMediaStatus = postMediaStatus;

/**
 * Posting update ke Channel/Saluran milik akun bot (butuh bot sudah jadi
 * admin/owner channel tsb.). Secara protokol ini sama saja dengan
 * sendMessage biasa ke JID channel (`...@newsletter`) — Baileys sudah
 * menangani routing-nya, helper ini cuma menambahkan validasi supaya
 * kesalahan pakai (misal JID yang dikirim bukan JID channel) ketahuan
 * dari awal dengan pesan yang jelas, bukan error protokol yang
 * membingungkan.
 *
 * @param {import('../Types').WASocket} sock
 * @param {string} newsletterJid JID channel, harus diakhiri "@newsletter"
 * @param {object} content konten pesan (text / image / video, dst)
 */
const postChannelUpdate = async (sock, newsletterJid, content) => {
    if (!WABinary_1.isJidNewsLetter(newsletterJid)) {
        throw makeError('postChannelUpdate: newsletterJid tidak valid, harus diakhiri "@newsletter"');
    }
    return sock.sendMessage(newsletterJid, content);
};
exports.postChannelUpdate = postChannelUpdate;

/**
 * Bereaksi ke pesan di dalam Channel/Saluran.
 * Berbeda dari reaksi status biasa — channel punya endpoint reaksi
 * sendiri di protokolnya (`newsletterReactMessage`), yang sudah ada
 * di lib/Socket/newsletter.js. Helper ini cuma pembungkus tipis biar
 * pemanggilannya konsisten dengan helper lain di file ini.
 *
 * @param {import('../Types').WASocket} sock
 * @param {string} newsletterJid JID channel
 * @param {string} serverMessageId server id pesan di channel tsb
 * @param {string} [emoji] kosongkan untuk menghapus reaksi
 */
const reactToChannelMessage = async (sock, newsletterJid, serverMessageId, emoji) => {
    if (!WABinary_1.isJidNewsLetter(newsletterJid)) {
        throw makeError('reactToChannelMessage: newsletterJid tidak valid, harus diakhiri "@newsletter"');
    }
    if (typeof sock.newsletterReactMessage !== 'function') {
        throw makeError('reactToChannelMessage: sock.newsletterReactMessage tidak tersedia di versi lib ini');
    }
    return sock.newsletterReactMessage(newsletterJid, serverMessageId, emoji);
};
exports.reactToChannelMessage = reactToChannelMessage;

// error kecil tanpa perlu import @hapi/boom di file ini (biar helper ini
// ringan & tidak nambah dependency graph); tetap instance dari Error asli.
function makeError(message) {
    return new Error(message);
}
