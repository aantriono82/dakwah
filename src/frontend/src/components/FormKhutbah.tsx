import { Field, Input, Select, Textarea } from "./ui";
import type { JenisId } from "../lib/utils";

type Parameters = Record<string, string>;

const bahasaOptions = ["Indonesia", "Jawa", "Sunda", "Ogan (Baturaja)", "Arab"];
const durasiOptions = ["pendek", "sedang", "panjang"];
const fokusAkurasiOptions = [
  { value: "ketat", label: "Ketat" },
  { value: "maksimal", label: "Maksimal" }
];
const gayaBahasaOptions = [
  { value: "natural-jelas", label: "Natural dan jelas" },
  { value: "sangat-natural", label: "Sangat natural" }
];
const gayaRetorikaOptions = [
  { value: "standar", label: "Standar / Netral" },
  { value: "quraish-shihab", label: "Teduh & Akademik" },
  { value: "zainuddin-mz", label: "Komunikatif & Praktis" },
  { value: "buya-hamka", label: "Sastra & Filosofis" }
];
const strategiDalilOptions = [
  { value: "relevan", label: "Relevan" },
  { value: "sangat-relevan", label: "Sangat relevan" }
];

export function defaultParameters(jenis: JenisId): Parameters {
  const common = {
    bahasa: "Indonesia",
    fokusAkurasi: "maksimal",
    gayaBahasaNaskah: "natural-jelas",
    gayaRetorika: "standar",
    strategiDalil: "sangat-relevan",
    catatanEditor: ""
  };
  if (jenis === "khutbah-jumat") return { ...common, temaUtama: "", subTema: "", ayatReferensi: "", durasi: "sedang" };
  if (jenis === "idul-fitri") return { ...common, tema: "", nuansa: "reflektif", momenSpesifik: "" };
  if (jenis === "idul-adha") return { ...common, tema: "", kisahNabi: "Nabi Ibrahim dan Nabi Ismail" };
  if (jenis === "nikah")
    return { ...common, mempelaiPria: "", mempelaiWanita: "", temaPesan: "", referensi: "", nuansa: "hangat", durasi: "sedang" };
  if (jenis === "ceramah") return { ...common, topik: "", targetAudiens: "campuran", setting: "masjid", durasi: "sedang" };
  return { ...common, topikSingkat: "", waktu: "maghrib", durasi: "sedang" };
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

  return (
    <div className="grid gap-4">
      <Field label="Bahasa">
        <Select value={values.bahasa ?? "Indonesia"} onChange={(event) => set("bahasa", event.target.value)}>
          {bahasaOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fokus akurasi">
          <Select value={values.fokusAkurasi ?? "maksimal"} onChange={(event) => set("fokusAkurasi", event.target.value)}>
            {fokusAkurasiOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gaya bahasa">
          <Select value={values.gayaBahasaNaskah ?? "natural-jelas"} onChange={(event) => set("gayaBahasaNaskah", event.target.value)}>
            {gayaBahasaOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gaya retorika">
          <Select value={values.gayaRetorika ?? "standar"} onChange={(event) => set("gayaRetorika", event.target.value)}>
            {gayaRetorikaOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Strategi dalil">
          <Select value={values.strategiDalil ?? "sangat-relevan"} onChange={(event) => set("strategiDalil", event.target.value)}>
            {strategiDalilOptions.map((item) => (
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

      {jenis === "khutbah-jumat" && (
        <>
          <Field label="Tema utama">
            <Input value={values.temaUtama ?? ""} onChange={(event) => set("temaUtama", event.target.value)} required />
          </Field>
          <Field label="Sub-tema">
            <Input value={values.subTema ?? ""} onChange={(event) => set("subTema", event.target.value)} />
          </Field>
          <Field label="Ayat Al-Quran referensi">
            <Textarea value={values.ayatReferensi ?? ""} onChange={(event) => set("ayatReferensi", event.target.value)} />
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
            <Input value={values.tema ?? ""} onChange={(event) => set("tema", event.target.value)} required />
          </Field>
          <Field label="Nuansa">
            <Select value={values.nuansa ?? "reflektif"} onChange={(event) => set("nuansa", event.target.value)}>
              {["haru", "semangat", "reflektif"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
          <Field label="Momen spesifik">
            <Input value={values.momenSpesifik ?? ""} onChange={(event) => set("momenSpesifik", event.target.value)} />
          </Field>
        </>
      )}

      {jenis === "idul-adha" && (
        <>
          <Field label="Tema">
            <Input value={values.tema ?? ""} onChange={(event) => set("tema", event.target.value)} required />
          </Field>
          <Field label="Kisah nabi sebagai referensi">
            <Input value={values.kisahNabi ?? ""} onChange={(event) => set("kisahNabi", event.target.value)} />
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
            <Input value={values.temaPesan ?? ""} onChange={(event) => set("temaPesan", event.target.value)} required />
          </Field>
          <Field label="Hadits/ayat tentang pernikahan">
            <Textarea value={values.referensi ?? ""} onChange={(event) => set("referensi", event.target.value)} />
          </Field>
          <Field label="Nuansa">
            <Select value={values.nuansa ?? "hangat"} onChange={(event) => set("nuansa", event.target.value)}>
              {["formal", "hangat", "puitis"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
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
            <Input value={values.topik ?? ""} onChange={(event) => set("topik", event.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Target audiens">
              <Select value={values.targetAudiens ?? "campuran"} onChange={(event) => set("targetAudiens", event.target.value)}>
                {["remaja", "dewasa", "lansia", "campuran"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </Field>
            <Field label="Setting">
              <Select value={values.setting ?? "masjid"} onChange={(event) => set("setting", event.target.value)}>
                {["masjid", "kampus", "kantor", "online"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </Field>
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
            <Input value={values.topikSingkat ?? ""} onChange={(event) => set("topikSingkat", event.target.value)} required />
          </Field>
          <Field label="Waktu">
            <Select value={values.waktu ?? "maghrib"} onChange={(event) => set("waktu", event.target.value)}>
              {["subuh", "maghrib", "tarawih"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
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
    </div>
  );
}
