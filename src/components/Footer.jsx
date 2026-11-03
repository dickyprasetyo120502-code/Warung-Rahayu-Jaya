import React from "react";

export default function Footer() {
  return (
    <footer id="kontak">
      <div className="footer-content">
        <h2>Warung Rahayu Jaya</h2>
        <p> Masakan Rumahan dengan Cita Rasa Khas.</p>
        <p>
          📍 Villa Gading Harapan 3 No.19 Blk D11, Kedungjaya, Kec. Babelan,
          Kabupaten Bekasi, Jawa Barat 17610
        </p>
        <p>
          📞 WhatsApp :{" "}
          <a
            href="https://wa.me/6285890788384"
            target="_blank"
            rel="noopener noreferrer"
          >
            0858-9078-8384
          </a>
        </p>
        <p>
          📍{" "}
          <a
            href="https://maps.app.goo.gl/X1T9v7p7cnocxT4r6"
            target="_blank"
            rel="noopener noreferrer"
          >
            Lihat Lokasi di Google Maps
          </a>
        </p>
        <hr />
        <p>
          &copy; {new Date().getFullYear()} Warung Rahayu Jaya. All Rights
          Reserved.
        </p>
      </div>
    </footer>
  );
}
