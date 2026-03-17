import prisma from "../../lib/prisma.js";
import PDFDocument from "pdfkit";

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function generateOrderCode() {
  return `CMD-${Date.now()}`;
}

function removeKitchenFlags(notes) {
  return String(notes || '')
    .replace(/\[KITCHEN_SENT\]/g, '')
    .replace(/\[KITCHEN_PREPARO\]/g, '')
    .replace(/\[KITCHEN_READY\]/g, '')
    .replace(/\[KITCHEN_FINISHED\]/g, '')
    .trim()
}

function hasKitchenSentFlag(notes) {
  return String(notes || "").includes("[KITCHEN_SENT]");
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleString("pt-BR");
}

function addKitchenSentFlag(notes) {
  const current = String(notes || "").trim();
  if (current.includes("[KITCHEN_SENT]")) return current;
  return current ? `${current} [KITCHEN_SENT]` : "[KITCHEN_SENT]";
}

function calculateOrderTotals(items, taxaServicoPercent = 0, couvert = 0) {
  const activeItems = items.filter((item) => item.status === "ATIVO");

  const subtotal = activeItems.reduce((acc, item) => {
    return acc + Number(item.totalPrice || 0);
  }, 0);

  const serviceFee = subtotal * (Number(taxaServicoPercent || 0) / 100);
  const couvertTotal = Number(couvert || 0);
  const discountAmount = 0;
  const total = subtotal + serviceFee + couvertTotal - discountAmount;

  return {
    subtotal,
    serviceFee,
    couvertTotal,
    discountAmount,
    total,
  };
}

function normalizeOrder(order) {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    tableId: order.tableId,
    table: order.table
      ? {
          id: order.table.id,
          numero: order.table.number,
          nome: order.table.name,
          status: order.table.status,
          ativo: order.table.isActive,
        }
      : null,
    customerName: order.customerName,
    notes: order.notes,
    subtotal: Number(order.subtotal || 0),
    serviceFee: Number(order.serviceFee || 0),
    couvertTotal: Number(order.couvertTotal || 0),
    discountAmount: Number(order.discountAmount || 0),
    total: Number(order.total || 0),
    createdBy: order.createdBy
      ? {
          id: order.createdBy.id,
          name: order.createdBy.name,
          username: order.createdBy.username,
        }
      : null,
    closedBy: order.closedBy
      ? {
          id: order.closedBy.id,
          name: order.closedBy.name,
          username: order.closedBy.username,
        }
      : null,
    canceledBy: order.canceledBy
      ? {
          id: order.canceledBy.id,
          name: order.canceledBy.name,
          username: order.canceledBy.username,
        }
      : null,
    openedAt: order.openedAt,
    closedAt: order.closedAt,
    canceledAt: order.canceledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice || 0),
      totalPrice: Number(item.totalPrice || 0),
      notes: item.notes,
      status: item.status,
      addedBy: item.addedBy
        ? {
            id: item.addedBy.id,
            name: item.addedBy.name,
            username: item.addedBy.username,
          }
        : null,
      canceledBy: item.canceledBy
        ? {
            id: item.canceledBy.id,
            name: item.canceledBy.name,
            username: item.canceledBy.username,
          }
        : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      canceledAt: item.canceledAt,
    })),
  };
}

async function getSettings() {
  return prisma.setting.findFirst();
}

async function recalculateOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    throw createError("Comanda não encontrada", 404);
  }

  const settings = await getSettings();

  const totals = calculateOrderTotals(
    order.items,
    settings?.taxaServico || 0,
    settings?.couvert || 0,
  );

  await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal: totals.subtotal,
      serviceFee: totals.serviceFee,
      couvertTotal: totals.couvertTotal,
      discountAmount: totals.discountAmount,
      total: totals.total,
    },
  });
}

async function list(query) {
  const where = {};

  if (query?.status) {
    where.status = query.status;
  }

  if (query?.tableId) {
    where.tableId = query.tableId;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      table: true,
      createdBy: true,
      closedBy: true,
      canceledBy: true,
      items: {
        include: {
          addedBy: true,
          canceledBy: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      openedAt: "desc",
    },
  });

  return orders.map(normalizeOrder);
}

async function getById(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      table: true,
      createdBy: true,
      closedBy: true,
      canceledBy: true,
      items: {
        include: {
          addedBy: true,
          canceledBy: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!order) {
    throw createError("Comanda não encontrada", 404);
  }

  return normalizeOrder(order);
}

async function create({ tableId, customerName, notes }, user) {
  if (!tableId) {
    throw createError("Mesa é obrigatória");
  }

  const table = await prisma.restaurantTable.findUnique({
    where: { id: tableId },
  });

  if (!table) {
    throw createError("Mesa não encontrada", 404);
  }

  if (!table.isActive) {
    throw createError("Mesa inativa");
  }

  const openOrder = await prisma.order.findFirst({
    where: {
      tableId,
      status: "ABERTA",
    },
  });

  if (openOrder) {
    throw createError("Já existe uma comanda aberta para essa mesa");
  }

  const order = await prisma.order.create({
    data: {
      code: generateOrderCode(),
      status: "ABERTA",
      tableId,
      customerName: customerName || null,
      notes: notes || null,
      createdById: user.id,
      subtotal: 0,
      serviceFee: 0,
      couvertTotal: 0,
      discountAmount: 0,
      total: 0,
    },
    include: {
      table: true,
      createdBy: true,
      closedBy: true,
      canceledBy: true,
      items: {
        include: {
          addedBy: true,
          canceledBy: true,
        },
      },
    },
  });

  await prisma.restaurantTable.update({
    where: { id: tableId },
    data: {
      status: "OCUPADA",
    },
  });

  return normalizeOrder(order);
}

async function addItem(orderId, { productId, quantity, notes }, user) {
  if (!productId) {
    throw createError("Produto é obrigatório");
  }

  if (!quantity || Number(quantity) <= 0) {
    throw createError("Quantidade inválida");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw createError("Comanda não encontrada", 404);
  }

  if (order.status !== "ABERTA") {
    throw createError("Só é possível adicionar item em comanda aberta");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw createError("Produto não encontrado", 404);
  }

  if (!product.isActive) {
    throw createError("Produto inativo");
  }

  const qty = Number(quantity);
  const unitPrice = Number(product.price);
  const totalPrice = unitPrice * qty;

  await prisma.orderItem.create({
    data: {
      orderId,
      productId,
      productName: product.name,
      quantity: qty,
      unitPrice,
      totalPrice,
      notes: notes || null,
      status: "ATIVO",
      addedById: user.id,
    },
  });

  await recalculateOrder(orderId);

  return getById(orderId);
}

async function updateItem(orderId, itemId, body) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw createError("Comanda não encontrada", 404);
  }

  if (order.status !== "ABERTA") {
    throw createError("Só é possível editar item em comanda aberta");
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
  });

  if (!item || item.orderId !== orderId) {
    throw createError("Item não encontrado", 404);
  }

  if (item.status === "CANCELADO") {
    throw createError("Não é possível editar um item cancelado");
  }

  if (!body.productId) {
    throw createError("Produto é obrigatório");
  }

  if (!body.quantity || Number(body.quantity) <= 0) {
    throw createError("Quantidade inválida");
  }

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
  });

  if (!product) {
    throw createError("Produto não encontrado", 404);
  }

  if (!product.isActive) {
    throw createError("Produto inativo");
  }

  const qty = Number(body.quantity);
  const unitPrice = Number(product.price);
  const totalPrice = qty * unitPrice;

  await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unitPrice,
      totalPrice,
      notes: body.notes || null,
    },
  });

  await recalculateOrder(orderId);

  return getById(orderId);
}

async function cancelItem(orderId, itemId, body, user) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw createError("Comanda não encontrada", 404);
  }

  if (order.status !== "ABERTA") {
    throw createError("Só é possível cancelar item em comanda aberta");
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
  });

  if (!item || item.orderId !== orderId) {
    throw createError("Item não encontrado", 404);
  }

  if (item.status === "CANCELADO") {
    throw createError("Item já está cancelado");
  }

  await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      status: "CANCELADO",
      canceledById: user.id,
      canceledAt: new Date(),
      notes: body?.notes ?? item.notes,
    },
  });

  await recalculateOrder(orderId);

  return getById(orderId);
}

async function sendToKitchen(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    throw createError("Comanda não encontrada", 404);
  }

  if (order.status !== "ABERTA") {
    throw createError("Só é possível enviar comandas abertas para a cozinha");
  }

  const itensAtivos = order.items.filter((item) => item.status === "ATIVO");

  if (!itensAtivos.length) {
    throw createError("A comanda não possui itens ativos para envio");
  }

  const itensPendentes = itensAtivos.filter(
    (item) => !hasKitchenSentFlag(item.notes),
  );

  if (!itensPendentes.length) {
    throw createError("Todos os itens já foram enviados para a cozinha");
  }

  await Promise.all(
    itensPendentes.map((item) =>
      prisma.orderItem.update({
        where: { id: item.id },
        data: {
          notes: addKitchenSentFlag(item.notes),
        },
      }),
    ),
  );

  return getById(orderId);
}

async function transferTable(orderId, body) {
  const { newTableId } = body;

  if (!newTableId) {
    throw createError("Mesa de destino é obrigatória");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw createError("Comanda não encontrada", 404);
  }

  if (order.status !== "ABERTA") {
    throw createError("Só é possível transferir mesa em comanda aberta");
  }

  const currentTable = await prisma.restaurantTable.findUnique({
    where: { id: order.tableId },
  });

  if (!currentTable) {
    throw createError("Mesa atual não encontrada", 404);
  }

  const newTable = await prisma.restaurantTable.findUnique({
    where: { id: newTableId },
  });

  if (!newTable) {
    throw createError("Mesa de destino não encontrada", 404);
  }

  if (!newTable.isActive) {
    throw createError("Mesa de destino está inativa");
  }

  if (newTable.id === currentTable.id) {
    throw createError("A mesa de destino deve ser diferente da atual");
  }

  const openOrderInNewTable = await prisma.order.findFirst({
    where: {
      tableId: newTableId,
      status: "ABERTA",
    },
  });

  if (openOrderInNewTable) {
    throw createError("Já existe uma comanda aberta na mesa de destino");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      tableId: newTableId,
    },
  });

  await prisma.restaurantTable.update({
    where: { id: currentTable.id },
    data: {
      status: "LIVRE",
    },
  });

  await prisma.restaurantTable.update({
    where: { id: newTable.id },
    data: {
      status: "OCUPADA",
    },
  });

  return getById(orderId);
}

async function close(orderId, user) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw createError("Comanda não encontrada", 404);
  }

  if (order.status !== "ABERTA") {
    throw createError("Só é possível fechar comandas abertas");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "FECHADA",
      closedById: user.id,
      closedAt: new Date(),
    },
  });

  if (order.tableId) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: {
        status: "LIVRE",
      },
    });
  }

  return getById(orderId);
}

async function cancel(orderId, body, user) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw createError("Comanda não encontrada", 404);
  }

  if (order.status !== "ABERTA") {
    throw createError("Só é possível cancelar comandas abertas");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELADA",
      canceledById: user.id,
      canceledAt: new Date(),
      notes: body?.notes || order.notes,
    },
  });

  if (order.tableId) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: {
        status: "LIVRE",
      },
    });
  }

  return getById(orderId);
}

async function generateReceiptPdf(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      createdBy: true,
      closedBy: true,
      items: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!order) {
    throw createError("Comanda não encontrada", 404);
  }

  const settings = await prisma.setting.findFirst();

  const activeItems = (order.items || []).filter(
    (item) => item.status === "ATIVO",
  );
  const canceledItems = (order.items || []).filter(
    (item) => item.status === "CANCELADO",
  );

  const doc = new PDFDocument({
    size: [226.77, 1000],
    margin: 18,
  });

  doc.font("Courier");

  const line = () => {
    doc.moveDown(0.3);
    doc.fontSize(9).text("--------------------------------", {
      align: "center",
    });
    doc.moveDown(0.3);
  };

  const center = (text, size = 10) => {
    doc.fontSize(size).text(text, { align: "center" });
  };

  const leftRight = (left, right, size = 9) => {
    const y = doc.y;
    doc.fontSize(size).text(String(left || ""), 18, y, {
      width: 120,
      align: "left",
    });
    doc.fontSize(size).text(String(right || ""), 140, y, {
      width: 65,
      align: "right",
    });
    doc.moveDown();
  };

  center(settings?.nomeFantasia || "ESPETARIA SABOR & BRASA", 12);
  if (settings?.razaoSocial) center(settings.razaoSocial, 8);
  if (settings?.cnpj) center(`CNPJ: ${settings.cnpj}`, 8);
  if (settings?.telefone) center(`Tel: ${settings.telefone}`, 8);
  if (settings?.endereco) center(settings.endereco, 8);

  line();

  center("COMANDA / RECIBO", 16);
  doc.moveDown(0.5);

  leftRight("Comanda", order.code || order.id);
  leftRight(
    "Mesa",
    order.table?.name ||
      `Mesa ${String(order.table?.number || "").padStart(2, "0")}`,
  );
  leftRight("Cliente", order.customerName || "Mesa sem identificação");
  leftRight("Aberta em", formatDateTime(order.openedAt), 8);
  leftRight("Fechada em", formatDateTime(order.closedAt), 8);
  leftRight(
    "Atendente",
    order.createdBy?.name || order.createdBy?.username || "-",
    8,
  );

  line();

  center("ITENS", 11);
  doc.moveDown(0.3);

  if (!activeItems.length) {
    center("Nenhum item ativo", 9);
  } else {
    activeItems.forEach((item) => {
      doc.fontSize(9).text(`${item.quantity}x ${item.productName}`, {
        align: "left",
      });

      leftRight(
        `  ${formatCurrency(item.unitPrice)} cada`,
        formatCurrency(item.totalPrice),
        8,
      );

      if (item.notes) {
        doc.fontSize(8).text(`  Obs.: ${removeKitchenFlags(item.notes)}`, {
          align: "left",
        });
      }

      doc.moveDown(0.2);
    });
  }

  if (canceledItems.length) {
    line();
    center("ITENS CANCELADOS", 10);
    doc.moveDown(0.3);

    canceledItems.forEach((item) => {
      doc.fontSize(8).text(`${item.quantity}x ${item.productName}`, {
        align: "left",
      });
      leftRight("  Cancelado", formatCurrency(item.totalPrice), 8);
    });
  }

  line();

  leftRight("Subtotal", formatCurrency(order.subtotal));
  leftRight("Taxa de serviço", formatCurrency(order.serviceFee));
  leftRight("Couvert", formatCurrency(order.couvertTotal));
  leftRight("Desconto", formatCurrency(order.discountAmount));

  line();

  doc.font("Courier-Bold");
  leftRight("TOTAL", formatCurrency(order.total), 11);
  doc.font("Courier");

  line();

  if (settings?.rodapeCupom) {
    center(settings.rodapeCupom, 9);
    doc.moveDown(0.5);
  } else {
    center("Obrigado pela preferência!", 9);
    center("Volte sempre.", 9);
    doc.moveDown(0.5);
  }

  center("Documento gerado em PDF", 8);

  doc.end();
  return doc;
}

export default {
  list,
  getById,
  generateReceiptPdf,
  create,
  addItem,
  updateItem,
  cancelItem,
  sendToKitchen,
  transferTable,
  close,
  cancel,
};
