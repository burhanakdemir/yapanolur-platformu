/**
 * Yalnızca geliştirme: DEV_SUPER_ADMIN_HINT_* ile tanımlı süper admin örnek bilgilerini gösterir.
 * Üretimde render edilmez.
 */
export default function AdminGateDevHint({
  email,
  password,
}: {
  email: string | null;
  password: string | null;
}) {
  if (!email && !password) return null;

  return (
    <div className="rounded-xl border border-dashed border-amber-400/80 bg-amber-50/95 p-4 text-left text-xs text-amber-950 shadow-inner">
      <p className="font-bold uppercase tracking-wide text-amber-900">Yerel geliştirme — örnek süper admin</p>
      <p className="mt-2 text-amber-900/90">
        Aşağıdaki değerler <code className="rounded bg-white/80 px-1">.env</code> içinde{" "}
        <code className="rounded bg-white/80 px-1">DEV_SUPER_ADMIN_HINT_EMAIL</code> ve{" "}
        <code className="rounded bg-white/80 px-1">DEV_SUPER_ADMIN_HINT_PASSWORD</code> ile
        ayarlanır; veritabanındaki <strong>SUPER_ADMIN</strong> hesabıyla eşleşmelidir.
      </p>
      {email ? (
        <p className="mt-2 break-all">
          <span className="font-semibold">E-posta:</span>{" "}
          <code className="rounded bg-white/90 px-1.5 py-0.5">{email}</code>
        </p>
      ) : null}
      {password ? (
        <p className="mt-1 break-all">
          <span className="font-semibold">Şifre:</span>{" "}
          <code className="rounded bg-white/90 px-1.5 py-0.5">{password}</code>
        </p>
      ) : null}
    </div>
  );
}
