"use client";

import { useEffect, useState } from "react";
import { FleetDashboard, type Language } from "@/components/fleet-dashboard";
import { Library } from "@/components/library";

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("first-mythos-language");
    if (savedLanguage === "it") setLanguage("it");
  }, []);

  function toggleLanguage() {
    setLanguage((current) => {
      const next = current === "en" ? "it" : "en";
      window.localStorage.setItem("first-mythos-language", next);
      return next;
    });
  }

  const italian = language === "it";
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
      <FleetDashboard language={language} />
      <Library />
      <footer>
        <span>FIRST MYTHOS CUP / FIRST 36 FLEET</span>
        <p>{italian ? "Le posizioni sono gli ultimi rapporti AIS disponibili e possono essere ritardati. First 36 è un modello Beneteau." : "Positions are last-known AIS reports and may be delayed. First 36 is a Beneteau model reference."}</p>
        <button type="button" className="language-toggle" onClick={toggleLanguage} aria-label={italian ? "Passa all'inglese" : "Switch to Italian"}>{italian ? "EN" : "IT"}</button>
      </footer>
    </main>
  );
}
