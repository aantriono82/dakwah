import { useState } from "react";
import { Field, Input, Select, Textarea } from "./ui";
import type { JenisId } from "../lib/utils";

type Parameters = Record<string, string>;

const bahasaOptions = ["Indonesia", "Jawa", "Sunda", "Ogan (Baturaja)", "Arab"];
const durasiOptions = ["pendek", "sedang", "panjang"];
const gayaBahasaOptions = [
  { value: "natural-jelas", label: "Natural dan jelas" },
  { value: "sangat-natural", label: "Sangat natural" }
];
const modeSumberInternetOptions = [
  { value: "manual", label: "Manual / tidak browsing" },
  { value: "web-search", label: "Aktifkan web search (lebih lambat)" }
];

// ─── Voice Input Button ───────────────────────────────────────────────────────
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
interface ISpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

function VoiceInputButton({
  onResult,
  lang = "id-ID",
  title = "Rekam suara"
}: {
  onResult: (text: string) => void;
  lang?: string;
  title?: string;
}) {
  const [listening, setListening] = useState(false);

  const SpeechRecognitionCtor =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;

  if (!SpeechRecognitionCtor) return null;

  function handleToggle() {
    if (listening) return;
    const recognition = new SpeechRecognitionCtor!();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) onResult(transcript.trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={title}
      aria-label={listening ? "Merekam suara..." : title}
      className={[
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition",
        listening
          ? "animate-pulse border-destructive bg-destructive/10 text-destructive"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40"
      ].join(" ")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" fillOpacity={listening ? 0.2 : 0.05} />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="17" x2="12" y2="22" />
        <line x1="9" y1="22" x2="15" y2="22" />
      </svg>
    </button>
  );
}

// ─── Voiced Input Field ───────────────────────────────────────────────────────
function VoicedInput({
  value,
  onChange,
  required,
  placeholder,
  lang = "id-ID"
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  lang?: string;
}) {
  return (
    <div className="flex gap-2">
      <Input
        className="flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
      <VoiceInputButton lang={lang} onResult={(text) => onChange(value ? `${value} ${text}` : text)} title="Rekam topik dengan suara" />
    </div>
  );
}

// ─── Default Parameters ───────────────────────────────────────────────────────
export function defaultParameters(jenis: JenisId): Parameters {
  const common = {
    bahasa: "Indonesia",
    fokusAkurasi: "ketat",
    gayaBahasaNaskah: "natural-jelas",
    gayaRetorika: "standar",
    strategiDalil: "relevan",
    haditsReferensi: "",
    sumberInternet: "",
    modeSumberInternet: "manual",
    catatanEditor: ""
  };
  if (jenis === "khutbah-jumat") return { ...common, temaUtama: "", durasi: "sedang" };
  if (jenis === "idul-fitri") return { ...common, tema: "", durasi: "sedang" };
  if (jenis === "idul-adha") return { ...common, tema: "", durasi: "sedang" };
  if (jenis === "nikah") return { ...common, mempelaiPria: "", mempelaiWanita: "", temaPesan: "", durasi: "sedang" };
  if (jenis === "ceramah") return { ...common, topik: "", durasi: "sedang" };
  return { ...common, topikSingkat: "", durasi: "sedang" };
}

export function FormKhutbah({
  jenis,
  values,
  onChange
}: {
  jenis: JenisId;
  values: Parameters;
  onChange: (values: Parameters) => void;
}) {
  const set = (key: string, value: string) => onChange({ ...values, [key]: value });
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="grid gap-4">
      <Field label="Bahasa">
        <Select value={values.bahasa ?? "Indonesia"} onChange={(event) => set("bahasa", event.target.value)}>
          {bahasaOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
      </Field>

      {jenis === "khutbah-jumat" && (
        <>
          <Field label="Tema utama">
            <VoicedInput value={values.temaUtama ?? ""} onChange={(v) => set("temaUtama", v)} required />
          </Field>
          <Field label="Durasi">
            <Select value={values.durasi ?? "sedang"} onChange={(event) => set("durasi", event.target.value)}>
              {durasiOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
        </>
      )}

      {jenis === "idul-fitri" && (
        <>
          <Field label="Tema">
            <VoicedInput value={values.tema ?? ""} onChange={(v) => set("tema", v)} required />
          </Field>
          <Field label="Durasi">
            <Select value={values.durasi ?? "sedang"} onChange={(event) => set("durasi", event.target.value)}>
              {durasiOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
        </>
      )}

      {jenis === "idul-adha" && (
        <>
          <Field label="Tema">
            <VoicedInput value={values.tema ?? ""} onChange={(v) => set("tema", v)} required />
          </Field>
          <Field label="Durasi">
            <Select value={values.durasi ?? "sedang"} onChange={(event) => set("durasi", event.target.value)}>
              {durasiOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
        </>
      )}

      {jenis === "nikah" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama mempelai pria">
              <Input value={values.mempelaiPria ?? ""} onChange={(event) => set("mempelaiPria", event.target.value)} />
            </Field>
            <Field label="Nama mempelai wanita">
              <Input value={values.mempelaiWanita ?? ""} onChange={(event) => set("mempelaiWanita", event.target.value)} />
            </Field>
          </div>
          <Field label="Tema pesan pernikahan">
            <VoicedInput value={values.temaPesan ?? ""} onChange={(v) => set("temaPesan", v)} required />
          </Field>
          <Field label="Durasi">
            <Select value={values.durasi ?? "sedang"} onChange={(event) => set("durasi", event.target.value)}>
              {durasiOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
        </>
      )}

      {jenis === "ceramah" && (
        <>
          <Field label="Topik bebas">
            <VoicedInput value={values.topik ?? ""} onChange={(v) => set("topik", v)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-1">
            <Field label="Durasi">
              <Select value={values.durasi ?? "sedang"} onChange={(event) => set("durasi", event.target.value)}>
                {durasiOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </Field>
          </div>
        </>
      )}

      {jenis === "kultum" && (
        <>
          <Field label="Topik singkat">
            <VoicedInput value={values.topikSingkat ?? ""} onChange={(v) => set("topikSingkat", v)} required />
          </Field>
          <Field label="Durasi">
            <Select value={values.durasi ?? "sedang"} onChange={(event) => set("durasi", event.target.value)}>
              {durasiOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
        </>
      )}

      <section className="grid gap-3 rounded-md border border-border px-3 py-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((current) => !current)}
          className="flex items-center justify-between gap-3 text-left"
          aria-expanded={advancedOpen}
        >
          <div>
            <p className="text-sm font-medium text-foreground">Advanced</p>
            <p className="mt-1 text-xs text-muted-foreground">Gaya bahasa, catatan tambahan, referensi hadits, dan web search. Default sistem sudah cukup untuk generate biasa.</p>
          </div>
          <span className="text-xs text-muted-foreground">{advancedOpen ? "Tutup" : "Buka"}</span>
        </button>

        {advancedOpen ? (
          <div className="grid gap-4 border-t border-border pt-3">
            <div className="grid gap-4 sm:grid-cols-1">
              <Field label="Gaya bahasa">
                <Select value={values.gayaBahasaNaskah ?? "natural-jelas"} onChange={(event) => set("gayaBahasaNaskah", event.target.value)}>
                  {gayaBahasaOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Catatan editor">
              <Textarea
                value={values.catatanEditor ?? ""}
                onChange={(event) => set("catatanEditor", event.target.value)}
                placeholder="Contoh: hindari bahasa terlalu puitis, jelaskan makna dalil dengan sederhana, fokus untuk jamaah remaja."
              />
            </Field>

            <Field label="Hadits referensi">
              <Textarea
                value={values.haditsReferensi ?? ""}
                onChange={(event) => set("haditsReferensi", event.target.value)}
                placeholder="Contoh: HR. Bukhari dan Muslim tentang berkata baik atau diam; HR. Bukhari tentang muslim yang selamat dari gangguan lisan dan tangannya."
              />
            </Field>

            <Field label="Sumber internet opsional">
              <Textarea
                value={values.sumberInternet ?? ""}
                onChange={(event) => set("sumberInternet", event.target.value)}
                placeholder="Isi URL, nama website, atau ringkasan artikel tepercaya. Web search hanya aktif jika Anda memilih mode web search di bawah."
              />
            </Field>

            <Field label="Mode sumber internet">
              <Select value={values.modeSumberInternet ?? "manual"} onChange={(event) => set("modeSumberInternet", event.target.value)}>
                {modeSumberInternetOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}
      </section>
    </div>
  );
}
