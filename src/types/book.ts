export interface BookItem {
  id: string;
  file: string;
  title: string;
  titleKey?: string;
  subtitle?: string;
  subtitleKey?: string;
  author?: string;
  coverImage?: string;
  coverColor?: string;
  accentColor?: string;
}

export interface H3Item {
  id: string;
  title: string;
  i18nKey?: string;
}

export interface BookSection {
  id: string;
  h1Title: string;
  h2Title: string;
  h3Items: H3Item[];
  html: string;
}

export interface H1Group {
  h1Title: string;
  sections: BookSection[];
}

export interface ParsedBook {
  h1Groups: H1Group[];
  allSections: BookSection[];
}

export interface SearchResultItem {
  id: string;
  bookId: string;
  bookTitle: string;
  h1Title: string;
  h2Title?: string;
  h3Title?: string;
  type: 'h1' | 'h2' | 'h3' | 'text';
  title: string;
  sectionId?: string;
  targetId?: string;
  textToMatch: string;
}
