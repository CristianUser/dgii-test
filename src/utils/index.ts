import axios from "axios";
import Redis from "ioredis";
import JSZip from "jszip";

const redis = new Redis(process.env.REDIS_URL as string);

export async function downloadAndProcessZip(
  url: string,
  processLine: (line: string) => void
) {
  try {
    // Step 1: Download the ZIP file from the URL
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const zipData = response.data;

    // Step 2: Unzip the file
    const zip = await JSZip.loadAsync(zipData);

    const txtFile = "TMP/DGII_RNC.TXT";

    // Step 3: Read the .txt file content from the ZIP
    const fileContent = await zip.files[txtFile].async("string");

    // Step 4: Process each line of the .txt file
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
      "https://dgii.gov.do/app/WebApps/Consultas/RNC/DGII_RNC.zip",
      async (line: string) => {
        if (line) {
          const [
            rnc,
            name = "",
            commercialName,
            activity,
            ,
            ,
            ,
            ,
            foundationDate,
            status,
            regime = "",
          ] = line.split("|");
          const parsedData = {
            rnc,
            name: name
              .split(" ")
              .filter((word) => word)
              .join(" "),
            commercialName,
            foundationDate,
            activity,
            status,
            regime: regime.replace("\r", ""),
          };

          await redis.set(rnc, JSON.stringify(parsedData));
          counter++;
        }
      }
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
