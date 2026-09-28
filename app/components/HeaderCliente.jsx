'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUser, signOut } from '../../lib/auth';

export default function HeaderCliente() {
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(true);
  const [qtdCarrinho, setQtdCarrinho] = useState(0);

  useEffect(() => {
    function atualizarCarrinho() {
      try {
        const itens = JSON.parse(localStorage.getItem('playdrop_carrinho') || '[]');
        setQtdCarrinho(itens.reduce((s, i) => s + (Number(i.quantidade) || 1), 0));
      } catch { setQtdCarrinho(0); }
    }
    atualizarCarrinho();
    window.addEventListener('storage', atualizarCarrinho);
    window.addEventListener('playdrop_carrinho', atualizarCarrinho);

    async function carregar() {
      try {
        const user = await getCurrentUser();
        setUsuario(user);
      } catch {}
      setVerificando(false);
    }
    carregar();

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      setUsuario(sessao?.user || null);
      setVerificando(false);
    });

    return () => {
      window.removeEventListener('storage', atualizarCarrinho);
      window.removeEventListener('playdrop_carrinho', atualizarCarrinho);
      sub?.subscription?.unsubscribe();
    };
  }, []);

  async function sair() {
    await signOut();
    window.location.href = '/';
  }

  return (
    <header className="nav">
      <div className="container">
        <Link href="/" className="nav-logo">PlayDrop</Link>
        <nav className="nav-links">
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/pedido">🛒 Ver pedido{qtdCarrinho > 0 ? ` (${qtdCarrinho})` : ''}</Link>
          {!verificando && (
            usuario ? (
              <>
                <Link href="/conta">👤 Minha conta</Link>
                <button className="btn btn-sm btn-outline"
                  style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }} onClick={sair}>Sair</button>
              </>
            ) : (
              <>
                <Link href="/login">Entrar</Link>
                <Link href="/registre">Criar conta</Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
