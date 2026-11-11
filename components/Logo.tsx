import Image from "next/image";

interface LogoProps {
  size?: "sm" | "lg";
  variant?: "default" | "light";
}

export default function Logo({
  size = "lg",
  variant = "default",
}: LogoProps) {
  const isLg = size === "lg";
  const imageSize = isLg ? 64 : 44;
  const textSize = isLg ? "text-4xl" : "text-2xl";
  const textColor =
    variant === "light" ? "text-white" : "text-[var(--color-navy)]";

  return (
    <div className="flex items-center gap-0">
      <Image
        src="/logo.png"
        alt="Logo formylab"
        width={imageSize}
        height={imageSize}
        referrerPolicy="no-referrer"
        className={`object-contain ${isLg ? "-mr-3" : "-mr-2.5"}`}
      />
      <h1
        className={`font-extrabold ${textColor} tracking-tighter ${textSize}`}
      >
        formylab<span className="text-[var(--color-menthe)]">.ai</span>
      </h1>
    </div>
  );
}