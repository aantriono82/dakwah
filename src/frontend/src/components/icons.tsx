// Custom Islamic-themed SVG icon components
// Menggantikan ikon-ikon lucide yang generik dengan desain bertema dakwah yang elegan, halus, dan jelas

type IconProps = {
  className?: string;
  strokeWidth?: number;
};

// 1. IconMosque - Masjid indah dengan kubah besar dan menara simetris
export function IconMosque({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Base line */}
      <path d="M2 22h20" />
      {/* Central Dome */}
      <path d="M6 15c0-3.3 2.7-6 6-6s6 2.7 6 6v7H6v-7z" fill="currentColor" fillOpacity="0.05" />
      {/* Left Tower */}
      <path d="M3 22V9.5L4.5 8 6 9.5V22" />
      <path d="M3 12h3" />
      {/* Right Tower */}
      <path d="M18 22V9.5l1.5-1.5 1.5 1.5V22" />
      <path d="M18 12h3" />
      {/* Crescent on top of central dome */}
      <path d="M12 9V5" />
      <path d="M12 5.5a1.5 1.5 0 1 1 1.5-1.5" />
      {/* Arched main door */}
      <path d="M9 22v-3.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5V22" />
    </svg>
  );
}

// 2. IconQuran - Al-Quran yang sedang terbuka di atas alas pembaca (Rehal)
export function IconQuran({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Open book pages */}
      <path d="M12 17.5c-2.5-1.8-6-1.8-9-1.8V4.2c3 0 6.5 0 9 1.8 2.5-1.8 6-1.8 9-1.8v11.5c-3 0-6.5 0-9 1.8z" fill="currentColor" fillOpacity="0.05" />
      <path d="M12 6v11.5" />
      {/* Quran emblem: Small crescent/details inside */}
      <path d="M6 7.5h3" />
      <path d="M6 10.5h3" />
      <path d="M15 7.5h3" />
      <path d="M15 10.5h3" />
      {/* Rehal (Book stand) base */}
      <path d="M5 21.5l7-4.5 7 4.5" />
      <path d="M8 19.5l4-2.5 4 2.5" />
    </svg>
  );
}

// 3. IconMinaret - Menara masjid yang tinggi dengan balkon
export function IconMinaret({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 22h16" />
      {/* Main pillar */}
      <path d="M9 22V9.5h6V22" fill="currentColor" fillOpacity="0.05" />
      {/* Balcony */}
      <path d="M7.5 9.5h9v-2.5h-9z" />
      <path d="M9 7V4.5l3-2.5 3 2.5V7" />
      {/* Small Crescent on top */}
      <path d="M12 2v1" />
      <circle cx="12" cy="1" r="0.5" fill="currentColor" stroke="none" />
      {/* Windows */}
      <path d="M12 13v2" />
      <path d="M12 17v2" />
    </svg>
  );
}

// 4. IconPulpit - Mimbar ceramah khatib lengkap dengan anak tangga dan atap kubah
export function IconPulpit({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 22h20" />
      {/* Pulpit main body */}
      <path d="M9 22V8c0-1.7 1.3-3 3-3s3 1.3 3 3v14" fill="currentColor" fillOpacity="0.05" />
      <path d="M9 13.5h6" />
      <path d="M12 5V2" />
      {/* Stairs on left */}
      <path d="M3 22v-3h3v-3h3" />
      {/* Decorative Islamic arch inside pulpit */}
      <path d="M10.5 17.5v-2c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v2" />
    </svg>
  );
}

// 5. IconScroll - Gulungan naskah pernikahan/khutbah dengan gulungan klasik di atas dan bawah
export function IconScroll({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Main parchment scroll */}
      <path d="M6 4h12c1.7 0 3 1.3 3 3v10c0 1.7-1.3 3-3 3H6c-1.7 0-3-1.3-3-3V7c0-1.7 1.3-3 3-3z" fill="currentColor" fillOpacity="0.05" />
      {/* Upper roll */}
      <path d="M5.5 7.5a2 2 0 1 1 0-4h13a2 2 0 1 1 0 4" />
      {/* Lower roll */}
      <path d="M5.5 20.5a2 2 0 1 1 0-4h13a2 2 0 1 1 0 4" />
      {/* Text lines */}
      <path d="M8 10h8" />
      <path d="M8 13.5h8" />
    </svg>
  );
}

// 6. IconCrescent - Bulan sabit dengan bintang (Ikon Kultum)
export function IconCrescent({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="currentColor" fillOpacity="0.1" />
      {/* 4-pointed star at the top right */}
      <path d="M19 3v4M21 5h-4" />
    </svg>
  );
}

// 7. IconCrescentStar - Bulan sabit dengan bintang di tengahnya
export function IconCrescentStar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="currentColor" fillOpacity="0.05" />
      {/* 5-pointed Star centered beautifully inside the crescent opening */}
      <polygon points="16,5.8 16.6,7.3 18.2,7.3 16.9,8.3 17.4,9.8 16.0,8.8 14.6,9.8 15.1,8.3 13.8,7.3 15.4,7.3" fill="currentColor" />
    </svg>
  );
}

// 8. IconStar5 - Bintang 8 sudut (Rub El Hizb) khas seni ornamen Islam
export function IconStar5({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Rub El Hizb shape */}
      <path d="M12 2l2.8 2.8H19v4.2L21.8 12 19 14.8v4.2h-4.2L12 21.8 9.2 19H5v-4.2L2.2 12 5 9.2V5h4.2z" fill="currentColor" fillOpacity="0.08" />
      {/* Concentric circle inside */}
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// 9. IconPrayer - Dua telapak tangan terbuka menghadap ke atas (sikap berdoa/tasyakur)
export function IconPrayer({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Left Hand */}
      <path d="M11 18c0 1.8-1.2 3.2-2.8 3.2S5.4 19.8 5.4 18v-5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v1.5c0 .4.3.7.8.7s.8-.3.8-.7V6c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v12z" fill="currentColor" fillOpacity="0.05" />
      {/* Right Hand (Symmetric) */}
      <path d="M13 18c0 1.8 1.2 3.2 2.8 3.2s2.8-1.4 2.8-3.2v-5c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v1.5c0 .4-.3.7-.8.7s-.8-.3-.8-.7V6c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v12z" fill="currentColor" fillOpacity="0.05" />
    </svg>
  );
}

// 10. IconMicrophone - Mikrofon ceramah yang modern
export function IconMicrophone({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" fillOpacity="0.05" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <line x1="9" y1="22" x2="15" y2="22" />
    </svg>
  );
}

// 11. IconDome - Kubah masjid yang bulat indah
export function IconDome({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 21h18" />
      {/* Dome curve */}
      <path d="M5 21c0-5.5 3.1-9 7-10 3.9 1 7 4.5 7 10" fill="currentColor" fillOpacity="0.05" />
      <path d="M12 11V7" />
      <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" />
      {/* Arch decoration */}
      <path d="M9 21v-3.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5V21" />
    </svg>
  );
}

// 12. IconKhutbah - Khatib yang berdiri menyampaikan naskah di mimbar
export function IconKhutbah({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="5.5" r="2.5" />
      {/* Speaker body */}
      <path d="M8 12.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2.5H8V12.5z" />
      {/* Podium stand */}
      <path d="M5 22h14" />
      <path d="M8.5 15h7v7h-7z" fill="currentColor" fillOpacity="0.08" />
      {/* Inner arch decoration */}
      <path d="M10.5 22v-2c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v2" />
    </svg>
  );
}

// 13. IconHistory - Jam riwayat naskah
export function IconHistory({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <polyline points="3 3 3 8 8 8" />
      <line x1="12" y1="7" x2="12" y2="12" />
      <line x1="12" y1="12" x2="15" y2="14" />
    </svg>
  );
}

// 14. IconBookmark - Simpan template naskah
export function IconBookmark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="currentColor" fillOpacity="0.05" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="12" x2="13" y2="12" />
    </svg>
  );
}

// 15. IconInfo - Tentang aplikasi
export function IconInfo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// 16. IconShield - Tameng disclaimer/keamanan
export function IconShield({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.05" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// 17. IconUser - Pengguna/Akun
export function IconUser({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="4" fill="currentColor" fillOpacity="0.05" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

// 18. IconLogout - Keluar akun
export function IconLogout({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// 19. IconSun - Mode terang
export function IconSun({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="6.34" y1="17.66" x2="4.93" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="17.66" y2="6.34" />
    </svg>
  );
}

// 20. IconMoon - Mode gelap
export function IconMoon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.08" />
    </svg>
  );
}

// 21. IconSearch - Pencarian naskah
export function IconSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// 22. IconMail - Email
export function IconMail({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" fillOpacity="0.05" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

// 23. IconLock - Kata sandi
export function IconLock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="currentColor" fillOpacity="0.05" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 24. IconEye - Tampilkan password
export function IconEye({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.1" />
    </svg>
  );
}

// 25. IconEyeOff - Sembunyikan password
export function IconEyeOff({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// 26. IconRefresh - Ganti captcha / Refresh
export function IconRefresh({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <polyline points="21 3 21 8 16 8" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <polyline points="3 21 3 16 8 16" />
    </svg>
  );
}

// 27. IconX - Tutup modal
export function IconX({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// 28. IconChevronDown - Panah dropdown kebawah
export function IconChevronDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// 29. IconArrowRight - Panah lanjut kartu
export function IconArrowRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// 30. IconPhone - Hubungi kontak
export function IconPhone({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2.8h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.72 18z" />
    </svg>
  );
}

// 31. IconMapPin - Alamat kontak
export function IconMapPin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="currentColor" fillOpacity="0.05" />
      <circle cx="12" cy="10" r="3" fill="currentColor" />
    </svg>
  );
}

// 32. IconHeart - Dibuat dengan cinta
export function IconHeart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// 33. IconFileText - Draft Naskah/File
export function IconFileText({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fillOpacity="0.05" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

// 34. IconAdmin - Admin panel
export function IconAdmin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" fill="currentColor" fillOpacity="0.05" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// 35. IconGithub - Link github
export function IconGithub({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

// 36. IconDakwahLogo - Logo premium aplikasi dakwah (Kubah Masjid dengan ornamen Bulan Sabit)
export function IconDakwahLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Base floor */}
      <path d="M4 28h24" />
      {/* Mosque Dome main body */}
      <path d="M8 24c0-5 3.5-8.5 8-10 4.5 1.5 8 5 8 10" fill="currentColor" fillOpacity="0.08" />
      {/* Minarets side pillars */}
      <path d="M6 28v-9M26 28v-9" />
      {/* Arch Gate */}
      <path d="M13 28v-3c0-1.7 1.3-3 3-3s3 1.3 3 3v3" />
      {/* Elegant Crescent Moon on Top of Dome - Made larger and higher */}
      <path d="M16 2A4.5 4.5 0 0 0 16 11A6 6 0 0 1 16 2Z" fill="currentColor" />
    </svg>
  );
}

// 37. IconPencil - Edit naskah
export function IconPencil({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

// 38. IconSave - Simpan naskah
export function IconSave({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" fill="currentColor" fillOpacity="0.05" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

// 39. IconTrash - Hapus naskah
export function IconTrash({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" fill="currentColor" fillOpacity="0.05" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

// 40. IconCopy - Salin naskah
export function IconCopy({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="currentColor" fillOpacity="0.05" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// 41. IconDownload - Unduh naskah
export function IconDownload({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// 42. IconSparkles - AI Generate / Hasilkan Naskah
export function IconSparkles({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Beautiful sparkles using fine bezier stars */}
      <path d="M12 3c.2 2.5 1.5 3.8 4 4-2.5.2-3.8 1.5-4 4-.2-2.5-1.5-3.8-4-4 2.5-.2 3.8-1.5 4-4z" fill="currentColor" />
      <path d="M19 12c.1 1.5.9 2.3 2.4 2.4-1.5.1-2.3.9-2.4 2.4-.1-1.5-.9-2.3-2.4-2.4 1.5-.1 2.3-.9 2.4-2.4z" fill="currentColor" />
      <path d="M6 16c.1 1 .6 1.5 1.6 1.6-1 .1-1.5.6-1.6 1.6-.1-1-.6-1.5-1.6-1.6 1-.1 1.5-.6 1.6-1.6z" fill="currentColor" />
    </svg>
  );
}

// 43. IconCheckCircle - Hasil verifikasi sukses
export function IconCheckCircle({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.05" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

// 44. IconAlertTriangle - Peringatan kepatuhan
export function IconAlertTriangle({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="currentColor" fillOpacity="0.05" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// 45. IconChevronUp - Panah dropdown keatas
export function IconChevronUp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

// 46. IconMaximize - Tampilan penuh editor
export function IconMaximize({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

// 47. IconMinimize - Tampilan kecil editor
export function IconMinimize({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

// 48. IconMoveDown - Pindah kebawah
export function IconMoveDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

// 49. IconMoveUp - Pindah keatas
export function IconMoveUp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

// 50. IconFileDown - Ekspor PDF/DOCX
export function IconFileDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fillOpacity="0.05" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <polyline points="9 15 12 18 15 15" />
    </svg>
  );
}

// 50b. IconPdf - Ekspor ke PDF (dokumen dengan label PDF)
export function IconPdf({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Document body */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fillOpacity="0.07" />
      <polyline points="14 2 14 8 20 8" />
      {/* PDF text label */}
      <text x="4.5" y="18.5" fontSize="5.5" fontWeight="700" fontFamily="sans-serif" stroke="none" fill="currentColor" letterSpacing="0.3">PDF</text>
    </svg>
  );
}

// 50c. IconDocx - Ekspor ke DOCX/Word (dokumen dengan label W)
export function IconDocx({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Document body */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fillOpacity="0.07" />
      <polyline points="14 2 14 8 20 8" />
      {/* DOC label */}
      <text x="4" y="18.5" fontSize="5.5" fontWeight="700" fontFamily="sans-serif" stroke="none" fill="currentColor" letterSpacing="0.3">DOC</text>
    </svg>
  );
}

// 51. IconRotateCcw - Kembalikan versi
export function IconRotateCcw({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3" />
    </svg>
  );
}

// 51b. IconSync - Dua panah memutar membentuk lingkaran (Generate)
export function IconSync({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Top-right arrow (clockwise) */}
      <path d="M21 2v6h-6" />
      {/* Bottom-left arrow (clockwise) */}
      <path d="M3 22v-6h6" />
      {/* Top arc */}
      <path d="M20.49 9a9 9 0 0 0-17 2" />
      {/* Bottom arc */}
      <path d="M3.51 15a9 9 0 0 0 17-2" />
    </svg>
  );
}

// 52. IconSendToBack - Gunakan template naskah
export function IconSendToBack({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="8" width="10" height="10" rx="1" fill="currentColor" fillOpacity="0.05" />
      <rect x="12" y="4" width="10" height="10" rx="1" fill="none" />
      <path d="M7 8V4h5" />
    </svg>
  );
}

// 53. IconUsers - Kelola admin pengguna
export function IconUsers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" fill="currentColor" fillOpacity="0.05" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// 55. IconGenerateAI - Hasilkan naskah dengan AI (dokumen + kilatan bintang)
export function IconGenerateAI({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Document body */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fillOpacity="0.06" />
      <polyline points="14 2 14 8 20 8" />
      {/* Text lines on document */}
      <line x1="8" y1="11" x2="13" y2="11" />
      <line x1="8" y1="14" x2="11" y2="14" />
      {/* Sparkle star overlay (AI magic) – positioned bottom-right */}
      <path d="M17 13c.15 1.85 1.15 2.85 3 3-1.85.15-2.85 1.15-3 3-.15-1.85-1.15-2.85-3-3 1.85-.15 2.85-1.15 3-3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 54. IconBookOpen - Daftar tema khutbah jumat pilihan
export function IconBookOpen({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" fill="currentColor" fillOpacity="0.05" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill="currentColor" fillOpacity="0.05" />
    </svg>
  );
}
