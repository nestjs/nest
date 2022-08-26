import { Inject, Injectable } from '@nestjs/common';
import { RoutingTable } from '../router/routing-table';
import { UrlGeneratorOptions } from './interfaces/url-generator-options.interface';
import { URL_GENERATOR_OPTIONS } from './url-generator.module';

type Slugs = { [name: string]: string };
type Params = { [name: string]: string };

@Injectable()
export class UrlGenerator {
  private urlGeneratorOptions: UrlGeneratorOptions;

  constructor(
    private routingTable: RoutingTable,
    @Inject(URL_GENERATOR_OPTIONS) urlGeneratorOptions: UrlGeneratorOptions,
  ) {
    this.urlGeneratorOptions = urlGeneratorOptions;
  }

  setOptions(urlGeneratorOptions: UrlGeneratorOptions) {
    this.urlGeneratorOptions = urlGeneratorOptions;
  }

  generateUrlByRouteName(
    routeName: string,
    slugs: Slugs = {},
    params: Params = {},
    absolute = false,
  ): string {
    let entry = this.routingTable.findEntry({ routeName });

    if (!entry) {
      throw new Error(`route with name ${routeName} not found`);
    }
    return this.generateUrl(entry.fullUrl, slugs, params, absolute);
  }

  generateUrl(
    url: string,
    slugs: Slugs = {},
    params: Params = {},
    absolute = false,
  ): string {
    url = this.replaceSlugs(url, slugs);
    url = this.addParams(url, params);

    return absolute ? this.urlGeneratorOptions.absoluteUrl + url : url;
  }

  private replaceSlugs(url: string, slugs: Slugs): string {
    for (let slug in slugs) {
      const slugPattern = ':' + slug;

      while (url.includes(slugPattern) !== false) {
        url = url.replace(slugPattern, slugs[slug]);
      }
    }
    return url;
  }

  private addParams(url: string, params: Params): string {
    let paramEntries: string[] = [];

    for (let param in params) {
      paramEntries.push(param + '=' + params[param]);
    }
    return paramEntries.length ? url + '?' + paramEntries.join('&') : url;
  }
}
