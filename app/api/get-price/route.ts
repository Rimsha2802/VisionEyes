import { findProduct } from "@/lib/product-database"

export async function POST(req: Request) {
  try {
    const { item } = await req.json()

    if (!item) {
      return Response.json({ error: "No item specified" }, { status: 400 })
    }

    const product = findProduct(item)

    if (product) {
      return Response.json({
        item: product.name,
        price: product.price,
        currency: "USD",
        description: product.description,
        category: product.category,
        inStock: product.inStock,
      })
    } else {
      return Response.json({
        item: item,
        price: null,
        message: "Product not found in our database",
      })
    }
  } catch (error) {
    console.error("Price lookup error:", error)
    return Response.json({ error: "Failed to get price" }, { status: 500 })
  }
}
