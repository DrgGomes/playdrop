'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUser } from '../../../lib/auth';
import HotbarCliente from '../../components/HotbarCliente';

const STATUS_LABEL = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  concluida: 'Concluída',
};
const STATUS_COR = {
  pendente: '#f59e0b',
  aprovada: '#22c55e',
  recusada: '#ef4444',
  concluida: '#6366f1',
};

function formatarData(d) {
  return new Date(d).toLocaleDateString('pt-BR');
}

export default function DevolucaoDetalhePage() {
  const { id } = useParams();
  const router = useRouter();
  const [dev, setDev] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase.rpc('listar_devolucoes');
      if (data) {
        const encontrada = data.find(d => d.id === id);
        setDev(encontrada || null);
      }
      setCarregando(false);
    }
    iniciar();
  }, [id, router]);

  if (carregando) return <p className="muted center" style={{ padding: 60 }}>Carregando...</p>;

  if (!dev) {
    return (
      <div className="container" style={{ padding: 60, textAlign: 'center' }}>
        <h2>Devolução não encontrada</h2>
        <Link href="/devolucoes" className="btn btn-primary" style={{ marginTop: 12 }}>← Voltar</Link>
      </div>
    );
  }

  const cor = STATUS_COR[dev.status] || '#999';
  const st = STATUS_LABEL[dev.status] || dev.status;

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/devolucoes">↩️ Devoluções</Link>
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>Devolução — Pedido #{dev.pedido_numero || '—'}</h1>
      </div>

      <div className="container" style={{ paddingBottom: 80, maxWidth: 560 }}>
        <div className="form-card">
          <div className="field">
            <span className="label">Status</span>
            <span className="badge" style={{ background: cor + '22', color: cor, fontSize: 14, padding: '4px 14px' }}>{st}</span>
          </div>
          <div className="field">
            <span className="label">Motivo</span>
            <p>{dev.motivo}</p>
          </div>
          {dev.descricao && (
            <div className="field">
              <span className="label">Descrição</span>
              <p>{dev.descricao}</p>
            </div>
          )}
          <div className="field">
            <span className="label">Solicitada em</span>
            <p>{formatarData(dev.criado_em)}</p>
          </div>
          {dev.resposta_admin && (
            <div className="field">
              <span className="label">Resposta do admin</span>
              <p>{dev.resposta_admin}</p>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 18 }}>
          <Link href="/devolucoes">← Voltar para devoluções</Link>
        </p>
      </div>

      <HotbarCliente />
    </>
  );
}
