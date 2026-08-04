import { FleetDashboard } from "@/components/fleet-dashboard";

export default function Home() {
  return (
    <main>
      <header className="hero">
        <div className="eyebrow"><span /> Saronic Gulf · 2026</div>
        <h1>First<br /><em>Mythos</em> Cup</h1>
        <p className="lede">Three vessels. One mythic passage. Follow the fleet’s latest AIS reports across the Aegean.</p>
      </header>
      <FleetDashboard />
      <footer>
        <span>FIRST MYTHOS CUP</span>
        <p>Positions are last-known AIS reports and may be delayed.</p>
      </footer>
    </main>
  );
}

