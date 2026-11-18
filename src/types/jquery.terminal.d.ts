declare module 'jquery.terminal/js/unix_formatting' {
  function installUnixFormatting(root: Window, jquery: JQueryStatic): JQueryStatic;
  export default installUnixFormatting;
}

interface JQueryTerminalStatic {
  ansi_colors: {
    normal: Record<string, string>;
    faited: Record<string, string>;
    bold: Record<string, string>;
  };
}
