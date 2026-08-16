import fs from 'fs';
import path from 'path';

async function generateApk() {
  console.log("🚀 Requesting cloud APK build for https://pademco-loan-monitoring.vercel.app/ ...");
  
  try {
    const response = await fetch("https://backend.pwabuilder.com/api/apk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: "https://pademco-loan-monitoring.vercel.app/",
        name: "PADEMCO Loan",
        packageId: "com.pademco.loaner",
        version: "1.0.0",
        versionCode: 1,
        host: "pademco-loan-monitoring.vercel.app",
        display: "standalone"
      })
    });

    console.log("HTTP status:", response.status, response.statusText);
    const contentType = response.headers.get("content-type");
    console.log("Content-Type:", contentType);

    if (!response.ok) {
      const text = await response.text();
      console.log("Response:", text);
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const outputPath = path.join(process.cwd(), "pademco-loaner.apk");
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ SUCCESS! APK file created directly at: ${outputPath}`);
  } catch (err) {
    console.error("Error generating APK:", err);
  }
}

generateApk();
