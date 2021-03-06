import { gql } from "apollo-server-core";
import fs from "fs";
import path from "path";
import { FoodQuery, getFood } from "../helpers/usda-v1.js";

const __dirname = (() => {
    let path = new URL(".", import.meta.url).pathname;
    if (process.platform === "win32") {
        path = path.replace(new RegExp("^/", "g"), "");
    }
    return path;
})();

interface FoodArgs extends FoodQuery {
    fdcId?: number;
}

interface FoodsArgs extends FoodQuery {
    fdcIds?: number;
}

interface FoodSearchArgs extends FoodQuery {
    query?: string;
    brandOwner?: string;
}

export const typeDefs = gql(
    String(fs.readFileSync(path.resolve(__dirname, "../../schema.graphql")))
);
export const resolvers = {
    FoodItem: {
        __resolveType(obj: any) {
            return obj.type;
        }
    },
    Query: {
        async food(parent: undefined, args: FoodArgs) {
            return (await getFood({ fdcId: args.fdcId }, args))[0];
        },
        async foods(parent: undefined, args: FoodsArgs) {
            return await getFood({ fdcId: { $in: args.fdcIds } }, args);
        },
        async foodList(parent: undefined, args: FoodQuery) {
            return await getFood({}, args);
        },
        async foodSearch(parent: undefined, args: FoodSearchArgs) {
            const { query, brandOwner } = args;
            const opts: any = query
                ? { $text: { $search: query }, brandOwner }
                : {};
            if (!brandOwner) {
                delete opts.brandOwner;
            }
            return await getFood(opts, args);
        }
    }
};

export default {
    typeDefs,
    resolvers
};
