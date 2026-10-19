import { useState, type ReactNode } from "react";
import { ChevronRight, Menu, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface PortalModule {
  title: string;
  icon: ReactNode;
  onClick: () => void;
  badge?: number;
  alert?: boolean;
}

const groups = ["Income & performance", "Requests & communication", "On the road", "Management & resources"];

function moduleGroup(title: string) {
  if (/income|commission|balance|payslip|fuel|target/i.test(title)) return groups[0];
  if (/request|notification|message|survey|sms/i.test(title)) return groups[1];
  if (/hotspot|cng|oil|yango|calendar/i.test(title)) return groups[2];
  return groups[3];
}

function ModuleNavigation({ items, onSelected }: { items: PortalModule[]; onSelected?: () => void }) {
  return <nav aria-label="Portal modules" className="space-y-5">
    {groups.map(group => {
      const entries = items.filter(item => moduleGroup(item.title) === group);
      if (!entries.length) return null;
      return <div key={group}>
        <p className="mb-2 px-3 text-xs font-semibold text-muted-foreground">{group}</p>
        {entries.map(item => <Button key={item.title} variant="ghost" onClick={() => { onSelected?.(); item.onClick(); }} className="h-auto min-h-11 w-full justify-start whitespace-normal px-3 py-2 text-left font-normal">
          <span className="shrink-0 text-primary [&_svg]:h-4 [&_svg]:w-4">{item.icon}</span>
          <span className="min-w-0 flex-1 break-words">{item.title}</span>
          {Boolean(item.badge) && <span className="text-xs font-semibold text-destructive">{item.badge}</span>}
        </Button>)}
      </div>;
    })}
  </nav>;
}

export function PortalMenu({ items }: { items: PortalModule[] }) {
  const [open, setOpen] = useState(false);
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open navigation" className="lg:hidden"><Menu /></Button></SheetTrigger>
    <SheetContent side="left" className="w-[min(90vw,360px)] overflow-y-auto">
      <SheetHeader className="mb-6 pr-8 text-left"><SheetTitle>AMAN Taxi</SheetTitle><SheetDescription>Driver Portal</SheetDescription></SheetHeader>
      <ModuleNavigation items={items} onSelected={() => setOpen(false)} />
    </SheetContent>
  </Sheet>;
}

export function PortalModules({ items }: { items: PortalModule[] }) {
  return <div className="grid min-w-0 flex-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
    <aside className="hidden border-r border-border pr-5 lg:block"><div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto"><ModuleNavigation items={items} /></div></aside>
    <main className="min-w-0 space-y-8">
      {groups.map((group, groupIndex) => {
        const entries = items.filter(item => moduleGroup(item.title) === group);
        if (!entries.length) return null;
        const tone = ["module-finance", "module-communication", "module-road", "module-management"][groupIndex];
        return <section key={group} aria-label={group}>
          <div className="mb-3 flex items-center gap-3"><h2 className="text-base font-semibold text-foreground">{group}</h2><span className="text-xs text-muted-foreground">{entries.length}</span></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {entries.map(item => <Button key={item.title} variant="outline" onClick={item.onClick} className={cn("group relative h-auto min-h-[124px] flex-col items-start justify-between gap-4 whitespace-normal rounded-lg border-border bg-card p-4 text-left text-card-foreground shadow-sm transition-shadow hover:bg-card hover:shadow-md", item.alert && "ring-2 ring-destructive") }>
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg [&_svg]:h-5 [&_svg]:w-5", tone)}>{item.icon}</span>
              <span className="flex w-full items-center justify-between gap-2"><span className="min-w-0 break-words text-sm font-medium leading-snug">{item.title}</span><ChevronRight className="shrink-0 text-muted-foreground" /></span>
              {item.badge !== undefined && item.badge > 0 && <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">{item.badge > 99 ? "99+" : item.badge}</span>}
              <ArrowUpRight className="absolute right-3 top-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            </Button>)}
          </div>
        </section>;
      })}
    </main>
  </div>;
}