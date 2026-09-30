'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { getCurrentUser, signOut } from '../../lib/auth';

const ITENS = [
  { href: '/dashboard', label: 'Início', icone: '🏠' },
  { href: '/catalogo', label: 'Catálogo', icone: '🛍️' },
  { href: '/pedido', label: 'Pedido', icone: '📦' },
  { href: '/devolucoes', label: 'Devoluções', icone: '↩️' },
  { href: '/conta', label: 'Minha conta', icone: '👤' },
];

export default function MenuLateral() {
  const pathname = usePathname();
  const [logado, setLogado] = useState(false);
  const [qtdCarrinho, setQtdCarrinho] = useState(0);

  useEffect(() => {
    let ativo = true;
    getCurrentUser().then((user) => { if (ativo) setLogado(!!user); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => {
      if (ativo) setLogado(!!sessao?.user);
    });
    return () => { ativo = false; sub?.subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    function atualizar() {
      try {
        const itens = JSON.parse(localStorage.getItem('playdrop_carrinho') || '[]');
        setQtdCarrinho(itens.reduce((s, i) => s + (Number(i.quantidade) || 1), 0));
      } catch { setQtdCarrinho(0); }
    }
    atualizar();
    window.addEventListener('storage', atualizar);
    window.addEventListener('playdrop_carrinho', atualizar);
    return () => {
      window.removeEventListener('storage', atualizar);
      window.removeEventListener('playdrop_carrinho', atualizar);
    };
  }, []);

  if (!logado) return null;

  async function sair() {
    await signOut();
    window.location.href = '/';
  }

  return (
    <aside className="menu-lateral">
      <Link href="/dashboard" className="menu-logo">
        <span className="menu-logo-marca">PlayDrop</span>
      </Link>

      <nav className="menu-links">
        {ITENS.map((item) => {
          const ativo = pathname === item.href || pathname.startsWith(item.href + '/');
          const isPedido = item.href === '/pedido';
          return (
            <Link key={item.href} href={item.href} className={`menu-item${ativo ? ' active' : ''}`} title={item.label}>
              <span className="menu-icone">
                {item.icone}
                {isPedido && qtdCarrinho > 0 && (
                  <span className="menu-badge">{qtdCarrinho}</span>
                )}
              </span>
              <span className="menu-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="menu-rodape">
        <button className="menu-sair" onClick={sair}>
          <span className="menu-icone">🚪</span>
          <span className="menu-label">Sair</span>
        </button>
      </div>
    </aside>
  );
}
