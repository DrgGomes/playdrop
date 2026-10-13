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

/* ===== Gerador de títulos estilo Mercado Livre ===== */
function limparBase(t) {
  return (t || '')
    .replace(/camiseta|camisa|blusa/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function gerarTitulos(produto) {
  const base = (produto.titulo || '').trim();
  const apelido = (produto.apelido || '').trim();
  const principal = apelido || base;
  const limpo = limparBase(principal);
  const semMarca2 = limparBase(base);

  const opcoes = [
    principal,
    `Camiseta ${limpo} Masculina Manga Curta`,
    `Camiseta ${limpo} - 100% Algodao, Tamanhos do P ao GG`,
    `Camisa ${semMarca2 || limpo} Premium para Revenda`,
    `Camiseta ${semMarca2 || limpo} Atacado e Revenda | Envio Imediato`,
  ].filter(Boolean);

  return [...new Set(opcoes)].slice(0, 5);
}

/* ===== Descrição padrão estilo Mercado Livre (sem emojis) ===== */
function gerarDescricao(produto) {
  const titulo = (produto.titulo || '').trim();
  const categoria = (produto.categoria || 'Camiseta');
  return [
    `${titulo} - ${categoria} de alta qualidade, confeccionada em malha 100% algodao, garantindo conforto, durabilidade e caimento perfeito para o dia a dia.`,
    '',
    'Caracteristicas:',
    '- Tecido macio e resistente, ideal para uso diario;',
    '- Modelagem confortavel com manga curta;',
    '- Tamanhos disponiveis do P ao GG;',
    '- Otima opcao para revenda, com excelente margem de lucro.',
    '',
    'Aproveite e garanta a sua!',
  ].join('\n');
}

export default function ProdutoDetalhePage() {
  const { id } = useParams();
  const router = useRouter();
  const [produto, setProduto] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [variacoes, setVariacoes] = useState([]);
  const [cores, setCores] = useState([]);
  const [tamanhos, setTamanhos] = useState([]);
  const [corAtiva, setCorAtiva] = useState('');
  const [tamAtivo, setTamAtivo] = useState('');
  const [qtd, setQtd] = useState(1);
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [copiado, setCopiado] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }

      const { data: prod } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single();
      if (!prod) { setCarregando(false); return; }
      setProduto(prod);

      // FOTOS: tabela produto_imagens (padrão), com fallback para fotos/imagens direto no produto
      const { data: imgs } = await supabase
        .from('produto_imagens')
        .select('url, ordem')
        .eq('produto_id', id)
        .order('ordem');
      let listaFotos = (imgs || []).map((i) => i.url).filter(Boolean);
      if (listaFotos.length === 0) {
        const diretas = Array.isArray(prod.fotos) ? prod.fotos : (Array.isArray(prod.imagens) ? prod.imagens : []);
        listaFotos = diretas.filter(Boolean);
      }
      setFotos(listaFotos);

      // VARIAÇÕES
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

  const fotoAtual = fotos[fotoAtiva] || null;

  const variacaoAtiva = variacoes.find((v) => v.cor === corAtiva && v.tamanho === tamAtivo);
  const estoque = variacaoAtiva?.estoque ?? 0;
  const esgotado = estoque <= 0;
  const sku = variacaoAtiva?.sku || produto.sku || '';

  // TÍTULOS e DESCRIÇÃO para anúncio (do ADM se existir, senão gerado)
  const titulos = Array.isArray(produto.titulos) && produto.titulos.length >= 5
    ? produto.titulos
    : gerarTitulos(produto);
  const descricao = (produto.descricao && produto.descricao.trim())
    ? produto.descricao
    : gerarDescricao(produto);

  function copiarTexto(texto, chave) {
    const concluir = () => {
      setCopiado(chave);
      setTimeout(() => setCopiado(''), 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(concluir).catch(() => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      concluir();
    }
  }

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
                <img
                  src={fotoAtual}
                  alt={produto.titulo}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = 'none';
                    const fb = e.currentTarget.parentElement.querySelector('.pd-fallback');
                    if (fb) fb.style.display = 'flex';
                  }}
                />
              ) : (
                <div className="pd-fallback" style={{ display: 'flex' }}>
                  <span>👕</span>
                  <p>{produto.titulo}</p>
                  <small>Imagem em breve</small>
                </div>
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

        {/* ===== TÍTULOS + DESCRIÇÃO PARA ANÚNCIO (estilo Mercado Livre) ===== */}
        <div className="loj-grid-2">
          <div className="loj-card">
            <div className="loj-card-topo">
              <h3>Títulos para o anúncio</h3>
              <span className="chip">5 opções</span>
            </div>
            <div className="loj-sub">Copie e cole no título do seu anúncio.</div>
            {titulos.map((t, i) => (
              <div key={i} className="loj-titulo-opcao">
                <p>{t}</p>
                <button
                  className={`loj-btn-copiar${copiado === 't' + i ? ' copiado' : ''}`}
                  onClick={() => copiarTexto(t, 't' + i)}
                >
                  {copiado === 't' + i ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            ))}
          </div>

          <div className="loj-card">
            <div className="loj-card-topo">
              <h3>Descrição para o anúncio</h3>
              <button
                className={`loj-btn-copiar${copiado === 'desc' ? ' copiado' : ''}`}
                onClick={() => copiarTexto(descricao, 'desc')}
              >
                {copiado === 'desc' ? 'Descrição copiada!' : 'Copiar descrição'}
              </button>
            </div>
            <div className="loj-sub">Sem emojis, pronto para colar no Mercado Livre.</div>
            <div className="loj-desc-texto">{descricao}</div>
          </div>
        </div>
      </div>

      <HotbarCliente />
    </>
  );
}
