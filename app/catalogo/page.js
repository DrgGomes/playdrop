'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function CatalogoPage() {
  const [produtos, setProdutos] = useState([]);
  const [imagens, setImagens] = useState({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const { data: prods } = await supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('criado_em', { ascending: false });

      const mapaImagens = {};
      if (prods && prods.length) {
        const { data: imgs } = await supabase
          .from('produto_imagens')
          .select('produto_id, url, ordem')
          .in('produto_id', prods.map((p) => p.id))
          .order('ordem', { ascending: true });
        if (imgs) {
          for (const img of imgs) {
            if (!mapaImagens[img.produto_id]) mapaImagens[img.produto_id] = img.url;
          }
        }
      }
      setProdutos(prods || []);
      setImagens(mapaImagens);
      setCarregando(false);
    }
    carregar();
  }, []);

  function formatar(valor) {
    return valor ? 'R$ ' + Number(valor).toFixed(2).replace('.', ',') : '—';
  }

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/login">Entrar</Link>
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>Catálogo</h1>
        <p>Escolha os produtos e gere sua planilha de revenda (em breve).</p>
      </div>

      <div className="container">
        {carregando && <p className="muted center" style={{ padding: 48 }}>Carregando catálogo...</p>}

        {!carregando && produtos.length === 0 && (
          <div className="empty">
            <h3>Catálogo em construção</h3>
            <p>Os produtos aparecerão aqui assim que forem cadastrados pelo administrador.</p>
          </div>
        )}

        {!carregando && produtos.length > 0 && (
          <div className="catalog-grid">
            {produtos.map((p) => (
              <div className="product-card" key={p.id}>
                {imagens[p.id] ? (
                  <img className="product-img" src={imagens[p.id]} alt={p.titulo} />
                ) : (
                  <div className="product-img" />
                )}
                <div className="product-info">
                  <div className="product-title">{p.titulo}</div>
                  <div className="product-price">{formatar(p.preco_sugerido)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
