import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconMoon,
  IconRefresh,
  IconSun,
  IconUser,
  IconX
} from "./icons";
import { Button, IconButton, Input } from "./ui";
import { getPublicConfig, type AuthCaptchaConfig } from "../lib/public-config";
import { api, cn } from "../lib/utils";
import type { User } from "../types";

const authCardClass =
  "relative w-full max-w-[340px] rounded-lg border border-border bg-card px-4 py-5 text-card-foreground shadow-2xl sm:max-w-[560px] sm:px-8 sm:py-9 lg:max-w-[520px] lg:px-7 lg:py-8";

type CaptchaChallenge = {
  token: string;
  question: string;
  inputMode: "numeric" | "text";
  placeholder: string;
  hint?: string;
  noise: Array<{ left: number; top: number; width: number; rotate: number }>;
};

export function Login({
  onLogin,
  dark,
  setDark,
  variant = "page",
  onClose
}: {
  onLogin: (user: User) => void;
  dark: boolean;
  setDark: (value: boolean) => void;
  variant?: "page" | "modal";
  onClose?: () => void;
}) {
  const [username, setUsername] = useState(() => (import.meta.env.DEV ? "admin" : ""));
  const [password, setPassword] = useState(() => (import.meta.env.DEV ? "admin123" : ""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const initialResetToken =
    window.location.pathname === "/reset-password" ? new URLSearchParams(window.location.search).get("token") ?? "" : "";
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [authPanel, setAuthPanel] = useState<"login" | "register" | "forgot" | "reset" | "terms" | "privacy">(
    initialResetToken ? "reset" : "login"
  );
  const [notice, setNotice] = useState("");
  const [authCaptchaConfig, setAuthCaptchaConfig] = useState<AuthCaptchaConfig>({ provider: "manual" });
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);

  useEffect(() => {
    getPublicConfig()
      .then((data) => {
        setGoogleOAuthEnabled(Boolean(data.data.googleOAuthEnabled));
        if (data.data.authCaptcha?.provider === "turnstile" && data.data.authCaptcha.turnstileSiteKey) {
          setAuthCaptchaConfig({ provider: "turnstile", turnstileSiteKey: data.data.authCaptcha.turnstileSiteKey });
          return;
        }
        setAuthCaptchaConfig({ provider: "manual" });
      })
      .catch(() => {
        setGoogleOAuthEnabled(false);
        setAuthCaptchaConfig({ provider: "manual" });
      });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      onLogin(data.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  function startGoogleLogin() {
    if (googleOAuthEnabled) {
      window.location.href = "/api/auth/google";
      return;
    }

    setError("");
    setNotice("Login dengan Google belum dikonfigurasi. Gunakan email dan kata sandi, atau hubungi admin untuk mengaktifkan OAuth Google.");
  }

  const content =
    authPanel === "login" ? (
      <div className={authCardClass}>
        {onClose && (
          <button
            className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-md text-foreground transition hover:bg-accent"
            onClick={onClose}
            type="button"
            aria-label="Tutup"
          >
            <IconX className="size-6" />
          </button>
        )}
        <div className="mb-4 text-center sm:mb-6 lg:mb-5">
          <h1 className="text-2xl font-black tracking-normal sm:text-4xl lg:text-[2rem]">Masuk</h1>
          <p className="mt-2 text-sm text-foreground sm:mt-3 sm:text-lg lg:text-base">Masuk untuk mengelola naskah dakwah Anda</p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:gap-4 lg:gap-3" aria-label="Pilihan masuk cepat">
          <SocialLoginButton label="Google" onClick={startGoogleLogin}>
            <GoogleMark className="size-5" />
          </SocialLoginButton>
        </div>

        {notice && <p className="mt-4 rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">{notice}</p>}

        <div className="my-4 flex items-center gap-4 sm:my-6 sm:gap-5 lg:my-5">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-foreground sm:text-lg">atau</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="grid gap-3 sm:gap-4 lg:gap-3.5">
          <label className="relative block">
            <IconMail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground sm:left-5 sm:size-6 lg:left-4 lg:size-5" />
            <Input
              className="h-12 rounded-md px-4 pl-12 text-base sm:h-16 sm:px-5 sm:pl-16 sm:text-lg lg:h-14 lg:px-4 lg:pl-12 lg:text-base"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Email"
              autoComplete="username"
            />
          </label>
          <label className="relative block">
            <IconLock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground sm:left-5 sm:size-6 lg:left-4 lg:size-5" />
            <Input
              className="h-12 rounded-md px-4 pl-12 pr-12 text-base sm:h-16 sm:px-5 sm:pl-16 sm:pr-16 sm:text-lg lg:h-14 lg:px-4 lg:pl-12 lg:pr-12 lg:text-base"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Kata Sandi"
              autoComplete="current-password"
            />
            <button
              className="absolute right-4 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-foreground transition hover:bg-accent sm:right-5 lg:right-4"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <IconEyeOff className="size-5 sm:size-6 lg:size-5" /> : <IconEye className="size-5 sm:size-6 lg:size-5" />}
            </button>
          </label>
          <button
            className="w-max text-sm font-medium text-blue-600 hover:text-blue-700 sm:text-lg lg:text-base"
            onClick={() => {
              setError("");
              setNotice("");
              setAuthPanel("forgot");
            }}
            type="button"
          >
            Lupa kata sandi?
          </button>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button className="mt-1 h-12 rounded-md text-lg font-bold sm:mt-2 sm:h-16 sm:text-2xl lg:h-14 lg:text-xl" disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-foreground sm:mt-7 sm:text-lg lg:mt-5 lg:text-base">
          Belum punya akun?{" "}
          <button
            className="font-bold text-primary"
            onClick={() => {
              setError("");
              setNotice("");
              setAuthPanel("register");
            }}
            type="button"
          >
            Daftar
          </button>
        </p>
        <p className="mx-auto mt-3 max-w-[300px] text-center text-xs leading-5 text-muted-foreground sm:mt-4 sm:max-w-[460px] sm:text-base sm:leading-7 lg:mt-3 lg:max-w-[400px] lg:text-[15px] lg:leading-6">
          Dengan menekan tombol masuk, Anda menyatakan telah membaca, memahami, dan menyetujui{" "}
          <button
            className="underline"
            onClick={() => {
              setError("");
              setNotice("");
              setAuthPanel("terms");
            }}
            type="button"
          >
            Syarat Ketentuan
          </button>{" "}
          serta{" "}
          <button
            className="underline"
            onClick={() => {
              setError("");
              setNotice("");
              setAuthPanel("privacy");
            }}
            type="button"
          >
            Kebijakan Privasi
          </button>{" "}
          yang berlaku.
        </p>
      </div>
    ) : authPanel === "register" ? (
      <RegisterPanel
        onRegister={onLogin}
        onShowLogin={() => setAuthPanel("login")}
        onShowTerms={() => setAuthPanel("terms")}
        onShowPrivacy={() => setAuthPanel("privacy")}
        authCaptchaConfig={authCaptchaConfig}
        dark={dark}
      />
    ) : authPanel === "forgot" ? (
      <ForgotPasswordPanel onBack={() => setAuthPanel("login")} />
    ) : authPanel === "reset" ? (
      <ResetPasswordPanel
        token={resetToken}
        onBack={() => setAuthPanel("login")}
        onSuccess={() => {
          setResetToken("");
          window.history.replaceState(null, "", "/");
          setAuthPanel("login");
        }}
      />
    ) : authPanel === "terms" ? (
      <LegalPanel
        title="Syarat Ketentuan"
        paragraphs={[
          "Dengan menggunakan Dakwah, pengguna setuju untuk memakai aplikasi ini sebagai alat bantu penyusunan awal naskah dakwah, bukan sebagai rujukan keagamaan final.",
          "Pengguna bertanggung jawab penuh untuk meninjau, menyunting, dan memastikan ketepatan isi naskah sebelum disampaikan kepada jamaah atau digunakan dalam kegiatan resmi.",
          "Pengguna tidak diperkenankan menggunakan layanan untuk membuat konten yang menyesatkan, merugikan pihak lain, melanggar hukum, atau bertentangan dengan adab penyampaian dakwah.",
          "Dakwah dapat melakukan pembaruan fitur, perbaikan layanan, atau perubahan ketentuan penggunaan sesuai kebutuhan pengembangan aplikasi."
        ]}
        onBack={() => setAuthPanel("register")}
      />
    ) : (
      <LegalPanel
        title="Kebijakan Privasi"
        paragraphs={[
          "Dakwah menggunakan data akun seperti nama, email, dan informasi autentikasi untuk menyediakan akses pengguna dan menjaga keamanan sesi penggunaan aplikasi.",
          "Naskah, template, dan riwayat penggunaan yang disimpan di aplikasi digunakan untuk mendukung fitur penyimpanan, pencarian, penggunaan ulang, serta pengelolaan dokumen pengguna.",
          "Data pengguna tidak ditampilkan kepada pengguna lain kecuali dibutuhkan untuk fitur administrasi, pemeliharaan layanan, atau kewajiban teknis yang relevan.",
          "Pengguna dapat menghubungi pengelola aplikasi untuk permintaan terkait akun, data tersimpan, atau pertanyaan mengenai penggunaan informasi pribadi."
        ]}
        onBack={() => setAuthPanel("register")}
      />
    );

  return (
    <main
      className={cn(
        "grid justify-items-center overflow-y-auto px-3 pb-5 pt-16 text-foreground sm:px-4 sm:py-10",
        "items-start sm:place-items-center",
        variant === "page" ? "min-h-screen bg-background" : "fixed inset-0 z-50 bg-slate-950/95"
      )}
    >
      <div className="absolute right-4 top-4 z-20">
        <IconButton onClick={() => setDark(!dark)} aria-label="Ganti tema">
          {dark ? <IconSun className="size-4" /> : <IconMoon className="size-4" />}
        </IconButton>
      </div>
      <div className="mx-auto flex w-full max-w-[340px] flex-col items-center sm:max-w-[560px] lg:max-w-[520px]">
        {content}
        <FooterCredit className="mt-6 w-full justify-center border-t-0 bg-transparent px-4 py-4 text-center sm:mt-8" />
      </div>
    </main>
  );
}

function ForgotPasswordPanel({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await api<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setMessage(data.message);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Permintaan reset kata sandi gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={authCardClass}>
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-normal text-foreground sm:text-3xl">Lupa Kata Sandi</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Masukkan email akun untuk menerima tautan reset kata sandi.</p>
      </div>

      <form className="mt-7 grid gap-4" onSubmit={submit}>
        <label className="relative block">
          <IconMail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 min-h-12 rounded-full border-border bg-card px-5 pl-14 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px]"
            placeholder="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        {message && <p className="rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">{message}</p>}
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button className="h-11 rounded-full bg-primary text-base font-bold hover:bg-primary/90" disabled={loading}>
          {loading ? "Mengirim..." : "Kirim Link Reset"}
        </Button>
        <button className="text-base font-medium text-muted-foreground transition hover:text-foreground sm:text-lg" onClick={onBack} type="button">
          Kembali ke Masuk
        </button>
      </form>
    </div>
  );
}

function ResetPasswordPanel({ token, onBack, onSuccess }: { token: string; onBack: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Token reset tidak tersedia.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi belum sama.");
      return;
    }

    setLoading(true);
    try {
      const data = await api<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });
      setMessage(data.message);
      window.setTimeout(onSuccess, 900);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Reset kata sandi gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={authCardClass}>
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-normal text-foreground sm:text-3xl">Kata Sandi Baru</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Buat kata sandi baru untuk akun Dakwah Anda.</p>
      </div>

      <form className="mt-7 grid gap-4" onSubmit={submit}>
        <label className="relative block">
          <IconLock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 min-h-12 rounded-full border-border bg-card px-5 pl-14 pr-14 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px]"
            placeholder="Kata sandi baru"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <button
            className="absolute right-4 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <IconEye className="size-5" /> : <IconEyeOff className="size-5" />}
          </button>
        </label>
        <label className="relative block">
          <IconLock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 min-h-12 rounded-full border-border bg-card px-5 pl-14 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px]"
            placeholder="Ulangi kata sandi baru"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        {message && <p className="rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">{message}</p>}
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button className="h-11 rounded-full bg-primary text-base font-bold hover:bg-primary/90" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Kata Sandi"}
        </Button>
        <button className="text-base font-medium text-muted-foreground transition hover:text-foreground sm:text-lg" onClick={onBack} type="button">
          Kembali ke Masuk
        </button>
      </form>
    </div>
  );
}

function TurnstileWidget({
  siteKey,
  dark,
  resetSignal,
  onTokenChange,
  onError
}: {
  siteKey: string;
  dark: boolean;
  resetSignal: number;
  onTokenChange: (token: string) => void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const ensureTurnstile = () => {
      if (window.turnstile) return Promise.resolve();
      if (scriptPromiseRef.current) return scriptPromiseRef.current;
      scriptPromiseRef.current = new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]');
        if (existingScript) {
          if (window.turnstile) {
            resolve();
            return;
          }
          existingScript.addEventListener("load", () => resolve(), { once: true });
          existingScript.addEventListener("error", () => reject(new Error("Gagal memuat script Turnstile.")), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Gagal memuat script Turnstile."));
        document.head.appendChild(script);
      });
      return scriptPromiseRef.current;
    };

    let cancelled = false;
    void ensureTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: dark ? "dark" : "light",
          callback: (token) => onTokenChange(token),
          "expired-callback": () => onTokenChange(""),
          "error-callback": () => {
            onTokenChange("");
            onError("Turnstile gagal dimuat. Muat ulang halaman lalu coba lagi.");
          }
        });
      })
      .catch((error) => {
        if (!cancelled) onError(error instanceof Error ? error.message : "Turnstile gagal dimuat.");
      });

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [dark, onError, onTokenChange, siteKey]);

  useEffect(() => {
    if (!window.turnstile || !widgetIdRef.current) return;
    onTokenChange("");
    window.turnstile.reset(widgetIdRef.current);
  }, [onTokenChange, resetSignal]);

  return <div ref={containerRef} className="min-h-[65px] origin-top-left scale-[0.84] sm:scale-100" />;
}

function RegisterPanel({
  onRegister,
  onShowLogin,
  onShowTerms,
  onShowPrivacy,
  authCaptchaConfig,
  dark
}: {
  onRegister: (user: User) => void;
  onShowLogin: () => void;
  onShowTerms: () => void;
  onShowPrivacy: () => void;
  authCaptchaConfig: AuthCaptchaConfig;
  dark: boolean;
}) {
  const turnstileEnabled = authCaptchaConfig.provider === "turnstile";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaStatus, setCaptchaStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [captchaMessage, setCaptchaMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const captchaCheckRef = useRef(0);
  const captchaIsReady = turnstileEnabled ? turnstileToken.length > 0 : Boolean(captcha && captchaStatus === "valid");
  const handleTurnstileTokenChange = useCallback((token: string) => {
    setError("");
    setTurnstileToken(token);
  }, []);

  const refreshCaptcha = useCallback(async () => {
    if (turnstileEnabled) return;
    setCaptchaAnswer("");
    setCaptchaStatus("idle");
    setCaptchaMessage("");
    try {
      const challenge = await api<{ token: string; question: string; inputMode: "numeric" | "text"; placeholder: string; hint?: string }>(
        "/api/auth/captcha"
      );
      setCaptcha({ ...challenge, noise: createCaptchaNoise() });
    } catch (error) {
      setCaptcha(null);
      setError(error instanceof Error ? error.message : "Captcha gagal dimuat.");
    }
  }, [turnstileEnabled]);

  useEffect(() => {
    if (turnstileEnabled) {
      setCaptcha(null);
      setCaptchaAnswer("");
      return;
    }
    void refreshCaptcha();
  }, [refreshCaptcha, turnstileEnabled]);

  useEffect(() => {
    if (turnstileEnabled) return;

    captchaCheckRef.current += 1;
    const checkId = captchaCheckRef.current;
    const answer = captchaAnswer.trim();

    if (!captcha || !answer) {
      setCaptchaStatus("idle");
      setCaptchaMessage("");
      return;
    }

    setCaptchaStatus("checking");
    setCaptchaMessage("");

    const timeout = window.setTimeout(async () => {
      try {
        const result = await api<{ valid: boolean }>("/api/auth/captcha/verify", {
          method: "POST",
          body: JSON.stringify({ captchaToken: captcha.token, captchaAnswer: answer })
        });

        if (captchaCheckRef.current !== checkId) return;
        if (result.valid) {
          setCaptchaStatus("valid");
          setCaptchaMessage("Captcha benar.");
        } else {
          setCaptchaStatus("invalid");
          setCaptchaMessage("Jawaban captcha salah. Periksa lagi atau ganti captcha.");
        }
      } catch (error) {
        if (captchaCheckRef.current !== checkId) return;
        setCaptchaStatus("invalid");
        setCaptchaMessage(error instanceof Error ? error.message : "Captcha gagal diverifikasi. Coba lagi.");
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [captcha, captchaAnswer, turnstileEnabled]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (turnstileEnabled) {
      if (!turnstileToken) {
        setError("Selesaikan verifikasi Turnstile terlebih dahulu.");
        return;
      }
    } else {
      if (!captcha || !captchaAnswer.trim()) {
        setError("Lengkapi captcha terlebih dahulu.");
        return;
      }
      if (captchaStatus === "checking") {
        setError("Tunggu verifikasi captcha selesai.");
        return;
      }
      if (captchaStatus !== "valid") {
        setError("Jawaban captcha salah. Periksa lagi atau ganti captcha.");
        return;
      }
    }

    setLoading(true);
    try {
      const data = await api<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(
          turnstileEnabled
            ? { email, name, password, turnstileToken }
            : { email, name, password, captchaToken: captcha?.token, captchaAnswer }
        )
      });
      onRegister(data.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registrasi gagal.");
      if (turnstileEnabled) {
        setTurnstileToken("");
        setTurnstileResetSignal((value) => value + 1);
      } else {
        void refreshCaptcha();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        authCardClass,
        "self-start max-w-[340px] overflow-hidden px-4 py-4 sm:my-auto sm:max-h-[calc(100vh-4rem)] sm:max-w-[560px] sm:self-auto sm:overflow-y-auto sm:px-8 sm:py-8 lg:max-w-[520px] lg:px-7 lg:py-7"
      )}
    >
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-normal text-foreground sm:text-3xl lg:text-[1.875rem]">Daftar</h1>
        <div className="mx-auto mt-5 hidden size-16 place-items-center rounded-full bg-muted text-muted-foreground shadow-inner ring-4 ring-border sm:grid lg:mt-4 lg:size-14">
          <IconUser className="size-12 lg:size-10" />
        </div>
      </div>

      <form className="mx-auto mt-3 grid max-w-[520px] gap-2.5 sm:mt-6 sm:gap-4 lg:mt-5 lg:max-w-[440px] lg:gap-3" onSubmit={submit}>
        <label className="relative block">
          <IconUser className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground sm:size-5" />
          <Input className="h-10 min-h-10 rounded-full border-border bg-card px-4 pl-11 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px] sm:px-5 sm:pl-14" placeholder="Nama" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
        </label>
        <label className="relative block">
          <IconMail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground sm:size-5" />
          <Input className="h-10 min-h-10 rounded-full border-border bg-card px-4 pl-11 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px] sm:px-5 sm:pl-14" placeholder="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        </label>
        <label className="relative block">
          <IconLock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground sm:size-5" />
          <Input className="h-10 min-h-10 rounded-full border-border bg-card px-4 pl-11 pr-11 text-base text-foreground placeholder:text-muted-foreground sm:h-[52px] sm:min-h-[52px] sm:px-5 sm:pl-14 sm:pr-14" placeholder="Kata sandi" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} required />
          <button className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent sm:right-4" onClick={() => setShowPassword((value) => !value)} type="button" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
            {showPassword ? <IconEye className="size-5" /> : <IconEyeOff className="size-5" />}
          </button>
        </label>

        <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-2 sm:gap-3 sm:rounded-2xl sm:p-4 lg:gap-2.5 lg:p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Verifikasi keamanan</p>
            {!turnstileEnabled && (
              <button className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-accent" onClick={() => void refreshCaptcha()} type="button" aria-label="Ganti captcha" title="Ganti captcha">
                <IconRefresh className="size-4" />
              </button>
            )}
          </div>
          {turnstileEnabled ? (
            <div className="h-[92px] overflow-hidden rounded-lg border border-border bg-card px-2 py-3 sm:h-auto sm:rounded-xl sm:px-4 sm:py-4">
              <TurnstileWidget
                siteKey={authCaptchaConfig.turnstileSiteKey}
                dark={dark}
                resetSignal={turnstileResetSignal}
                onTokenChange={handleTurnstileTokenChange}
                onError={setError}
              />
            </div>
          ) : (
            <>
              <div className="relative flex w-full items-start overflow-visible rounded-lg border border-border bg-card px-3 py-2 sm:rounded-xl sm:px-4 sm:py-4" aria-label={captcha ? `Soal captcha ${captcha.question}` : "Memuat captcha"}>
                {captcha?.noise.map((line, index) => (
                  <span
                    key={`${line.left}-${index}`}
                    className="pointer-events-none absolute h-px rounded-full bg-muted-foreground/35"
                    style={{ left: `${line.left}%`, top: `${line.top}%`, width: `${line.width}px`, transform: `rotate(${line.rotate}deg)` }}
                  />
                ))}
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--muted-foreground)/0.22)_1px,transparent_0)] bg-[length:8px_8px] opacity-60" />
                <span className="relative z-10 block w-full max-w-full select-none whitespace-normal break-words text-left font-mono text-sm font-semibold leading-5 tracking-normal text-foreground sm:py-1 sm:text-[15px] sm:leading-6">
                  {captcha?.question ?? "Memuat..."}
                </span>
              </div>
              <Input
                className="h-9 rounded-full border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground sm:h-11"
                type="text"
                value={captchaAnswer}
                onChange={(event) => {
                  setError("");
                  setCaptchaAnswer(event.target.value);
                }}
                placeholder={captcha?.placeholder ?? "Masukkan jawaban"}
                aria-label="Jawaban captcha"
                aria-invalid={captchaStatus === "invalid"}
                aria-describedby="captcha-status"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode={captcha?.inputMode === "numeric" ? "numeric" : "text"}
              />
              {captchaMessage && <p id="captcha-status" className={cn("text-xs", captchaStatus === "valid" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{captchaMessage}</p>}
              {captchaStatus === "checking" && <p id="captcha-status" className="text-xs text-muted-foreground">Memeriksa captcha...</p>}
              {captcha?.hint && <p className="text-xs text-muted-foreground">{captcha.hint}</p>}
            </>
          )}
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <div className="relative mt-1 flex items-center justify-center sm:mt-2">
          <Button className="h-10 w-full rounded-full bg-primary px-5 text-base font-bold hover:bg-primary/90 sm:h-11 sm:w-auto sm:min-w-36" disabled={!captchaIsReady || loading}>
            {loading ? "Mendaftar..." : "Daftar"}
          </Button>
        </div>
      </form>

      <p className="mt-3 text-center text-sm text-foreground sm:mt-7 sm:text-lg lg:mt-5 lg:text-base">
        Sudah punya akun?{" "}
        <button className="font-medium text-primary" onClick={onShowLogin} type="button">
          Masuk sekarang
        </button>
      </p>
      <p className="mx-auto mt-2 max-w-[320px] text-center text-[11px] leading-4 text-muted-foreground sm:mt-4 sm:max-w-[460px] sm:text-base sm:leading-7 lg:mt-3 lg:max-w-[400px] lg:text-[15px] lg:leading-6">
        Dengan menekan tombol daftar, Anda menyatakan telah membaca, memahami, dan menyetujui{" "}
        <button className="underline" onClick={onShowTerms} type="button">Syarat Ketentuan</button> serta{" "}
        <button className="underline" onClick={onShowPrivacy} type="button">Kebijakan Privasi</button> yang berlaku.
      </p>
    </div>
  );
}

function createCaptchaNoise() {
  return Array.from({ length: 5 }, () => ({
    left: Math.floor(Math.random() * 78),
    top: Math.floor(Math.random() * 78) + 10,
    width: Math.floor(Math.random() * 70) + 45,
    rotate: Math.floor(Math.random() * 121) - 60
  }));
}

function LegalPanel({ title, paragraphs, backLabel = "Kembali ke Daftar", onBack }: { title: string; paragraphs: string[]; backLabel?: string; onBack: () => void }) {
  return (
    <div className="relative w-full max-w-[520px] rounded-2xl border border-border bg-card px-5 py-8 text-card-foreground shadow-2xl sm:px-8">
      <h1 className="text-center text-2xl font-black tracking-normal text-foreground">{title}</h1>
      <div className="mt-6 grid gap-4 text-sm leading-6 text-muted-foreground">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <Button className="mt-7 h-11 w-full rounded-full bg-primary text-base font-bold hover:bg-primary/90" onClick={onBack} type="button">
        {backLabel}
      </Button>
    </div>
  );
}

function SocialLoginButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="flex h-11 items-center justify-center gap-2.5 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-accent sm:h-14 sm:gap-3 sm:text-base lg:h-12 lg:text-sm"
      onClick={onClick}
      type="button"
      aria-label={`Masuk dengan ${label}`}
      title={label}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M21.805 12.23c0-.718-.064-1.408-.184-2.07H12v3.92h5.498a4.703 4.703 0 0 1-2.04 3.086v2.562h3.305c1.935-1.782 3.042-4.412 3.042-7.498Z" fill="#4285F4" />
      <path d="M12 22c2.76 0 5.074-.914 6.763-2.472l-3.305-2.562c-.915.614-2.086.976-3.458.976-2.655 0-4.905-1.793-5.708-4.204H2.875V16.38A9.997 9.997 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.292 13.738A5.997 5.997 0 0 1 5.973 12c0-.603.109-1.19.319-1.738V7.62H2.875A9.997 9.997 0 0 0 2 12c0 1.609.384 3.13 1.075 4.38l3.217-2.642Z" fill="#FBBC04" />
      <path d="M12 6.058c1.5 0 2.847.516 3.907 1.529l2.93-2.93C17.07 2.995 14.756 2 12 2A9.997 9.997 0 0 0 2.875 7.62l3.417 2.642C7.095 7.851 9.345 6.058 12 6.058Z" fill="#EA4335" />
    </svg>
  );
}

function FooterCredit({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center text-xs text-muted-foreground", className)}>
      <span>Dakwah</span>
    </div>
  );
}
