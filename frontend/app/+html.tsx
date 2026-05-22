import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Turnos — Gestão de Turnos Profissional</title>
        <meta name="description" content="Gestão de turnos, gratificações e ocorrências para PSP/GNR." />
        <meta name="theme-color" content="#050816" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
