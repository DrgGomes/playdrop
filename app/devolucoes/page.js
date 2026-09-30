'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUser, getProfile } from '../../lib/auth';
import HotbarCliente from '../components/HotbarCliente';

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

export default function DevolucoesPage() {
  const router = useRouter();
  const [devolucoes, setDevolucoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      const { data: perfil } = await getProfile(user.id);
      const zap = perfil?.whatsapp || '';
      setWhatsapp(zap);

      if (zap) {
        const { data } = await supabase.rpc('listar_devolucoes');
        if (data) {
          setDevolucoes(data.filter(d => d.cliente_whatsapp === zap));
        }
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
            <Link href="/conta">👤 Conta</Link>
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>↩️ Minhas devoluções</h1>
        <p>Acompanhe ou solicite uma nova devolução.</p>
      </div>

      <div className="container" style={{ paddingBottom: 80 }}>
        <Link href="/devolucoes/solicitar" className="btn btn-primary" style={{ marginBottom: 20 }}>
          + Solicitar devolução
        </Link>

        {devolucoes.length === 0 ? (
          <div className="empty">
            <h3>Nenhuma devolução</h3>
            <p>Você ainda não solicitou nenhuma devolução.</p>
          </div>
        ) : (
          <div className="dash-lista">
            {devolucoes.map((d) => {
              const cor = STATUS_COR[d.status] || '#999';
              const st = STATUS_LABEL[d.status] || d.status;
              return (
                <Link href={`/devolucoes/${d.id}`} key={d.id} className="dash-item">
                  <div>
                    <strong>Pedido #{d.pedido_numero || '—'}</strong>
                    <span className="dash-data">{d.motivo} · {formatarData(d.criado_em)}</span>
                  </div>
                  <span className="badge" style={{ background: cor + '22', color: cor }}>{st}</span>
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
