import { Context } from "@elastic/react-search-ui";
import { runRequest } from "./requests";

const combineAggregationsFromResponses = (responses: any[]) => {
    return responses.reduce((acc: any, response: any) => {
        return {
            ...acc,
            ...response.aggregations
        };
    }, {} as object);
}

const removeFilterByName = (state: Context, facetName: string) => {
    return {
        ...state,
        filters: state.filters ? state.filters.filter(f => f.field !== facetName) : []
    };
}

const removeAllFacetsExcept = (body: any, facetName: string) => {
    return {
        ...body,
        aggs: {
            [facetName]: body.aggs[facetName]
        }
    };
}

const changeSizeToZero = (body: any) => {
    return {
        ...body,
        size: 0
    };
}


async function getDisjunctiveFacetCounts(state: Context, disunctiveFacetNames: string[]) {
    const responses = await Promise.all(
        // Note that this could be optimized by *not* executing a request
        // if not filter is currently applied for that field. Kept simple here for clarity.
        disunctiveFacetNames.map((facetName: string) => {
            let newState = removeFilterByName(state, facetName);
            return runRequest(newState, (body: object) => {
                const zeroSizedBody = changeSizeToZero(body);
                return removeAllFacetsExcept(zeroSizedBody, facetName);
            });
        })
    );
    return combineAggregationsFromResponses(responses);
}

export const applyDisjunctiveFaceting = async (
    json: any,
    state: Context,
    disunctiveFacetNames: string[]
) => {
    const disjunctiveFacetCounts = await getDisjunctiveFacetCounts(
        state,
        disunctiveFacetNames
    );

    return {
        ...json,
        aggregations: {
            ...json.aggregations,
            ...disjunctiveFacetCounts
        }
    };
}