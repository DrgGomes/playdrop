'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { getCurrentUser, getProfile, signOut } from '../../../lib/auth';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [nomeMarca, setNomeMarca] = useState('');
  const [dominio, setDominio] = useState('');
  const [margem, setMargem] = useState('100');
  const [custos, setCustos] = useState([]);
  const [novoCustoNome, setNovoCustoNome] = useState('');
  const [novoCustoValor, setNovoCustoValor] = useState('');
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      const { data: perfil } = await getProfile(user.id);
      if (!perfil || perfil.papel !== 'admin') { router.push('/catalogo'); return; }
      await carregarDados();
      setVerificando(false);
    }
    iniciar();
  }, [router]);

  async function carregarDados() {
    const { data: confs } = await supabase.from('configuracoes').select('chave, valor');
    if (confs) {
      const map = {};
      confs.forEach((c) => (map[c.chave] = c.valor));
      setNomeMarca(map.nome_marca || 'PlayDrop');
      setDominio(map.dominio || '');
      setMargem(map.margem_padrao || '100');
    }
    const { data: cs } = await supabase.from('custos_config').select('*').order('criado_em');
    if (cs) setCustos(cs);
  }

  async function salvarConfiguracoes(e) {
    e.preventDefault();
    setErro(''); setInfo(''); setSalvando(true);
    const linhas = [
      { chave: 'nome_marca', valor: nomeMarca },
      { chave: 'dominio', valor: dominio },
      { chave: 'margem_padrao', valor: String(margem) },
    ];
    const { error } = await supabase.from('configuracoes').upsert(linhas);
    if (error) { setErro('Erro ao salvar: ' + error.message); }
    else { setInfo('Configurações salvas!'); }
    setSalvando(false);
  }

  async function adicionarCusto(e) {
    e.preventDefault();
    if (!novoCustoNome.trim()) return;
    const valor = parseFloat(String(novoCustoValor).replace(',', '.')) || 0;
    const { data, error } = await supabase
      .from('custos_config')
      .insert({ nome: novoCustoNome.trim(), valor })
      .select().single();
    if (error) { setErro('Erro ao adicionar custo: ' + error.message); return; }
    setCustos((prev) => [...prev, data]);
    setNovoCustoNome(''); setNovoCustoValor('');
  }

  function mudarCusto(id, campo, valor) {
    setCustos((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
  }

  async function salvarCusto(custo) {
    const { error } = await supabase
      .from('custos_config')
      .update({ nome: custo.nome, valor: custo.valor, ativo: custo.ativo })
      .eq('id', custo.id);
    if (error) setErro('Erro ao salvar custo: ' + error.message);
  }

  async function removerCusto(id) {
    const { error } = await supabase.from('custos_config').delete().eq('id', id);
    if (error) { setErro('Erro ao remover: ' + error.message); return; }
    setCustos((prev) => prev.filter((c) => c.id !== id));
  }

  if (verificando) return <p className="center muted" style={{ padding: 60 }}>Verificando acesso...</p>;

  return (
    <>
      <header className="nav">
        <div className="container">
          <span className="nav-logo">PlayDrop</span>
          <nav className="nav-links">
            <Link href="/admin">Painel</Link>
            <Link href="/admin/produtos">Produtos</Link>
            <Link href="/catalogo">Ver site</Link>
            <button className="btn btn-sm btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}
              onClick={async () => { await signOut(); router.push('/login'); }}>Sair</button>
          </nav>
        </div>
      </header>

      <div className="page-header container">
        <h1>Configurações</h1>
        <p>Marca, margem padrão e custos fixos (DTF, camiseta, embalagem...).</p>
      </div>

      <div className="container" style={{ paddingBottom: 80 }}>
        {erro && <p className="erro">{erro}</p>}
        {info && <p className="info">{info}</p>}

        <div className="form-card">
          <h2>Dados da marca</h2>
          <form onSubmit={salvarConfiguracoes}>
            <div className="form-grid">
              <div className="field">
                <span className="label">Nome da marca</span>
                <input value={nomeMarca} onChange={(e) => setNomeMarca(e.target.value)} />
              </div>
              <div className="field">
                <span className="label">Domínio</span>
                <input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="playdrop.com.br" />
              </div>
              <div className="field">
                <span className="label">Margem padrão (%)</span>
                <input type="number" min="0" value={margem} onChange={(e) => setMargem(e.target.value)} />
                <span className="hint">Usada no cálculo do preço sugerido do produto.</span>
              </div>
            </div>
            <button className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </form>
        </div>

        <div className="form-card">
          <h2>Custos fixos</h2>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Estes custos aparecem automaticamente no cadastro de cada produto. Você pode desativar ou ajustar o valor por produto na hora do cadastro.
          </p>
          {custos.length === 0 && <p className="muted">Nenhum custo cadastrado ainda. Adicione abaixo.</p>}
          {custos.map((c) => (
            <div className="custo-row" key={c.id}>
              <input style={{ flex: 1 }} value={c.nome}
                onChange={(e) => mudarCusto(c.id, 'nome', e.target.value)}
                onBlur={() => salvarCusto(custos.find((x) => x.id === c.id))} />
              <input className="custo-width" type="number" step="0.01" min="0" value={c.valor}
                onChange={(e) => mudarCusto(c.id, 'valor', parseFloat(e.target.value) || 0)}
                onBlur={() => salvarCusto(custos.find((x) => x.id === c.id))} />
              <button className="btn btn-sm btn-outline"
                onClick={() => { const novo = { ...c, ativo: !c.ativo }; mudarCusto(c.id, 'ativo', novo.ativo); salvarCusto(novo); }}>
                {c.ativo ? 'Ativo' : 'Desativado'}
              </button>
              <button className="btn btn-sm" style={{ background: '#fef2f2', color: 'var(--danger)' }}
                onClick={() => removerCusto(c.id)}>Remover</button>
            </div>
          ))}
          <form onSubmit={adicionarCusto} className="row" style={{ marginTop: 14 }}>
            <input style={{ flex: 1 }} placeholder="Ex.: DTF, Camiseta, Embalagem, Etiqueta..." value={novoCustoNome} onChange={(e) => setNovoCustoNome(e.target.value)} />
            <input className="custo-width" type="number" step="0.01" min="0" placeholder="0,00" value={novoCustoValor} onChange={(e) => setNovoCustoValor(e.target.value)} />
            <button className="btn btn-primary btn-sm">Adicionar</button>
          </form>
        </div>
      </div>
    </>
  );
}
