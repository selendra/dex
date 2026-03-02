import { SwapHeader } from '@/components/swap';
import { TokenListCard } from '@/components/tokens';

export default function TokensPage() {
  return (
    <div className="min-h-screen">
      <SwapHeader />
      <main className="swap-bg flex items-start justify-center px-4 pt-16 pb-24">
        <TokenListCard />
      </main>
    </div>
  );
}
