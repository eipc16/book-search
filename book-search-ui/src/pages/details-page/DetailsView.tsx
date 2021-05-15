import React from "react";

import { Filter, SortDirection } from "@elastic/react-search-ui";
import { useEffect, useState } from "react";
import { runRequest } from '../search-page/helpers/requests';
import parse from 'html-react-parser';

import './styles.scss';

interface DetailsViewProps {
    current: number;
    filters?: Filter[];
    searchTerm?: string;
    sortDirection?: SortDirection;
    sortField?: string;
    id: string;
}

interface Book {
    date_issued: string;
    subjects: string[];
    language: string;
    id: number;
    type: string;
    title: string;
    num_downloads: number;
    content: string;
    authors: string[];
    _highlights?: {
        [field: string]: string[];
    }
}

const fixNewLines = (text: string) => {
    const new_lines_regexp_2 = /(\n){2}/g;
    const NEW_LINE_SEPARATOR_2 = "!_)@#*%@(#%@#&*(@#%_2";
    const content =  text
        .replaceAll(new_lines_regexp_2, NEW_LINE_SEPARATOR_2)
        .replaceAll("\n", "")
        .replaceAll(NEW_LINE_SEPARATOR_2, "\n\n\n");
    return content;
}

const replaceSnippets = (text: string, snippets: string[]) => {
    let finalText = text;
    snippets.forEach((snippet, i) => {
        const highlightWithAnchor = `<a class="content--snippet" name="snippet_${i}" id="snippet_${i}">${snippet}</a>`;
        finalText = finalText.replace(snippet, highlightWithAnchor)
    })
    return finalText;
}

const BookContentComponent = (book: Book) => {
    return (
        <div className='details--content'>
            <div className='details--header'>
                <h1 className='title'>{book.title}</h1>
                <h5 className='authors'>
                    <p className='authors--label'>Authors: </p>
                    <p className='authors--names'>
                        {book.authors.join(", ")}
                    </p>
                </h5>
            </div>
            <div className='details--book--text'>
                <pre>{parse(book?.content || "")}</pre>
            </div>
        </div>
    )
}

const DetailsView = (props: DetailsViewProps) => {
    const [fetchedBook, setFetchedBook] = useState<Book | undefined>();

    const { id } = props;

    useEffect(() => {
        runRequest({ ...props, id: id, disableAggregations: true, additionalFields: ["content"] })
            .then(fetchedJson => fetchedJson['hits']['hits'])
            .then(hits => hits[0])
            .then(hit => {
                return {
                    ...hit['_source'],
                    _highlights: hit['highlight']
                }
            })
            .then((book: Book) => {
                if (!book._highlights) {
                    return book;
                }
                const contentHighlights = book._highlights['content']
                    .map(highlight => highlight.replaceAll("<em>", "").replaceAll("</em>", ""));
                return {
                    ...book,
                    content: replaceSnippets(book.content, contentHighlights),
                    _highlights: {
                        ...book._highlights,
                        content: contentHighlights
                    }
                }
            })
            .then((fetchedBook) => setFetchedBook(fetchedBook))
    }, [props, id])

    return (
        <div className='details--view'>
            {
                fetchedBook ? (
                    // <pre>{ JSON.stringify({...fetchedBook, content:  fixNewLines(fetchedBook.content)}, null, 2)}</pre>
                    <BookContentComponent {...fetchedBook} content={fixNewLines(fetchedBook.content)} />
                ) : (
                    <div>No book with id: {id}</div>
                )
            }
        </div>
    )
}

export default DetailsView;