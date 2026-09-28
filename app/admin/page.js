'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getProfile, signOut } from '../../lib/auth';

export default function AdminPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    async function verificar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await getProfile(user.id);
      if (!data || data.papel !== 'admin') { router.push('/catalogo'); return; }
      setNome(data.nome || 'Admin');
      setVerificando(false);
    }
    verificar();
  }, [router]);

  async function handleSair() { await signOut(); router.push('/login'); }

  if (verificando) return <p className="center muted" style={{ padding: 60 }}>Verificando acesso...</p>;

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/admin/produtos">Produtos</Link>
            <Link href="/admin/configuracoes">Configurações</Link>
            <Link href="/catalogo">Ver site</Link>
            <button className="btn btn-sm btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }} onClick={handleSair}>Sair</button>
          </nav>
        </div>
      </header>

      <header className="admin-header">
        <div className="container">
          <h1>Painel Administrativo</h1>
          <p>Olá, {nome}</p>
        </div>
      </header>

      <div className="container">
        <div className="admin-grid">
          <Link href="/admin/produtos">
            <div className="admin-card">
              <h3>🛒 Produtos</h3>
              <p>Cadastrar camisetas com fotos, cores, tamanhos, custos e preço sugerido.</p>
            </div>
          </Link>
          <Link href="/admin/configuracoes">
            <div className="admin-card">
              <h3>⚙️ Configurações</h3>
              <p>Custos fixos (DTF, camiseta, embalagem) e margem padrão.</p>
            </div>
          </Link>
                    <Link href="/admin/pedidos">
            <div className="admin-card">
              <h3>📦 Pedidos</h3>
              <p>Ver pedidos, alterar status e imprimir cupons.</p>
            </div>
          </Link>
          <div className="admin-card">
            <h3>📣 Novidades</h3>
            <p>Postar notícias e devoluções. (Próximo bloco)</p>
          </div>
        </div>
      </div>
    </>
  );
}
