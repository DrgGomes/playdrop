'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUp } from '../../lib/auth';

export default function RegistrePage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleCadastro(e) {
    e.preventDefault();
    setErro('');
    setInfo('');
    if (password.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setCarregando(true);
    try {
      const { data, error } = await signUp(nome, email, password, whatsapp);
      if (error) throw new Error(error.message);

      if (data.session) {
        router.push('/catalogo');
      } else {
        setInfo('Conta criada! Verifique seu e-mail para confirmar e depois faça login.');
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already registered')) {
        setErro('Este e-mail já está cadastrado. Faça login.');
      } else {
        setErro('Não foi possível criar a conta. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">PlayDrop</div>
        <h1>Criar conta</h1>
        <p className="auth-sub">Cadastre-se grátis e comece a revender</p>
        <form onSubmit={handleCadastro}>
          <label>
            Seu nome
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Ex.: Maria Silva"
            />
          </label>
          <label>
            WhatsApp (opcional)
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(16) 99999-9999"
            />
          </label>
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
              placeholder="Mínimo 6 caracteres"
            />
          </label>
          {erro && <p className="erro">{erro}</p>}
          {info && <p className="info">{info}</p>}
          <button type="submit" disabled={carregando} className="btn btn-primary btn-block">
            {carregando ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
        <p className="auth-link">
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
