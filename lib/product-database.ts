export interface Product {
  id: string
  name: string
  price: number
  category: string
  description: string
  keywords: string[]
  inStock: boolean
}

export const PRODUCT_DATABASE: Product[] = [
  // Fruits
  {
    id: "fruit-001",
    name: "apple",
    price: 1.99,
    category: "fruits",
    description: "Fresh red apple",
    keywords: ["apple", "red apple", "fruit"],
    inStock: true,
  },
  {
    id: "fruit-002",
    name: "banana",
    price: 0.79,
    category: "fruits",
    description: "Ripe yellow banana",
    keywords: ["banana", "yellow banana", "fruit"],
    inStock: true,
  },
  {
    id: "fruit-003",
    name: "orange",
    price: 1.29,
    category: "fruits",
    description: "Juicy orange",
    keywords: ["orange", "citrus", "fruit"],
    inStock: true,
  },
  {
    id: "fruit-004",
    name: "grapes",
    price: 3.99,
    category: "fruits",
    description: "Fresh grapes",
    keywords: ["grapes", "grape", "fruit"],
    inStock: true,
  },

  // Vegetables
  {
    id: "veg-001",
    name: "tomato",
    price: 2.99,
    category: "vegetables",
    description: "Fresh red tomato",
    keywords: ["tomato", "red tomato", "vegetable"],
    inStock: true,
  },
  {
    id: "veg-002",
    name: "lettuce",
    price: 2.49,
    category: "vegetables",
    description: "Fresh lettuce head",
    keywords: ["lettuce", "salad", "vegetable", "greens"],
    inStock: true,
  },
  {
    id: "veg-003",
    name: "carrot",
    price: 1.99,
    category: "vegetables",
    description: "Fresh carrots",
    keywords: ["carrot", "carrots", "vegetable"],
    inStock: true,
  },
  {
    id: "veg-004",
    name: "broccoli",
    price: 2.79,
    category: "vegetables",
    description: "Fresh broccoli",
    keywords: ["broccoli", "vegetable", "greens"],
    inStock: true,
  },

  // Dairy
  {
    id: "dairy-001",
    name: "milk",
    price: 3.49,
    category: "dairy",
    description: "Fresh whole milk",
    keywords: ["milk", "whole milk", "dairy"],
    inStock: true,
  },
  {
    id: "dairy-002",
    name: "cheese",
    price: 4.99,
    category: "dairy",
    description: "Cheddar cheese block",
    keywords: ["cheese", "cheddar", "dairy"],
    inStock: true,
  },
  {
    id: "dairy-003",
    name: "yogurt",
    price: 1.99,
    category: "dairy",
    description: "Greek yogurt",
    keywords: ["yogurt", "greek yogurt", "dairy"],
    inStock: true,
  },
  {
    id: "dairy-004",
    name: "butter",
    price: 3.99,
    category: "dairy",
    description: "Unsalted butter",
    keywords: ["butter", "dairy"],
    inStock: true,
  },

  // Beverages
  {
    id: "bev-001",
    name: "bottle of water",
    price: 1.49,
    category: "beverages",
    description: "Bottled water",
    keywords: ["water", "bottle of water", "bottled water", "beverage"],
    inStock: true,
  },
  {
    id: "bev-002",
    name: "soda",
    price: 1.99,
    category: "beverages",
    description: "Cola soda",
    keywords: ["soda", "cola", "soft drink", "beverage"],
    inStock: true,
  },
  {
    id: "bev-003",
    name: "juice",
    price: 3.99,
    category: "beverages",
    description: "Orange juice",
    keywords: ["juice", "orange juice", "beverage"],
    inStock: true,
  },

  // Pantry Items
  {
    id: "pantry-001",
    name: "bread",
    price: 2.99,
    category: "pantry",
    description: "Whole wheat bread",
    keywords: ["bread", "loaf", "wheat bread"],
    inStock: true,
  },
  {
    id: "pantry-002",
    name: "cereal",
    price: 4.49,
    category: "pantry",
    description: "Breakfast cereal",
    keywords: ["cereal", "breakfast", "oats"],
    inStock: true,
  },
  {
    id: "pantry-003",
    name: "pasta",
    price: 1.99,
    category: "pantry",
    description: "Spaghetti pasta",
    keywords: ["pasta", "spaghetti", "noodles"],
    inStock: true,
  },
  {
    id: "pantry-004",
    name: "rice",
    price: 3.49,
    category: "pantry",
    description: "White rice",
    keywords: ["rice", "white rice", "grain"],
    inStock: true,
  },

  // Meat & Protein
  {
    id: "meat-001",
    name: "chicken",
    price: 8.99,
    category: "meat",
    description: "Fresh chicken breast",
    keywords: ["chicken", "chicken breast", "meat", "protein"],
    inStock: true,
  },
  {
    id: "meat-002",
    name: "ground beef",
    price: 6.99,
    category: "meat",
    description: "Ground beef",
    keywords: ["beef", "ground beef", "meat"],
    inStock: true,
  },
  {
    id: "meat-003",
    name: "salmon",
    price: 12.99,
    category: "meat",
    description: "Fresh salmon fillet",
    keywords: ["salmon", "fish", "seafood"],
    inStock: true,
  },

  // Electronics (for testing)
  {
    id: "elec-001",
    name: "smartphone",
    price: 699.99,
    category: "electronics",
    description: "Latest smartphone",
    keywords: ["phone", "smartphone", "mobile", "cell phone"],
    inStock: true,
  },
  {
    id: "elec-002",
    name: "laptop",
    price: 999.99,
    category: "electronics",
    description: "Laptop computer",
    keywords: ["laptop", "computer", "notebook"],
    inStock: true,
  },
  {
    id: "elec-003",
    name: "headphones",
    price: 79.99,
    category: "electronics",
    description: "Wireless headphones",
    keywords: ["headphones", "earphones", "wireless"],
    inStock: true,
  },

  // Office Supplies
  {
    id: "office-001",
    name: "pen",
    price: 2.49,
    category: "office",
    description: "Ballpoint pen",
    keywords: ["pen", "ballpoint", "writing"],
    inStock: true,
  },
  {
    id: "office-002",
    name: "notebook",
    price: 5.99,
    category: "office",
    description: "Spiral notebook",
    keywords: ["notebook", "notepad", "journal"],
    inStock: true,
  },
  {
    id: "office-003",
    name: "book",
    price: 12.99,
    category: "office",
    description: "Paperback book",
    keywords: ["book", "novel", "paperback"],
    inStock: true,
  },

  // Household Items
  {
    id: "house-001",
    name: "coffee mug",
    price: 8.99,
    category: "household",
    description: "Ceramic coffee mug",
    keywords: ["mug", "coffee mug", "cup"],
    inStock: true,
  },
  {
    id: "house-002",
    name: "plate",
    price: 6.99,
    category: "household",
    description: "Dinner plate",
    keywords: ["plate", "dish", "dinner plate"],
    inStock: true,
  },
  {
    id: "house-003",
    name: "bowl",
    price: 4.99,
    category: "household",
    description: "Ceramic bowl",
    keywords: ["bowl", "cereal bowl", "dish"],
    inStock: true,
  },
]

export function findProduct(searchTerm: string): Product | null {
  const term = searchTerm.toLowerCase().trim()

  // Try exact name match first
  let product = PRODUCT_DATABASE.find((p) => p.name.toLowerCase() === term)

  if (product) return product

  // Try keyword matching
  product = PRODUCT_DATABASE.find((p) => p.keywords.some((keyword) => keyword.toLowerCase() === term))

  if (product) return product

  // Try partial matching in name
  product = PRODUCT_DATABASE.find((p) => p.name.toLowerCase().includes(term) || term.includes(p.name.toLowerCase()))

  if (product) return product

  // Try partial matching in keywords
  product = PRODUCT_DATABASE.find((p) =>
    p.keywords.some((keyword) => keyword.toLowerCase().includes(term) || term.includes(keyword.toLowerCase())),
  )

  return product || null
}

export function getProductsByCategory(category: string): Product[] {
  return PRODUCT_DATABASE.filter((p) => p.category.toLowerCase() === category.toLowerCase())
}

export function getAllCategories(): string[] {
  const categories = new Set(PRODUCT_DATABASE.map((p) => p.category))
  return Array.from(categories).sort()
}

export function searchProducts(query: string): Product[] {
  const term = query.toLowerCase().trim()
  return PRODUCT_DATABASE.filter(
    (p) =>
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.keywords.some((keyword) => keyword.toLowerCase().includes(term)),
  )
}
