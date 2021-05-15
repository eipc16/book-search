import { Context, SearchProvider, WithSearch } from '@elastic/react-search-ui';
import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";
import DetailsView from './pages/details-page/DetailsView';

import config from './pages/search-page/configs';
import runRequest, { applyDisjunctiveFaceting, buildState } from './pages/search-page/helpers';
import { SearchViewWithContext } from './pages/search-page/SearchView';

interface SearchConfig {
  debug: boolean,
  hasA11yNotifications: boolean,
  onSearch: (state: Context) => Promise<object>
};

const searchViewConfig = {
  debug: false,
  hasA11yNotifications: false,
  alwaysSearchOnInitialLoad: true,
  onSearch: async (state: Context) => {
    const { resultsPerPage } = state;
    const responseJson = await runRequest(state);


    const responseJsonWithDisjunctiveFacetCounts = await applyDisjunctiveFaceting(
      responseJson,
      state,
      config.aggregations ? config.aggregations.map(aggr => aggr.name ? aggr.name : aggr.field) : []
    );
    return buildState(responseJsonWithDisjunctiveFacetCounts, resultsPerPage) as object;
  }
} as SearchConfig;

function App() {
  return (
    <div className="App">
      <Router>
        <SearchProvider config={searchViewConfig}>
          <Switch>
            {/* Search Page */}
            <Route exact path="/">
              <WithSearch
                mapContextToProps={({ wasSearched, results, isLoading }) => ({ wasSearched, results, isLoading })}
              >
                {context => (<SearchViewWithContext {...context} />)}
              </WithSearch>
            </Route>

            {/* Book details page */}
            <Route exact path="/details/:id"
              render={(props) => (
                <WithSearch
                  mapContextToProps={({ current, filters, searchTerm, sortDirection, sortField }) => ({ current, filters, searchTerm, sortDirection, sortField })}
                >
                  {context => (<DetailsView {...context} id={props.match?.params.id} />)}
                </WithSearch>
              )} />
          </Switch>
        </SearchProvider>
      </Router>
    </div >
  )
}

export default App;
