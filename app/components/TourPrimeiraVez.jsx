'use client';

import { useCallback, useEffect, useState } from 'react';

export default function TourPrimeiraVez({ chave, passos = [] }) {
  const [visivel, setVisivel] = useState(false);
  const [idx, setIdx] = useState(0);
  const [caixa, setCaixa] = useState(null);

  useEffect(() => {
    setIdx(0);
    setCaixa(null);
    try {
      if (localStorage.getItem(chave)) { setVisivel(false); return; }
      const t = setTimeout(() => setVisivel(true), 900);
      return () => clearTimeout(t);
    } catch {
      setVisivel(false);
    }
  }, [chave]);

  const medir = useCallback(() => {
    const passo = passos[idx];
    if (!passo) return;
    const el = passo.seletor ? document.querySelector(passo.seletor) : null;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      setCaixa({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      setCaixa(null);
    }
  }, [idx, passos]);

  useEffect(() => {
    if (!visivel) return;
    const passo = passos[idx];
    if (passo && passo.seletor) {
      const el = document.querySelector(passo.seletor);
      if (el) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
      }
    }
    const t = setTimeout(medir, 500);
    window.addEventListener('scroll', medir);
    window.addEventListener('resize', medir);
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
    };
  }, [visivel, idx, passos, medir]);

  function fechar() {
    try { localStorage.setItem(chave, '1'); } catch {}
    setVisivel(false);
  }

  if (!visivel) return null;
  const passo = passos[idx] || {};
  const total = passos.length;

  let estiloCard = { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 100002, width: 'min(92vw, 400px)' };
  if (caixa) {
    const centroX = caixa.left + caixa.width / 2;
    const left = Math.max(12, Math.min(window.innerWidth - 412, centroX - 200));
    const acima = caixa.top > 270;
    estiloCard = acima
      ? { position: 'fixed', left: left, top: Math.max(12, caixa.top - 236), zIndex: 100002, width: 400 }
      : { position: 'fixed', left: left, top: caixa.top + caixa.height + 16, zIndex: 100002, width: 400 };
  }

  return (
    <>
      {caixa ? (
        <div className="tour-foco" style={{ top: caixa.top, left: caixa.left, width: caixa.width, height: caixa.height }} />
      ) : (
        <div className="tour-escuro" />
      )}
      <div className="tour-card" style={estiloCard}>
        {passo.tag && <span className="tour-tag">{passo.tag}</span>}
        <h3>{passo.titulo || 'Dica'}</h3>
        {passo.texto && <p>{passo.texto}</p>}
        <div className="tour-progresso">Passo {idx + 1} de {total}</div>
        <div className="tour-barra">
          <button className="tour-pular" onClick={fechar}>Pular tour</button>
          <div className="tour-nav">
            {idx > 0 && (
              <button className="tour-setinha voltar" onClick={() => setIdx(idx - 1)} aria-label="Voltar">←</button>
            )}
            {idx < total - 1 ? (
              <button className="tour-setinha" onClick={() => setIdx(idx + 1)} aria-label="Avançar">→</button>
            ) : (
              <button className="tour-setinha" onClick={fechar}>Entendi! ✓</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
