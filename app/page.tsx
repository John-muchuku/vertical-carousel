import { StackedCarousel } from "@/components/stacked-carousel";

export default function Home() {
  return (
    <main
      className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 bg-cover bg-center bg-no-repeat font-sans"
      style={{ backgroundImage: "url('/ascii-magic-4.avif')" }}
    >
      <StackedCarousel />
    </main>
  );
}
