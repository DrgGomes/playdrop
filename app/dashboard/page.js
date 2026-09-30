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
  {
    id: 'padrao-1',
    emoji: '🚀',
    titulo: 'PlayDrop está de cara nova!',
    mensagem: 'Dashboard renovado, devoluções online e menu lateral em todas as telas.',
  },
  {
    id: 'padrao-2',
    emoji: '📦',
    titulo: 'Dica de revenda',
    mensagem: 'Feche combos de 10+ peças para pedidos maiores e mais margem.',
  },
  {
    id: 'padrao-3',
    emoji: '🔥',
    titulo: 'Lançamento em breve',
    mensagem: 'Novas estampas chegando no catálogo. Fique de olho!',
  },
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
  const emAndamento = ultimos.filter((p) => p.status !== 'entregue' && p.status !== 'cancelado').length;
  let totalGasto = 0;
  ultimos.forEach((p) => { totalGasto += Number(p.total) || 0; });
  const taxaConclusao = ultimos.length > 0 ? Math.round((entregues / ultimos.length) * 100) : 0;
  const destaque = avisos[0] || null;
  const outrosAvisos = avisos.filter((a) => a.id !== (destaque?.id));

  return (
    <div className="dash-page">
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
            <h1>Olá, <span>{primeiroNome}</span>!</h1>
            <p>Acompanhe seus pedidos, devoluções e novidades em um só lugar.</p>
            <div className="dash-hero-botoes">
              <Link href="/catalogo" className="dash-btn dash-btn-primario">🛍️ Ver catálogo</Link>
              <Link href="/devolucoes/solicitar" className="dash-btn dash-btn-fantasma">↩️ Solicitar devolução</Link>
            </div>
          </div>
          <div className="dash-hero-avatar">{inicial}</div>
        </section>

        {/* ALERTA / NOVIDADE EM DESTAQUE */}
        {destaque && (
          <section className="dash-destaque">
            <div className="dash-destaque-glow"></div>
            <span className="dash-destaque-emoji">{destaque.emoji || '📢'}</span>
            <div className="dash-destaque-conteudo">
              <span className="dash-destaque-badge">📢 Novidade</span>
              <h2>{destaque.titulo}</h2>
              <p>{destaque.mensagem}</p>
            </div>
          </section>
        )}

        {/* OUTROS AVISOS */}
        {outrosAvisos.length > 0 && (
          <section className="dash-avisos">
            {outrosAvisos.map((a) => (
              <div key={a.id} className="dash-aviso">
                <span className="dash-aviso-emoji">{a.emoji || '📢'}</span>
                <div>
                  <strong>{a.titulo}</strong>
                  <p>{a.mensagem}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* STATS */}
        <section className="dash-stats">
          <div className="stat-card sc-pedidos">
            <span className="stat-icone">📦</span>
            <div className="stat-info">
              <span className="stat-num">{stats?.total_pedidos || 0}</span>
              <span className="stat-label">Pedidos</span>
            </div>
          </div>
          <div className="stat-card sc-entregues">
            <span className="stat-icone">✅</span>
            <div className="stat-info">
              <span className="stat-num">{entregues}</span>
              <span className="stat-label">Entregues</span>
            </div>
          </div>
          <div className="stat-card sc-andamento">
            <span className="stat-icone">⏳</span>
            <div className="stat-info">
              <span className="stat-num">{emAndamento}</span>
              <span className="stat-label">Em andamento</span>
            </div>
          </div>
          <div className="stat-card sc-valor">
            <span className="stat-icone">💰</span>
            <div className="stat-info">
              <span className="stat-num">{formatarValor(totalGasto)}</span>
              <span className="stat-label">Em pedidos</span>
            </div>
          </div>
          <div className="stat-card sc-devolucoes">
            <span className="stat-icone">↩️</span>
            <div className="stat-info">
              <span className="stat-num">{stats?.total_devolucoes || 0}</span>
              <span className="stat-label">Devoluções</span>
            </div>
          </div>
        </section>

        {/* PROGRESSO */}
        <section className="dash-progresso">
          <div className="dash-progresso-info">
            <span>Pedidos concluídos</span>
            <strong>{taxaConclusao}%</strong>
          </div>
          <div className="dash-progresso-barra">
            <div className="dash-progresso-preenchido" style={{ width: taxaConclusao + '%' }}></div>
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
              <p>Bora fazer seu primeiro pedido? É rapidinho!</p>
              <Link href="/catalogo" className="dash-btn dash-btn-primario">Ver catálogo</Link>
            </div>
          ) : (
            <div className="dash-pedido-lista">
              {ultimos.map((p) => {
                const cor = STATUS_COR[p.status] || '#94a3b8';
                const label = STATUS_LABEL[p.status] || p.status;
                return (
                  <div key={p.numero} className="pedido-row">
                    <div className="pedido-row-info">
                      <span className="pedido-row-num">#{p.numero}</span>
                      <span className="pedido-row-data">{formatarData(p.criado_em)}</span>
                    </div>
                    <div className="pedido-row-right">
                      <span className="pedido-row-status" style={{ background: cor + '22', color: cor }}>{label}</span>
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
    </div>
  );
}
