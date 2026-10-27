import React from 'react';
import {language} from '../lib/runtime.js';
export default function RootLayout({children}) {
  return <html lang={language()}><body style={{margin:0}}>{children}</body></html>;
}
