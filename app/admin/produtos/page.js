'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUser, getProfile, signOut } from '../../../lib/auth';

export default function ProdutosAdminPage() {
  const router = useRouter();
  const [produtos, setProdutos] = useState([]);
  const [imagens, setImagens] = useState({});
  const [variacoes, setVariacoes] = useState({});
  const [verificando, setVerificando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => { iniciar(); }, [router]);

  async function iniciar() {
    const user = await getCurrentUser();
    if (!user) { router.push('/login'); return; }
    const { data: perfil } = await getProfile(user.id);
    if (!perfil || perfil.papel !== 'admin') { router.push('/catalogo'); return; }
    setVerificando(false);
    await buscarProdutos();
  }

  async function buscarProdutos() {
    const { data: prods } = await supabase
      .from('produtos').select('*').order('criado_em', { ascending: false });
    if (!prods) return;
    setProdutos(prods);
    const ids = prods.map((p) => p.id);

    const { data: imgs } = await supabase
      .from('produto_imagens').select('produto_id, url, ordem').in('produto_id', ids).order('ordem');
    const mapaImg = {};
    (imgs || []).forEach((i) => { if (!(i.produto_id in mapaImg)) mapaImg[i.produto_id] = i.url; });
    setImagens(mapaImg);

    const { data: vars } = await supabase
      .from('variacoes').select('produto_id');
    const mapaVar = {};
    (vars || []).forEach((v) => { mapaVar[v.produto_id] = (mapaVar[v.produto_id] || 0) + 1; });
    setVariacoes(mapaVar);
  }

  async function deletar(id) {
    if (!confirm('Excluir este produto e todas as variações? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) { setErro('Erro ao excluir: ' + error.message); return; }
    await buscarProdutos();
  }

  if (verificando) return <p className="center muted" style={{ padding: 60 }}>Verificando acesso...</p>;

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/admin">Painel</Link>
            <Link href="/admin/configuracoes">Configurações</Link>
            <Link href="/catalogo">Ver site</Link>
            <button className="btn btn-sm btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}
              onClick={async () => { await signOut(); router.push('/login'); }}>Sair</button>
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>Produtos</h1>
        <p>Gerencie as camisetas do catálogo.</p>
      </div>

      <div className="container" style={{ paddingBottom: 80 }}>
        {erro && <p className="erro">{erro}</p>}
        <div className="admin-tools">
          <span className="muted">{produtos.length} produto(s)</span>
          <Link href="/admin/produtos/novo" className="btn btn-primary">+ Novo produto</Link>
        </div>

        {produtos.length === 0 && (
          <div className="empty">
            <h3>Nenhum produto ainda</h3>
            <p>Clique em "+ Novo produto" para cadastrar a primeira camiseta.</p>
          </div>
        )}

        {produtos.length > 0 && (
          <table className="list">
            <thead>
              <tr>
                <th>Foto</th><th>Produto</th><th>Código</th><th>Preço sugerido</th><th>Variações</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id}>
                  <td>{imagens[p.id] ? <img className="thumb" src={imagens[p.id]} alt="" /> : <div className="thumb" />}</td>
                  <td style={{ fontWeight: 600 }}>{p.titulo}</td>
                  <td>{p.codigo || '—'}</td>
                  <td>{p.preco_sugerido ? 'R$ ' + Number(p.preco_sugerido).toFixed(2).replace('.', ',') : '—'}</td>
                  <td>{variacoes[p.id] || 0}</td>
                  <td>{p.ativo ? <span className="badge badge-ok">Ativo</span> : <span className="badge badge-off">Inativo</span>}</td>
                  <td>
                    <button className="btn btn-sm" style={{ background: '#fef2f2', color: 'var(--danger)' }}
                      onClick={() => deletar(p.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
