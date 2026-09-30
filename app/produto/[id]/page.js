'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUser } from '../../../lib/auth';
import HotbarCliente from '../../components/HotbarCliente';

function formatarValor(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

export default function ProdutoDetalhePage() {
  const { id } = useParams();
  const router = useRouter();
  const [produto, setProduto] = useState(null);
  const [variacoes, setVariacoes] = useState([]);
  const [cores, setCores] = useState([]);
  const [tamanhos, setTamanhos] = useState([]);
  const [corAtiva, setCorAtiva] = useState('');
  const [tamAtivo, setTamAtivo] = useState('');
  const [qtd, setQtd] = useState(1);
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }

      const { data: prod } = await supabase.from('produtos').select('*').eq('id', id).single();
      if (!prod) { setCarregando(false); return; }
      setProduto(prod);

      const { data: vars } = await supabase
        .from('variacoes')
        .select('*')
        .eq('produto_id', id);
      const lista = vars || [];
      setVariacoes(lista);

      const listaCores = [...new Set(lista.map((v) => v.cor).filter(Boolean))];
      const listaTams = [...new Set(lista.map((v) => v.tamanho).filter(Boolean))];
      setCores(listaCores);
      setTamanhos(listaTams);
      if (listaCores[0]) setCorAtiva(listaCores[0]);
      if (listaTams[0]) setTamAtivo(listaTams[0]);

      setCarregando(false);
    }
    iniciar();
  }, [id, router]);

  if (carregando) return <p className="muted center" style={{ padding: 60 }}>Carregando...</p>;

  if (!produto) {
    return (
      <>
        <header className="nav">
          <div className="container"><span className="nav-logo">PlayDrop</span></div>
        </header>
        <div className="pd-wrap container">
          <div className="dash-vazio">
            <span className="dash-vazio-emoji">👕</span>
            <h3>Produto não encontrado</h3>
            <p style={{ marginBottom: 16 }}>Não foi possível encontrar esse produto.</p>
            <Link href="/catalogo" className="btn btn-primary">← Voltar ao catálogo</Link>
          </div>
        </div>
        <HotbarCliente />
      </>
    );
  }

  const fotos = Array.isArray(produto.fotos) && produto.fotos.length > 0
    ? produto.fotos
    : (produto.imagens ? (Array.isArray(produto.imagens) ? produto.imagens : [produto.imagens]) : []);
  const fotoAtual = fotos[fotoAtiva] || null;

  const variacaoAtiva = variacoes.find((v) => v.cor === corAtiva && v.tamanho === tamAtivo);
  const estoque = variacaoAtiva?.estoque ?? 0;
  const esgotado = estoque <= 0;
  const sku = variacaoAtiva?.sku || produto.sku || '';

  function adicionar() {
    if (esgotado) return;
    const carrinho = JSON.parse(localStorage.getItem('playdrop_carrinho') || '[]');
    const existente = carrinho.find((i) => i.variacao_id === variacaoAtiva?.id);
    if (existente) {
      existente.quantidade = (Number(existente.quantidade) || 1) + qtd;
    } else {
      carrinho.push({
        variacao_id: variacaoAtiva?.id || null,
        produto_id: produto.id,
        titulo: produto.titulo,
        sku,
        cor: corAtiva,
        tamanho: tamAtivo,
        quantidade: qtd,
        preco_unitario: Number(produto.preco_sugerido) || 0,
      });
    }
    localStorage.setItem('playdrop_carrinho', JSON.stringify(carrinho));
    window.dispatchEvent(new Event('playdrop_carrinho'));
    router.push('/pedido');
  }

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/catalogo">← Catálogo</Link>
            <Link href="/pedido">🛒 Ver pedido</Link>
          </nav>
        </div>
      </header>

      <div className="pd-wrap container">
        <nav className="pd-crumbs">
          <Link href="/catalogo">Catálogo</Link> / <span>{produto.categoria || 'Camisetas'}</span>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
          {/* GALERIA */}
          <div className="pd-galeria">
            <div className="pd-galeria-principal">
              {fotoAtual ? (
                <img src={fotoAtual} alt={produto.titulo} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>👕</div>
              )}
              <button className="pd-favorito">🤍</button>
            </div>
            {fotos.length > 1 && (
              <div className="pd-galeria-thumbs">
                {fotos.map((f, i) => (
                  <button
                    key={i}
                    className={`pd-thumb${i === fotoAtiva ? ' ativo' : ''}`}
                    onClick={() => setFotoAtiva(i)}
                  >
                    <img src={f} alt={`Foto ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="pd-info-card">
            <span className="pd-categoria">{produto.categoria || 'Camisetas'}</span>
            <h1 className="pd-title">{produto.titulo}</h1>

            <div className="pd-preco">
              <span className="pd-preco-atual">{formatarValor(produto.preco_sugerido)}</span>
              <span className="pd-preco-hint"> · preço sugerido para revenda</span>
            </div>

            <div className="pd-block">
              <span className="pd-block-titulo">Cor</span>
              <div className="pd-cores">
                {cores.length === 0 ? (
                  <span className="muted" style={{ fontSize: 13 }}>Única</span>
                ) : cores.map((c) => (
                  <button
                    key={c}
                    className={`pd-cor${corAtiva === c ? ' ativo' : ''}`}
                    onClick={() => setCorAtiva(c)}
                  >{c}</button>
                ))}
              </div>
            </div>

            <div className="pd-block">
              <span className="pd-block-titulo">Tamanho</span>
              <div className="pd-tamanhos">
                {tamanhos.length === 0 ? (
                  <span className="muted" style={{ fontSize: 13 }}>Único</span>
                ) : tamanhos.map((t) => (
                  <button
                    key={t}
                    className={`pd-tam${tamAtivo === t ? ' ativo' : ''}`}
                    onClick={() => setTamAtivo(t)}
                  >{t}</button>
                ))}
              </div>
            </div>

            {sku && <p className="pd-sku">SKU: {sku}</p>}

            <div className="pd-block">
              <span className="pd-block-titulo">Quantidade</span>
              <div className="pd-qtd">
                <button onClick={() => setQtd(Math.max(1, qtd - 1))}>−</button>
                <input value={qtd} onChange={(e) => setQtd(Math.max(1, Number(e.target.value) || 1))} />
                <button onClick={() => setQtd(qtd + 1)}>+</button>
              </div>
            </div>

            <button
              className="btn btn-primary btn-block"
              style={{ fontSize: 16, padding: 15 }}
              disabled={esgotado}
              onClick={adicionar}
            >
              {esgotado ? 'Esgotado' : '🛒 Adicionar ao pedido'}
            </button>
            {esgotado && <p className="erro" style={{ marginTop: 10 }}>Este tamanho/cor está esgotado.</p>}
          </div>
        </div>
      </div>

      <HotbarCliente />
    </>
  );
}
