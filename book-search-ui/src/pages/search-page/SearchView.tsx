import React, { useEffect, useState } from "react";

import { Link } from "react-router-dom";
import { HashLink } from 'react-router-hash-link';

import { ErrorBoundary, Facet, Paging, PagingInfo, ResultsPerPage, ResultT, SearchBox, SearchProvider, Sorting, WithSearch, Context, FilterType } from '@elastic/react-search-ui';
import { Layout } from "@elastic/react-search-ui-views";
import parse from "html-react-parser";
import Button from "@material-ui/core/Button";
import BookIcon from '@material-ui/icons/Book';
import LaunchIcon from '@material-ui/icons/Launch';

import config, { Aggregation } from './configs';

import "@elastic/react-search-ui-views/lib/styles/styles.css";
import { TermAggregation, RangeAggregation } from './configs/config';

import './styles.scss';
import { LinearProgress } from "@material-ui/core";

const SearchViewHeader = () => {
  return <div />
}

const CustomFacet = (aggregation: Aggregation) => {

  switch (aggregation.type) {
    case 'TermAggregation':
      const termAggr = aggregation as TermAggregation;
      return <Facet
        field={termAggr.name || termAggr.field}
        label={termAggr.label}
        filterType={termAggr.filterType || "any"}
        isFilterable={termAggr.isFilterable || false}
      />
    case 'RangeAggregation':
      const rangeAggr = aggregation as RangeAggregation;
      return <Facet
        field={rangeAggr.name || rangeAggr.field}
        label={rangeAggr.label}
        filterType="any"
      />
    default:
      return <div />
  }
}

const CustomFacets = (props: { aggregations: Aggregation[] }) => {
  const { aggregations } = props;
  return (
    <React.Fragment>
      { aggregations.map((aggr, i) => <CustomFacet {...aggr} />)}
    </React.Fragment>
  )
}

const SearchViewSideContent = (props: { wasSearched: boolean }) => {

  return (
    <div className='search--view--side--content'>
      <Sorting
        label={"Sort by"}
        sortOptions={config.sortOptions}
      />
      <CustomFacets aggregations={config.aggregations || []} />
    </div>
  )
}

interface BookData {
  date_issued: string;
  language: string;
  id: number;
  type: string;
  title: string;
  subjects: string[];
  num_downloads: number;
  authors: string[];
  _snippets: string[];
}

const RefrenceInfoLink = (props: { filterName: string, value: string, className: string, key?: number, filterType: FilterType }) => {
  const { className, value, filterName, key, filterType } = props;
  return (
    <a key={key}
      className={`${className} entry--element--refrence`}
      href={`?filters[0][field]=${filterName}&filters[0][values][0]=${value}&filters[0][type]=${filterType}`}>
      <span className='entry--element--refrence--container'>{value}</span>
    </a>
  )
}

interface SearchViewResultEntrySnippetProps {
  bookId: number;
  text: string;
  snippetKey: string;
}

const SearchViewResultEntrySnippet = (props: SearchViewResultEntrySnippetProps) => {
  const { snippetKey, text, bookId } = props;
  return (
    <div key={snippetKey} className='snippet'>
      <p className='snippet--content'>
        {parse(text)}
      </p>
      <HashLink
        className='snippet--launch--btn'
        to={`/details/${bookId}#${snippetKey}`}
      >
        <Button
          endIcon={<LaunchIcon />}
          style={{ color: 'gray' }}
        />
      </HashLink>
    </div>
  )
}

const SearchViewResultEntry = (props: ({ key: number, bookData: BookData })) => {
  const { key, bookData } = props;
  const { id, title, language, num_downloads, type, authors, subjects, _snippets } = bookData;



  return (
    <div className='book--result--entry' key={key}>
      <div className='entry--header'>
        <p className='title'>{title}</p>
        <span className='authors'>
          <p className='label'>Authors: </p>
          <span className='authors--inner'>
            {
              authors.map((author, i) => (
                <RefrenceInfoLink filterName='authors' value={author} key={i} className={`entry--authors ${i === authors.length - 1 ? 'last' : ''}`} filterType='all' />
              ))
            }
          </span>
        </span>
        <span className='subjects'>
          <p className='label'>Subjects: </p>
          <span className='subjects--inner'>
            {
              subjects.map((subject, i) => (
                <RefrenceInfoLink filterName='subjects' value={subject} key={i} className={`entry--subjects ${i === subjects.length - 1 ? 'last' : ''}`} filterType='all' />
              ))
            }
          </span>
        </span>
        <div className='read--button'>
          <Link
            className='read--button-btn'
            to={`/details/${id}`}
          >
            <Button
              endIcon={<BookIcon />}
              style={{ color: 'gray' }}
            >
              Read
          </Button>
          </Link>
        </div>
      </div>
      {
        _snippets.length > 0 && (
          <div className='entry--snippets'>
            <p className='label'>Occurences: </p>
            {
              _snippets.map((snippet, key) => {
                const sKey = `snippet_${key}`
                return <SearchViewResultEntrySnippet snippetKey={sKey} text={snippet} bookId={id} />
              })
            }
          </div>
        )
      }
      <div className='entry--footer'>
        <div className='language'>
          <p className='label'>Language: </p>
          <RefrenceInfoLink filterName='language' value={language} className='entry--language entry' filterType='any' />
        </div>
        <div className='type'>
          <p className='label'>Type: </p>
          <RefrenceInfoLink filterName='type' value={type} className='entry--type entry' filterType='any' />
        </div>
        <div className='num_downloads'>
          <p className='label'>Downloads: </p>
          <p className='entry--num_downloads entry'>{num_downloads}</p>
        </div>
      </div>
    </div>
  )
}

const SearchViewBodyContent = (props: { isLoading: boolean, results: ResultT[] }) => {
  const { results, isLoading } = props;
  const [bookData, setBookData] = useState<any[]>([]);

  useEffect(() => {
    const mappedResults = results.map(result => {
      if (!result || result === null) {
        return null;
      }
      return Object.keys(result).reduce((acc, key) => {
        if (result[key] !== null) {
          const keys = Object.keys(result[key]);
          if (keys.includes("raw")) {
            return {
              ...acc,
              [key]: result[key]['raw']
            }
          } else if (keys.includes('content')) {
            return {
              ...acc,
              [key]: (result[key] as any)['content']
            }
          }
        }
        return {
          ...acc,
          [key]: result[key]
        }
      }, {});
    })
      .filter(result => result !== null)
    setBookData(mappedResults);
  }, [results])

  return (
    <ErrorBoundary>
      <div className='results--container'>
        <React.Fragment>
          {isLoading && <LinearProgress /> }
        </React.Fragment>
        <div className='results--container--loaded--results'>
          {
            bookData
              .map(result => (result as any) as BookData)
              .map((result, i) => (<SearchViewResultEntry key={i} bookData={result} />))
          }
        </div>
      </div>
    </ErrorBoundary>
  )
}

const SearchViewBodyHeader = (props: { wasSearched: boolean }) => {
  const { wasSearched } = props;

  return (
    <React.Fragment>
      <div className='search--view--body--header'>
        <div className='searchbox--container'>
          <SearchBox />
        </div>
        <div className='paging--info'>
          {wasSearched && <PagingInfo />}
          {wasSearched && <ResultsPerPage />}
        </div>
      </div>
    </React.Fragment>
  )
}

const SearchViewBodyFooter = () => {
  return <Paging />
}

interface SearchViewInnerProps {
  wasSearched: boolean;
  results: ResultT[];
  isLoading: boolean;
}

const SearchViewInner = (props: SearchViewInnerProps) => {

  const { wasSearched, results, isLoading } = props;

  return (
    <div className='search--view--component'>
      <Layout
        header={<SearchViewHeader />}
        sideContent={<SearchViewSideContent wasSearched={wasSearched} />}
        bodyContent={<SearchViewBodyContent isLoading={isLoading} results={results} />}
        bodyHeader={<SearchViewBodyHeader wasSearched={wasSearched} />}
        bodyFooter={<SearchViewBodyFooter />}
      />
    </div>
  )
}

type SearchConfig = Required<{ onSearch: (context: Context) => Promise<object> }>

interface SearchViewProps {
  config: SearchConfig;
}

export const SearchViewWithContext = (context: Context, onFirstLoad: (context: Context) => void) => {
  const { isLoading, wasSearched, results } = context;

  // useEffect(() => {
  //   onFirstLoad(context);
  // }, []);

  return (
    <SearchViewInner
      isLoading={isLoading}
      wasSearched={wasSearched}
      results={results}
    />
  )
}

export const SearchView = (props: SearchViewProps) => {
  // const [ searchConfig, ] = useState<SearchConfig>(props.config);

  const { config } = props;

  console.log('[START_STATE]', config);

  return (
    <SearchProvider config={config}>
      <WithSearch
        mapContextToProps={({ wasSearched, results, isLoading }) => ({ wasSearched, results, isLoading })}
      >
        {context => <SearchViewWithContext {...context} />}
      </WithSearch>
    </SearchProvider>
  )
};