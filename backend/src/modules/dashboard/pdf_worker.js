import fs from "fs";
import puppeteer from "puppeteer";

async function generatePDF() {
  const htmlPath = process.argv[2];
  if (!htmlPath) {
    console.error("Missing HTML file path argument");
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, "utf8");

  const browser = await puppeteer.launch({
    headless: "shell",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
    
    // Write PDF binary directly to stdout
    process.stdout.write(pdfBuffer);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generatePDF();
