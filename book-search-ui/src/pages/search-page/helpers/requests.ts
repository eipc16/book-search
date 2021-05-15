import { Filter, SortDirection } from "@elastic/react-search-ui";
import { request } from "node:http";
import getQueryFromString from "../../../grammar";

import config, { Aggregation } from '../configs';
import { TermAggregation, RangeAggregation } from '../configs/config';
import buildRequestFilter from "./requests-filters";

const buildFrom = (current?: number, resultsPerPage?: number) => {
    if (!current || !resultsPerPage) return;
    return (current - 1) * resultsPerPage;
};

const buildSort = (sortField?: string, sortDirection?: SortDirection) => {
    if (sortDirection && sortField) {
        return [{ [sortField]: sortDirection }];
    }
};

const buildMust = (fields: string[], searchTerm?: string, id?: string | number) => {
    if (!searchTerm && !id) {
        return { match_all: {} };
    }

    let must = [] as any[];

    if (searchTerm) {
        must = [
            ...must,
            getQueryFromString(searchTerm).query
        ] 
    }

    if (id) {
        must = [
            ...must,
            {
                match: {
                    id: id
                }
            }
        ]
    }

    return must
};

interface Request {
    current?: number;
    filters?: Filter[];
    resultsPerPage?: number;
    searchTerm?: string;
    sortDirection?: SortDirection;
    sortField?: string;
    id?: string | number;
    disableAggregations?: boolean;
    additionalFields?: string[];
}

const mapAggregation = (aggregation: Aggregation) => {
    switch (aggregation.type) {
        case 'TermAggregation':
            const termAggregation = aggregation as TermAggregation;

            if (!termAggregation.size || termAggregation.size === null) {
                return {
                    terms: {
                        field: termAggregation.field
                    }
                }
            }

            return {
                terms: {
                    field: termAggregation.field,
                    size: termAggregation.size || null
                }
            }
        case 'RangeAggregation':
            const rangeAggregation = aggregation as RangeAggregation;
            return {
                range: {
                    field: rangeAggregation.field,
                    ranges: rangeAggregation.ranges.map(range => ({
                        from: range.from,
                        to: range.to,
                        key: range.label
                    }))
                }
            }
        default:
            return null
    }
}

const mapAggregations = (aggregations: Aggregation[]) => {
    let result = {};
    aggregations.forEach(aggregation => {
        const key = aggregation.name ? aggregation.name : aggregation.field;
        const mappedAggregation = mapAggregation(aggregation);
        if (mappedAggregation !== null) {
            result = {
                ...result,
                [key]: mappedAggregation
            }
        }
    })
    return result;
}

const buildRequest = (request: Request) => {

    const { current, resultsPerPage, filters, searchTerm, sortDirection, sortField, id, disableAggregations, additionalFields } = request;
    const { highlight, fetchFields, aggregations, matchFields } = config;

    console.log('[REQUEST_BUILD] - Start')

    const sort = buildSort(sortField, sortDirection);
    const mustCondition = buildMust(matchFields, searchTerm, id);
    const size = resultsPerPage;
    const from = buildFrom(current, resultsPerPage);
    const filter = filters && buildRequestFilter(filters, config);

    console.log('[REQUEST_BUILD] - Calc Sort & Match & Size & From & Filter', aggregations);

    const body = {
        highlight: highlight,
        _source: additionalFields ? [...fetchFields, ...additionalFields] : fetchFields,
        query: {
            bool: {
                must: mustCondition,
                ...(filter && { filter })
            }
        },
        ...(sort && { sort }),
        ...(size && { size }),
        ...(from && { from }),
    }

    if (aggregations && !disableAggregations) {
        const bodyWithAggregations = {
            ...body,
            aggs: mapAggregations(aggregations)
        }
        console.log('[REQUEST_BUILD]: Body: "', bodyWithAggregations)
        return bodyWithAggregations;
    }
    return body;
}

export const runRequest = async (request: Request, transformBodyBeforeRequest?: (body: object) => object) => {
    const response = await fetch('/engine/books/_search', {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(transformBodyBeforeRequest ? transformBodyBeforeRequest(buildRequest(request)) : buildRequest(request))
    });
    return response.json();
};