export interface SeoCopy { readonly title: string; readonly description: string }
export interface SiteIdentity { readonly name: string; readonly url: string }
export interface QaArticle {
  readonly id: string;
  readonly slug: string;
  readonly categorySlug: string;
  readonly title: string;
  readonly summary: string;
  readonly body: readonly string[];
  readonly section: { readonly id: string; readonly title: string };
  readonly author: { readonly name: string; readonly slug: string };
  readonly publishedAt: string;
  readonly modifiedAt: string;
  readonly seo: SeoCopy;
}
export interface ConsentPolicy {
  readonly cookieName: string;
  readonly revision: number;
  readonly retentionDays: number;
}
export interface ConsentSettings extends ConsentPolicy { readonly ui: Readonly<Record<'settings'|'title'|'description'|'accept'|'reject'|'customize'|'save'|'close'|'necessary'|'necessaryDescription'|'analytics'|'analyticsDescription'|'revision'|'policyLink',string>> }
export interface MeasurementSettings {
  readonly enabled: boolean;
  readonly analyticsScript: string;
  readonly analyticsEndpoint: string;
  readonly speedScript: string;
  readonly speedEndpoint: string;
  readonly excludedPaths: readonly string[];
  readonly eventName: string;
}
export interface MeasurementRuntime extends MeasurementSettings {
  readonly mode: 'off'|'production'|'local-test';
  readonly origin: string;
  readonly affiliateOrigins: readonly string[];
}
export interface NetworkRegistry {readonly version:number;readonly sites:readonly {readonly id:string;readonly origin:string;readonly niche:string;readonly topics:readonly string[]}[]}
export interface SiteDefinition {
  readonly network:NetworkRegistry;
  readonly consent: ConsentSettings;
  readonly measurement: MeasurementSettings;
  readonly affiliate: {readonly allowedOrigins:readonly string[];readonly disclosure:string;readonly ownedDisclosure:string;readonly linkLabel:string;readonly ownedLinkLabel:string};
  readonly layouts: { readonly home: 'index' | 'magazine' | 'directory'; readonly article: 'classic' | 'editorial' | 'reference' };
  readonly minTopicArticles: number;
  readonly pageSize: number;
  // Both names are next/font/google exports; the generator writes them straight into an import, so the
  // union is what keeps an arbitrary string out of generated source.
  readonly fonts: { readonly body: 'Geist'; readonly heading: 'Source_Serif_4' | 'Archivo' };
  readonly media: { readonly sizes: string; readonly remotePatterns: readonly { readonly protocol: 'https'; readonly hostname: string }[] };
  readonly og: { readonly width: number; readonly height: number; readonly padding: number; readonly titleSize: number; readonly smallSize: number };
  readonly seoTemplates: Readonly<Record<'home'|'article'|'news'|'review'|'category'|'topic'|'author'|'page', string>>;
  readonly labels: Readonly<Record<string, string>>;
  readonly trustPages: readonly { readonly slug: string; readonly title: string; readonly todo: string }[];
  readonly delivery: { readonly robotsDisallow: readonly string[]; readonly sitemapMaxUrls: number; readonly sitemapMaxBytes: number; readonly indexNowEndpoint: string; readonly indexNowKeyPath: string; readonly searchConsole: { readonly status: string; readonly checkedAt: string | null } };
  readonly home: SeoCopy;
  readonly editorial: { readonly issuer: string; readonly provider: string; readonly priceValidityHours: number; readonly ratingMin: number; readonly ratingMax: number; readonly ui: Readonly<Record<string, string>> };
  readonly id: string;
  readonly identity: SiteIdentity;
  readonly locale: 'nb';
  readonly formattingLocale: 'nb-NO';
  readonly niche: string;
  readonly toneOfVoice: string;
  readonly tokens: Readonly<Record<`--${string}`, string>>;
  readonly routes: { readonly reserved: readonly string[]; readonly maxSlugLength: number };
  readonly ui: { readonly skip: string; readonly menu: string; readonly home: string; readonly category: string; readonly read: string; readonly contents: string; readonly published: string; readonly modified: string; readonly author: string; readonly notFound: string; readonly back: string; readonly breadcrumb: string ; readonly photo: string; readonly photoSource: string};
  readonly content: { readonly home: string; readonly category: string; readonly footer: string };
  readonly qa: { readonly database: {readonly projectId:string;readonly branchId:string;readonly branchName:string;readonly hostPrefix:string}; readonly phase7: Readonly<Record<string,string>>; readonly network:NetworkRegistry; readonly phase6: Readonly<Record<string,string>>; readonly phase5: Readonly<Record<string,string>>; readonly phase4: Readonly<Record<string,string>>; readonly oidc: { readonly issuer: string; readonly clientId: string }; readonly markers: Readonly<Record<string, string>>; readonly identity: SiteIdentity; readonly banner: string; readonly home: SeoCopy; readonly category: SeoCopy & { readonly slug: string; readonly name: string }; readonly article: QaArticle };
}
