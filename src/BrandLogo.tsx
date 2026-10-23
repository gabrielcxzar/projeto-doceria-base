// Arquivo original da confeitaria, preservado sem recorte ou alteração de cores.
export const originalLogo = "/images/logo.png";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <img
      className={`brand-logo ${className}`}
      src={originalLogo}
      width={1024}
      height={1024}
      alt="Logo da Lá Divino Sabor"
      decoding="async"
    />
  );
}
