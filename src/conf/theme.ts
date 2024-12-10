import "../css/Pragmatica.css";

export const getDesignTokens = (mode: string | undefined) => ({
  typography: {
    body1: {
      fontFamily: "Pragmatica, sans-serif",
      fontWeight: 300,
      lineHeight: "150%",
      fontSize: "0.9rem",
      "@media (min-width:600px)": {
        fontSize: "1rem",
      },
      "@media (min-width:900px)": {
        fontSize: "1.1rem",
      },
    },
    caption: {
      fontFamily: "Pragmatica, sans-serif",
      fontWeight: 600,
      fontSize: "0.625rem",
      lineHeight: "1.3",
    },
  },
  shape: {
    borderRadius: 10,
  },
  palette: {
    mode,
    ...(mode === "light"
      ? {
          primary: {
            main: "#2b45ed",
          },
          secondary: {
            main: "#0de5b2",
          },
          background: {
            default: "#FEFCFB",
            paper: "#FEFCFB",
          },
          text: {
            primary: "#131854",
          },
        }
      : //Dark Mode
        {
          primary: {
            main: "#0de5b2",
          },
          secondary: {
            main: "#2b45ed",
          },
          background: {
            default: "#131854",
            paper: "#131854",
          },
          text: {
            primary: "#FEFCFB",
          },
        }),
  },
});

export const getThemedComponents = (mode) => ({
  components: {
    ...(mode === "light"
      ? {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                fontFamily: "Pragmatica, sans-serif",
                fontWeight: 300,
                lineHeight: "1.3",
                color: "#0de5b2",
                "& h1, h2, h3, h4, h5, h6": {
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 400,
                  lineHeight: "1.2",
                  color: "#2b45ed",
                },
              },
            },
          },
        }
      : //Dark mode
        {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                fontFamily: "Pragmatica, sans-serif",
                fontWeight: 300,
                lineHeight: "1.3",
                color: "#FEFCFB",
                "& h1, h2, h3, h4, h5, h6": {
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 400,
                  lineHeight: "1.2",
                  color: "#0de5b2",
                },
              },
            },
          },
        }),
    // Both Modes
    MuiInputBase: {
      styleOverrides: {
        root: {
          "& input": {
            "&:-webkit-autofill": {
              transition:
                "background-color 50000s ease-in-out 0s, color 50000s ease-in-out 0s",
            },
          },
        },
      },
    },
  },
});
