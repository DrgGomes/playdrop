'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUser, getProfile, signOut } from '../../../lib/auth';

const STATUS = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_producao: 'Em produção',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};
const STATUS_COR = {
  pendente: '#f59e0b',
  confirmado: '#3b82f6',
  em_producao: '#8b5cf6',
  enviado: '#06b6d4',
  entregue: '#22c55e',
  cancelado: '#ef4444',
};

function formatarValor(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

export default function PedidosAdminPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState([]);
  const [contItens, setContItens] = useState({});
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
      setErro('Seu usuário não está marcado como admin nesta conta. Clique em Sair e entre com a conta de administrador.');
      setVerificando(false);
      return;
    }
    setVerificando(false);
    await buscar();
  }

  async function buscar() {
    setCarregando(true);
    setErro('');
    const { data, error } = await supabase.rpc('listar_pedidos');
    if (error) {
      setErro('Erro ao buscar pedidos: ' + error.message);
      setCarregando(false);
      return;
    }
    const lista = Array.isArray(data) ? data : [];
    setPedidos(lista);
    const mapa = {};
    lista.forEach((p) => { mapa[p.id] = p.qtd_itens || 0; });
    setContItens(mapa);
    setCarregando(false);
  }

  const visiveis = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.status === filtro);
  const contagem = {};
  pedidos.forEach((p) => { contagem[p.status] = (contagem[p.status] || 0) + 1; });

  if (verificando) return <p className="muted center" style={{ padding: 60 }}>Verificando acesso...</p>;

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/admin">Painel</Link>
            <Link href="/admin/produtos">Produtos</Link>
            <Link href="/admin/configuracoes">Configurações</Link>
            <Link href="/catalogo">Ver site</Link>
            <button className="btn btn-sm btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}
              onClick={async () => { await signOut(); router.push('/login'); }}>Sair</button>
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>Pedidos</h1>
        <p>{pedidos.length} pedido(s) no total.</p>
      </div>

      <div className="container" style={{ paddingBottom: 80 }}>
        {erro && <p className="erro">{erro}</p>}

        <div className="ped-filtros">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todos ({pedidos.length})</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v} ({contagem[k] || 0})</option>
            ))}
          </select>
          <button className="btn btn-sm btn-outline" onClick={buscar} disabled={carregando}>
            {carregando ? 'Buscando...' : '🔄 Atualizar'}
          </button>
        </div>

        {!carregando && !erro && visiveis.length === 0 && (
          <div className="empty">
            <h3>Nenhum pedido</h3>
            <p>Se acabou de fazer um pedido de teste, clique em Atualizar.</p>
          </div>
        )}

        {visiveis.length > 0 && (
          <table className="list">
            <thead>
              <tr>
                <th>Pedido</th><th>Cliente</th><th>WhatsApp</th><th>Data</th>
                <th>Itens</th><th>Total</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => {
                const st = STATUS[p.status] || 'Pendente';
                const cor = STATUS_COR[p.status] || '#999';
                const data = new Date(p.criado_em).toLocaleDateString('pt-BR');
                return (
                  <tr key={p.id}>
                    <td><strong>#{p.numero}</strong></td>
                    <td>{p.nome_cliente}</td>
                    <td>{p.whatsapp}</td>
                    <td>{data}</td>
                    <td>{contItens[p.id] || 0}</td>
                    <td className="ped-total">{formatarValor(p.total)}</td>
                    <td><span className="badge" style={{ background: cor + '22', color: cor }}>{st}</span></td>
                    <td><Link href={`/admin/pedidos/${p.id}`} className="btn btn-sm btn-outline">Abrir</Link></td>
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
