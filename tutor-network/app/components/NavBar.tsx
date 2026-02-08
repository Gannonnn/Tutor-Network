import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b border-zinc-200 px-6 flex items-center">
      <Link href="/" className="text-xl font-[family-name:var(--font-orbitron)] text-foreground hover:opacity-80 transition-opacity">
        Tutor<span className="font-[family-name:var(--font-orbitron)] text-primary">Network</span>
      </Link>
    </nav>
  );
}
