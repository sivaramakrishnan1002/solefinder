import Navbar from "./Navbar";

export default function AppLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-10rem] h-72 w-72 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-500/10" />
        <div className="absolute right-[-10rem] top-28 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-orange-200/20 blur-3xl dark:bg-orange-500/10" />
      </div>

      <Navbar />
      <main className="relative mx-auto w-full max-w-[1440px] px-4 pb-12 pt-6 sm:px-6 lg:px-10">
        {children}
      </main>
    </div>
  );
}
