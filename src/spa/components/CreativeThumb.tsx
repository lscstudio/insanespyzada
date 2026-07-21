import { Play, Image as ImageIcon } from "lucide-react";

/**
 * Thumbnail determinística gerada via CSS (gradientes + padrão),
 * sem depender de imagens externas.
 */
export function CreativeThumb({
  hue,
  type,
  className = "",
  showType = true,
}: {
  hue: number;
  type: "video" | "image";
  className?: string;
  showType?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg,
          hsl(${hue} 70% 14%) 0%,
          hsl(${(hue + 40) % 360} 80% 30%) 45%,
          #0F52BA 130%)`,
      }}
    >
      {/* padrão de linhas diagonais */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 9px)",
        }}
      />
      {/* brilho */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.28), transparent 55%)",
        }}
      />
      {/* marca d'água */}
      <div className="absolute bottom-1 left-2 text-[9px] font-bold uppercase tracking-[0.3em] text-white/50">
        InsaneSpy
      </div>
      {showType && (
        <div className="absolute inset-0 flex items-center justify-center">
          {type === "video" ? (
            <div className="flex h-11 w-11 items-center justify-center border-2 border-white/80 bg-black/30">
              <Play size={18} className="ml-0.5 fill-white text-white" />
            </div>
          ) : (
            <ImageIcon size={22} className="text-white/70" />
          )}
        </div>
      )}
    </div>
  );
}
