'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, getProfile } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const { data, error } = await signIn(email, password);
      if (error) throw new Error(error.message);

      const perfil = await getProfile(data.user.id);
      if (perfil.error) throw new Error('perfil');

      if (perfil.data.papel === 'admin') {
        router.push('/admin');
      } else {
        router.push('/catalogo');
      }
    } catch (err) {
      if (err.message === 'perfil') {
        setErro('Perfil não encontrado. Peça ao administrador para liberar seu acesso.');
      } else {
        setErro('E-mail ou senha incorretos.');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">PlayDrop</div>
        <h1>Entrar</h1>
        <p className="auth-sub">Acesse sua conta de revendedor</p>
        <form onSubmit={handleLogin}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="voce@email.com"
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <button type="submit" disabled={carregando} className="btn btn-primary btn-block">
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="auth-link">
          Ainda não tem conta? <Link href="/registre">Cadastre-se grátis</Link>
        </p>
      </div>
    </main>
  );
}
