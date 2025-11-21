import { ImageAnnotatorClient, protos } from '@google-cloud/vision';

// Define an interface for the expected credentials structure
interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string; // Optional field
}

// --- Authentication Setup ---
const credentialsJsonString = process.env.GOOGLE_CREDENTIALS_JSON;
let credentials: ServiceAccountCredentials | undefined;

if (credentialsJsonString) {
  try {
    credentials = JSON.parse(credentialsJsonString) as ServiceAccountCredentials;
  } catch (e) {
    console.error("CRITICAL: Failed to parse GOOGLE_CREDENTIALS_JSON.", e);
    credentials = undefined;
  }
} else {
  console.error("CRITICAL: GOOGLE_CREDENTIALS_JSON environment variable not set.");
  credentials = undefined;
}

const clientOptions: { credentials?: ServiceAccountCredentials } = credentials ? { credentials } : {};
const client = new ImageAnnotatorClient(clientOptions);

// Helper function to calculate bounding box area
function calculateNormalizedArea(vertices: protos.google.cloud.vision.v1.INormalizedVertex[] | null | undefined): number {
    if (!vertices || vertices.length < 4) return 0;
    // Find min/max x and y (simple approach, assumes roughly rectangular)
    let minX = 1.0, maxX = 0.0, minY = 1.0, maxY = 0.0;
    for (const vertex of vertices) {
        if (vertex.x !== null && vertex.x !== undefined) {
            minX = Math.min(minX, vertex.x);
            maxX = Math.max(maxX, vertex.x);
        }
         if (vertex.y !== null && vertex.y !== undefined) {
            minY = Math.min(minY, vertex.y);
            maxY = Math.max(maxY, vertex.y);
        }
    }
     // Avoid calculating area if bounds are invalid
     if (maxX <= minX || maxY <= minY) return 0;
    return (maxX - minX) * (maxY - minY);
}


// --- API Route Handler ---
export async function POST(req: Request) {
  if (!credentials) {
     console.error("CRITICAL: Credentials not loaded. Cannot call API.");
     return Response.json({ error: 'Server configuration error: Missing credentials' }, { status: 500 });
  }

  try {
    const { image } = await req.json();
    if (!image || typeof image !== 'string') {
      return Response.json({ error: 'No valid image provided' }, { status: 400 });
    }
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
    if (!base64Data) {
        return Response.json({ error: 'Invalid image data' }, { status: 400 });
    }

    const request = {
      image: { content: base64Data },
      features: [
        { type: protos.google.cloud.vision.v1.Feature.Type.OBJECT_LOCALIZATION, maxResults: 10 }, // Get more results to choose from
        { type: protos.google.cloud.vision.v1.Feature.Type.LABEL_DETECTION, maxResults: 5 }, // Keep labels as fallback
      ],
    };

    console.log('Sending request to Google Cloud Vision API...');
    const [result] = await client.annotateImage(request);
    console.log('Received response from Google Cloud Vision API.');

    const objects = result.localizedObjectAnnotations;
    let primaryObjectName = 'unknown object';
    let primaryObjectConfidence = 0;

    if (objects && objects.length > 0) {
      let largestObject: protos.google.cloud.vision.v1.ILocalizedObjectAnnotation | null = null;
      let largestArea = 0;

      // Filter out unwanted objects and find the one with the largest area
      for (const obj of objects) {
        const objectNameLower = obj.name?.toLowerCase();
        // --- Exclude specific items like 'person' or 'glasses' ---
        if (objectNameLower === 'person' || objectNameLower === 'glasses' || objectNameLower === 'eyewear') {
            console.log(`Skipping detected object: ${obj.name}`);
            continue; // Skip this object
        }
        // ---------------------------------------------------------

        const area = calculateNormalizedArea(obj.boundingPoly?.normalizedVertices);
        console.log(`Detected: ${obj.name}, Score: ${obj.score?.toFixed(3)}, Area: ${area.toFixed(3)}`);

        // Prioritize larger area, potentially with a minimum confidence threshold?
        // Let's prioritize area for now. Add confidence check if needed: && (obj.score ?? 0) > 0.5
        if (area > largestArea ) {
          largestArea = area;
          largestObject = obj;
        }
      }

      if (largestObject) {
        primaryObjectName = largestObject.name?.toLowerCase() || 'unknown object';
        primaryObjectConfidence = largestObject.score ?? 0;
        console.log(`Selected largest object: ${primaryObjectName} (Area: ${largestArea.toFixed(3)}, Score: ${primaryObjectConfidence.toFixed(3)})`);
      } else {
         console.log('No suitable objects found after filtering.');
         // Fallback to highest confidence label if no suitable object found
         if (result.labelAnnotations && result.labelAnnotations.length > 0) {
             primaryObjectName = result.labelAnnotations[0].description?.toLowerCase() || 'unknown object';
             primaryObjectConfidence = result.labelAnnotations[0].score ?? 0;
             console.log(`No object selected, using top label instead: ${primaryObjectName}`);
         }
      }

    } else {
      console.log('No objects detected by OBJECT_LOCALIZATION.');
      // Fallback to highest confidence label
      if (result.labelAnnotations && result.labelAnnotations.length > 0) {
          primaryObjectName = result.labelAnnotations[0].description?.toLowerCase() || 'unknown object';
          primaryObjectConfidence = result.labelAnnotations[0].score ?? 0;
          console.log(`No object detected, using top label instead: ${primaryObjectName}`);
      }
    }

    // Prepare response payload (only object info for now)
     const responsePayload: { object: string; confidence: number } = {
        object: primaryObjectName,
        confidence: primaryObjectConfidence,
    };

    return Response.json(responsePayload);

  } catch (error) {
    console.error('Google Cloud Vision API error during request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    console.error('Underlying error message:', errorMessage);
    return Response.json({ error: `Failed to process image using Google Vision API.` }, { status: 500 });
  }
}






// import { ImageAnnotatorClient, protos } from '@google-cloud/vision';

// // Define an interface for the expected credentials structure
// interface ServiceAccountCredentials {
//   type: string;
//   project_id: string;
//   private_key_id: string;
//   private_key: string;
//   client_email: string;
//   client_id: string;
//   auth_uri: string;
//   token_uri: string;
//   auth_provider_x509_cert_url: string;
//   client_x509_cert_url: string;
//   universe_domain?: string; // Optional field
// }

// // --- Authentication Setup ---
// // Read the JSON credentials string from the environment variable
// const credentialsJsonString = process.env.GOOGLE_CREDENTIALS_JSON;
// // Explicitly type the credentials variable
// let credentials: ServiceAccountCredentials | undefined;

// // Try to parse the credentials ONLY if the environment variable exists
// if (credentialsJsonString) {
//   try {
//     // Parse the JSON string and assert it matches the defined type
//     credentials = JSON.parse(credentialsJsonString) as ServiceAccountCredentials;
//   } catch (e) {
//     console.error("CRITICAL: Failed to parse GOOGLE_CREDENTIALS_JSON. Check env variable format.", e);
//     credentials = undefined; // Set to undefined if parsing fails
//   }
// } else {
//   // Log an error if the crucial environment variable is missing
//   console.error("CRITICAL: GOOGLE_CREDENTIALS_JSON environment variable not set.");
//   credentials = undefined; // Ensure it's undefined
// }

// // Initialize client options: Pass credentials only if they were successfully parsed
// // Define the type for client options
// const clientOptions: { credentials?: ServiceAccountCredentials } = credentials ? { credentials } : {};
// const client = new ImageAnnotatorClient(clientOptions);

// // --- API Route Handler ---
// export async function POST(req: Request) {
//   // === IMPORTANT: Check if credentials actually loaded ===
//   // If 'credentials' object is still undefined here, it means setup failed.
//   if (!credentials) {
//      console.error("CRITICAL: Google Cloud credentials were not loaded successfully. Cannot call API.");
//      // Return an error immediately, don't try to call the API.
//      return Response.json({ error: 'Server configuration error: Missing or invalid credentials' }, { status: 500 });
//   }
//   // =======================================================

//   try {
//     const { image } = await req.json();

//     if (!image) {
//       console.log('API Error: No image provided in the request body.');
//       return Response.json({ error: 'No image provided' }, { status: 400 });
//     }

//     // Ensure image is a string before replacing
//     if (typeof image !== 'string') {
//         console.log('API Error: Image data is not a string.');
//         return Response.json({ error: 'Invalid image data format' }, { status: 400 });
//     }

//     // Remove the 'data:image/...;base64,' prefix
//     const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');

//     if (!base64Data) {
//         console.log('API Error: Base64 data is empty after removing prefix.');
//         return Response.json({ error: 'Invalid image data' }, { status: 400 });
//     }

//     // Prepare the request for the Vision API - Let TypeScript infer the type here
//     const request = {
//       image: {
//         content: base64Data,
//       },
//       features: [
//         // --- Feature Configuration ---
//         // Use the imported protos enum value for type safety
//         { type: protos.google.cloud.vision.v1.Feature.Type.OBJECT_LOCALIZATION, maxResults: 5 },
//         // Optional: Uncomment to request Text Detection (OCR)
//         // { type: protos.google.cloud.vision.v1.Feature.Type.TEXT_DETECTION, maxResults: 1 },
//         // Optional: Uncomment to request Label Detection
//         // { type: protos.google.cloud.vision.v1.Feature.Type.LABEL_DETECTION, maxResults: 5 },
//         // ---------------------------
//       ],
//     };

//     console.log('Sending request to Google Cloud Vision API...');
//     // Make the API call - TypeScript should now accept the inferred type
//     const [result] = await client.annotateImage(request);
//     console.log('Received response from Google Cloud Vision API.');

//     // --- Process Object Localization Results ---
//     const objects = result.localizedObjectAnnotations;
//     let primaryObjectName = 'unknown object';
//     let primaryObjectConfidence = 0;

//     if (objects && objects.length > 0) {
//       let bestObject = objects[0];
//       for (const obj of objects) {
//         const currentScore = obj.score ?? 0;
//         const bestScore = bestObject.score ?? 0;
//         if (currentScore > bestScore) {
//           bestObject = obj;
//         }
//       }
//       primaryObjectName = bestObject.name?.toLowerCase() || 'unknown object';
//       primaryObjectConfidence = bestObject.score ?? 0;
//       console.log(`Detected object: ${primaryObjectName} with confidence ${primaryObjectConfidence}`);
//     } else {
//       console.log('No specific objects detected by OBJECT_LOCALIZATION.');
//       // Optional: Fallback using labels if requested and available
//       const labelFeatureRequested = request.features?.some(f => f.type === protos.google.cloud.vision.v1.Feature.Type.LABEL_DETECTION);
//       if (labelFeatureRequested && result.labelAnnotations && result.labelAnnotations.length > 0) {
//           primaryObjectName = result.labelAnnotations[0].description?.toLowerCase() || 'unknown object';
//           primaryObjectConfidence = result.labelAnnotations[0].score ?? 0;
//           console.log(`No specific object, using top label instead: ${primaryObjectName}`);
//       }
//     }

//     // --- (Optional) Process Text Detection Results ---
//     let detectedText = '';
//     const textFeatureRequested = request.features?.some(f => f.type === protos.google.cloud.vision.v1.Feature.Type.TEXT_DETECTION);
//     if (textFeatureRequested && result.textAnnotations && result.textAnnotations.length > 0) {
//       detectedText = result.textAnnotations[0].description || '';
//       console.log(`Detected text: "${detectedText.substring(0, 50)}..."`);
//     } else if (textFeatureRequested) {
//       console.log('No text detected.');
//     }

//     // --- (Optional) Process Label Detection Results ---
//     let detectedLabels: string[] = [];
//     const labelFeatureRequestedForResponse = request.features?.some(f => f.type === protos.google.cloud.vision.v1.Feature.Type.LABEL_DETECTION);
//     if (labelFeatureRequestedForResponse && result.labelAnnotations && result.labelAnnotations.length > 0) {
//       detectedLabels = result.labelAnnotations.map(label => label.description?.toLowerCase() || '').filter(Boolean);
//       console.log(`Detected labels: ${detectedLabels.join(', ')}`);
//     } else if (labelFeatureRequestedForResponse) {
//       console.log('No labels detected.');
//     }

//     // --- Prepare Response ---
//     // Define the type for the response payload
//     interface ResponsePayload {
//         object: string;
//         confidence: number;
//         text?: string;
//         labels?: string[];
//     }

//     const responsePayload: ResponsePayload = {
//         object: primaryObjectName,
//         confidence: primaryObjectConfidence,
//     };

//     if (textFeatureRequested) {
//         responsePayload.text = detectedText;
//     }
//      if (labelFeatureRequestedForResponse) {
//         responsePayload.labels = detectedLabels;
//     }

//     return Response.json(responsePayload);

//   } catch (error) {
//     console.error('Google Cloud Vision API error during request:', error);
//     const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
//     console.error('Underlying error message:', errorMessage); // Log detailed error server-side
//     return Response.json({ error: `Failed to process image using Google Vision API.` }, { status: 500 });
//   }
// }








// // import { generateText } from "ai"

// // export async function POST(req: Request) {
// //   try {
// //     const { image } = await req.json()

// //     if (!image) {
// //       return Response.json({ error: "No image provided" }, { status: 400 })
// //     }

// //     // Convert base64 image to the format expected by AI SDK
// //     const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "")

// //     const { text } = await generateText({
// //       model: "openai/gpt-4o",
// //       messages: [
// //         {
// //           role: "user",
// //           content: [
// //             {
// //               type: "text",
// //               text: 'Identify the main object in this image. Respond with just the name of the object (e.g., "apple", "bottle of water", "smartphone"). Be specific but concise. If you cannot clearly identify an object, respond with "unknown object".',
// //             },
// //             {
// //               type: "image",
// //               image: base64Data,
// //             },
// //           ],
// //         },
// //       ],
// //       maxOutputTokens: 50,
// //       temperature: 0.1,
// //     })

// //     const objectName = text.trim().toLowerCase()

// //     return Response.json({
// //       object: objectName,
// //       confidence: 0.9, // Placeholder confidence score
// //     })
// //   } catch (error) {
// //     console.error("Object identification error:", error)
// //     return Response.json({ error: "Failed to identify object" }, { status: 500 })
// //   }
// // }
