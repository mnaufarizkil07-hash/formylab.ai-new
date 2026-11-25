import BrandLogo from "./BrandLogo";

interface LogoProps {
  size?: "sm" | "lg";
  variant?: "default" | "light";
}

export default function Logo({
  size = "lg",
}: LogoProps) {
  return <BrandLogo variant="dark" size={size === "lg" ? "lg" : "sm"} />;
}