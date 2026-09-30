'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUser, signOut } from '../../lib/auth';

const STATUS_INFO = {
  pendente: { label: 'Pendente', cor: '#f59e0b' },
  confirmado: { label: 'Confirmado', cor: '#3b82f6' },
  em_producao: { label: 'Em produção', cor: '#8b5cf6' },
  enviado: { label: 'Enviado', cor: '#22d3ee' },
  entregue: { label: 'Entregue', cor: '#34d399' },
  cancelado: { label: 'Cancelado', cor: '#f43f5e' },
};

function formatarValor(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

function formatarData(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [carregando, setCarregando] = useState(true);
  const [pedidos, setPedidos] = useState([]);
  const [devolucoes, setDevolucoes] = useState([]);
  const [qtdProdutos, setQtdProdutos] = useState(0);

  useEffect(() => { iniciar(); }, []);

  async function iniciar() {
    const user = await getCurrentUser();
    if (!user) { router.push('/login'); return; }

    const [ped, dev, pro] = await Promise.all([
      supabase.rpc('listar_pedidos'),
      supabase.rpc('listar_devolucoes'),
      supabase.from('produtos').select('id'),
    ]);
    setPedidos(Array.isArray(ped.data) ? ped.data : []);
    setDevolucoes(Array.isArray(dev.data) ? dev.data : []);
    setQtdProdutos(pro.data?.length || 0);
    setCarregando(false);
  }

  async function sair() {
    await signOut();
    window.location.href = '/';
  }

  const totalPedidos = pedidos.length;
  const validos = pedidos.filter((p) => p.status !== 'cancelado');
  let receita = 0;
  validos.forEach((p) => { receita += Number(p.total) || 0; });
  const emAndamento = pedidos.filter((p) => p.status !== 'entregue' && p.status !== 'cancelado').length;
  const entregues = pedidos.filter((p) => p.status === 'entregue').length;
  const devPendentes = devolucoes.filter((d) => d.status === 'pendente').length;
  const recentes = [...pedidos].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 6);

  const metricas = [
    { icone: '📦', num: totalPedidos, label: 'Pedidos', cls: 'sc-pedidos' },
    { icone: '💰', num: formatarValor(receita), label: 'Faturamento', cls: 'sc-valor' },
    { icone: '✅', num: entregues, label: 'Entregues', cls: 'sc-entregues' },
    { icone: '⏳', num: emAndamento, label: 'Em andamento', cls: 'sc-andamento' },
    { icone: '↩️', num: devPendentes, label: 'Devoluções pend.', cls: 'sc-devolucoes' },
    { icone: '👕', num: qtdProdutos, label: 'Produtos', cls: 'sc-pedidos' },
  ];

  const linksRapidos = [
    { href: '/admin/pedidos', emoji: '📦', nome: 'Pedidos', desc: 'Gerenciar pedidos' },
    { href: '/admin/produtos', emoji: '👕', nome: 'Produtos', desc: 'Catálogo e estoque' },
    { href: '/admin/devolucoes', emoji: '↩️', nome: 'Devoluções', desc: 'Analisar solicitações' },
    { href: '/admin/novidades', emoji: '📢', nome: 'Novidades', desc: 'Publicar avisos' },
    { href: '/admin/configuracoes', emoji: '⚙️', nome: 'Configurações', desc: 'Ajustes do sistema' },
  ];

  if (carregando) {
    return (
      <div className="dash-loading">
        <div className="dash-loading-spin"></div>
        <p>Carregando painel admin...</p>
      </div>
    );
  }

  return (
    <>
      <header className="adm-nav">
        <div className="container adm-nav-inner">
          <Link href="/admin" className="nav-logo">PlayDrop Admin</Link>
          <nav className="adm-nav-links">
            <Link href="/admin" className={pathname === '/admin' ? 'active' : ''}>Painel</Link>
            <Link href="/admin/pedidos" className={pathname.startsWith('/admin/pedidos') ? 'active' : ''}>Pedidos</Link>
            <Link href="/admin/produtos" className={pathname.startsWith('/admin/produtos') ? 'active' : ''}>Produtos</Link>
            <Link href="/admin/devolucoes" className={pathname.startsWith('/admin/devolucoes') ? 'active' : ''}>Devoluções</Link>
            <Link href="/admin/novidades" className={pathname.startsWith('/admin/novidades') ? 'active' : ''}>Novidades</Link>
          </nav>
          <button className="btn btn-sm btn-outline" onClick={sair}>Sair</button>
        </div>
      </header>

      <div className="adm-wrap container">
        <section className="adm-hero">
          <h1>⚡ Painel administrativo</h1>
          <p>Visão geral do PlayDrop: pedidos, devoluções, produtos e novidades.</p>
        </section>

        <section className="adm-metricas">
          {metricas.map((m) => (
            <div key={m.label} className={`bento-card ${m.cls}`}>
              <span className="stat-icone">{m.icone}</span>
              <div className="stat-info">
                <span className="stat-num">{m.num}</span>
                <span className="stat-label">{m.label}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="adm-cartao-bonus">
          <h3>🧭 Acessos rápidos</h3>
          <div className="adm-links-rapidos">
            {linksRapidos.map((l) => (
              <Link key={l.href} href={l.href} className="adm-link-card">
                <span className="adm-link-card-emoji">{l.emoji}</span>
                <strong>{l.nome}</strong>
                <small>{l.desc}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="dash-pedidos" style={{ marginTop: 26 }}>
          <div className="dash-titulo-linha">
            <h2 className="dash-titulo">🧾 Pedidos recentes</h2>
            <Link href="/admin/pedidos" className="dash-ver-todos">Ver todos →</Link>
          </div>

          {recentes.length === 0 ? (
            <div className="dash-vazio">
              <span className="dash-vazio-emoji">📦</span>
              <h3>Nenhum pedido ainda</h3>
              <p>Os pedidos aparecem aqui em tempo real.</p>
            </div>
          ) : (
            <div className="dash-pedido-lista">
              {recentes.map((p) => {
                const info = STATUS_INFO[p.status] || { label: p.status, cor: '#888' };
                return (
                  <Link key={p.id} href={`/admin/pedidos/${p.id}`} className="pedido-row" style={{ textDecoration: 'none' }}>
                    <div className="pedido-row-info">
                      <span className="pedido-row-num">#{p.numero}</span>
                      <span className="pedido-row-data">{p.nome_cliente} · {formatarData(p.criado_em)}</span>
                    </div>
                    <div className="pedido-row-right">
                      <span className="pedido-row-status" style={{ background: info.cor + '1f', color: info.cor }}>{info.label}</span>
                      <strong className="pedido-row-total">{formatarValor(p.total)}</strong>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
