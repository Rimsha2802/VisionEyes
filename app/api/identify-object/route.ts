import { generateText } from "ai"

export async function POST(req: Request) {
  try {
    const { image } = await req.json()

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 })
    }

    // Convert base64 image to the format expected by AI SDK
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "")

    const { text } = await generateText({
      model: "openai/gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Identify the main object in this image. Respond with just the name of the object (e.g., "apple", "bottle of water", "smartphone"). Be specific but concise. If you cannot clearly identify an object, respond with "unknown object".',
            },
            {
              type: "image",
              image: base64Data,
            },
          ],
        },
      ],
      maxOutputTokens: 50,
      temperature: 0.1,
    })

    const objectName = text.trim().toLowerCase()

    return Response.json({
      object: objectName,
      confidence: 0.9, // Placeholder confidence score
    })
  } catch (error) {
    console.error("Object identification error:", error)
    return Response.json({ error: "Failed to identify object" }, { status: 500 })
  }
}
