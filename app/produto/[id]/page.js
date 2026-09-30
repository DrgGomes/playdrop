'use client';

import HeaderCliente from '../../components/HeaderCliente';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

function formatarValor(v) {
  const n = Number(v);
  if (!v || isNaN(n)) return '—';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export default function ProdutoDetalhePage() {
  const params = useParams();
  const id = params.id;

  const [produto, setProduto] = useState(null);
  const [imagens, setImagens] = useState([]);
  const [variacoes, setVariacoes] = useState([]);
  const [categoriaNome, setCategoriaNome] = useState('Camisetas');
  const [marca, setMarca] = useState('PlayDrop');

  const [indiceImagem, setIndiceImagem] = useState(0);
  const [corSelecionada, setCorSelecionada] = useState('');
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState('');
  const [quantidade, setQuantidade] = useState(1);

  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [msgCopiado, setMsgCopiado] = useState('');
  const [msgCarrinho, setMsgCarrinho] = useState('');

  useEffect(() => {
    async function carregar() {
      if (!id) return;
      const { data: prod, error } = await supabase
        .from('produtos').select('*').eq('id', id).single();
      if (error || !prod || !prod.ativo) { setNaoEncontrado(true); setCarregando(false); return; }
      setProduto(prod);

      const [{ data: imgs }, { data: vars }, { data: confs }] = await Promise.all([
        supabase.from('produto_imagens').select('id, url, ordem').eq('produto_id', id).order('ordem'),
        supabase.from('variacoes').select('*').eq('produto_id', id),
        supabase.from('configuracoes').select('chave, valor'),
      ]);
      setImagens(imgs || []);
      setVariacoes(vars || []);

      if (confs) {
        const map = {};
        confs.forEach((c) => (map[c.chave] = c.valor));
        if (map.nome_marca) setMarca(map.nome_marca);
      }

      if (prod.categoria_id) {
        const { data: cat } = await supabase
          .from('categorias').select('nome').eq('id', prod.categoria_id).single();
        if (cat) setCategoriaNome(cat.nome);
      }

      const cores = [];
      (vars || []).forEach((v) => { if (!cores.includes(v.cor)) cores.push(v.cor); });
      if (cores.length > 0) {
        setCorSelecionada(cores[0]);
        const tams = (vars || []).filter((v) => v.cor === cores[0]).map((v) => v.tamanho);
        if (tams.length > 0) setTamanhoSelecionado(tams[0]);
      }

      setCarregando(false);
    }
    carregar();
  }, [id]);

  if (carregando) return <p className="muted center" style={{ padding: 60 }}>Carregando produto...</p>;
  if (naoEncontrado || !produto) {
    return (
      <div className="container" style={{ padding: 80, textAlign: 'center' }}>
        <h1>Produto não encontrado</h1>
        <p>Ele pode ter sido removido ou desativado.</p>
        <Link href="/catalogo" className="btn btn-primary" style={{ marginTop: 16 }}>← Voltar ao catálogo</Link>
      </div>
    );
  }

  const cores = [];
  variacoes.forEach((v) => { if (!cores.includes(v.cor)) cores.push(v.cor); });
  const tamanhosDaCor = variacoes.filter((v) => v.cor === corSelecionada).map((v) => v.tamanho);
  const variacaoAtual = variacoes.find((v) => v.cor === corSelecionada && v.tamanho === tamanhoSelecionado);
  const estoqueAtual = variacaoAtual ? Number(variacaoAtual.estoque) || 0 : 0;
  const skuAtual = variacaoAtual ? variacaoAtual.sku : '';
  const imagemAtual = imagens[indiceImagem] ? imagens[indiceImagem].url : (imagens[0] || {}).url || '';

  const preco = Number(produto.preco_sugerido) || 0;

  const textoAnuncio = [
    `📍 ${produto.titulo}`,
    `💰 Preço: ${formatarValor(preco)}`,
    ``,
    `${produto.descricao || ''}`,
    ``,
    `✅ Cores: ${cores.join(', ')}`,
    `✅ Tamanhos: ${tamanhosDaCor.join(', ')}`,
    `✅ Código: ${produto.codigo || '—'}`,
    `✅ Categoria: ${categoriaNome}`,
    ``,
    `🛒 Garanta já a sua! Entregas para todo o Brasil.`,
  ].join('\n');

  async function copiarAnuncio() {
    const ok = await copiar(textoAnuncio);
    setMsgCopiado(ok ? 'Anúncio copiado!' : 'Não foi possível copiar');
    setTimeout(() => setMsgCopiado(''), 2500);
  }

  async function copiarTexto(texto, label) {
    const ok = await copiar(texto);
    setMsgCopiado(ok ? label + ' copiado!' : 'Não foi possível copiar');
    setTimeout(() => setMsgCopiado(''), 2500);
  }

  function adicionarAoCarrinho() {
    if (!variacaoAtual || estoqueAtual <= 0) {
      setMsgCarrinho('Este tamanho está sem estoque.');
      setTimeout(() => setMsgCarrinho(''), 2500);
      return;
    }
    let carrinho = [];
    try { carrinho = JSON.parse(localStorage.getItem('playdrop_carrinho') || '[]'); } catch {}
    const item = {
      produto_id: produto.id,
      variacao_id: variacaoAtual.id,
      sku: skuAtual,
      titulo: produto.titulo,
      cor: corSelecionada,
      tamanho: tamanhoSelecionado,
      quantidade: Number(quantidade) || 1,
      preco_unitario: preco,
      imagem: imagemAtual,
    };
    carrinho.push(item);
    localStorage.setItem('playdrop_carrinho', JSON.stringify(carrinho));
    setMsgCarrinho('✓ Adicionado ao pedido!');
    setTimeout(() => setMsgCarrinho(''), 2500);
  }

  return (
    <>
            <HeaderCliente />

      <div className="container pd-wrap">
        <div className="pd-crumbs">
          <Link href="/catalogo">Catálogo</Link> <span>/</span> <span>{categoriaNome}</span>
        </div>

        <div className="pd-grid">
          {/* ===== Galeria ===== */}
          <div className="pd-gallery">
            {imagemAtual ? (
              <img className="pd-main-img" src={imagemAtual} alt={produto.titulo} />
            ) : (
              <div className="pd-main-img pd-main-empty">Sem foto</div>
            )}
            {imagens.length > 1 && (
              <div className="pd-thumbs">
                {imagens.map((img, i) => (
                  <button key={img.id} type="button"
                    className={'pd-thumb' + (i === indiceImagem ? ' ativo' : '')}
                    onClick={() => setIndiceImagem(i)}>
                    <img src={img.url} alt={''} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ===== Informações ===== */}
          <div className="pd-info">
            <div className="pd-categoria">{categoriaNome} {produto.codigo ? '· ' + produto.codigo : ''}</div>
            <h1 className="pd-title">{produto.titulo}</h1>

            <div className="pd-preco">
              {preco > 0 ? (
                <>
                  <div className="pd-preco-atual">{formatarValor(preco)}</div>
                  <div className="pd-preco-hint">Preço sugerido de revenda · você pode ajustar no catálogo</div>
                </>
              ) : (
                <div className="pd-preco-hint">Preço a definir</div>
              )}
            </div>

            {/* Variações */}
            <div className="pd-block">
              <div className="pd-block-titulo">Cor: <strong>{corSelecionada || '—'}</strong></div>
              <div className="pd-cores">
                {cores.map((cor) => (
                  <button key={cor} type="button"
                    className={'pd-cor' + (cor === corSelecionada ? ' ativo' : '')}
                    onClick={() => { setCorSelecionada(cor); const tams = variacoes.filter((v) => v.cor === cor).map((v) => v.tamanho); if (tams.length) setTamanhoSelecionado(tams[0]); }}>
                    {cor}
                  </button>
                ))}
              </div>
            </div>

            <div className="pd-block">
              <div className="pd-block-titulo">Tamanho: <strong>{tamanhoSelecionado || '—'}</strong></div>
              <div className="pd-tamanhos">
                {tamanhosDaCor.map((tam) => {
                  const v = variacoes.find((x) => x.cor === corSelecionada && x.tamanho === tam);
                  const semEstoque = !v || Number(v.estoque) <= 0;
                  return (
                    <button key={tam} type="button"
                      className={'pd-tam' + (tam === tamanhoSelecionado ? ' ativo' : '') + (semEstoque ? ' esgotado' : '')}
                      disabled={semEstoque}
                      onClick={() => setTamanhoSelecionado(tam)}>
                      {tam}
                    </button>
                  );
                })}
              </div>
              <div className="pd-sku">
                SKU: <strong>{skuAtual || '—'}</strong>
                <button type="button" className="pd-mini-copy" onClick={() => copiarTexto(skuAtual || '', 'SKU')}>copiar</button>
              </div>
            </div>

            <div className="pd-block">
              <div className="pd-block-titulo">Quantidade</div>
              <div className="row">
                <div className="pd-qtd">
                  <button type="button" onClick={() => setQuantidade((q) => Math.max(1, q - 1))}>−</button>
                  <input type="number" min="1" max={Math.max(1, estoqueAtual)} value={quantidade}
                    onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)} />
                  <button type="button" onClick={() => setQuantidade((q) => Math.min(Math.max(1, estoqueAtual), q + 1))}>+</button>
                </div>
                <div className="pd-estoque">
                  {estoqueAtual > 0 ? `${estoqueAtual} disponíveis` : 'Esgotado'}
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-block pd-add" onClick={adicionarAoCarrinho}>
              Adicionar ao pedido
            </button>
            {msgCarrinho && <div className="pd-feedback ok">{msgCarrinho}</div>}

            {/* Descrição */}
            <div className="pd-block">
              <div className="pd-block-titulo">Descrição</div>
              <p className="pd-descricao">{produto.descricao || 'Sem descrição.'}</p>
              <div className="pd-acoes-copy">
                <button className="btn btn-sm btn-outline" onClick={() => copiarTexto(produto.titulo || '', 'Título')}>📋 Copiar título</button>
                <button className="btn btn-sm btn-outline" onClick={() => copiarTexto(produto.descricao || '', 'Descrição')}>📋 Copiar descrição</button>
              </div>
            </div>

            {/* Anúncio pronto */}
            <div className="pd-block pd-anuncio">
              <div className="pd-block-titulo">📣 Anúncio pronto pra copiar</div>
              <p className="pd-hint">Texto formatado pra colar direto no Mercado Livre, Shopee ou WhatsApp.</p>
              <pre className="pd-anuncio-texto">{textoAnuncio}</pre>
              <button className="btn btn-primary btn-sm" onClick={copiarAnuncio}>📋 Copiar anúncio completo</button>
            </div>

            {msgCopiado && <div className="pd-feedback ok">{msgCopiado}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
