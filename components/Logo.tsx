import Image from "next/image";

interface LogoProps {
  size?: "sm" | "lg";
}

export default function Logo({ size = "lg" }: LogoProps) {
  const isLg = size === "lg";
  // Ukuran lg diturunkan jadi 64, sm tetap 44
  const imageSize = isLg ? 64 : 44;
  const textSize = isLg ? "text-4xl" : "text-2xl";

  return (
    <div className="flex items-center gap-0">
      <Image 
        src="/logo.png" 
        alt="Logo formylab" 
        width={imageSize} 
        height={imageSize} 
        referrerPolicy="no-referrer"
        /* Margin negatif lg dilonggarkan jadi -mr-3 supaya tidak terlalu dempet */
        className={`object-contain ${isLg ? "-mr-3" : "-mr-2.5"}`} 
      />
      <h1 className={`font-extrabold text-[var(--color-navy)] tracking-tighter ${textSize}`}>
        formylab<span className="text-[var(--color-menthe)]">.ai</span>
      </h1>
    </div>
  );
}