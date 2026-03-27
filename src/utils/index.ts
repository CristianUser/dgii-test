import axios from "axios";
import Redis from "ioredis";
import JSZip from "jszip";

const redis = new Redis(process.env.REDIS_URL as string);

export async function downloadAndProcessZip(
  url: string,
  processLine: (line: string) => void,
) {
  try {
    // Step 1: Download the ZIP file from the URL
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const zipData = response.data;

    // Step 2: Unzip the file
    const zip = await JSZip.loadAsync(zipData);

    // Step 3: Find the .csv file (it's the only one, name varies)
    const csvFile = Object.keys(zip.files).find((name) =>
      name.toLowerCase().endsWith(".csv"),
    );

    if (!csvFile) {
      throw new Error("No CSV file found in the ZIP archive");
    }

    // Step 4: Read the .csv file content from the ZIP
    // Using uint8array and TextDecoder to handle Spanish special characters (ISO-8859-1 / Windows-1252)
    const uint8Array = await zip.files[csvFile].async("uint8array");
    const decoder = new TextDecoder("windows-1252");
    const fileContent = decoder.decode(uint8Array);

    // Step 5: Process each line of the .csv file
    const lines = fileContent.split("\n");
    await Promise.all(lines.map(processLine));

    console.log("File processed successfully!");
  } catch (error) {
    console.error("Error processing the ZIP file:", error);
  }
}

export async function loadData() {
  console.info("🔄 Started Loading Content");
  const startTime = Date.now();
  let counter = 0;
  // Example usage:
  try {
    await downloadAndProcessZip(
      "https://dgii.gov.do/app/WebApps/Consultas/RNC/RNC_CONTRIBUYENTES.zip",
      async (line: string) => {
        if (line && !line.startsWith("RNC")) {
          // Skip header
          // Robust CSV line parser that handles commas inside quotes
          const values: string[] = [];
          let current = "";
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              values.push(current);
              current = "";
            } else {
              current += char;
            }
          }
          values.push(current);

          if (values.length < 6) return; // Basic validation

          const [rnc, name, activity, foundationDate, status, regime] = values;

          const parsedData = {
            rnc,
            name: name
              .split(" ")
              .filter((word) => word)
              .join(" "),
            commercialName: "", // CSV doesn't seem to have this now, or it's same as name
            foundationDate,
            activity,
            status,
            regime: regime.replace("\r", ""),
          };

          await redis.set(rnc, JSON.stringify(parsedData));
          counter++;
        }
      },
    );
  } catch (error: any) {
    console.error(error.message);
    return {
      status: "error",
    };
  }

  const endTime = Date.now();
  const took = endTime - startTime;
  console.log(`✅ Loaded ${counter} entries in ${took}ms`);

  return {
    status: "ok",
    took,
  };
}
