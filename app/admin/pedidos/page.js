'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUser, signOut } from '../../../lib/auth';

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
  enviado: '#22d3ee',
  entregue: '#34d399',
  cancelado: '#f43f5e',
};

function formatarValor(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

export default function PedidosAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => { buscar(); }, []);

  async function buscar() {
    setErro('');
    const user = await getCurrentUser();
    if (!user) { router.push('/login'); return; }

    const { data, error } = await supabase.rpc('listar_pedidos');
    if (error) { setErro('Erro ao buscar pedidos: ' + error.message); setCarregando(false); return; }
    setPedidos(Array.isArray(data) ? data : []);
    setCarregando(false);
  }

  async function sair() {
    await signOut();
    window.location.href = '/';
  }

  const contagem = {};
  pedidos.forEach((p) => { contagem[p.status] = (contagem[p.status] || 0) + 1; });
  const visiveis = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.status === filtro);
  const filtros = ['todos', ...Object.keys(STATUS)];

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
          <h1>📦 Pedidos</h1>
          <p>{pedidos.length} pedido(s) no total.</p>
        </section>

        {erro && <p className="erro">{erro}</p>}

        <div className="adm-filtros">
          {filtros.map((f) => (
            <button
              key={f}
              className={`adm-filtro${filtro === f ? ' ativo' : ''}`}
              onClick={() => setFiltro(f)}
            >
              {f === 'todos' ? 'Todos' : STATUS[f]} ({f === 'todos' ? pedidos.length : contagem[f] || 0})
            </button>
          ))}
        </div>

        {carregando ? (
          <p className="muted center" style={{ padding: 48 }}>Carregando...</p>
        ) : visiveis.length === 0 ? (
          <div className="dash-vazio">
            <span className="dash-vazio-emoji">📦</span>
            <h3>Nenhum pedido aqui</h3>
            <p>Não há pedidos para este filtro.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="list">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>WhatsApp</th>
                  <th>Data</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
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
                      <td className="ped-total">{formatarValor(p.total)}</td>
                      <td><span className="badge" style={{ background: cor + '1f', color: cor }}>{st}</span></td>
                      <td>
                        <Link href={`/admin/pedidos/${p.id}`} className="btn btn-sm btn-outline">Abrir</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
