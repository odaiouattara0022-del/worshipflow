import Link from "next/link";

export function MobileHeader() {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border flex items-center px-4 h-14">
      <Link href="/" className="text-primary font-bold text-lg no-underline">
        ✦ ProSendWorship
      </Link>
    </div>
  );
}
