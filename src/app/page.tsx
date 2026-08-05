import { FleetDashboard } from "@/components/fleet-dashboard";

export default function Home() {
  return (
    <main>
      <header className="hero">
        <div className="hero-content">
          <h1>FIRST<br /><em>MYTHOS</em><br />CUP</h1>
        </div>
        <div className="boat-line" aria-hidden="true">
          <img
            src="/artwork/first-mythos-cup-front.png"
            alt=""
            className="hero-artwork"
          />
        </div>
      </header>
      <FleetDashboard />
      <footer>
        <span>FIRST MYTHOS CUP / FIRST 36 FLEET</span>
        <p>Positions are last-known AIS reports and may be delayed. First 36 is a Beneteau model reference.</p>
      </footer>
    </main>
  );
}
