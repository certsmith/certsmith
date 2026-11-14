import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import {
  DynamicOrigin,
  DynamicHost,
  DynamicHostname,
  AcmeUrl,
  DynamicText,
  DynamicSnippet,
  RootCaDownloadSnippet,
} from './dynamic-host';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    DynamicOrigin,
    DynamicHost,
    DynamicHostname,
    AcmeUrl,
    DynamicText,
    DynamicSnippet,
    RootCaDownloadSnippet,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
