'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUser, signOut } from '../../../lib/auth';

const VAZIO = { id: null, emoji: '📢', titulo: '', mensagem: '', ativo: true };

export default function AdminNovidadesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [avisos, setAvisos] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const user = await getCurrentUser();
    if (!user) { router.push('/login'); return; }
    const { data } = await supabase
      .from('avisos')
      .select('*')
      .order('criado_em', { ascending: false });
    setAvisos(data || []);
    setCarregando(false);
  }

  async function sair() {
    await signOut();
    window.location.href = '/';
  }

  function editar(a) {
    setForm({ id: a.id, emoji: a.emoji || '📢', titulo: a.titulo || '', mensagem: a.mensagem || '', ativo: !!a.ativo });
    setErro('');
  }

  function novo() {
    setForm(VAZIO);
    setErro('');
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!form.titulo.trim()) { setErro('Informe um título.'); return; }
    if (!form.mensagem.trim()) { setErro('Informe a mensagem.'); return; }
    setSalvando(true);

    if (form.id) {
      const { error } = await supabase
        .from('avisos')
        .update({ emoji: form.emoji, titulo: form.titulo.trim(), mensagem: form.mensagem.trim(), ativo: form.ativo })
        .eq('id', form.id);
      if (error) { setErro('Erro ao salvar: ' + error.message); setSalvando(false); return; }
    } else {
      const { error } = await supabase
        .from('avisos')
        .insert({ emoji: form.emoji, titulo: form.titulo.trim(), mensagem: form.mensagem.trim(), ativo: form.ativo });
      if (error) { setErro('Erro ao criar: ' + error.message); setSalvando(false); return; }
    }

    setSalvando(false);
    setForm(VAZIO);
    await carregar();
  }

  async function alternar(a) {
    const novoAtivo = !a.ativo;
    setAvisos((prev) => prev.map((x) => (x.id === a.id ? { ...x, ativo: novoAtivo } : x)));
    await supabase.from('avisos').update({ ativo: novoAtivo }).eq('id', a.id);
  }

  async function excluir(a) {
    if (!confirm(`Excluir a novidade "${a.titulo}"?`)) return;
    const { error } = await supabase.from('avisos').delete().eq('id', a.id);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    if (form.id === a.id) setForm(VAZIO);
    await carregar();
  }

  function formatarData(d) {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

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
          <h1>📢 Novidades</h1>
          <p>Publique avisos que aparecem no topo do dashboard dos clientes.</p>
        </section>

        <div className="nov-grid">
          <form onSubmit={salvar} className="nov-form-card">
            <h2>{form.id ? '✏️ Editar novidade' : '➕ Nova novidade'}</h2>

            {erro && <p className="erro">{erro}</p>}

            <div className="nov-emoji-linha">
              <div className="field">
                <span className="label">Emoji</span>
                <input
                  type="text"
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  placeholder="📢"
                  maxLength={6}
                />
              </div>
              <div className="field">
                <span className="label">Título</span>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex.: Lançamento de novas estampas"
                />
              </div>
            </div>

            <div className="field">
              <span className="label">Mensagem</span>
              <textarea
                rows={3}
                value={form.mensagem}
                onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                placeholder="Descreva a novidade..."
              />
            </div>

            <label className="row" style={{ marginBottom: 16, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
              />
              <span style={{ fontSize: 14 }}>Ativa (aparece para os clientes)</span>
            </label>

            <div className="row">
              <button className="btn btn-primary" disabled={salvando}>
                {salvando ? 'Salvando...' : (form.id ? 'Salvar alterações' : 'Publicar novidade')}
              </button>
              {form.id && (
                <button type="button" className="btn btn-outline" onClick={novo}>Cancelar edição</button>
              )}
            </div>
          </form>

          <div>
            {carregando ? (
              <p className="muted center" style={{ padding: 40 }}>Carregando...</p>
            ) : avisos.length === 0 ? (
              <div className="nov-vazio">
                <span style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>📢</span>
                <strong>Nenhuma novidade publicada</strong>
                <p>Use o formulário ao lado para criar a primeira.</p>
              </div>
            ) : (
              <div className="nov-lista">
                {avisos.map((a) => (
                  <div key={a.id} className="nov-item" style={{ opacity: a.ativo ? 1 : 0.55 }}>
                    <span className="nov-item-emoji">{a.emoji || '📢'}</span>
                    <div className="nov-item-conteudo">
                      <strong>{a.titulo}</strong>
                      <p>{a.mensagem}</p>
                      <span className="nov-item-data">{formatarData(a.criado_em)}</span>
                    </div>
                    <div className="nov-item-acoes">
                      <button className={`nov-toggle${a.ativo ? ' on' : ' off'}`} onClick={() => alternar(a)}>
                        {a.ativo ? '● Ativa' : '○ Inativa'}
                      </button>
                      <button className="nov-btn-ghost" onClick={() => editar(a)}>✏️ Editar</button>
                      <button className="nov-btn-ghost danger" onClick={() => excluir(a)}>🗑 Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
