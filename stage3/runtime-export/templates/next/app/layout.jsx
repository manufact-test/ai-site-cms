import React from 'react';
import {language,sharedStylesheetHref} from '../lib/runtime.js';
export default function RootLayout({children}) {
  const css=sharedStylesheetHref();
  return <html lang={language()}><head>{css?<link rel="stylesheet" href={css}/>:null}</head><body style={{margin:0}}>{children}</body></html>;
}
