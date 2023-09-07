import React, { useState, useEffect, useMemo } from "react";
import { Container, Box, Slide, useMediaQuery, Link } from "@mui/material";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import Upload from "./Upload";
import Results from "./Results";
import Login from "./Login";
import CssBaseline from "@mui/material/CssBaseline";
import { getDesignTokens, getThemedComponents } from "../conf/theme.ts";
import {
  createTheme,
  ThemeProvider,
  responsiveFontSizes,
} from "@mui/material/styles";
import HarmonyAppBar from "./AppBar";
import pattern from "../img/pattern.svg";
import logoWithText from "../img/Logo-04-min.svg";
import ResultsOptions from "./ResultsOptions";
import { deepmerge } from "@mui/utils";
import { ColorModeContext } from "../contexts/ColorModeContext";
import postData from "../utilities/postData";
import { useData } from "../contexts/DataContext";
import { utils as XLSXutils, writeFile as XLSXwriteFile } from "xlsx";
import ReactGA from 'react-ga4';
import CookieConsent from "react-cookie-consent";

function App() {
  const [fileInfos, setFileInfos] = useState([]);
  const [existingInstruments, setExistingInstruments] = useState([]);
  const [apiData, setApiData] = useState({});
  const [resultsOptions, setResultsOptions] = useState({
    threshold: [70, 100],
    searchTerm: "",
    intraInstrument: false,
  });
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState();
  const { storeHarmonisation } = useData();



  useEffect(() => {
    setMode(prefersDarkMode ? "dark" : "light");
  }, [prefersDarkMode]);

  useEffect(() => {
    //default to intraInstrument ON in the case of just one instument in the model
    if (fileInfos.length == 1 && resultsOptions.intraInstrument == false) {
      var newResultsOptions = { ...resultsOptions };
      newResultsOptions.intraInstrument = true;
      newResultsOptions.intraInstrumentPreviousState =
        resultsOptions.intraInstrument;
      setResultsOptions(newResultsOptions);
    }

    // If there is now more than 1 switch it back to what it was before we forced it.
    if (
      fileInfos.length > 1 &&
      typeof resultsOptions.intraInstrumentPreviousState == "boolean"
    ) {
      var newResultsOptions = { ...resultsOptions };
      newResultsOptions.intraInstrument =
        newResultsOptions.intraInstrumentPreviousState;
      delete newResultsOptions.intraInstrumentPreviousState;
      setResultsOptions(newResultsOptions);
    }
  }, [fileInfos]);

  useEffect(() => {
    postData(process.env.REACT_APP_API_EXAMPLES)
      .then((data) => {
        setExistingInstruments(data);
        console.log(data);
      })
      .catch((e) => {
        console.log(e);
      });
  }, []);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
      },
    }),
    []
  );

  const getQuestion = (qidx) => {
    return apiData.instruments
      .map((i) => {
        return i.questions;
      })
      .flat()
      .filter((q) => {
        return q.question_index == qidx;
      })[0];
  };

  const makePublicShareLink = () => {
    let h = {};
    h.apiData = apiData;
    h.resultsOptions = resultsOptions;
    h.public = true;

    return new Promise((resolve, reject) => {
      storeHarmonisation(h)
        .then((doc) => {
          console.log(doc);
          resolve(window.location.origin + "/app/#/model/" + doc.id);
        })
        .catch((e) => {
          console.log(e);
          reject("Could not create share link");
        });
    });
  };

  const saveToMyHarmony = () => {
    let h = {};
    h.apiData = JSON.parse(JSON.stringify(apiData));
    h.resultsOptions = resultsOptions;
    h.public = false;
    h.created = new Date();
    return new Promise((resolve, reject) => {
      storeHarmonisation(h)
        .then((docRef) => {
          resolve(window.location.origin + "/#/match/" + docRef);
        })
        .catch((e) => {
          console.log(e);
          reject("Could not create share link");
        });
    });
  };

  const downloadExcel = () => {
    var ignoredMatches = [];
    if (Object.keys(apiData).includes("ignoredMatches")) {
      ignoredMatches = apiData.ignoredMatches;
      ignoredMatches = ignoredMatches.map((im) => {
        return im.q1.question_index + "-" + im.q2.question_index;
      });
    }
    const exportedData = apiData.instruments
      .map((instrument) => {
        return instrument.questions
          .map((q) => {
            return q.matches.reduce(function (a, e, i) {
              if (
                Math.abs(e) >= resultsOptions.threshold[0] / 100 &&
                Math.abs(e) <= resultsOptions.threshold[1] / 100 &&
                (resultsOptions.intraInstrument ||
                  i + 1 + q.question_index > instrument.maxqidx) &&
                (!resultsOptions.searchTerm || (q.question_text.concat(q.topics_auto).toLowerCase().includes(resultsOptions.searchTerm.toLowerCase()) || getQuestion(i + 1 + q.question_index).question_text.concat(getQuestion(i + 1 + q.question_index).topics_auto).toLowerCase().includes(resultsOptions.searchTerm)))
              ) {
                var mq = getQuestion(i + 1 + q.question_index);
                var mi = mq.instrument;
                var ignore = ignoredMatches.includes(
                  q.question_index + "-" + (i + 1 + q.question_index)
                );
                a.push({
                  instrument1: instrument.name,
                  question1_no: q.question_no,
                  question1_text: q.question_text,
                  question1_topics: q.topics_auto.toString(),
                  instrument2: mi.name,
                  question2_no: mq.question_no,
                  question2_text: mq.question_text,
                  question2_topics: mq.topics_auto.toString(),
                  match: e,
                  flagged_as_ignore: ignore,
                });
              }
              return a;
            }, []);
          })
          .flat();
      })
      .flat()
      .sort((a, b) => {
        if (Math.abs(a.match) < Math.abs(b.match)) {
          return 1;
        }
        if (Math.abs(a.match) > Math.abs(b.match)) {
          return -1;
        }
        return 0;
      });
    const worksheet = XLSXutils.json_to_sheet(exportedData);
    const workbook = XLSXutils.book_new();
    XLSXutils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSXwriteFile(workbook, "Harmony.xlsx");
  };

  let theme = useMemo(
    () =>
      createTheme(deepmerge(getDesignTokens(mode), getThemedComponents(mode))),
    [mode]
  );

  theme = responsiveFontSizes(theme);
  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container
          disableGutters={true}
          //
          sx={{
            display: { lg: "flex", md: "block" },
            flexDirection: useMediaQuery(theme.breakpoints.down("lg"))
              ? "column"
              : "row",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            width: "100%",
            maxWidth: "100%!important",
          }}
        >
          <Router>
            {/* Side bar for wide screens - narrow screens at top of screen and only on upload page*/}
            <Box
              sx={{
                display: "flex",
                boxSizing: "border-box",
                width: { lg: "50%", md: "100%" },
                top: 0,
                marginLeft: 0,
                marginRight: "auto",
                height: { lg: "100%", md: "unset" },
                background: "linear-gradient(-135deg,#0de5b2, #2b45ed)",
                backgroundImage: `linear-gradient(-135deg,#0de5b2DD, #2b45edAA), url(${pattern}), linear-gradient(-135deg,#0de5b2, #2b45ed)`,
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "2rem",
                color: "white",
              }}
            >
              <Link href="#" sx={{ width: "80%", maxWidth: 700, mx: "auto" }} >
                <img src={logoWithText} alt="Harmony Logo" />
              </Link>

              <Switch>
                <Route path="/model/:stateHash?">
                  <ResultsOptions
                    resultsOptions={resultsOptions}
                    setResultsOptions={setResultsOptions}
                    makePublicShareLink={makePublicShareLink}
                    saveToMyHarmony={saveToMyHarmony}
                    downloadExcel={downloadExcel}
                    ReactGA={ReactGA}
                  />
                </Route>
                <Route path="*">
                  <div>
                    <h1 style={{ color: "white" }}>
                      Harmonise questionnaire items - with Harmony
                    </h1>
                    <p>
                      Harmony is a tool for retrospective harmonisation of
                      questionnaire items.
                    </p>
                    <p>
                      If you want to compare items from different surveys, such
                      as GAD-7 and PHQ-9, Harmony can identify which questions
                      match.
                    </p>
                    <p>
                      <a style={{ color: "white" }} href="https://harmonydata.ac.uk/frequently-asked-questions">
                        FAQs
                      </a>{" "}
                      -{" "}
                      <a style={{ color: "white" }} href="https://harmonydata.ac.uk/privacy-policy">
                        Privacy policy
                      </a>
                    </p>
                  </div>
                </Route>
              </Switch>

              <Box sx={{ display: { lg: "block", md: "none", sm: "none", xs: "none" } }}>
                <img
                  src={logoWithText}
                  style={{ visibility: "hidden" }}
                  alt="Harmony Logo"
                />
              </Box>
            </Box>
            <HarmonyAppBar></HarmonyAppBar>
            <Slide in={true} direction="up">
              <Box
                sx={{
                  width: { lg: "50%", md: "100%" },
                  maxHeight: { lg: "100%" },
                  paddingTop: { lg: "4rem" },
                  overflow: "auto",
                  padding: useMediaQuery(theme.breakpoints.only("xs"))
                    ? "0.5rem"
                    : "2rem",
                }}
              >
                <Switch>
                  {/* <Route path="/signup" component={Signup} /> */}
                  {/* <Route path="/forgot-password" component={ForgotPassword} /> */}
                  <Route path="/login">
                    <Login />
                  </Route>
                  <Route path="/model/:stateHash?">
                    <Results
                      fileInfos={fileInfos}
                      apiData={apiData}
                      setApiData={setApiData}
                      setResultsOptions={setResultsOptions}
                      resultsOptions={resultsOptions}
                      ReactGA={ReactGA}
                    />
                  </Route>
                  <Route path="*">
                    <Upload
                      fileInfos={fileInfos}
                      setFileInfos={setFileInfos}
                      setApiData={setApiData}
                      existingInstruments={existingInstruments}
                      ReactGA={ReactGA}
                    />
                  </Route>
                </Switch>
              </Box>
            </Slide>
          </Router>

          <CookieConsent
            acceptOnScroll={false}
            location="bottom"
            buttonText="That's fine"
            cookieName="harmonyCookieConsent"
            style={{ background: "#2B373B" }}
            buttonStyle={{ color: "#4e503b", fontSize: "13px" }}
            expires={150}
            onAccept={() => {
              ReactGA.initialize("G-S79J6E39ZP");
            }}
          >
            This website uses analytics cookies to allow us to improve the user experience.{" "}

          </CookieConsent>
        </Container>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
