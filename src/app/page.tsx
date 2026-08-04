import { FleetDashboard } from "@/components/fleet-dashboard";

export default function Home() {
  return (
    <main>
      <header className="hero">
        <div className="hero-content">
          <h1>FIRST<br /><em>MYTHOS</em><br />CUP</h1>
        </div>
        <div className="boat-line" aria-hidden="true">
          <svg viewBox="0 0 1200 420" role="presentation">
            <path className="waterline" d="M76 343h1054" />
            <path className="hull" d="M164 307c185 4 510 3 768-12 63-4 116-17 157-39-20 52-83 76-184 84-182 13-531 14-741-6Z" />
            <path className="deck" d="M180 305h712l42-15h143" />
            <path className="coachroof" d="M396 302h219l40-25h153l27 22" />
            <path className="cockpit" d="M810 299h68l18-19" />
            <path className="mast" d="M640 299 630 37" />
            <path className="boom" d="M423 275h356" />
            <path className="mainsail" d="M636 51 638 270 425 270Z" />
            <path className="jib" d="M646 54 879 274 650 270Z" />
            <path className="backstay" d="M628 39 356 300" />
            <path className="forestay" d="M641 41 1059 269" />
            <path className="keel" d="M588 338 614 383h63l28-43" />
            <path className="keel-base" d="M580 385c28 8 82 9 117 0" />
            <path className="rudder" d="M214 329 204 368l14 2 12-37" />
            <path className="windows" d="M568 294h38m12 0h46m12 0h47m13 0h44" />
          </svg>
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
