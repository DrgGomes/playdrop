'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUser, getProfile } from '../../lib/auth';
import HotbarCliente from '../components/HotbarCliente';

const STATUS_COR = {
  pendente: '#f59e0b',
  confirmado: '#3b82f6',
  em_producao: '#8b5cf6',
  enviado: '#06b6d4',
  entregue: '#22c55e',
  cancelado: '#ef4444',
};

const STATUS_LABEL = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_producao: 'Em produção',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const AVISOS_PADRAO = [
  { id: 'padrao-1', emoji: '🚀', titulo: 'Nova versão do PlayDrop', mensagem: 'Dashboard, devoluções e menu lateral chegaram. Tudo pensado para você revender mais.' },
  { id: 'padrao-2', emoji: '📦', titulo: 'Dica de revenda', mensagem: 'Monte combos de 10+ peças para fechar pedidos maiores com mais margem.' },
];

function formatarValor(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

function formatarData(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [stats, setStats] = useState(null);
  const [avisos, setAvisos] = useState(AVISOS_PADRAO);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }

      const { data: perfil } = await getProfile(user.id);
      const meta = user.user_metadata || {};
      const nomeConta = (perfil?.nome || perfil?.nome_completo || meta.nome || meta.name || '').trim();
      const zapConta = (perfil?.whatsapp || perfil?.telefone || meta.whatsapp || '').trim();
      setNome(nomeConta);

      if (zapConta) {
        const { data } = await supabase.rpc('dashboard_cliente', { p_whatsapp: zapConta });
        if (data) setStats(data);
      }

      const { data: avisosDb, error: errAvisos } = await supabase
        .from('avisos')
        .select('*')
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(4);
      if (!errAvisos && avisosDb && avisosDb.length > 0) {
        setAvisos(avisosDb);
      }

      setCarregando(false);
    }
    iniciar();
  }, [router]);

  if (carregando) {
    return (
      <div className="dash-loading">
        <div className="dash-loading-spin"></div>
        <p>Carregando seu painel...</p>
      </div>
    );
  }

  const primeiroNome = nome.split(' ')[0] || 'cliente';
  const inicial = nome ? nome.trim()[0]?.toUpperCase() : '👤';
  const ultimos = stats?.ultimos_pedidos || [];
  const entregues = ultimos.filter((p) => p.status === 'entregue').length;
  let totalGasto = 0;
  ultimos.forEach((p) => { totalGasto += Number(p.total) || 0; });

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/pedido">🛒 Ver pedido</Link>
          </nav>
        </div>
      </header>

      <div className="dash-wrap container">
        {/* HERO */}
        <section className="dash-hero">
          <div className="dash-hero-bolha hb1"></div>
          <div className="dash-hero-bolha hb2"></div>
          <div className="dash-hero-bolha hb3"></div>
          <div className="dash-hero-texto">
            <span className="dash-hello">👋 Bem-vindo de volta</span>
            <h1>Olá, <span>{primeiroNome}</span>! 👊</h1>
            <p>Que tal dar uma olhada no catálogo hoje? Tem novidade esperando você.</p>
            <div className="dash-hero-botoes">
              <Link href="/catalogo" className="dash-btn dash-btn-primario">🛍️ Ver catálogo</Link>
              <Link href="/devolucoes/solicitar" className="dash-btn dash-btn-fantasma">↩️ Pedir devolução</Link>
            </div>
          </div>
          <div className="dash-hero-avatar">{inicial}</div>
        </section>

        {/* NOVIDADES */}
        {avisos.length > 0 && (
          <section className="dash-avisos">
            <h2 className="dash-titulo">📢 Novidades</h2>
            <div className="dash-aviso-lista">
              {avisos.map((a) => (
                <div key={a.id} className="dash-aviso">
                  <span className="dash-aviso-emoji">{a.emoji || '📢'}</span>
                  <div>
                    <strong>{a.titulo}</strong>
                    <p>{a.mensagem}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* STATS */}
        <section className="dash-stats">
          <div className="stat-card sc-pedidos">
            <span className="stat-icone">📦</span>
            <div>
              <span className="stat-num">{stats?.total_pedidos || 0}</span>
              <span className="stat-label">Pedidos</span>
            </div>
          </div>
          <div className="stat-card sc-entregues">
            <span className="stat-icone">✅</span>
            <div>
              <span className="stat-num">{entregues}</span>
              <span className="stat-label">Entregues</span>
            </div>
          </div>
          <div className="stat-card sc-valor">
            <span className="stat-icone">💰</span>
            <div>
              <span className="stat-num">{formatarValor(totalGasto)}</span>
              <span className="stat-label">Em pedidos</span>
            </div>
          </div>
          <div className="stat-card sc-devolucoes">
            <span className="stat-icone">↩️</span>
            <div>
              <span className="stat-num">{stats?.total_devolucoes || 0}</span>
              <span className="stat-label">Devoluções</span>
            </div>
          </div>
        </section>

        {/* AÇÕES RÁPIDAS */}
        <section className="dash-acoes">
          <Link href="/catalogo" className="acao-card">
            <span className="acao-emoji">🛍️</span>
            <span className="acao-nome">Catálogo</span>
            <span className="acao-desc">Explorar produtos</span>
          </Link>
          <Link href="/pedido" className="acao-card">
            <span className="acao-emoji">🛒</span>
            <span className="acao-nome">Meu pedido</span>
            <span className="acao-desc">Ver carrinho</span>
          </Link>
          <Link href="/devolucoes" className="acao-card">
            <span className="acao-emoji">↩️</span>
            <span className="acao-nome">Devoluções</span>
            <span className="acao-desc">Acompanhar</span>
          </Link>
          <Link href="/conta" className="acao-card">
            <span className="acao-emoji">👤</span>
            <span className="acao-nome">Minha conta</span>
            <span className="acao-desc">Meus dados</span>
          </Link>
        </section>

        {/* ÚLTIMOS PEDIDOS */}
        <section className="dash-pedidos">
          <div className="dash-titulo-linha">
            <h2 className="dash-titulo">🧾 Últimos pedidos</h2>
            <Link href="/pedido" className="dash-ver-todos">Ver todos →</Link>
          </div>

          {ultimos.length === 0 ? (
            <div className="dash-vazio">
              <span className="dash-vazio-emoji">🛍️</span>
              <h3>Nenhum pedido ainda</h3>
              <p>Bora dar uma olhada no catálogo e fazer seu primeiro pedido?</p>
              <Link href="/catalogo" className="dash-btn dash-btn-primario">Ver catálogo</Link>
            </div>
          ) : (
            <div className="dash-pedido-lista">
              {ultimos.map((p) => {
                const cor = STATUS_COR[p.status] || '#999';
                const label = STATUS_LABEL[p.status] || p.status;
                return (
                  <div key={p.numero} className="pedido-row">
                    <div className="pedido-row-info">
                      <span className="pedido-row-num">#{p.numero}</span>
                      <span className="pedido-row-data">{formatarData(p.criado_em)}</span>
                    </div>
                    <div className="pedido-row-right">
                      <span className="pedido-row-status" style={{ background: cor + '1f', color: cor }}>
                        {label}
                      </span>
                      <strong className="pedido-row-total">{formatarValor(p.total)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <HotbarCliente />
    </>
  );
}
