import { FastifyPluginAsync } from "fastify";
import { loadData } from "../../utils";

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/", async function (request, reply) {

    const result = await loadData()

    return { status: result.status, took: `${result.took}ms` };
  });
};

export default example;
