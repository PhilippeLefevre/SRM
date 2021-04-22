import React, { memo, ReactElement } from 'react';
import ReactDOM from 'react-dom';
import * as packg from './package.json';
import { Store } from 'easy-peasy';
import { IntlProvider } from 'react-intl';
import _SRMStore, { ContextStoreModel, LoadMessagesFunction } from './store';

import '@formatjs/intl-locale/polyfill';
import '@formatjs/intl-relativetimeformat/polyfill';
import '@formatjs/intl-relativetimeformat/locale-data/en';

export const SRMStore = _SRMStore;

interface PropsMountSelector {
  selector: string;
  element?: null;
}

interface PropsMountElement {
  selector?: null;
  element: HTMLElement;
}

type PropsMount = PropsMountSelector | PropsMountElement;

interface PropsCommon {
  sendEvent?: (id: string, ...args: Array<any>) => Promise<any>;
  navigate: (
    commands: string | Array<string>,
    options?: { queryParams?: any }
  ) => any;
  loadMessages?: (lang: string) => Promise<{ [term: string]: string }>;
  basename?: string;
  language?: string;
}

export type PropsSRM<T = void> = PropsMount & PropsCommon & T;
export type PropsApp = { [key: string]: any };

export type RenderFunction<Props extends PropsApp> = (
  props: Props
) => ReactElement;

export type SRMFunction<Props extends PropsApp> = (
  props: Props
) => any;

export function overrideModel<
  StoreModel extends Object = {},
  Key extends keyof StoreModel = any
>(
  store: Store<StoreModel, any>,
  key: Key,
  value: StoreModel[Key] | undefined | null
) {
  if (value != null) {
    store.removeModel(key as any);
    store.addModel(key as any, value as any);
  }
}

function exportSRM<Props extends PropsApp>(
  path: string,
  srm: SRMFunction<Props>
) {
  const out = path.split('.').reduce((obj, part) => {
    if (!obj[part]) {
      obj[part] = {};
    }

    return obj[part];
  }, window as any);

  Object.assign(out || {}, { render: srm });
}

export function SRM<Props extends PropsApp>(
  path: string,
  render: RenderFunction<Props & { store: Store<ContextStoreModel, any> }>,
  loadMessages?: LoadMessagesFunction,
): SRMFunction<Props & PropsSRM & { store: Store<ContextStoreModel, any> }> {
  const srm: SRMFunction<Props & PropsSRM & { store: Store<ContextStoreModel, any> }> = (props) => {
    const {
      element,
      selector,
      basename,
      language,
      sendEvent,
      navigate,
    } = props;

    let ret = {};
    const Content = memo(() => {
      const store = SRMStore.useStore();

      const { setBasename } = store.getActions();
      if (basename) {
        setBasename(basename);
      }

      const { setLanguage } = store.getActions();
      if (language) {
        setLanguage(language);
      } else {
        setLanguage('en');
      }

      if (sendEvent) {
        overrideModel(store, 'sendEvent', sendEvent);
      }

      if (navigate) {
        overrideModel(store, 'navigate', navigate);
      }

      if (props.loadMessages || loadMessages) {
        overrideModel(store, 'loadMessages', props.loadMessages || loadMessages);
      }

      ret = {
        setBasename,
        setLanguage,
      };

      const { messages, language: locale } = store.getState();
      return (
        <IntlProvider locale={locale} messages={messages} defaultLocale="en">
          { render(Object.assign({}, props, store)) }
        </IntlProvider>
      );
    });

    const el = element || document.querySelector(selector || "#srm");
    ReactDOM.render(
      <div className={`__${packg.name}`}>
        <React.StrictMode>
          <SRMStore.Provider>
            <Content />
          </SRMStore.Provider>
        </React.StrictMode>
      </div>,
      el
    );

    return ret;
  };

  exportSRM(path, srm);

  return srm;
}
