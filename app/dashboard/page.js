'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUser, getProfile } from '../../lib/auth';
import HotbarCliente from '../components/HotbarCliente';

const STATUS_INFO = {
  pendente: { label: 'Pendente', cor: '#f59e0b' },
  confirmado: { label: 'Confirmado', cor: '#3b82f6' },
  em_producao: { label: 'Em produção', cor: '#8b5cf6' },
  enviado: { label: 'Enviado', cor: '#22d3ee' },
  entregue: { label: 'Entregue', cor: '#34d399' },
  cancelado: { label: 'Cancelado', cor: '#f43f5e' },
};

const AVISOS_PADRAO = [
  { id: 'p1', emoji: '🚀', titulo: 'PlayDrop de cara nova!', mensagem: 'Dashboard renovado, devoluções online e menu lateral em todas as telas.' },
  { id: 'p2', emoji: '📦', titulo: 'Dica de revenda', mensagem: 'Feche combos de 10+ peças para pedidos maiores e mais margem.' },
];

function formatarValor(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

function formatarData(d) {
  if (!d) return '';
  const t = new Date(d);
  if (isNaN(t.getTime())) return '';
  try {
    return t.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

function infoStatus(s) {
  return STATUS_INFO[s] || { label: (s || '—'), cor: '#8a94a6' };
}

export default function DashboardPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [stats, setStats] = useState(null);
  const [avisos, setAvisos] = useState(AVISOS_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [pronto, setPronto] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => { setPronto(true); }, []);

  useEffect(() => {
    async function iniciar() {
      try {
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
        if (!errAvisos && avisosDb && avisosDb.length > 0) setAvisos(avisosDb);
      } catch {}
      setCarregando(false);
    }
    iniciar();
  }, [router]);

  if (carregando || !pronto) {
    return (
      <>
        <div className="kv-loading">
          <div className="kv-spin"></div>
          <p>Carregando seu painel...</p>
        </div>
        <HotbarCliente />
      </>
    );
  }

  const primeiroNome = nome.split(' ')[0] || 'cliente';
  const inicial = nome ? nome.trim()[0]?.toUpperCase() : '👤';
  const ultimos = (stats && Array.isArray(stats.ultimos_pedidos)) ? stats.ultimos_pedidos : [];
  const totalPedidos = Number(stats?.total_pedidos) || 0;
  const totalDevolucoes = Number(stats?.total_devolucoes) || 0;
  const entregues = ultimos.filter((p) => p.status === 'entregue').length;
  const emAndamento = ultimos.filter((p) => p.status !== 'entregue' && p.status !== 'cancelado').length;
  let totalGasto = 0;
  ultimos.forEach((p) => { totalGasto += Number(p.total) || 0; });
  const taxaConclusao = totalPedidos > 0 ? Math.round((entregues / totalPedidos) * 100) : 0;

  const vendas7d = useMemo(() => {
    try {
      const dias = [];
      const hoje = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(hoje);
        d.setDate(d.getDate() - i);
        dias.push({
          chave: d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(),
          label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          total: 0,
        });
      }
      ultimos.forEach((p) => {
        const dia = new Date(p.criado_em);
        if (isNaN(dia.getTime())) return;
        const chave = dia.getFullYear() + '-' + dia.getMonth() + '-' + dia.getDate();
        const alvo = dias.find((d) => d.chave === chave);
        if (alvo) alvo.total += Number(p.total) || 0;
      });
      const max = Math.max(...dias.map((d) => d.total), 1);
      return dias.map((d) => ({ ...d, altura: Math.max(6, Math.round((d.total / max) * 100)) }));
    } catch { return []; }
  }, [ultimos]);

  const total7d = vendas7d.reduce((s, d) => s + d.total, 0);

  const atividades = useMemo(() => {
    const lista = ultimos.slice(0, 6).map((p) => {
      const st = infoStatus(p.status).label;
      const emoji = p.status === 'entregue' ? '✅' : p.status === 'cancelado' ? '❌' : '📦';
      return { id: 'ped-' + String(p.numero ?? ''), emoji, titulo: 'Pedido #' + String(p.numero ?? '?') + ' - ' + st, mensagem: formatarData(p.criado_em) };
    });
    const comAvisos = [...lista, ...avisos.map((a) => ({ id: 'av-' + String(a.id ?? ''), emoji: a.emoji || '📢', titulo: a.titulo || '', mensagem: a.mensagem || '' }))];
    return comAvisos.slice(0, 8);
  }, [ultimos, avisos]);

  const pedidosFiltrados = busca.trim()
    ? ultimos.filter((p) => {
        const num = String(p.numero ?? '');
        const st = infoStatus(p.status).label.toLowerCase();
        const termo = busca.trim().toLowerCase();
        return num.includes(termo) || st.includes(termo);
      })
    : ultimos;

  return (
    <div className="kv-dash">
      <header className="kv-topbar">
        <div className="kv-topbar-inner">
          <Link href="/dashboard" className="kv-brand">
            <span className="kv-brand-marca">PlayDrop</span>
            <span className="kv-brand-sub">by KORVO</span>
          </Link>
          <div className="kv-busca">
            <span className="kv-busca-icone">🔍</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pedidos (número ou status)..."
              aria-label="Buscar pedidos"
            />
          </div>
          <div className="kv-topbar-acoes">
            <Link href="/devolucoes" className="kv-sino" aria-label="Notificações (devoluções)">
              🔔
              {totalDevolucoes > 0 && <span className="kv-sino-badge">{totalDevolucoes}</span>}
            </Link>
            <span className="kv-avatar" title={nome}>{inicial}</span>
          </div>
        </div>
      </header>

      <main className="kv-container">
        <div className="kv-hello">
          <div>
            <h1>Olá, {primeiroNome} 👋</h1>
            <p>Acompanhe suas vendas, pedidos e devoluções em um só lugar.</p>
          </div>
          <Link href="/catalogo" className="kv-btn-primario">+ Ver catálogo</Link>
        </div>

        <section className="kv-cards">
          <div className="kv-card">
            <span className="kv-card-icone">📦</span>
            <div>
              <span className="kv-card-num">{totalPedidos}</span>
              <span className="kv-card-label">Pedidos</span>
            </div>
          </div>
          <div className="kv-card">
            <span className="kv-card-icone">💰</span>
            <div>
              <span className="kv-card-num">{formatarValor(totalGasto)}</span>
              <span className="kv-card-label">Vendas</span>
            </div>
          </div>
          <div className="kv-card">
            <span className="kv-card-icone">✅</span>
            <div>
              <span className="kv-card-num">{entregues}</span>
              <span className="kv-card-label">Entregues</span>
            </div>
          </div>
          <div className="kv-card">
            <span className="kv-card-icone">↩️</span>
            <div>
              <span className="kv-card-num">{totalDevolucoes}</span>
              <span className="kv-card-label">Devoluções</span>
            </div>
          </div>
        </section>

        <section className="kv-duplo">
          <div className="kv-painel">
            <div className="kv-painel-cabecalho">
              <h2>Vendas — últimos 7 dias</h2>
              <strong>{formatarValor(total7d)}</strong>
            </div>
            {total7d === 0 ? (
              <p className="kv-vazio">Sem vendas registradas nos últimos 7 dias. Faça seu primeiro pedido!</p>
            ) : (
              <div className="kv-barras">
                {vendas7d.map((d) => (
                  <div className="kv-barra-coluna" key={d.chave}>
                    <div className="kv-barra-trilho">
                      <div className="kv-barra" style={{ height: d.altura + '%' }}>
                        <span>{d.total > 0 ? formatarValor(d.total) : ''}</span>
                      </div>
                    </div>
                    <span className="kv-barra-label">{d.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="kv-painel">
            <div className="kv-painel-cabecalho">
              <h2>Atividades</h2>
            </div>
            <div className="kv-feed">
              {atividades.length === 0 ? (
                <p className="kv-vazio">Nenhuma atividade ainda.</p>
              ) : (
                atividades.map((a) => (
                  <div className="kv-feed-item" key={a.id}>
                    <span className="kv-feed-emoji">{a.emoji}</span>
                    <div>
                      <span>{a.titulo}</span>
                      <small>{a.mensagem}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="kv-painel">
          <div className="kv-painel-cabecalho">
            <h2>Pedidos recentes</h2>
            <Link href="/pedido" className="kv-ver-todos">Ver todos →</Link>
          </div>
          {pedidosFiltrados.length === 0 ? (
            <div className="kv-vazio">
              <h3>{busca ? 'Nenhum pedido para "' + busca + '"' : 'Nenhum pedido ainda'}</h3>
              <p>{busca ? 'Tente outro número ou status.' : 'Bora fazer seu primeiro pedido? É rapidinho!'}</p>
              {!busca && <Link href="/catalogo" className="kv-btn-primario" style={{ marginTop: 14 }}>Ver catálogo</Link>}
            </div>
          ) : (
            <>
              <div className="kv-tabela-cabecalho">
                <span>Pedido</span>
                <span>Data</span>
                <span>Status</span>
                <span>Total</span>
              </div>
              {pedidosFiltrados.map((p) => {
                const info = infoStatus(p.status);
                return (
                  <div className="kv-tabela-linha" key={String(p.numero ?? '') + '-' + idx}>
                    <span className="kv-tabela-num">#{String(p.numero ?? '?')}</span>
                    <span className="kv-tabela-data">{formatarData(p.criado_em)}</span>
                    <span><span className="kv-status" style={{ background: info.cor + '1f', color: info.cor }}>{info.label}</span></span>
                    <strong className="kv-tabela-total">{formatarValor(p.total)}</strong>
                  </div>
                );
              })}
            </>
          )}
        </section>
      </main>

      <HotbarCliente />
    </div>
  );
}
