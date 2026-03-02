import { SwapHeader } from '@/components/swap';
import { FeesCard } from '@/components/fees';

export default function FeesPage() {
  return (
    <div className="min-h-screen">
      <SwapHeader />
      <main className="swap-bg flex items-start justify-center px-4 pt-16 pb-24">
        <FeesCard />
      </main>
    </div>
  );
}
