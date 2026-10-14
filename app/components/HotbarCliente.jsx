'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUser, getProfile, signOut } from '../../lib/auth';
import TourPrimeiraVez from './TourPrimeiraVez';

const ITENS = [
  { href: '/dashboard', label: 'Início', icone: '🏠' },
  { href: '/catalogo', label: 'Catálogo', icone: '🛍️' },
  { href: '/pedido', label: 'Pedido', icone: '📦' },
  { href: '/vendas', label: 'Vendas', icone: '📈' },
  { href: '/financeiro', label: 'Financeiro', icone: '💰' },
  { href: '/produtos', label: 'Produtos', icone: '👕' },
  { href: '/relatorios', label: 'Relatórios', icone: '📊' },
  { href: '/devolucoes', label: 'Devoluções', icone: '↩️' },
  { href: '/conta', label: 'Minha conta', icone: '👤' },
];

/* ===== Tour guiado — 1ª visita de cada tela ===== */
function passosPorRota(caminho) {
  if (!caminho) return null;

  if (caminho === '/dashboard') {
    return {
      chave: 'playdrop_tour_dashboard_v1',
      passos: [
        { seletor: '.dash-hero', tag: '👋 Bem-vindo(a)', titulo: 'Este é o seu painel', texto: 'Aqui ficam os dados das suas vendas e o status dos seus pedidos, tudo em um só lugar.' },
        { seletor: '.dash-bento', tag: '📊 Seus números', titulo: 'Dados de vendas', texto: 'Cartões com total de pedidos, entregues, em andamento, valor investido em pedidos e devoluções.' },
        { seletor: '.dash-progresso', tag: '🎯 Progresso', titulo: 'Concluídos', texto: 'A barra mostra a porcentagem dos seus pedidos já concluídos.' },
        { seletor: '.dash-pedidos', tag: '🧾 Status', titulo: 'Status dos pedidos', texto: 'Cada pedido tem uma cor de status: amarelo = pendente, azul = confirmado, roxo = em produção, azul claro = enviado, verde = entregue e vermelho = cancelado.' },
      ],
    };
  }

  if (caminho === '/catalogo') {
    return {
      chave: 'playdrop_tour_catalogo_v1',
      passos: [
        { seletor: '[class*="product-card"]', tag: '🛍️ Catálogo', titulo: 'Produtos disponíveis', texto: 'Aqui você encontra cada produto disponível para venda, com foto, nome e informações de revenda.' },
        { seletor: '.product-info', tag: 'ℹ️ Card do produto', titulo: 'O que tem em cada card', texto: 'Cada card mostra o produto com o custo que você paga. Clique nele para abrir a página completa do produto.' },
      ],
    };
  }

  if (caminho.startsWith('/produto/')) {
    return {
      chave: 'playdrop_tour_produto_v1',
      passos: [
        { seletor: '.pd-galeria-principal', tag: '📸 Fotos', titulo: 'Fotos do produto', texto: 'Veja as fotos da peça. Use as miniaturas para trocar a imagem e o botão de baixar para guardar todas as fotos de uma vez.' },
        { seletor: '.pd-custo', tag: '💰 Custo', titulo: 'Seu custo (o que você paga)', texto: 'Este é o preço que VOCÊ paga pela camiseta já embalada, etiquetada e enviada. É o seu custo real.' },
        { seletor: '.pd-venda-sugerida', tag: '💡 Sugestão', titulo: 'Preço de venda sugerido', texto: 'Calculamos o preço ideal para você lucrar entre R$ 5,00 e R$ 10,00 por peça. Os valores "chamativos" (como R$ 39,90) aparecem em destaque porque vendem mais rápido.' },
        { seletor: '.pd-info-card', tag: '🛒 Pedido', titulo: 'Como fazer um pedido', texto: 'Escolha a cor, o tamanho e a quantidade, depois clique em "Adicionar ao pedido". O item vai para a sua tela de pedido.' },
        { seletor: '.loj-grid-2', tag: '📋 Títulos e descrições', titulo: 'Prontos para o anúncio', texto: 'Aqui estão 5 títulos e uma descrição sem emojis prontos para copiar e colar no seu anúncio (Mercado Livre, Shopee etc.). É só clicar em "Copiar".' },
      ],
    };
  }

  if (caminho.startsWith('/devolucoes')) {
    return {
      chave: 'playdrop_tour_devolucoes_v1',
      passos: [
        { tag: '↩️ Devoluções', titulo: 'Para que serve esta tela', texto: 'Aqui você solicita a devolução de peças e acompanha o andamento de cada solicitação.' },
        { tag: '🔵 Acompanhe o status', titulo: 'Status das devoluções', texto: 'Pendente = aguardando análise · Aprovada = devolução aceita · Recusada = não aceita · Concluída = finalizada.' },
        { tag: '💬 Dica', titulo: 'Como solicitar', texto: 'Preencha os dados da peça (produto, quantidade e motivo) e envie. Você acompanha tudo por aqui.' },
      ],
    };
  }

  if (caminho.startsWith('/pedido')) {
    return {
      chave: 'playdrop_tour_pedido_v1',
      passos: [
        { tag: '📦 Pedido', titulo: 'Sua tela de pedido', texto: 'Aqui você confere os itens que adicionou, as quantidades e o total do pedido.' },
        { tag: '✅ Finalizar', titulo: 'Envie seu pedido', texto: 'Confira tudo e envie. Seus dados (nome e WhatsApp) já vêm preenchidos da sua conta.' },
      ],
    };
  }

  return null;
}

export default function MenuLateral() {
  const pathname = usePathname();
  const [logado, setLogado] = useState(false);
  const [qtdCarrinho, setQtdCarrinho] = useState(0);
  const [nome, setNome] = useState('');

  useEffect(() => {
    let ativo = true;
    getCurrentUser().then(async (user) => {
      if (!ativo) return;
      setLogado(!!user);
      if (user) {
        const { data: perfil } = await getProfile(user.id);
        const meta = user.user_metadata || {};
        const nomeConta = (perfil?.nome || perfil?.nome_completo || meta.nome || meta.name || '').trim();
        if (ativo) setNome(nomeConta);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => {
      if (ativo) setLogado(!!sessao?.user);
    });
    return () => { ativo = false; sub?.subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    function atualizar() {
      try {
        const itens = JSON.parse(localStorage.getItem('playdrop_carrinho') || '[]');
        setQtdCarrinho(itens.reduce((s, i) => s + (Number(i.quantidade) || 1), 0));
      } catch { setQtdCarrinho(0); }
    }
    atualizar();
    window.addEventListener('storage', atualizar);
    window.addEventListener('playdrop_carrinho', atualizar);
    return () => {
      window.removeEventListener('storage', atualizar);
      window.removeEventListener('playdrop_carrinho', atualizar);
    };
  }, []);

  if (!logado) return null;

  const inicial = nome ? nome.trim()[0]?.toUpperCase() : '👤';
  const primeiroNome = nome.split(' ')[0] || 'Cliente';
  const tour = passosPorRota(pathname);

  async function sair() {
    await signOut();
    window.location.href = '/';
  }

  return (
    <>
      <aside className="menu-lateral">
        <Link href="/dashboard" className="menu-logo">
          <span className="menu-logo-marca">PlayDrop</span>
        </Link>

        <nav className="menu-links">
          <span className="menu-secao">Navegação</span>
          {ITENS.map((item, i) => {
            const ativo = pathname === item.href || pathname.startsWith(item.href + '/');
            const isPedido = item.href === '/pedido';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`menu-item${ativo ? ' active' : ''}`}
                title={item.label}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="menu-icone">
                  {item.icone}
                  {isPedido && qtdCarrinho > 0 && (
                    <span className="menu-badge">{qtdCarrinho}</span>
                  )}
                </span>
                <span className="menu-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="menu-rodape">
          <div className="menu-usuario">
            <span className="menu-usuario-avatar">{inicial}</span>
            <span className="menu-usuario-info">
              <strong>{primeiroNome}</strong>
              <small>Cliente</small>
            </span>
          </div>
          <button className="menu-sair" onClick={sair}>
            <span className="menu-icone">🚪</span>
            <span className="menu-label">Sair</span>
          </button>
        </div>
      </aside>

      {tour && <TourPrimeiraVez chave={tour.chave} passos={tour.passos} />}
    </>
  );
}
