import { SortOption, FilterType } from "@elastic/react-search-ui";

export interface Aggregation {
    name?: string;
    field: string;
    type: string;
    label: string;
}

export interface TermAggregation extends Aggregation {
    type: 'TermAggregation';
    size?: number;
    isFilterable?: boolean;
    filterType?: FilterType;
}

export interface Range {
    from: number;
    to?: number;
    label: string;
}

export interface RangeAggregation extends Aggregation {
    type: 'RangeAggregation';
    ranges: Range[];
}

export interface Highlight {
    fragment_size: number;
    number_of_fragments: number;
    fields: {
        [field: string]: object;
    }
}

export interface Config {
    matchFields: string[];
    fetchFields: string[];
    highlight: Highlight;
    aggregations?: Aggregation[];
    sortOptions: SortOption[];
}

export const config: Config = {
    matchFields: ["title", "content"],
    fetchFields: ["id", "title", "language", "authors", "num_downloads", "type", "date_issued", "subjects"],
    highlight: {
        fragment_size: 400,
        number_of_fragments: 1,
        fields: {
            content: { 
                fragment_size: 400, 
                boundary_max_scan: 400,
                number_of_fragments: 3, 
                boundary_chars: "a",
                order: "score",
                options: {
                    "return_offset": true
                }
            }
            // content: {}
        }
    },
    sortOptions: [
        {
            name: "Relevance",
            value: "",
            direction: ""
        },
        {
            name: "Date Issued (Ascending)",
            value: "date_issued",
            direction: "asc"
        },
        {
            name: "Date Issued (Descending)",
            value: "date_issued",
            direction: "desc"
        },
        {
            name: "Number of Downloads (Ascending)",
            value: "num_downloads",
            direction: "asc"
        },
        {
            name: "Number of Downloads (Descending)",
            value: "num_downloads",
            direction: "desc"
        },
        {
            name: "Title (Ascending)",
            value: "title.raw",
            direction: "asc"
        },
        {
            name: "Title (Descending)",
            value: "title.raw",
            direction: "desc"
        }
    ],
    aggregations: [
        {
            type: 'TermAggregation',
            name: 'authors',
            field: 'authors.raw',
            isFilterable: true,
            filterType: "all",
            label: 'Author',
            size: 1000000
        } as TermAggregation,
        {
            type: 'TermAggregation',
            name: 'subjects',
            field: 'subjects.raw',
            isFilterable: true,
            filterType: "all",
            label: 'Subject',
            size: 1000000
        } as TermAggregation,
        {
            type: 'TermAggregation',
            name: 'type',
            field: 'type.raw',
            label: 'Type'
        } as TermAggregation,
        {
            type: 'TermAggregation',
            name: 'language',
            field: 'language',
            label: 'Language',
            size: 1000000
        } as TermAggregation,
        {
            type: 'RangeAggregation',
            field: 'num_downloads',
            label: 'Number of Downloads',
            ranges: [
                {
                    from: 0,
                    to: 9,
                    label: '0-9'
                },
                {
                    from: 10,
                    to: 49,
                    label: '10-49'
                },
                {
                    from: 50,
                    to: 99,
                    label: '50-99'
                },
                {
                    from: 100,
                    to: 249,
                    label: '100-249'
                },
                {
                    from: 250,
                    to: 499,
                    label: '250-499'
                },
                {
                    from: 500,
                    label: '500+'
                }
            ]
        } as RangeAggregation
    ]
};

interface AggregationMapEntry {
    name: string;
    field: string
}

interface AggregationMap {
    [aggregationType: string]: AggregationMapEntry[];
}

const getAggregationNamesByType = (config: Config) => {
    const { aggregations } = config;

    if (!aggregations) {
        return {} as AggregationMap;
    }

    return aggregations.reduce((acc, filter) => {
        if (Object.keys(acc).includes(filter.type)) {
            return {
                ...acc,
                [filter.type]: [
                    ...acc[filter.type],
                    {
                        name: filter.name ? filter.name : filter.field,
                        field: filter.field
                    }
                ]
            }
        }
        return {
            ...acc,
            [filter.type]: [{
                name: filter.name ? filter.name : filter.field,
                field: filter.field
            }]
        }
    }, {} as AggregationMap);
}

const getAggregations = (config: Config) => {
    const aggregationsByName = getAggregationNamesByType(config);
    const termAggregationKey = 'TermAggregation';
    const rangeAggregation = 'RangeAggregation';
    const keys = Object.keys(aggregationsByName);

    const termAggregations = keys.includes(termAggregationKey) ? aggregationsByName[termAggregationKey] : [];
    const rangeAggregations = keys.includes(rangeAggregation) ? aggregationsByName[rangeAggregation] : [];

    return {
        getTermAggregations: () => termAggregations,
        getRangeAggregations: () => rangeAggregations,
    }
}

export const aggregationsMap = getAggregations(config);



/*
@TODO: RAW QUERY FOR DETAILS


{
    "highlight": {
        "fragment_size": 200,
        "number_of_fragments": 1,
        "fields": {
            "content": {
                "fragment_size": 200,
                "boundary_max_scan": 200,
                "number_of_fragments": 3,
                "boundary_chars": "a",
                "order": "score",
                "options": {
                    "return_offset": true
                }
            }
        }
    },
    "_source": [
        "id",
        "title",
        "language",
        "authors",
        "num_downloads",
        "type",
        "date_issued",
        "content"
    ],
    "query": {
        "bool": {
            "must": [
                {
                    "match": {
                        "id": 3762
                    }
                },
                {
                    "match": {
                        "content": "\"black cat\""
                    }
                }
            ]
        }
    }
}

*/