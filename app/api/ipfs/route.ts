import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const json = formData.get("json") as string | null;

    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_SECRET_KEY;

    if (!pinataApiKey || !pinataSecretKey) {
      return NextResponse.json(
        { error: "Pinata keys missing" },
        { status: 500 },
      );
    }

    let response;

    // Handle File Upload (for the encrypted code)
    if (file) {
      const data = new FormData();
      data.append("file", file);

      response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey,
        },
        body: data,
      });
    }
    // Handle JSON Upload (for the metadata)
    else if (json) {
      response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey,
        },
        body: json,
      });
    } else {
      return NextResponse.json(
        { error: "No file or json provided" },
        { status: 400 },
      );
    }

    // check for Pinata API errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return NextResponse.json({ cid: result.IpfsHash });
  } catch (error) {
    console.error("IPFS Upload Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
