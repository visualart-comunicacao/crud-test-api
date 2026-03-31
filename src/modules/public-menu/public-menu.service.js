import prisma from '../../lib/prisma.js'

function toNumber(value) {
  if (value == null) return 0
  return Number(value)
}

function buildCompanyAddress(settings) {
  const parts = [
    settings?.endereco,
    settings?.numero,
    settings?.bairro,
    settings?.cidade,
    settings?.uf,
  ].filter(Boolean)

  return parts.join(', ')
}

export async function getDigitalMenu() {
  const settings = await prisma.setting.findFirst()

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      availableDelivery: true,
    },
    include: {
      category: true,
    },
    orderBy: [
      { category: { name: 'asc' } },
      { isFeatured: 'desc' },
      { name: 'asc' },
    ],
  })

  const categoriesMap = new Map()

  for (const product of products) {
    const categoryName = product.category?.name || 'Sem categoria'

    if (!categoriesMap.has(categoryName)) {
      categoriesMap.set(categoryName, {
        id: product.category?.id || `sem-categoria`,
        name: categoryName,
        products: [],
      })
    }

    categoriesMap.get(categoryName).products.push({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: toNumber(product.price),
      imageUrl: product.imageUrl || null,
      prepTimeMinutes: product.prepTimeMinutes || null,
      isFeatured: product.isFeatured,
      unit: product.unit || null,
      printSector: product.printSector || null,
      availableInStore: product.availableInStore,
      availableDelivery: product.availableDelivery,
      availableCounter: product.availableCounter,
    })
  }

  const categories = Array.from(categoriesMap.values())

  return {
    company: {
      razaoSocial: settings?.razaoSocial || '',
      nomeFantasia: settings?.nomeFantasia || 'Cardápio Digital',
      telefone: settings?.telefone || '',
      whatsapp: settings?.whatsapp || '',
      email: settings?.email || '',
      logoUrl: settings?.logoUrl || '',
      horarioFuncionamento: settings?.horarioFuncionamento || '',
      enderecoCompleto: buildCompanyAddress(settings),
      cidade: settings?.cidade || '',
      uf: settings?.uf || '',
    },
    highlights: products
      .filter((product) => product.isFeatured)
      .slice(0, 8)
      .map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: toNumber(product.price),
        imageUrl: product.imageUrl || null,
        categoryName: product.category?.name || 'Sem categoria',
      })),
    categories,
  }
}