"use client";

import { FormEvent, useEffect, useState } from "react";

type Book = { id: string; reader_name: string; title: string; author: string; summary: string };

export function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [form, setForm] = useState({ readerName: "", title: "", author: "", summary: "" });
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/library").then(async (response) => {
      if (!response.ok) throw new Error();
      const payload = await response.json();
      setBooks(payload.data ?? []);
      setStatus("ready");
    }).catch(() => setStatus("error"));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("ready");
    try {
      const response = await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setBooks((current) => [payload.data, ...current]);
      setForm({ readerName: "", title: "", author: "", summary: "" });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Impossibile salvare il libro.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="library-section" aria-labelledby="library-title">
      <div className="section-heading">
        <div><span className="section-number">05 / CONDIVISIONE</span><h3 id="library-title">Libreria</h3></div>
        <p className="library-intro">I libri letti durante queste vacanze, raccontati senza spoiler.</p>
      </div>
      <div className="library-layout">
        <form className="library-form" onSubmit={submit}>
          <span className="section-number">AGGIUNGI UN LIBRO</span>
          <label>Partecipante<input required maxLength={80} value={form.readerName} onChange={(event) => setForm({ ...form, readerName: event.target.value })} placeholder="Il tuo nome" /></label>
          <label>Titolo<input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Titolo del libro" /></label>
          <label>Autore<input required maxLength={120} value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} placeholder="Nome dell'autore" /></label>
          <label>Riassunto senza spoiler <small>(massimo 4 righe)</small><textarea required maxLength={700} rows={4} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Di cosa parla, senza rivelare troppo?" /></label>
          <button disabled={saving}>{saving ? "SALVATAGGIO…" : "AGGIUNGI ALLA LIBRERIA"}</button>
          {status !== "ready" && status !== "loading" && <p className="library-error">{status === "error" ? "La Libreria non è disponibile in questo momento." : status}</p>}
        </form>
        <div className="library-books">
          {status === "loading" && <p className="library-empty">Caricamento della Libreria…</p>}
          {status === "ready" && books.length === 0 && <p className="library-empty">La Libreria è ancora vuota. Qual è il libro della tua vacanza?</p>}
          {books.map((book) => <article className="book-card" key={book.id}><span className="book-reader">{book.reader_name} LEGGE</span><h4>{book.title}</h4><p className="book-author">{book.author}</p><p className="book-summary">{book.summary}</p></article>)}
        </div>
      </div>
    </section>
  );
}
