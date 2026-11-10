"use client";
import { useRouter } from "next/navigation";
import Logo from "../../components/Logo";
import MoleculeCanvas from "../../components/MoleculeCanvas";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-gradasi-animasi flex flex-col font-sans overflow-x-hidden">
      
      {/* Background Blur Blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[70vw] h-[70vw] bg-[var(--color-brume)] rounded-full mix-blend-soft-light filter blur-[180px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[70vw] h-[70vw] bg-[var(--color-verveine)] rounded-full mix-blend-soft-light filter blur-[190px] opacity-20 pointer-events-none"></div>

      {/* Canvas Jaringan Molekul Interaktif */}
      <MoleculeCanvas />

      {/* NAVBAR */}
      <header className="relative z-30 w-full bg-white/70 backdrop-blur-md px-8 py-4 flex items-center justify-between border-b border-white/60 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/dashboard")}>
          <Logo size="sm" />
        </div>

        <div className="flex items-center gap-8">
          <nav className="flex items-center gap-6 text-sm font-semibold">
            <button 
              onClick={() => router.push("/dashboard")} 
              style={{ color: "#123832" }}
              className="hover:text-[var(--color-menthe)] transition-colors cursor-pointer bg-transparent border-none text-sm font-semibold"
            >
            </button>
          </nav>
        </div>
      </header>

      {/* KONTEN HALAMAN ABOUT US */}
      <main className="relative z-30 flex-1 max-w-4xl w-full mx-auto p-8 lg:p-12 flex flex-col gap-10">
        
        {/* CARD UTAMA ABOUT */}
        <div className="bg-white rounded-[28px] p-8 lg:p-12 shadow-[0_12px_40px_rgba(53,200,180,0.15)] border border-white flex flex-col gap-6">
          <span style={{ color: "#123832", backgroundColor: "rgba(53,200,180,0.2)" }} className="text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full w-fit border border-[var(--color-menthe)]/40">
            About formylab.ai
          </span>
          <h1 style={{ color: "#123832" }} className="text-3xl lg:text-4xl font-extrabold leading-tight">
            Mempercepat Inovasi & Prediksi Formulasi Kosmetik Berbasis AI.
          </h1>
          <p style={{ color: "#123832" }} className="text-sm lg:text-base leading-relaxed font-medium">
            <strong>formylab.ai</strong> dikembangkan khusus untuk membantu para formulator dan tim R&D di industri kecantikan dan perawatan diri (beauty & personal care). Platform ini dirancang untuk memangkas siklus uji coba laboratorium yang panjang melalui simulasi cerdas dan analisis kompatibilitas bahan secara instan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
            <div className="bg-[#F6F3EA] p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 style={{ color: "#123832" }} className="font-extrabold mb-2 text-base">Riset Lebih Efisien</h3>
              <p style={{ color: "#123832" }} className="text-xs leading-relaxed font-normal">
                Mengurangi limbah material dan waktu uji coba fisik dengan memprediksi kestabilan emulsi dan titik pH sejak tahap awal perencanaan produk.
              </p>
            </div>
            <div className="bg-[#F6F3EA] p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h3 style={{ color: "#123832" }} className="font-extrabold mb-2 text-base">Direktori Bahan Terkurasi</h3>
              <p style={{ color: "#123832" }} className="text-xs leading-relaxed font-normal">
                Dilengkapi dengan 142 bahan aktif dan fungsional yang telah diindeks untuk memudahkan penyusunan formula yang aman bagi kulit sensitif.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION VISI & MISI */}
        <div className="bg-white rounded-[28px] p-8 lg:p-12 shadow-[0_12px_40px_rgba(53,200,180,0.15)] border border-white flex flex-col gap-8">
          
          <div>
            <span style={{ color: "#123832" }} className="text-xs font-bold uppercase tracking-wider bg-yellow-100 px-3.5 py-1.5 rounded-full w-fit border border-yellow-200">
              Visi & Misi Kami
            </span>
            <h2 style={{ color: "#123832" }} className="text-2xl lg:text-3xl font-extrabold mt-3 mb-2">
              Visi
            </h2>
            <p style={{ color: "#123832" }} className="text-sm lg:text-base leading-relaxed font-medium bg-emerald-50/80 p-5 rounded-2xl border border-emerald-200">
              Menjadi AI formulation partner yang mendukung dan mempercepat proses pengembangan produk berdasarkan kebutuhan kondisi kulit khusus melalui variasi kandidat formulasi yang berbasis data.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h2 style={{ color: "#123832" }} className="text-2xl lg:text-3xl font-extrabold">
              Misi
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3.5 bg-[#F6F3EA] p-4 rounded-xl border border-slate-200 shadow-xs">
                <span style={{ color: "#123832" }} className="w-6 h-6 rounded-full bg-[var(--color-menthe)] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                <p style={{ color: "#123832" }} className="text-xs lg:text-sm leading-relaxed font-normal">
                  Membantu mendapatkan kandidat formulasi terbaik sehingga mengurangi banyaknya eksperimen yang dilakukan.
                </p>
              </div>

              <div className="flex items-start gap-3.5 bg-[#F6F3EA] p-4 rounded-xl border border-slate-200 shadow-xs">
                <span style={{ color: "#123832" }} className="w-6 h-6 rounded-full bg-[var(--color-menthe)] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                <p style={{ color: "#123832" }} className="text-xs lg:text-sm leading-relaxed font-normal">
                  Mempercepat proses penentuan kandidat formulasi berdasarkan bahan dan konsentrasi yang sesuai dengan kebutuhan kondisi kulit khusus (rosacea, psoriasis, dermatitis seboroik, dan dermatitis kontak).
                </p>
              </div>

              <div className="flex items-start gap-3.5 bg-[#F6F3EA] p-4 rounded-xl border border-slate-200 shadow-xs">
                <span style={{ color: "#123832" }} className="w-6 h-6 rounded-full bg-[var(--color-menthe)] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                <p style={{ color: "#123832" }} className="text-xs lg:text-sm leading-relaxed font-normal">
                  Memberikan prediksi dan perbandingan parameter formulasi (pH, viskositas, stabilitas, dan kehalalan) berbasis data sebagai pendukung keputusan.
                </p>
              </div>

              <div className="flex items-start gap-3.5 bg-[#F6F3EA] p-4 rounded-xl border border-slate-200 shadow-xs">
                <span style={{ color: "#123832" }} className="w-6 h-6 rounded-full bg-[var(--color-menthe)] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">4</span>
                <p style={{ color: "#123832" }} className="text-xs lg:text-sm leading-relaxed font-normal">
                  Menghubungkan hasil eksperimen dengan proses pengembangan model agar pengetahuan formulasi dapat terus berkembang.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={() => router.push("/dashboard")}
              style={{ color: "#123832" }}
              className="px-6 py-3.5 bg-[var(--color-menthe)] hover:bg-[var(--color-verveine)] font-extrabold text-xs rounded-xl transition-all duration-300 shadow-[0_4px_16px_rgba(53,200,180,0.25)] cursor-pointer"
            >
              Kembali ke Workspace Utama
            </button>
          </div>

        </div>

      </main>

    </div>
  );
}