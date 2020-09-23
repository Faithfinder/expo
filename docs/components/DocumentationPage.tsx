import some from 'lodash/some';
import Router from 'next/router';
import * as React from 'react';
import { css } from 'react-emotion';

import { NavigationRoute, Url } from '~/common/types';
import * as Utilities from '~/common/utilities';
import * as WindowUtils from '~/common/window';
import DocumentationFooter from '~/components/DocumentationFooter';
import DocumentationHeader from '~/components/DocumentationHeader';
import DocumentationNestedScrollLayout from '~/components/DocumentationNestedScrollLayout';
import DocumentationPageContext from '~/components/DocumentationPageContext';
import DocumentationSidebar from '~/components/DocumentationSidebar';
import DocumentationSidebarRight, {
  SidebarRightComponentType,
} from '~/components/DocumentationSidebarRight';
import Head from '~/components/Head';
import { H1 } from '~/components/base/headings';
import navigation from '~/constants/navigation';
import * as Constants from '~/constants/theme';
import { VERSIONS } from '~/constants/versions';

const STYLES_DOCUMENT = css`
  background: #fff;
  margin: 0 auto;
  padding: 40px 56px;

  hr {
    border-top: 1px solid ${Constants.expoColors.gray[250]};
    border-bottom: 0px;
  }

  @media screen and (max-width: ${Constants.breakpoints.mobile}) {
    padding: 20px 16px 48px 16px;
  }
`;

const HIDDEN_ON_MOBILE = css`
  @media screen and (max-width: ${Constants.breakpoints.mobile}) {
    display: none;
  }
`;

const HIDDEN_ON_DESKTOP = css`
  @media screen and (min-width: ${Constants.breakpoints.mobile}) {
    display: none;
  }
`;

type Props = {
  url: Url;
  title: string;
  asPath: string;
  sourceCodeUrl?: string;
  tocVisible: boolean;
};

type State = {
  isMenuActive: boolean;
  isMobileSearchActive: boolean;
};

export default class DocumentationPage extends React.Component<Props, State> {
  state = {
    isMenuActive: false,
    isMobileSearchActive: false,
  };

  private _version?: string;

  private layoutRef = React.createRef<DocumentationNestedScrollLayout>();
  private sidebarRightRef = React.createRef<SidebarRightComponentType>();

  componentDidMount() {
    Router.events.on('routeChangeStart', () => {
      if (this.layoutRef.current) {
        window.__sidebarScroll = this.layoutRef.current.getSidebarScrollTop();
      }
      window.NProgress.start();
    });

    Router.events.on('routeChangeComplete', () => {
      window.NProgress.done();
    });

    Router.events.on('routeChangeError', () => {
      window.NProgress.done();
    });

    window.addEventListener('resize', this._handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._handleResize);
  }

  private _handleResize = () => {
    if (WindowUtils.getViewportSize().width >= Constants.breakpoints.mobileValue) {
      window.scrollTo(0, 0);
    }
  };

  private _handleSetVersion = (version: string) => {
    this._version = version;
    let newPath = Utilities.replaceVersionInUrl(this.props.url.pathname, version);

    if (!newPath.endsWith('/')) {
      newPath += '/';
    }

    // note: we can do this without validating if the page exists or not.
    // the error page will redirect users to the versioned-index page when a page doesn't exists.
    Router.push(newPath);
  };

  private _handleShowMenu = () => {
    this.setState({
      isMenuActive: true,
    });
    this._handleHideSearch();
  };

  private _handleHideMenu = () => {
    this.setState({
      isMenuActive: false,
    });
  };

  private _handleToggleSearch = () => {
    this.setState(prevState => ({
      isMobileSearchActive: !prevState.isMobileSearchActive,
    }));
  };

  private _handleHideSearch = () => {
    this.setState({
      isMobileSearchActive: false,
    });
  };

  private _isReferencePath = () => {
    return this.props.url.pathname.startsWith('/versions');
  };

  private _isGeneralPath = () => {
    return some(navigation.generalDirectories, name =>
      this.props.url.pathname.startsWith(`/${name}`)
    );
  };

  private _isGettingStartedPath = () => {
    return (
      this.props.url.pathname === '/' ||
      some(navigation.startingDirectories, name => this.props.url.pathname.startsWith(`/${name}`))
    );
  };

  private _isPreviewPath = () => {
    return some(navigation.previewDirectories, name =>
      this.props.url.pathname.startsWith(`/${name}`)
    );
  };

  private _getCanonicalUrl = () => {
    if (this._isReferencePath()) {
      return `https://docs.expo.io${Utilities.replaceVersionInUrl(
        this.props.url.pathname,
        'latest'
      )}`;
    } else {
      return `https://docs.expo.io/${this.props.url.pathname}`;
    }
  };

  private _getVersion = () => {
    let version = (this.props.asPath || this.props.url.pathname).split(`/`)[2];
    if (!version || VERSIONS.indexOf(version) === -1) {
      version = VERSIONS[0];
    }
    if (!version) {
      version = 'latest';
    }

    this._version = version;
    return version;
  };

  private _getRoutes = (): NavigationRoute[] => {
    if (this._isReferencePath()) {
      const version = this._getVersion();
      return navigation.reference[version];
    } else {
      return navigation[this._getActiveTopLevelSection()];
    }
  };

  private _getActiveTopLevelSection = () => {
    if (this._isReferencePath()) {
      return 'reference';
    } else if (this._isGeneralPath()) {
      return 'general';
    } else if (this._isGettingStartedPath()) {
      return 'starting';
    } else if (this._isPreviewPath()) {
      return 'preview';
    }
  };

  render() {
    const sidebarScrollPosition = process.browser ? window.__sidebarScroll : 0;

    // note: we should probably not keep this version property outside of react.
    // right now, it's used in non-deterministic ways and depending on variable states.
    const version = this._getVersion();
    const routes = this._getRoutes();

    const isReferencePath = this._isReferencePath();

    const headerElement = (
      <DocumentationHeader
        activeSection={this._getActiveTopLevelSection()}
        version={this._version}
        isMenuActive={this.state.isMenuActive}
        isMobileSearchActive={this.state.isMobileSearchActive}
        isAlgoliaSearchHidden={this.state.isMenuActive}
        onShowMenu={this._handleShowMenu}
        onHideMenu={this._handleHideMenu}
        onToggleSearch={this._handleToggleSearch}
      />
    );

    const sidebarElement = (
      <DocumentationSidebar
        url={this.props.url}
        asPath={this.props.asPath}
        routes={routes}
        version={this._version}
        onSetVersion={this._handleSetVersion}
        isVersionSelectorHidden={!isReferencePath}
      />
    );

    const handleContentScroll = contentScrollPosition => {
      window.requestAnimationFrame(() => {
        if (this.sidebarRightRef && this.sidebarRightRef.current) {
          this.sidebarRightRef.current.handleContentScroll(contentScrollPosition);
        }
      });
    };

    const sidebarRight = <DocumentationSidebarRight ref={this.sidebarRightRef} />;

    return (
      <DocumentationNestedScrollLayout
        ref={this.layoutRef}
        header={headerElement}
        sidebar={sidebarElement}
        sidebarRight={sidebarRight}
        tocVisible={this.props.tocVisible}
        isMenuActive={this.state.isMenuActive}
        isMobileSearchActive={this.state.isMobileSearchActive}
        onContentScroll={handleContentScroll}
        sidebarScrollPosition={sidebarScrollPosition}>
        <Head title={`${this.props.title} - Expo Documentation`}>
          <meta name="docsearch:version" content={isReferencePath ? version : 'none'} />

          {(this._version === 'unversioned' || this._isPreviewPath()) && (
            <meta name="robots" content="noindex" />
          )}
          {this._version !== 'unversioned' && (
            <link rel="canonical" href={this._getCanonicalUrl()} />
          )}
        </Head>

        {!this.state.isMenuActive ? (
          <div className={STYLES_DOCUMENT}>
            <H1>{this.props.title}</H1>
            <DocumentationPageContext.Provider value={{ version: this._version }}>
              {this.props.children}
            </DocumentationPageContext.Provider>
            <DocumentationFooter
              title={this.props.title}
              url={this.props.url}
              asPath={this.props.asPath}
              sourceCodeUrl={this.props.sourceCodeUrl}
            />
          </div>
        ) : (
          <div>
            <div className={`${STYLES_DOCUMENT} ${HIDDEN_ON_MOBILE}`}>
              <H1>{this.props.title}</H1>
              <DocumentationPageContext.Provider value={{ version: this._version }}>
                {this.props.children}
              </DocumentationPageContext.Provider>
              <DocumentationFooter
                title={this.props.title}
                asPath={this.props.asPath}
                sourceCodeUrl={this.props.sourceCodeUrl}
              />
            </div>
            <div className={HIDDEN_ON_DESKTOP}>
              <DocumentationSidebar
                url={this.props.url}
                asPath={this.props.asPath}
                routes={routes}
                version={this._version}
                onSetVersion={this._handleSetVersion}
                isVersionSelectorHidden={!isReferencePath}
              />
            </div>
          </div>
        )}
      </DocumentationNestedScrollLayout>
    );
  }
}
