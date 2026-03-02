import { SwapHeader } from '@/components/swap';
import { OracleCard } from '@/components/oracle';

export default function OraclePage() {
  return (
    <div className="min-h-screen">
      <SwapHeader />
      <main className="swap-bg flex items-start justify-center px-4 pt-16 pb-24">
        <OracleCard />
      </main>
    </div>
  );
}
