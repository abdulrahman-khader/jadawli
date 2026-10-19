import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner } from "sonner";

// الإشعارات: تتبع الوضع الداكن للجهاز وتظهر من اليمين للعربية
const Toaster = ({ ...props }) => (
  <Sonner
    theme="system"
    dir="rtl"
    position="top-center"
    className="toaster group"
    icons={{
      success: <CircleCheckIcon className="size-4" />,
      info: <InfoIcon className="size-4" />,
      warning: <TriangleAlertIcon className="size-4" />,
      error: <OctagonXIcon className="size-4" />,
      loading: <Loader2Icon className="size-4 animate-spin" />,
    }}
    style={{
      "--normal-bg": "var(--popover)",
      "--normal-text": "var(--popover-foreground)",
      "--normal-border": "var(--border)",
      "--border-radius": "var(--radius)",
      fontFamily: "var(--font-sans)",
    }}
    {...props}
  />
);

export { Toaster };
