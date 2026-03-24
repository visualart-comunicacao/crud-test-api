import prisma from '../../lib/prisma.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function normalizeCustomer(customer) {
  return {
    id: customer.id,
    nome: customer.name,
    telefone: customer.phone,
    endereco: customer.address || '',
    bairro: customer.neighborhood || '',
    referencia: customer.reference || '',
    ativo: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }
}

async function list() {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    orderBy: [{ name: 'asc' }],
  })

  return customers.map(normalizeCustomer)
}

async function create({ nome, telefone, endereco, bairro, referencia }) {
  if (!nome?.trim()) throw createError('Nome é obrigatório')
  if (!telefone?.trim()) throw createError('Telefone é obrigatório')

  const customer = await prisma.customer.create({
    data: {
      name: nome.trim(),
      phone: telefone.trim(),
      address: endereco?.trim() || null,
      neighborhood: bairro?.trim() || null,
      reference: referencia?.trim() || null,
      isActive: true,
    },
  })

  return normalizeCustomer(customer)
}

export default {
  list,
  create,
}