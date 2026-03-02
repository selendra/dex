import { SwapHeader } from '@/components/swap';
import { PoolCard } from '@/components/pool';

export default function PoolPage() {
  return (
    <div className="min-h-screen">
      <SwapHeader />
      <main className="swap-bg flex items-start justify-center px-4 pt-16 pb-24">
        <PoolCard />
      </main>
    </div>
  );
}
