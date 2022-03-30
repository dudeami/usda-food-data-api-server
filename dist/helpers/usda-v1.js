import mongoose from "mongoose";
import { populateAll, sanitize } from "./dbhelper.js";
/**
 * Key are USDA API `dataType` values, values are the corresponding Schema
 */
const translation = {
    Foundation: "FoundationFoodItem",
    "SR Legacy": "SRLegacyFoodItem",
    Branded: "BrandedFoodItem",
    Survey: "SurveyFoodItem"
};
const rootFoodTypes = Object.values(translation);
/**
 * Given an nutrients api query argument, filters the nutrients returned
 * to the given nutrient IDs.
 * @param doc The document to be filtered
 * @param nutrients
 * @returns
 */
function cleanNutrients(doc, nutrients) {
    if (doc.foodNutrients && nutrients.length > 0) {
        const set = new Set(nutrients);
        const filtered = [];
        for (let n in doc.foodNutrients) {
            let fn = doc.foodNutrients[n];
            if (set.has(fn.nutrient.id)) {
                filtered.push(doc.foodNutrients[n]);
            }
        }
        doc.foodNutrients = filtered;
        return doc;
    }
    else {
        return doc;
    }
}
/**
 * Given a dataType api query argument, returns the Schemas to use for search.
 * @param dataType dataType api query argument
 * @returns A list of Schema to use for this query
 */
function getFoodTypes(dataType) {
    dataType = dataType.filter((str) => str.trim().length > 0);
    if (dataType.length === 0) {
        return rootFoodTypes;
    }
    const foodTypes = [];
    dataType.forEach((str) => {
        if (translation[str]) {
            foodTypes.push(translation[str]);
        }
    });
    return foodTypes;
}
/**
 * A DefinedFoodQuery defining the API query defaults
 */
export const defaultFoodQuery = {
    format: "json",
    dataType: Object.keys(translation),
    nutrients: [],
    sortBy: "_id",
    sortOrder: "desc",
    pageSize: 50,
    pageNumber: 0
};
/**
 * Given a MongoDB filter and API query arguments, finds the items requested.
 *
 * @param filter A valid MongoDB filter
 * @param query The API Query arguments
 * @returns
 */
export async function getFood(filter, query = {}) {
    const results = [];
    const filterNutrients = query.nutrients;
    const foodTypes = getFoodTypes(query.dataType || []);
    const options = { ...defaultFoodQuery, ...query };
    for (let f in foodTypes) {
        const model = mongoose.model(foodTypes[f]);
        const sort = options.sortOrder.toLowerCase() === "asc";
        const docs = await model.find(filter, {}, {
            sort: {
                [options.sortBy]: sort ? 1 : -1
            },
            limit: options.pageSize,
            skip: Math.max(0, options.pageNumber) * options.pageSize
        });
        let tmp = await Promise.all(docs.map(async (doc) => {
            await populateAll(doc, model);
            let json = sanitize(doc.toJSON());
            if (filterNutrients) {
                json = cleanNutrients(json, query.nutrients || []);
            }
            json.type = foodTypes[f];
            return json;
        }));
        tmp.forEach((t) => results.push(t));
    }
    return results;
}
//# sourceMappingURL=usda-v1.js.map