'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUser, getProfile } from '../../lib/auth';
import HotbarCliente from '../components/HotbarCliente';

function formatarValor(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

function formatarData(d) {
  return new Date(d).toLocaleDateString('pt-BR');
}

const STATUS_COR = {
  pendente: '#f59e0b',
  confirmado: '#3b82f6',
  em_producao: '#8b5cf6',
  enviado: '#06b6d4',
  entregue: '#22c55e',
  cancelado: '#ef4444',
};

export default function DashboardPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [stats, setStats] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      setUsuario(user);

      const { data: perfil } = await getProfile(user.id);
      const meta = user.user_metadata || {};
      const nomeConta = (perfil?.nome || perfil?.nome_completo || meta.nome || meta.name || '');
      const zapConta = (perfil?.whatsapp || perfil?.telefone || meta.whatsapp || '');
      setNome(nomeConta);
      setWhatsapp(zapConta);

      if (zapConta) {
        const { data } = await supabase.rpc('dashboard_cliente', { p_whatsapp: zapConta });
        if (data) setStats(data);
      }
      setCarregando(false);
    }
    iniciar();
  }, [router]);

  if (carregando) return <p className="muted center" style={{ padding: 60 }}>Carregando...</p>;

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/pedido">🛒 Ver pedido</Link>
            <Link href="/conta">👤 {nome || 'Conta'}</Link>
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>👋 Olá, {nome || 'cliente'}!</h1>
        <p>Aqui está um resumo da sua atividade.</p>
      </div>

      <div className="container" style={{ paddingBottom: 80 }}>
        {/* Cards de estatísticas */}
        <div className="dash-cards">
          <div className="dash-card">
            <span className="dash-num">{stats?.total_pedidos || 0}</span>
            <span className="dash-label">Pedidos</span>
            <Link href="/pedido" className="dash-link">Ver todos →</Link>
          </div>
          <div className="dash-card">
            <span className="dash-num">{stats?.total_devolucoes || 0}</span>
            <span className="dash-label">Devoluções</span>
            <Link href="/devolucoes" className="dash-link">Ver todas →</Link>
          </div>
          <div className="dash-card">
            <span className="dash-num">
              {stats?.ultimos_pedidos?.filter(p => p.status === 'entregue').length || 0}
            </span>
            <span className="dash-label">Entregues</span>
          </div>
        </div>

        {/* Últimos pedidos */}
        <h2 style={{ marginTop: 32, marginBottom: 12 }}>Últimos pedidos</h2>
        {(!stats?.ultimos_pedidos || stats.ultimos_pedidos.length === 0) ? (
          <div className="empty">
            <h3>Nenhum pedido ainda</h3>
            <p>Que tal dar uma olhada no catálogo?</p>
            <Link href="/catalogo" className="btn btn-primary" style={{ marginTop: 12 }}>Ver catálogo</Link>
          </div>
        ) : (
          <div className="dash-lista">
            {stats.ultimos_pedidos.map((p) => {
              const cor = STATUS_COR[p.status] || '#999';
              return (
                <Link href={`/pedido`} key={p.numero} className="dash-item">
                  <div>
                    <strong>#{p.numero}</strong>
                    <span className="dash-data">{formatarData(p.criado_em)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge" style={{ background: cor + '22', color: cor }}>
                      {p.status === 'pendente' ? 'Pendente' :
                       p.status === 'confirmado' ? 'Confirmado' :
                       p.status === 'em_producao' ? 'Em produção' :
                       p.status === 'enviado' ? 'Enviado' :
                       p.status === 'entregue' ? 'Entregue' :
                       p.status === 'cancelado' ? 'Cancelado' : p.status}
                    </span>
                    <strong>{formatarValor(p.total)}</strong>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <HotbarCliente />
    </>
  );
}
