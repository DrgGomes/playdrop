'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUser, getProfile, signOut } from '../../../lib/auth';

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

export default function AdminDevolucoesPage() {
  const router = useRouter();
  const [devolucoes, setDevolucoes] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [verificando, setVerificando] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => { iniciar(); }, []);

  async function iniciar() {
    setErro('');
    const user = await getCurrentUser();
    if (!user) { router.push('/login'); return; }
    const { data: perfil } = await getProfile(user.id);
    if (!perfil || perfil.papel !== 'admin') {
      setErro('Acesso restrito a administradores.');
      setVerificando(false);
      return;
    }
    setVerificando(false);
    await buscar();
  }

  async function buscar() {
    setCarregando(true);
    setErro('');
    const { data, error } = await supabase.rpc('listar_devolucoes');
    if (error) { setErro('Erro: ' + error.message); setCarregando(false); return; }
    setDevolucoes(Array.isArray(data) ? data : []);
    setCarregando(false);
  }

  async function atualizarStatus(id, novoStatus, resposta = '') {
    const { error } = await supabase
      .from('devolucoes')
      .update({ status: novoStatus, resposta_admin: resposta, atualizado_em: new Date().toISOString() })
      .eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }
    await buscar();
  }

  const visiveis = filtro === 'todos' ? devolucoes : devolucoes.filter(d => d.status === filtro);
  const contagem = {};
  devolucoes.forEach(d => { contagem[d.status] = (contagem[d.status] || 0) + 1; });

  if (verificando) return <p className="muted center" style={{ padding: 60 }}>Verificando...</p>;

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/admin">Painel</Link>
            <Link href="/admin/produtos">Produtos</Link>
            <Link href="/admin/pedidos">Pedidos</Link>
            <Link href="/admin/configuracoes">Configurações</Link>
            <button className="btn btn-sm btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}
              onClick={async () => { await signOut(); router.push('/login'); }}>Sair</button>
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>Devoluções</h1>
        <p>{devolucoes.length} solicitação(ões).</p>
      </div>

      <div className="container" style={{ paddingBottom: 80 }}>
        {erro && <p className="erro">{erro}</p>}

        <div className="ped-filtros">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todas ({devolucoes.length})</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v} ({contagem[k] || 0})</option>
            ))}
          </select>
          <button className="btn btn-sm btn-outline" onClick={buscar} disabled={carregando}>
            {carregando ? 'Buscando...' : '🔄 Atualizar'}
          </button>
        </div>

        {visiveis.length === 0 && !carregando && (
          <div className="empty"><h3>Nenhuma devolução</h3></div>
        )}

        {visiveis.length > 0 && (
          <table className="list">
            <thead>
              <tr>
                <th>Pedido</th><th>Cliente</th><th>Motivo</th><th>Data</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((d) => {
                const cor = STATUS_COR[d.status] || '#999';
                const st = STATUS_LABEL[d.status] || d.status;
                return (
                  <tr key={d.id}>
                    <td>#{d.pedido_numero || '—'}</td>
                    <td>{d.cliente_nome}<br /><small>{d.cliente_whatsapp}</small></td>
                    <td>{d.motivo}</td>
                    <td>{formatarData(d.criado_em)}</td>
                    <td><span className="badge" style={{ background: cor + '22', color: cor }}>{st}</span></td>
                    <td>
                      {d.status === 'pendente' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm" style={{ background: '#22c55e', color: '#fff' }}
                            onClick={() => atualizarStatus(d.id, 'aprovada')}>Aprovar</button>
                          <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff' }}
                            onClick={() => atualizarStatus(d.id, 'recusada')}>Recusar</button>
                        </div>
                      )}
                      {d.status === 'aprovada' && (
                        <button className="btn btn-sm" style={{ background: '#6366f1', color: '#fff' }}
                          onClick={() => atualizarStatus(d.id, 'concluida')}>Concluir</button>
                      )}
                      {d.status === 'recusada' && <span style={{ color: '#ef4444', fontSize: 13 }}>Recusada</span>}
                      {d.status === 'concluida' && <span style={{ color: '#6366f1', fontSize: 13 }}>Concluída</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
