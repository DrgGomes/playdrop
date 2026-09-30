'use client';

import HotbarCliente from '../components/HotbarCliente';
import HeaderCliente from '../components/HeaderCliente';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUser, getProfile, signOut } from '../../lib/auth';

export default function ContaPage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      setEmail(user.email || '');
      const { data: perfil } = await getProfile(user.id);
      if (perfil) {
        setNome(perfil.nome || perfil.nome_completo || perfil.full_name || '');
        setWhatsapp(perfil.whatsapp || perfil.telefone || perfil.celular || perfil.phone || '');
      }
      setVerificando(false);
    }
    iniciar();
  }, [router]);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setMsg('');
    setSalvando(true);
    try {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      const { error } = await supabase
        .from('perfis')
        .upsert({ id: user.id, nome: nome.trim(), whatsapp: whatsapp.trim() });
      if (error) throw error;
      setMsg('Dados salvos com sucesso! ✓');
      setSalvando(false);
    } catch (err) {
      setErro('Erro ao salvar: ' + (err.message || 'tente novamente'));
      setSalvando(false);
    }
  }

  async function sair() {
    await signOut();
    window.location.href = '/';
  }

  if (verificando) return <p className="muted center" style={{ padding: 60 }}>Carregando...</p>;

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/pedido">🛒 Ver pedido</Link>
            <Link href="/conta">👤 Minha conta</Link>
            <button className="btn btn-sm btn-outline"
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }} onClick={sair}>Sair</button>
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>Minha conta</h1>
        <p>Seus dados ficam salvos e já aparecem preenchidos na hora de fazer o pedido.</p>
      </div>

      <div className="container" style={{ paddingBottom: 80, maxWidth: 560 }}>
        {erro && <p className="erro">{erro}</p>}
        {msg && <p style={{ background: '#dcfce7', color: '#15803d', padding: '10px 14px', borderRadius: 10, fontWeight: 600 }}>{msg}</p>}

        <form onSubmit={salvar} className="form-card">
          <h2>Dados de contato</h2>

          <div className="field">
            <span className="label">E-mail (login)</span>
            <input value={email} disabled style={{ background: '#f1f5f9' }} />
          </div>

          <div className="field">
            <span className="label">Seu nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>

          <div className="field">
            <span className="label">WhatsApp</span>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
          </div>

          <button className="btn btn-primary btn-block" style={{ marginTop: 6 }} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar dados'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18 }}>
          <Link href="/catalogo">← Voltar ao catálogo</Link>
        </p>
                  <HotbarCliente />
      </div>
    </>
  );
}
