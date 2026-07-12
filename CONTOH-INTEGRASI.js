/**
 * CONTOH-INTEGRASI.js
 * ------------------------------------------------------------------
 * Contoh pemakaian fungsi-fungsi baru di julzkagenou-baileys.
 * Ini BUKAN file yang dijalankan langsung — ambil bagian yang kamu
 * perlukan dan taruh di file koneksi/handler bot kamu sendiri
 * (di ShadowBotz kelihatannya itu ada di handler.js, variabel socket-
 * nya kamu kasih nama "alip").
 *
 * Semua fungsi ini generik — tidak bergantung struktur bot tertentu,
 * jadi bisa dipakai di ShadowBotz maupun bot lain yang strukturnya beda.
 * ------------------------------------------------------------------
 */

const {
    reactToStatus,
    postTextStatus,
    postMediaStatus,
    postChannelUpdate,
    reactToChannelMessage,
    getName,
    getProfilePicture,
} = require('julzkagenou-baileys'); // sesuaikan nama package sesuai package.json kamu

// ------------------------------------------------------------------
// 1) Auto-react ke SEMUA status yang lewat (personal maupun grup)
//    Taruh di dalam handler messages.upsert yang sudah ada.
// ------------------------------------------------------------------
async function contohHandlerPesan(sock, m) {
    const msg = m.messages?.[0];
    if (!msg?.message) return;

    // status masuk lewat remoteJid === 'status@broadcast'
    if (msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe) {
        try {
            await reactToStatus(sock, msg, '🔥');
        } catch (e) {
            console.error('gagal react status:', e.message);
        }
        return; // status bukan pesan chat biasa, biasanya di-skip dari handler command
    }

    // ------------------------------------------------------------------
    // 2) Resolusi nama pengirim — pakai ini, JANGAN pakai msg.key.participant
    //    atau jid mentah buat ditampilkan ke user.
    // ------------------------------------------------------------------
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const namaPengirim = getName(sock, senderJid, {
        msg,                 // supaya bisa baca pushName-nya
        store,               // kalau kamu pakai makeInMemoryStore, oper di sini
        fallbackLabel: 'Kak' // opsional, dipakai kalau JID-nya LID & tidak ada info sama sekali
    });
    console.log(`Pesan dari ${namaPengirim}`);

    // ------------------------------------------------------------------
    // 3) Ambil foto profil dengan aman (tidak akan crash kalau private)
    // ------------------------------------------------------------------
    const profil = await getProfilePicture(sock, senderJid, 'image');
    if (profil.status === 'ok') {
        // profil.url siap dipakai
    } else if (profil.status === 'privacy_restricted') {
        // wajar — nomor itu memang mem-private foto profilnya, jangan dianggap error
    } else if (profil.status === 'no_picture') {
        // memang belum pasang foto profil
    } else {
        console.error('gagal ambil foto profil:', profil.error?.message);
    }
}

// ------------------------------------------------------------------
// 4) Posting status dari bot (bukan react, tapi upload baru)
//    statusJidList WAJIB diisi kontak asli, bukan daftar sembarangan.
// ------------------------------------------------------------------
async function contohPostingStatus(sock, daftarKontakAsli) {
    await postTextStatus(sock, 'Halo dari bot!', {
        statusJidList: daftarKontakAsli, // ambil dari store.contacts kamu
        backgroundColor: '#25D366',
    });

    await postMediaStatus(sock, { image: { url: './gambar.jpg' }, caption: 'contoh' }, {
        statusJidList: daftarKontakAsli,
    });
}

// ------------------------------------------------------------------
// 5) Posting & react di Channel/Saluran milik bot
// ------------------------------------------------------------------
async function contohChannel(sock, newsletterJid) {
    await postChannelUpdate(sock, newsletterJid, { text: 'Update baru dari channel kami' });

    // serverMessageId didapat dari event newsletter (mis. saat kamu fetch pesan channel)
    await reactToChannelMessage(sock, newsletterJid, 'SERVER_MSG_ID', '👍');
}

module.exports = {
    contohHandlerPesan,
    contohPostingStatus,
    contohChannel,
};
