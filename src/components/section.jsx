// زرّا التبديل بين القسمين أعلى صفحة الفصل وصفحة الطالب
import { setFam } from "../lib/section.js";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group.jsx";

const item = "h-14 rounded-xl border-2 text-base gap-2";
export function SectionSwitch({ fam }) {
  return (
    <ToggleGroup type="single" value={fam} onValueChange={(v) => v && setFam(v)} className="grid w-full grid-cols-2 gap-2" dir="rtl">
      <ToggleGroupItem value="x" className={item + " data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"}>
        <b className="font-display text-xl">× ÷</b> الضرب والقسمة</ToggleGroupItem>
      <ToggleGroupItem value="pm" className={item + " data-[state=on]:border-warm data-[state=on]:bg-warm data-[state=on]:text-warm-foreground"}>
        <b className="font-display text-xl">+ −</b> الجمع والطرح</ToggleGroupItem>
    </ToggleGroup>
  );
}
