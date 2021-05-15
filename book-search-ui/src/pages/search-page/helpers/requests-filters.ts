import { FieldValue, Filter, FilterValueRange } from '@elastic/react-search-ui';
import { access } from 'node:fs';

import { aggregationsMap, Config } from '../configs/config';

const getTermFilterValue = (field: string, fieldValue: FieldValue, fieldName: string) => {
    if (fieldValue === "false" || fieldValue === "true") {
        return { [field]: fieldValue === "true" };
    }

    return { [fieldName]: fieldValue };
}

const getTermFilter = (filter: Filter, fieldName: string) => {
    if (filter.type === "any") {
        return {
            bool: {
                should: filter.values
                    .map(filterValue => filterValue as FieldValue)
                    .map((filterValue: FieldValue) => ({
                        term: getTermFilterValue(filter.field, filterValue, fieldName)
                    })),
                minimum_should_match: 1
            }
        };
    } else if (filter.type === "all") {
        return {
            bool: {
                filter: filter.values
                    .map(filterValue => filterValue as FieldValue)
                    .map((filterValue: FieldValue) => ({
                        term: getTermFilterValue(filter.field, filterValue, fieldName)
                    }))
            }
        };
    }
}

const getRangeFilter = (filter: Filter) => {
    if (filter.type === "any") {
        return {
            bool: {
                should: filter.values
                    .map(filterValue => filterValue as FilterValueRange)
                    .map((filterValue: FilterValueRange) => ({
                        range: {
                            [filter.field]: {
                                ...(filterValue.to && { lt: filterValue.to }),
                                ...(filterValue.from && { gt: filterValue.from })
                            }
                        }
                    })),
                minimum_should_match: 1
            }
        };
    } else if (filter.type === "all") {
        return {
            bool: {
                filter: filter.values
                    .map(filterValue => filterValue as FilterValueRange)
                    .map((filterValue: FilterValueRange) => ({
                        range: {
                            [filter.field]: {
                                ...(filterValue.to && { lt: filterValue.to }),
                                ...(filterValue.from && { gt: filterValue.from })
                            }
                        }
                    }))
            }
        };
    }
}

const buildRequestFilter = (filters: Filter[], config: Config) => {
    const filtersByName = filters.reduce((acc, filter) => ({ ...acc, [filter.field]: filter }), {} as { [field: string]: Filter });
    const filterNames = Object.keys(filtersByName);
    // console.log('[FILTERS_BY_NAME]', filterNames)
    const termAggregations = aggregationsMap.getTermAggregations()
        .filter(aggr => filterNames.includes(aggr.name))
        .map(aggr => getTermFilter(filtersByName[aggr.name], aggr.field))

    const rangeAggregations = aggregationsMap.getRangeAggregations()
        .filter(aggr => filterNames.includes(aggr.name))
        .map(aggr => getRangeFilter(filtersByName[aggr.name]))

    const reducedFilters = [...termAggregations, ...rangeAggregations]

    if (reducedFilters.length < 1) return;
    return reducedFilters;
};

export default buildRequestFilter;