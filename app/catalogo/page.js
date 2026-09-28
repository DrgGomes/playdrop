'use client';

import HeaderCliente from '../components/HeaderCliente';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { montarPlanilhaUpseller } from '../../lib/planilhaUpseller';

export default function CatalogoPage() {
  const [produtos, setProdutos] = useState([]);
  const [imagens, setImagens] = useState({});
  const [variacoes, setVariacoes] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [selecionados, setSelecionados] = useState({});
  const [precos, setPrecos] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from('produtos').select('*').eq('ativo', true).order('criado_em', { ascending: false }),
        supabase.from('categorias').select('id, nome'),
      ]);

      const mapaCats = {};
      (cats || []).forEach((c) => (mapaCats[c.id] = c.nome));
      setCategorias(mapaCats);
      setProdutos(prods || []);

      const ids = (prods || []).map((p) => p.id);
      if (ids.length > 0) {
        const [{ data: imgs }, { data: vars }] = await Promise.all([
          supabase.from('produto_imagens').select('produto_id, url, ordem').in('produto_id', ids).order('ordem'),
          supabase.from('variacoes').select('produto_id, cor, tamanho, estoque, sku').in('produto_id', ids),
        ]);

        const mapaImg = {};
        (imgs || []).forEach((i) => {
          if (!(i.produto_id in mapaImg)) mapaImg[i.produto_id] = i.url;
        });
        setImagens(mapaImg);
        setVariacoes(vars || []);

        const mapaPrecos = {};
        (prods || []).forEach((p) => {
          mapaPrecos[p.id] = p.preco_sugerido || '';
        });
        setPrecos(mapaPrecos);
      }
      setCarregando(false);
    }
    carregar();
  }, []);

  const totalSelecionados = produtos.filter((p) => selecionados[p.id]).length;

  function alternar(produtoId) {
    setSelecionados((prev) => ({ ...prev, [produtoId]: !prev[produtoId] }));
  }

  function mudarPreco(produtoId, valor) {
    setPrecos((prev) => ({ ...prev, [produtoId]: valor }));
  }

  function formatar(valor) {
    const v = Number(valor);
    if (!valor || isNaN(v)) return '—';
    return 'R$ ' + v.toFixed(2).replace('.', ',');
  }

  function baixarPlanilha() {
    const linhas = [];
    produtos.forEach((p) => {
      if (!selecionados[p.id]) return;
      const variaveis = variacoes.filter((v) => v.produto_id === p.id);
      const precoVarejo = Number(precos[p.id]) || 0;
      const custoCompra = Number(p.preco_sugerido) || 0;
      const nomeCategoria = categorias[p.categoria_id] || 'Camisetas';

      variaveis.forEach((v) => {
        linhas.push({
          sku: v.sku,
          titulo: p.titulo,
          apelido: p.apelido || p.titulo,
          categoria: nomeCategoria,
          precoVarejo,
          custoCompra,
          quantidade: v.estoque || 0,
          imagem: imagens[p.id] || '',
        });
      });
    });

    if (linhas.length === 0) return;
    setBaixando(true);
    try {
      montarPlanilhaUpseller({ linhas });
    } finally {
      setTimeout(() => setBaixando(false), 800);
    }
  }

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
                    <nav className="nav-links">
            <Link href="/pedido">🛒 Ver pedido</Link>
            <Link href="/login">Entrar</Link>
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>Catálogo</h1>
        <p>Selecione as camisetas que quer vender e baixe a planilha pronta para o UpSeller.</p>
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
            {produtos.map((p) => {
              const marcado = !!selecionados[p.id];
              const qtdVariaveis = variacoes.filter((v) => v.produto_id === p.id).length;
              const totalEstoque = variacoes
                .filter((v) => v.produto_id === p.id)
                .reduce((soma, v) => soma + (v.estoque || 0), 0);

              return (
                <div className="product-card" key={p.id}
                  style={marcado ? { border: '2px solid var(--primary)', boxShadow: 'var(--shadow)' } : {}}>
                                    <Link href={`/produto/${p.id}`}>
                    {imagens[p.id] ? (
                      <img className="product-img" src={imagens[p.id]} alt={p.titulo} />
                    ) : (
                      <div className="product-img" />
                    )}
                  </Link>
                  <div className="product-info">
                    <div className="card-topo">
                      <div className="product-title">{p.titulo}</div>
                      <label className="check-box">
                        <input type="checkbox" checked={marcado} onChange={() => alternar(p.id)} />
                        <span>Selecionar</span>
                      </label>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                      {categorias[p.categoria_id] || 'Camisetas'} · {qtdVariaveis} variações · {totalEstoque} em estoque
                    </div>

                    <div className="field" style={{ marginBottom: 6 }}>
                      <span className="label">Seu preço de venda</span>
                      <input type="number" step="0.01" min="0"
                        value={precos[p.id] ?? ''} placeholder="0,00"
                        onChange={(e) => mudarPreco(p.id, e.target.value)} />
                    </div>
                    <div className="hint" style={{ fontSize: 12 }}>
                      Custo para você: {formatar(p.preco_sugerido)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalSelecionados > 0 && (
        <div className="barra-flutuante">
          <span>{totalSelecionados} produto(s) selecionado(s)</span>
          <button className="btn btn-primary" disabled={baixando} onClick={baixarPlanilha}>
            {baixando ? 'Gerando...' : 'Baixar planilha UpSeller'}
          </button>
        </div>
      )}
    </>
  );
}
