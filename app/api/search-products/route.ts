import { searchProducts, getAllCategories } from "@/lib/product-database"

export async function POST(req: Request) {
  try {
    const { query, category } = await req.json()

    if (!query && !category) {
      return Response.json({ error: "No search query or category specified" }, { status: 400 })
    }

    let results = []

    if (query) {
      results = searchProducts(query)
    }

    if (category) {
      const { getProductsByCategory } = await import("@/lib/product-database")
      results = getProductsByCategory(category)
    }

    return Response.json({
      results: results.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        description: product.description,
        inStock: product.inStock,
      })),
      total: results.length,
      categories: getAllCategories(),
    })
  } catch (error) {
    console.error("Product search error:", error)
    return Response.json({ error: "Failed to search products" }, { status: 500 })
  }
}
