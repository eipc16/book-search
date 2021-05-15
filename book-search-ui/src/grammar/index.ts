import types from './types';

const Query = require('./final_query');

const parseQuery = (provided_query: string): object => {
    if (typeof provided_query !== 'string') {
        throw new Error('Query must be a string');
    }
    const conditionTree = Query.parse(provided_query, { types });
    return types.Value.simplify(conditionTree.reduce(), {});
}

const composeObject = (currentObject: object, subResult: any): object => {
    if (!Array.isArray(subResult)) {
        return currentObject;
    }
    const [type, ...rest] = subResult;

    switch (type) {
        case 'Value':
        case 'Text':
            return {
                multi_match: {
                    query: subResult[1],
                    fields: ["title^3", "content"],
                    type: "cross_fields"
                }
            }
        case 'Or':
            if (rest !== null && rest.length === 1 && rest[0] !== null && rest[0].length === 1) {
                return composeObject(currentObject, rest[0][0]);
            }

            const nonTextQueries = subResult[1]
                .filter((value: any[]) => value[0] !== 'Text')
                .map((value: any) => composeObject(currentObject, value));

            let queries = [...nonTextQueries]

            const textQueries: any[] = subResult[1].filter((value: any[]) => value[0] === 'Text');

            if (textQueries.length > 0) {
                queries = [
                    ...queries,
                    {
                        multi_match: {
                            query: textQueries.map(value => value[1]).join(" "),
                            fields: ["title^3", "content"],
                            type: "cross_fields"
                        }
                    }
                ]
            }

            return {
                bool: {
                    should: queries
                }
            }
        case 'And':
            return {
                bool: {
                    must: subResult[1].map((value: any) => composeObject(currentObject, value))
                }
            }
        case 'Pair':
            if (subResult[2][0] === 'Text') {
                return {
                    match: {
                        [subResult[1]]: subResult[2][1]
                    }
                }
            } else if (subResult[2][0] === 'Exactly') {
                return {
                    match_phrase: {
                        [subResult[1]]: subResult[2][1]
                    }
                }
            }
            return {
                match: {
                    [subResult[1]]: composeObject(currentObject, subResult[2])
                }
            }
        case 'Group':
            return composeObject(currentObject, subResult[1])
        case 'Excluding':
            return {
                bool: {
                    must_not: composeObject(currentObject, subResult[1])
                }
            }
        case 'Exactly':
            return {
                bool: {
                    should: [
                        {
                            match_phrase: {
                                title: subResult[1]
                            }
                        },
                        {
                            match_phrase: {
                                content: subResult[1]
                            }
                        }
                    ]
                }
            }
        default:
            return subResult;
    }
}

const getQueryFromString = (provided_query: string) => {
    return {
        query: composeObject({}, parseQuery(provided_query))
    }
}

export default getQueryFromString;