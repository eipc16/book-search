import { aggregationsMap, config } from '../configs/config';

const getValueFacet = (aggregations: any, fieldName: string) => {
    if (
        aggregations &&
        aggregations[fieldName] &&
        aggregations[fieldName].buckets &&
        aggregations[fieldName].buckets.length > 0
    ) {
        return [
            {
                field: fieldName,
                type: "value",
                data: aggregations[fieldName].buckets.map((bucket: any) => ({
                    // Boolean values and date values require using `key_as_string`
                    value: bucket.key_as_string || bucket.key,
                    count: bucket.doc_count
                }))
            }
        ];
    }
}

const getRangeFacet = (aggregations: any, fieldName: string) => {
    if (
        aggregations &&
        aggregations[fieldName] &&
        aggregations[fieldName].buckets &&
        aggregations[fieldName].buckets.length > 0
    ) {
        return [
            {
                field: fieldName,
                type: "range",
                data: aggregations[fieldName].buckets.map((bucket: any) => ({
                    // Boolean values and date values require using `key_as_string`
                    value: {
                        to: bucket.to,
                        from: bucket.from,
                        name: bucket.key
                    },
                    count: bucket.doc_count
                }))
            }
        ];
    }
}

const buildStateFacets = (aggregations: any) => {

    const termFacets = aggregationsMap.getTermAggregations()
        .map(aggr => {
            return {
                name: aggr,
                value: getValueFacet(aggregations, aggr.name)
            }
        })
        .filter(aggr => aggr.value !== undefined && aggr.value !== null)
        .reduce((acc, facet) => {
            return {
                ...acc,
                [facet.name.name]: facet.value
            }
        }, {})

    const rangeFacets = aggregationsMap.getRangeAggregations()
        .map(aggr => {
            return {
                name: aggr,
                value: getRangeFacet(aggregations, aggr.name)
            }
        })
        .filter(aggr => aggr.value !== undefined && aggr.value !== null)
        .reduce((acc, facet) => {
            return {
                ...acc,
                [facet.name.name]: facet.value
            }
        }, {})

    const facets = { ...termFacets, ...rangeFacets }
    if (Object.keys(facets).length > 0) {
        return facets;
    }
}

function buildTotalPages(totalResults: number, resultsPerPage?: number) {
    if (!resultsPerPage) return 0;
    if (totalResults === 0) return 1;
    return Math.ceil(totalResults / resultsPerPage);
}

function buildTotalResults(hits: any) {
    return hits.total.value;
}

function getHighlight(hit: any, fieldName: string) {
    if (
        !hit.highlight ||
        !hit.highlight[fieldName] ||
        hit.highlight[fieldName].length < 1
    ) {
        return;
    }

    return hit.highlight[fieldName][0];
}

function buildResults(hits: any) {
    const toObject = (value: any, snippet: any) => {
        return { raw: value, ...(snippet && { snippet }) };
    };

    const results = hits.map((record: any) => {
        return Object.entries(record._source)
            .map(([fieldName, fieldValue]) => [
                fieldName,
                toObject(fieldValue, getHighlight(record, fieldName))
            ])
            .reduce((acc: any, obj: any[]) => {
                const [key, value] = obj;
                return {
                    ...acc,
                    [key]: value
                }
            }, {});
    });

    console.log('[RESULTS - WITHOUT SNIPPETS]: ', results, hits)

    const highlightFields = Object.keys(config.highlight.fields);
    const snippets = hits.map((record: any) => {
        if (!Object.keys(record).includes('highlight')) {
            return highlightFields.reduce((acc, field) => ({...acc, [field]: []}), {})
        }
        return Object.entries(record.highlight)
            .filter(([fieldName, snippets]) => highlightFields.includes(fieldName))
            .map(([fieldName, fieldValue]) => ({
                name: fieldName,
                snippets: fieldValue
            } as {name: string, snippets: string[]}))
            .reduce((acc: any, obj: { name: string, snippets: string[] }) => {
                const { name, snippets } = obj;
                return {
                    ...acc,
                    [name]: snippets
                }
            }, {});
    })

    console.log('[RESSULTS & SNIPPETS]: ', results, snippets)

    return results.map((result: any, i: number) => {
        return {
            ...result,
            _snippets: snippets[i]
        }
    })
}

export const buildState = (response: any, resultsPerPage?: number) => {

    const results = buildResults(response.hits.hits);
    const totalResults = buildTotalResults(response.hits);
    const totalPages = buildTotalPages(totalResults, resultsPerPage);
    const facets = buildStateFacets(response.aggregations);

    return {
        results,
        totalPages,
        totalResults,
        ...(facets && { facets })
    };
}