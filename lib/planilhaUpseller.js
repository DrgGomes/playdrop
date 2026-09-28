import * as XLSX from 'xlsx';

// Cabeçalho OFICIAL do template de importação UpSeller (Produto Único)
const CABECALHO = [
  'sku_obrigatorio_1_200_caracteres_e_limite_de_numeros_letras_e_caracteres_especiais_',
  'titulo_obrigatorio_1_500_caracteres_',
  'apelido_do_produto_1_500_caracteres_',
  'usar_apelido_como_titulo_da_nfe',
  'categoria_principal_campos_em_branco_ou_invalidos_nao_atualizarao_a_categoria_do_produto_',
  'categoria_secundaria_selecione_uma_categoria_principal_primeiro_',
  'preco_de_varejo_limite_0_999999999_',
  'custo_de_compra_limite_0_999999999_',
  'quantidade_limite_0_999999999_se_nao_for_preenchido_nao_sera_registrado_na_lista_de_estoque_',
  'n_do_estante_apenas_estantes_existentes_serao_filtrados_se_o_estante_selecionado_estiver_cheio_ou_ficara_cheio_apos_a_importacao_',
  'codigo_de_barras_limite_de_8_a_14_caracteres_separe_varios_codigos_de_barras_com_virgulas_',
  'apelido_de_sku_limite_a_letras_numeros_e_caracteres_especiais_separe_varios_apelidos_de_sku_com_virgulas_maximo_de_20_entradas_',
  'imagem_link_da_imagem_apenas_suporta_imagens_nos_formatos_jpg_jpeg_png_com_tamanho_maximo_de_2mb_para_multiplas_imagens_use_para_separa_las_no_maximo_15_imagens_',
  'peso_g_limite_1_999999_',
  'comprimento_cm_limite_1_999999_',
  'largura_cm_limite_1_999999_',
  'altura_cm_limite_1_999999_',
  'ncm_limite_8_digitos_',
  'cest_limite_7_digitos_',
  'unidade_selecionar_un_kg_par_',
  'origem_selecionar_0_1_2_3_4_5_6_7_8_',
  'link_do_fornecedor',
];

// Valores padrão técnicos (ajuste aqui quando quiser)
const DEFAULTS = {
  usarApelidoNfe: 'não',
  peso: 250,
  comprimento: 30,
  largura: 25,
  altura: 2,
  ncm: '6109.10.00',
  unidade: 'UN',
  origem: '0',
  linkFornecedor: '',
};

function dataHoje() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Monta o .xlsx no formato exato do UpSeller
export function montarPlanilhaUpseller({ linhas }) {
  const dados = [CABECALHO];

  linhas.forEach((l) => {
    dados.push([
      l.sku || '',
      l.titulo || '',
      l.apelido || '',
      DEFAULTS.usarApelidoNfe,
      l.categoria || 'Camisetas',
      l.categoriaSecundaria || '',
      l.precoVarejo || 0,
      l.custoCompra || 0,
      l.quantidade || 0,
      '',
      l.codigoBarras || '',
      l.apelidoSku || '',
      l.imagem || '',
      DEFAULTS.peso,
      DEFAULTS.comprimento,
      DEFAULTS.largura,
      DEFAULTS.altura,
      DEFAULTS.ncm,
      '',
      DEFAULTS.unidade,
      DEFAULTS.origem,
      DEFAULTS.linkFornecedor,
    ]);
  });

  const wsDados = XLSX.utils.aoa_to_sheet(dados);
  wsDados['!cols'] = CABECALHO.map((cab, i) => ({
    wch: [12, 50, 35, 18, 25, 22, 14, 14, 12, 16, 16, 22, 55, 9, 14, 12, 10, 12, 10, 10, 9, 22][i] || 14,
  }));

  const abaControle = XLSX.utils.aoa_to_sheet([['Número de Linhas'], [linhas.length]]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDados, 'Dados');
  XLSX.utils.book_append_sheet(wb, abaControle, 'Número de Linhas');

  XLSX.writeFile(wb, `playdrop-upseller-${dataHoje()}.xlsx`);
}
