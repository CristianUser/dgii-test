import { FastifyPluginAsync } from "fastify";
import { loadData } from "../../utils";

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/", async function (request, reply) {
    if (process.env.NODE_ENV === "production") {
      return { status: "ok", took: "0.0ms" };
    }
    const result = await loadData();

    return { status: result.status, took: `${result.took}ms` };
  });
};

export default example;
