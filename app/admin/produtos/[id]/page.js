'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentUser, getProfile } from '../../../../lib/auth';

function limparTexto(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function gerarSku(codigo, cor, tamanho) {
  return `${limparTexto(codigo)}-${limparTexto(cor)}-${limparTexto(tamanho)}`;
}
function arredondarPreco(v) {
  if (!v || v <= 0) return 0;
  return Number((Math.ceil(v) - 0.1).toFixed(2));
}

export default function EditarProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const [verificando, setVerificando] = useState(true);
  const [carregando, setCarregando] = useState(true);

  const [titulo, setTitulo] = useState('');
  const [apelido, setApelido] = useState('');
  const [descricao, setDescricao] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');

  const [custos, setCustos] = useState([]); // valores aplicados no produto
  const [margem, setMargem] = useState('100');

  const [cores, setCores] = useState([]);
  const [novaCor, setNovaCor] = useState('');
  const [tamanhos, setTamanhos] = useState([]);
  const [novoTamanho, setNovoTamanho] = useState('');
  const [estoques, setEstoques] = useState({});

  const [imagensExistentes, setImagensExistentes] = useState([]); // {id, url}
  const [novosArquivos, setNovosArquivos] = useState([]);
  const [precoSugerido, setPrecoSugerido] = useState(0);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function iniciar() {
      const user = await getCurrentUser();
      if (!user) { router.push('/login'); return; }
      const { data: perfil } = await getProfile(user.id);
      if (!perfil || perfil.papel !== 'admin') { router.push('/catalogo'); return; }
      await carregarProduto();
      setVerificando(false);
    }
    iniciar();
  }, [id, router]);

  async function carregarProduto() {
    const { data: prod, error } = await supabase.from('produtos').select('*').eq('id', id).single();
    if (error || !prod) { setErro('Produto não encontrado.'); setCarregando(false); return; }

    setTitulo(prod.titulo);
    setApelido(prod.apelido || '');
    setDescricao(prod.descricao || '');
    setCodigo(prod.codigo || '');
    setCategoria(prod.categoria_id || '');
    setPrecoSugerido(Number(prod.preco_sugerido) || 0);

    const { data: cats } = await supabase.from('categorias').select('id, nome').order('nome');
    setCategorias(cats || []);
    if (!cats.some((c) => c.id === prod.categoria_id)) setCategoria('nova');

    const { data: confs } = await supabase.from('configuracoes').select('chave, valor');
    if (confs) {
      const map = {};
      confs.forEach((c) => (map[c.chave] = c.valor));
      setMargem(map.margem_padrao || '100');
    }

    const { data: imgs } = await supabase
      .from('produto_imagens').select('id, url').eq('produto_id', id).order('ordem');
    setImagensExistentes(imgs || []);

    const { data: vars } = await supabase
      .from('variacoes').select('*').eq('produto_id', id);
    const coresSet = [];
    const tamSet = [];
    const est = {};
    (vars || []).forEach((v) => {
      if (!coresSet.includes(v.cor)) coresSet.push(v.cor);
      if (!tamSet.includes(v.tamanho)) tamSet.push(v.tamanho);
      est[`${v.cor}|${v.tamanho}`] = v.estoque;
    });
    setCores(coresSet);
    setTamanhos(tamSet);
    setEstoques(est);

    const { data: custosProd } = await supabase
      .from('produto_custos').select('custo_config_id, valor').eq('produto_id', id);
    const { data: custosConfig } = await supabase.from('custos_config').select('*').order('criado_em');
    const mapaValor = {};
    (custosProd || []).forEach((c) => (mapaValor[c.custo_config_id] = Number(c.valor)));
    setCustos((custosConfig || []).map((c) => ({
      id: c.id,
      nome: c.nome,
      valor: c.custo_config_id in mapaValor ? mapaValor[c.custo_config_id] : Number(c.valor),
    })));

    setCarregando(false);
  }

  useEffect(() => {
    const total = custos.reduce((soma, c) => soma + (Number(c.valor) || 0), 0);
    const m = parseFloat(String(margem).replace(',', '.')) || 0;
    setPrecoSugerido(arredondarPreco(total * (1 + m / 100)));
  }, [custos, margem]);

  const custoTotal = custos.reduce((soma, c) => soma + (Number(c.valor) || 0), 0);

  function mudarCusto(id, valor) {
    setCustos((prev) => prev.map((c) => (c.id === id ? { ...c, valor: parseFloat(valor) || 0 } : c)));
  }
  function adicionarCor() {
    const v = novaCor.trim();
    if (!v) return;
    setCores((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setNovaCor('');
  }
  function removerCor(cor) {
    setCores((prev) => prev.filter((c) => c !== cor));
    setEstoques((prev) => {
      const novo = {};
      Object.keys(prev).forEach((k) => { if (!k.startsWith(cor + '|')) novo[k] = prev[k]; });
      return novo;
    });
  }
  function adicionarTamanho() {
    const v = novoTamanho.trim().toUpperCase();
    if (!v) return;
    setTamanhos((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setNovoTamanho('');
  }
  function removerTamanho(tam) {
    setTamanhos((prev) => prev.filter((t) => t !== tam));
    setEstoques((prev) => {
      const novo = {};
      Object.keys(prev).forEach((k) => { if (!k.endsWith('|' + tam)) novo[k] = prev[k]; });
      return novo;
    });
  }
  function mudarEstoque(cor, tam, valor) {
    setEstoques((prev) => ({ ...prev, [`${cor}|${tam}`]: valor }));
  }
  async function removerImagem(imgId) {
    const { error } = await supabase.from('produto_imagens').delete().eq('id', imgId);
    if (error) { setErro('Erro ao remover foto: ' + error.message); return; }
    setImagensExistentes((prev) => prev.filter((i) => i.id !== imgId));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!titulo.trim()) { setErro('Informe o título do produto.'); return; }
    if (!codigo.trim()) { setErro('Informe um código curto, ex.: CAM001.'); return; }
    if (cores.length === 0) { setErro('Adicione pelo menos 1 cor.'); return; }
    if (tamanhos.length === 0) { setErro('Adicione pelo menos 1 tamanho.'); return; }
    setSalvando(true);

    try {
      let categoriaId = categoria;
      if (categoria === 'nova') {
        if (!novaCategoria.trim()) throw new Error('Digite o nome da nova categoria.');
        const { data: cat, error: errCat } = await supabase
          .from('categorias').insert({ nome: novaCategoria.trim() }).select().single();
        if (errCat) throw errCat;
        categoriaId = cat.id;
      }

      const { error: errProd } = await supabase
        .from('produtos')
        .update({
          titulo: titulo.trim(),
          apelido: apelido.trim(),
          descricao: descricao.trim(),
          categoria_id: categoriaId || null,
          codigo: codigo.trim().toUpperCase(),
          preco_sugerido: Number(precoSugerido) || 0,
        })
        .eq('id', id);
      if (errProd) throw errProd;

      // Novas fotos
      for (let i = 0; i < novosArquivos.length; i++) {
        const arquivo = novosArquivos[i];
        const nomeSeguro = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const caminho = `${id}/${Date.now()}-${i}-${nomeSeguro}`;
        const { error: errUp } = await supabase.storage.from('produtos').upload(caminho, arquivo);
        if (errUp) throw errUp;
        const { data: pub } = supabase.storage.from('produtos').getPublicUrl(caminho);
        const { error: errImg } = await supabase
          .from('produto_imagens').insert({ produto_id: id, url: pub.publicUrl, ordem: 999 + i });
        if (errImg) throw errImg;
      }

      // Recria as variações (apaga e insere de novo)
      const { error: errDelVar } = await supabase.from('variacoes').delete().eq('produto_id', id);
      if (errDelVar) throw errDelVar;
      const linhasVar = [];
      cores.forEach((cor) => {
        tamanhos.forEach((tam) => {
          linhasVar.push({
            produto_id: id,
            cor,
            tamanho: tam,
            estoque: Number(estoques[`${cor}|${tam}`] || 0),
            sku: gerarSku(codigo, cor, tam),
          });
        });
      });
      const { error: errVar } = await supabase.from('variacoes').insert(linhasVar);
      if (errVar) throw errVar;

      // Atualiza os custos do produto
      const { error: errDelCusto } = await supabase.from('produto_custos').delete().eq('produto_id', id);
      if (errDelCusto) throw errDelCusto;
      const linhasCusto = custos
        .filter((c) => c.valor > 0)
        .map((c) => ({ produto_id: id, custo_config_id: c.id, valor: c.valor }));
      if (linhasCusto.length) {
        const { error: errCusto } = await supabase.from('produto_custos').insert(linhasCusto);
        if (errCusto) throw errCusto;
      }

      router.push('/admin/produtos');
    } catch (err2) {
      setErro('Erro ao salvar: ' + (err2.message || 'tente novamente'));
      setSalvando(false);
    }
  }

  if (verificando) return <p className="center muted" style={{ padding: 60 }}>Verificando acesso...</p>;
  if (carregando) return <p className="center muted" style={{ padding: 60 }}>Carregando produto...</p>;

  return (
    <>
      <div className="page-header container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1>Editar produto</h1>
            <p>Atualize as informações da camiseta.</p>
          </div>
          <a href="/admin/produtos" className="btn btn-outline">← Voltar</a>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 80 }}>
        {erro && <p className="erro">{erro}</p>}

        <form onSubmit={salvar}>
          <div className="form-card">
            <h2>Dados do produto</h2>
            <div className="form-grid">
              <div className="field">
                <span className="label">Título (aparece na planilha)</span>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
              <div className="field">
                <span className="label">Apelido (nome curto)</span>
                <input value={apelido} onChange={(e) => setApelido(e.target.value)} />
              </div>
              <div className="field">
                <span className="label">Código do produto</span>
                <input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                <span className="hint">Vira o SKU: {codigo || 'CAM'}-PRETO-M</span>
              </div>
              <div className="field">
                <span className="label">Categoria</span>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  <option value="nova">+ Nova categoria...</option>
                </select>
              </div>
              {categoria === 'nova' && (
                <div className="field">
                  <span className="label">Nome da nova categoria</span>
                  <input value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} />
                </div>
              )}
            </div>
            <div className="field" style={{ marginTop: 8 }}>
              <span className="label">Descrição</span>
              <textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>

          <div className="form-card">
            <h2>Fotos do produto</h2>
            <div className="foto-preview">
              {imagensExistentes.map((img) => (
                <div className="item" key={img.id}>
                  <img src={img.url} alt="" />
                  <button type="button" onClick={() => removerImagem(img.id)}>×</button>
                </div>
              ))}
              {novosArquivos.map((a, i) => (
                <div className="item" key={'n' + i}>
                  <img src={URL.createObjectURL(a)} alt="" />
                  <button type="button" onClick={() => setNovosArquivos((prev) => prev.filter((_, x) => x !== i))}>×</button>
                </div>
              ))}
            </div>
            <input type="file" accept="image/*" multiple style={{ marginTop: 12 }}
              onChange={(e) => setNovosArquivos((prev) => [...prev, ...Array.from(e.target.files || [])])} />
            <span className="hint">Fotos novas são adicionadas às já existentes. Clique no × para remover.</span>
          </div>

          <div className="form-card">
            <h2>Cores e tamanhos</h2>
            <div className="form-grid">
              <div className="field">
                <span className="label">Cores</span>
                <div className="row">
                  <input style={{ flex: 1 }} value={novaCor} onChange={(e) => setNovaCor(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarCor(); } }}
                    placeholder="Ex.: Preto" />
                  <button type="button" className="btn btn-primary btn-sm" onClick={adicionarCor}>+</button>
                </div>
                <div className="chips">
                  {cores.map((cor) => (
                    <span className="chip" key={cor}>{cor}<button type="button" onClick={() => removerCor(cor)}>×</button></span>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Tamanhos</span>
                <div className="row">
                  <input style={{ flex: 1 }} value={novoTamanho} onChange={(e) => setNovoTamanho(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarTamanho(); } }}
                    placeholder="Ex.: XGG" />
                  <button type="button" className="btn btn-primary btn-sm" onClick={adicionarTamanho}>+</button>
                </div>
                <div className="chips">
                  {tamanhos.map((tam) => (
                    <span className="chip" key={tam}>{tam}<button type="button" onClick={() => removerTamanho(tam)}>×</button></span>
                  ))}
                </div>
              </div>
            </div>

            {cores.length > 0 && tamanhos.length > 0 && (
              <div className="field" style={{ marginTop: 16 }}>
                <span className="label">Estoque por variação (SKU gerado automaticamente)</span>
                <table className="matrix">
                  <thead>
                    <tr>
                      <th>Cor \\ Tamanho</th>
                      {tamanhos.map((tam) => <th key={tam}>{tam}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {cores.map((cor) => (
                      <tr key={cor}>
                        <td style={{ fontWeight: 700 }}>{cor}</td>
                        {tamanhos.map((tam) => (
                          <td key={tam}>
                            <span className="sku">{gerarSku(codigo || 'CAM', cor, tam)}</span>
                            <input type="number" min="0" value={estoques[`${cor}|${tam}`] || ''}
                              placeholder="0" onChange={(e) => mudarEstoque(cor, tam, e.target.value)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="form-card">
            <h2>Custos e preço sugerido</h2>
            {custos.length === 0 && <p className="muted">Nenhum custo ativo nas configurações.</p>}
            {custos.map((c) => (
              <div className="custo-row" key={c.id}>
                <span style={{ flex: 1, fontWeight: 600 }}>{c.nome}</span>
                <input className="custo-width" type="number" step="0.01" min="0"
                  value={c.valor} onChange={(e) => mudarCusto(c.id, e.target.value)} />
              </div>
            ))}
            <div className="field" style={{ marginTop: 14 }}>
              <span className="label">Margem de lucro (%)</span>
              <input className="custo-width" type="number" min="0" value={margem}
                onChange={(e) => setMargem(e.target.value)} />
            </div>

            <div className="resumo">
              <div className="linha"><span>Custo total</span><strong>R$ {custoTotal.toFixed(2).replace('.', ',')}</strong></div>
              <div className="linha"><span>Preço sugerido de venda</span><strong className="preco">R$ {Number(precoSugerido).toFixed(2).replace('.', ',')}</strong></div>
              <div className="linha" style={{ marginTop: 10 }}>
                <span className="label" style={{ margin: 0 }}>Preço final (editável):</span>
                <input className="custo-width" type="number" step="0.01" min="0" value={precoSugerido}
                  onChange={(e) => setPrecoSugerido(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          <button className="btn btn-primary btn-block" style={{ fontSize: 16, padding: '14px' }} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </>
  );
}
