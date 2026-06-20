import { Globe } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Variant = "icon" | "compact";

export function LanguageSwitcher({
  variant = "icon",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const { lang, setLang, t } = useLang();
  const current =
    lang === "pt"
      ? { flag: "🇧🇷", label: "PT" }
      : lang === "es"
        ? { flag: "🇪🇸", label: "ES" }
        : { flag: "🇺🇸", label: "EN" };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("Trocar idioma")}
            className={cn("relative", className)}
          >
            <span className="text-base leading-none" aria-hidden>
              {current.flag}
            </span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            aria-label={t("Trocar idioma")}
            className={cn("gap-2", className)}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="text-base leading-none" aria-hidden>
              {current.flag}
            </span>
            <span className="text-xs font-medium">{current.label}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => setLang("pt")}
          className={cn(lang === "pt" && "bg-accent")}
        >
          <span className="text-base leading-none" aria-hidden>🇧🇷</span>
          <span>{t("Português")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLang("en")}
          className={cn(lang === "en" && "bg-accent")}
        >
          <span className="text-base leading-none" aria-hidden>🇺🇸</span>
          <span>{t("Inglês")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLang("es")}
          className={cn(lang === "es" && "bg-accent")}
        >
          <span className="text-base leading-none" aria-hidden>🇪🇸</span>
          <span>{t("Espanhol")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
