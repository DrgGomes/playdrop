'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getProfile, signOut } from '../../lib/auth';

export default function AdminPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    async function verificar() {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data } = await getProfile(user.id);
      if (!data || data.papel !== 'admin') {
        router.push('/catalogo');
        return;
      }
      setNome(data.nome || 'Admin');
      setVerificando(false);
    }
    verificar();
  }, [router]);

  async function handleSair() {
    await signOut();
    router.push('/login');
  }

  if (verificando) {
    return <p className="center muted" style={{ padding: 60 }}>Verificando acesso...</p>;
  }

  return (
    <>
      <header className="admin-header">
        <div className="container">
          <h1>Painel Administrativo</h1>
          <p>Olá, {nome}</p>
        </div>
      </header>

      <div className="container">
        <div className="admin-grid">
          <div className="admin-card">
            <h3>Produtos</h3>
            <p>Cadastrar camisetas, fotos, cores, tamanhos e custos. (Próximo bloco)</p>
          </div>
          <div className="admin-card">
            <h3>Configurações de custos</h3>
            <p>DTF, camiseta, embalagem e margem padrão. (Próximo bloco)</p>
          </div>
          <div className="admin-card">
            <h3>Pedidos</h3>
            <p>Pedidos com status, NFs e etiquetas. (Bloco futuro)</p>
          </div>
          <div className="admin-card">
            <h3>Novidades</h3>
            <p>Postar novidades na área de notícias. (Bloco futuro)</p>
          </div>
        </div>
        <div style={{ paddingBottom: 64 }}>
          <button className="btn btn-outline" onClick={handleSair}>Sair</button>
        </div>
      </div>
    </>
  );
}
