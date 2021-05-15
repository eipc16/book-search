declare module "@elastic/react-search-ui-views" {

    import { Component } from 'react';

    type func = (...args: any[]) => any;
    type renderFunc = (...args: any[]) => JSX.Element;

    interface LayoutProps {
        className?: string;
        children?: JSX.Element;
        header: JSX.Element;
        bodyContent: JSX.Element;
        bodyFooter: JSX.Element;
        bodyHeader: JSX.Element;
        sideContent: JSX.Element;
    }

    export class Layout extends Component<LayoutProps> { }
}