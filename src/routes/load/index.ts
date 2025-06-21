import { FastifyPluginAsync } from "fastify";
import { downloadAndProcessZip } from "../../utils";
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL as string);

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/", async function (request, reply) {

    const startTime = Date.now();
    // Example usage:
    await downloadAndProcessZip(
      "https://dgii.gov.do/app/WebApps/Consultas/RNC/DGII_RNC.zip",
      async (line: string) => {
        const [
          rnc,
          name,
          commercialName,
          activity,
          ,
          ,
          ,
          ,
          foundationDate,
          status,
          regime,
        ] = line.split("|");
        const parsedData = {
          rnc,
          name,
          commercialName,
          foundationDate,
          activity,
          status,
          regime: regime.replace("\r", ""),
        };

        await redis.set(rnc, JSON.stringify(parsedData));
      }
    );

    const endTime = Date.now();
    const took = endTime - startTime;

    return { status: "ok", took: `${took}ms` };
  });
};

export default example;
