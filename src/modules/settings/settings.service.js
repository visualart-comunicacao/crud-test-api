import prisma from '../../lib/prisma.js'

async function getSettings() {
  let settings = await prisma.setting.findFirst()

  if (!settings) {
    settings = await prisma.setting.create({
      data: {},
    })
  }

  return settings
}

async function updateSettings(data) {
  const existing = await prisma.setting.findFirst()

  if (!existing) {
    return prisma.setting.create({
      data: normalizeSettings(data),
    })
  }

  return prisma.setting.update({
    where: { id: existing.id },
    data: normalizeSettings(data),
  })
}

function normalizeSettings(data) {
  return {
    razaoSocial: data.razaoSocial ?? null,
    nomeFantasia: data.nomeFantasia ?? null,
    cnpj: data.cnpj ?? null,
    telefone: data.telefone ?? null,
    whatsapp: data.whatsapp ?? null,
    email: data.email ?? null,
    endereco: data.endereco ?? null,
    numero: data.numero ?? null,
    bairro: data.bairro ?? null,
    cidade: data.cidade ?? null,
    uf: data.uf ?? null,
    cep: data.cep ?? null,
    horarioFuncionamento: data.horarioFuncionamento ?? null,
    taxaServico: data.taxaServico ?? null,
    couvert: data.couvert ?? null,
    rodapeCupom: data.rodapeCupom ?? null,
    logoUrl: data.logoUrl ?? null,

    usaMesa: data.usaMesa ?? true,
    usaComanda: data.usaComanda ?? true,
    comandaObrigatoria: data.comandaObrigatoria ?? false,
    qtdMesas: data.qtdMesas ?? null,
    separarPedidoPorSetor: data.separarPedidoPorSetor ?? true,
    bloquearVendaSemEstoque: data.bloquearVendaSemEstoque ?? true,
    exigirObservacaoCancelamento: data.exigirObservacaoCancelamento ?? true,
    permitirDescontoLivre: data.permitirDescontoLivre ?? false,

    impressoraCozinha: data.impressoraCozinha ?? null,
    impressoraBar: data.impressoraBar ?? null,
    impressoraCaixa: data.impressoraCaixa ?? null,
    tamanhoPapel: data.tamanhoPapel ?? null,
    imprimirAutomaticamente: data.imprimirAutomaticamente ?? true,
    imprimirDuasVias: data.imprimirDuasVias ?? false,
    imprimirNomeGarcom: data.imprimirNomeGarcom ?? true,
    imprimirHorario: data.imprimirHorario ?? true,

    somNovoPedido: data.somNovoPedido ?? true,
    alertaPedidoPronto: data.alertaPedidoPronto ?? true,
    alertaMesaAbertaSemConsumo: data.alertaMesaAbertaSemConsumo ?? false,
    tempoAlertaMesaSemConsumo: data.tempoAlertaMesaSemConsumo ?? null,

    tema: data.tema ?? null,
    formatoData: data.formatoData ?? null,
    fusoHorario: data.fusoHorario ?? null,
    logoutAutomaticoMinutos: data.logoutAutomaticoMinutos ?? null,
    forcarTrocaSenhaPadrao: data.forcarTrocaSenhaPadrao ?? true,
    exibirAtalhosInicio: data.exibirAtalhosInicio ?? true,

    whatsappToken: data.whatsappToken ?? null,
    webhookPedidos: data.webhookPedidos ?? null,
    ifoodHabilitado: data.ifoodHabilitado ?? false,
    apiEntregaHabilitada: data.apiEntregaHabilitada ?? false,
  }
}

export default {
  getSettings,
  updateSettings,
}