import { SwapHeader, SwapCard } from '@/components/swap';

export default function SwapPage() {
  return (
    <div className="min-h-screen">
      <SwapHeader />
      <main className="swap-bg flex items-start justify-center px-4 pt-16 pb-24">
        <SwapCard />
      </main>
    </div>
  );
}
