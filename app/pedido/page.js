'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUser, getProfile, signOut } from '../../lib/auth';

function formatarValor(v) {
  const n = Number(v);
  if (!v || isNaN(n)) return 'R$ 0,00';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

export default function PedidoPage() {
  const router = useRouter();
  const [itens, setItens] = useState([]);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [contaCarregando, setContaCarregando] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(null); // { numero, nome }
  const [preenchidoDaConta, setPreenchidoDaConta] = useState(false);

  useEffect(() => {
    let carrinho = [];
    try { carrinho = JSON.parse(localStorage.getItem('playdrop_carrinho') || '[]'); } catch {}
    setItens(carrinho);
    setCarregando(false);

    async function carregarConta() {
      try {
        const user = await getCurrentUser();
        setUsuario(user);
        if (user) {
          let perfil = null;
          try {
            const { data: pf } = await getProfile(user.id);
            perfil = pf;
          } catch {}
          const meta = user.user_metadata || {};
          const nomeConta =
            (perfil && (perfil.nome || perfil.nome_completo || perfil.full_name)) ||
            meta.nome || meta.name || meta.full_name || '';
          const zapConta =
            (perfil && (perfil.whatsapp || perfil.telefone || perfil.celular || perfil.phone)) ||
            meta.whatsapp || meta.phone || user.phone || '';
          if (nomeConta || zapConta) {
            setNome(nomeConta);
            setWhatsapp(zapConta);
            setPreenchidoDaConta(true);
          }
        }
      } catch {}
      setContaCarregando(false);
    }
    carregarConta();
  }, []);

  const total = itens.reduce((soma, i) => soma + (Number(i.preco_unitario) || 0) * (Number(i.quantidade) || 1), 0);
  const totalItens = itens.reduce((soma, i) => soma + (Number(i.quantidade) || 1), 0);

  function removerItem(indice) {
    const novo = itens.filter((_, i) => i !== indice);
    setItens(novo);
    localStorage.setItem('playdrop_carrinho', JSON.stringify(novo));
  }

  function mudarQtd(indice, qtd) {
    const novo = itens.map((i, x) => (x === indice ? { ...i, quantidade: Math.max(1, qtd) } : i));
    setItens(novo);
    localStorage.setItem('playdrop_carrinho', JSON.stringify(novo));
  }

  function limparCarrinho() {
    setItens([]);
    localStorage.removeItem('playdrop_carrinho');
  }

  async function sair() {
    await signOut();
    window.location.href = '/';
  }

  async function finalizar(e) {
    e.preventDefault();
    setErro('');
    if (!nome.trim()) { setErro('Informe seu nome.'); return; }
    if (!whatsapp.trim()) { setErro('Informe seu WhatsApp.'); return; }
    if (itens.length === 0) { setErro('Seu pedido está vazio.'); return; }
    setEnviando(true);

    try {
      const { data: pedido, error: errPedido } = await supabase
        .from('pedidos')
        .insert({
          nome_cliente: nome.trim(),
          whatsapp: whatsapp.trim(),
          observacoes: observacoes.trim(),
          status: 'pendente',
          total: total,
        })
        .select()
        .single();
      if (errPedido) throw errPedido;

      const linhasItens = itens.map((i) => ({
        pedido_id: pedido.id,
        produto_id: i.produto_id || null,
        variacao_id: i.variacao_id || null,
        titulo: i.titulo || '',
        sku: i.sku || '',
        cor: i.cor || '',
        tamanho: i.tamanho || '',
        quantidade: Number(i.quantidade) || 1,
        preco_unitario: Number(i.preco_unitario) || 0,
      }));
      const { error: errItens } = await supabase.from('pedido_itens').insert(linhasItens);
      if (errItens) throw errItens;

      localStorage.removeItem('playdrop_carrinho');
      setSucesso({ numero: pedido.numero, nome: nome.trim() });
      setEnviando(false);
    } catch (err) {
      setErro('Erro ao enviar pedido: ' + (err.message || 'tente novamente'));
      setEnviando(false);
    }
  }

  // ===== Tela de sucesso =====
  if (sucesso) {
    return (
      <>
        <header className="nav">
          <div className="container">
            <span className="nav-logo">PlayDrop</span>
            <nav className="nav-links">
              <Link href="/catalogo">Catálogo</Link>
            </nav>
          </div>
        </header>
        <div className="container" style={{ padding: 60, maxWidth: 560, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>Pedido enviado!</h1>
          <p style={{ color: 'var(--muted)' }}>
            Obrigado, <strong>{sucesso.nome}</strong>! Seu pedido <strong>#{sucesso.numero}</strong> foi recebido.
          </p>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            Em breve você receberá a confirmação com os dados de pagamento e envio.
          </p>
          <Link href="/catalogo" className="btn btn-primary">← Voltar ao catálogo</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/pedido">🛒 Ver pedido{itens.length > 0 ? ` (${itens.length})` : ''}</Link>
            {!contaCarregando && (
              usuario ? (
                <>
                  <Link href="/conta">👤 Minha conta</Link>
                  <button className="btn btn-sm btn-outline"
                    style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }} onClick={sair}>Sair</button>
                </>
              ) : (
                <Link href="/login">Entrar</Link>
              )
            )}
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>Seu pedido</h1>
        <p>Revise os itens e finalize com seus dados de contato.</p>
      </div>

      <div className="container" style={{ paddingBottom: 80 }}>
        {erro && <p className="erro">{erro}</p>}

        {!carregando && itens.length === 0 && (
          <div className="empty">
            <h3>Seu carrinho está vazio</h3>
            <p>Adicione produtos pelo catálogo para montar seu pedido.</p>
            <Link href="/catalogo" className="btn btn-primary" style={{ marginTop: 12 }}>Ver catálogo</Link>
          </div>
        )}

        {itens.length > 0 && (
          <div className="ped-grid">
            {/* ===== Itens ===== */}
            <div className="ped-itens">
              {itens.map((i, idx) => (
                <div className="ped-item" key={idx}>
                  {i.imagem ? <img className="ped-item-img" src={i.imagem} alt={i.titulo} /> : <div className="ped-item-img" />}
                  <div className="ped-item-info">
                    <div className="ped-item-titulo">{i.titulo}</div>
                    <div className="ped-item-spec">
                      {i.cor} · {i.tamanho} · <span className="ped-item-sku">{i.sku}</span>
                    </div>
                    <div className="ped-item-preco">{formatarValor(i.preco_unitario)}</div>
                  </div>
                  <div className="ped-item-qtd">
                    <button type="button" onClick={() => mudarQtd(idx, (Number(i.quantidade) || 1) - 1)}>−</button>
                    <span>{i.quantidade}</span>
                    <button type="button" onClick={() => mudarQtd(idx, (Number(i.quantidade) || 1) + 1)}>+</button>
                  </div>
                  <button type="button" className="ped-item-remove" onClick={() => removerItem(idx)}>×</button>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-outline" style={{ marginTop: 12 }} onClick={limparCarrinho}>
                Limpar carrinho
              </button>
            </div>

            {/* ===== Resumo + dados ===== */}
            <div className="ped-resumo">
              <h3>Resumo</h3>
              <div className="ped-linha"><span>{totalItens} item(ns)</span><span>{formatarValor(total)}</span></div>
              <div className="ped-linha total"><span>Total</span><strong>{formatarValor(total)}</strong></div>

              {preenchidoDaConta && (
                <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
                  ✓ Dados preenchidos da sua conta — edite se precisar.
                </p>
              )}

              <form onSubmit={finalizar} style={{ marginTop: 14 }}>
                <div className="field">
                  <span className="label">Seu nome</span>
                  <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="field">
                  <span className="label">WhatsApp</span>
                  <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
                <div className="field">
                  <span className="label">Observações (opcional)</span>
                  <textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex.: entrega em endereço comercial, prazo..." />
                </div>
                <button className="btn btn-primary btn-block" style={{ fontSize: 16, padding: '14px' }} disabled={enviando}>
                  {enviando ? 'Enviando...' : 'Finalizar pedido'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
