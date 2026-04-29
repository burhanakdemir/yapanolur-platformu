/** httpOnly cookie: anonim destek oturumu */
export const SUPPORT_VISITOR_COOKIE = "support_vkey";

/** Yönetici “çevrimiçi” sayılmak için son ping (dakika) */
export const SUPPORT_ONLINE_GRACE_MINUTES = 2;

/** Çevrimdışı iken aynı sohbet için e-posta tekrar aralığı (ms) */
export const SUPPORT_EMAIL_THROTTLE_MS = 10 * 60 * 1000;

export const SUPPORT_MAX_BODY_CHARS = 4000;
export const SUPPORT_MAX_MESSAGES_PER_CONV_PER_HOUR = 40;
export const SUPPORT_MAX_NEW_CONV_PER_KEY_PER_DAY = 5;
