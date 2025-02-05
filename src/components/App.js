import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Container,
  Box,
  Slide,
  useMediaQuery,
  Link,
  Typography,
  Rating,
} from "@mui/material";
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
import { simplifyApi } from "../utilities/simplifyApi";
import HarmonyAppBar from "./AppBar";
import pattern from "../img/pattern.svg";
import logoWithText from "../img/Logo-04-min.svg";
import ResultsOptions from "./ResultsOptions";
import { deepmerge } from "@mui/utils";
import { ColorModeContext } from "../contexts/ColorModeContext";
import { useData } from "../contexts/DataContext";
import { utils as XLSXutils, writeFile as XLSXwriteFile } from "xlsx";
import ReactGA from "react-ga4";
import CookieConsent, { getCookieConsentValue } from "react-cookie-consent";
import { ToastContainer, toast } from "react-toastify";
import MakeMeJSON from "./MakeMeJSON.js";
import "react-toastify/dist/ReactToastify.css";
import YouTube from "react-youtube";
import "../css/youtube.css";
import { useHistory } from "react-router-dom";

function App() {
  const history = useHistory();
  const [fullscreen, setFullscreen] = useState(false);
  const [existingInstruments, setExistingInstruments] = useState([]);
  const [apiData, setApiData] = useState({});
  const [resultsOptions, setResultsOptions] = useState({
    threshold: [70, 100],
    searchTerm: "",
    intraInstrument: false,
  });
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState();
  const {
    storeHarmonisation,
    reportRating,
    exampleInstruments,
    match,
    currentModel,
  } = useData();
  const [ratingValue, setRatingValue] = useState();
  const [computedMatches, setComputedMatches] = useState();
  const [fileInfos, setFileInfos] = useState();
  useEffect(() => {
    setMode(prefersDarkMode ? "dark" : "light");
  }, [prefersDarkMode]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // stash the current fileInfos to sessionStorage so they can be retreived in the case of handling an import link
      if (fileInfos.length)
        sessionStorage["harmonyStashed"] = JSON.stringify(fileInfos);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [fileInfos]);

  useEffect(() => {
    if (
      sessionStorage["harmonyStashed"] &&
      sessionStorage["harmonyStashed"] !== "undefined"
    )
      setFileInfos(JSON.parse(sessionStorage["harmonyStashed"]));
  }, []);

  useEffect(() => {
    //default to intraInstrument ON in the case of just one instument in the model
    if (
      fileInfos &&
      fileInfos.length === 1 &&
      resultsOptions.intraInstrument === false
    ) {
      let newResultsOptions = { ...resultsOptions };
      newResultsOptions.intraInstrument = true;
      newResultsOptions.intraInstrumentPreviousState =
        resultsOptions.intraInstrument;
      setResultsOptions(newResultsOptions);
    }

    // If there is now more than 1 switch it back to what it was before we forced it.
    if (
      fileInfos &&
      fileInfos.length > 1 &&
      typeof resultsOptions.intraInstrumentPreviousState == "boolean"
    ) {
      let newResultsOptions = { ...resultsOptions };
      newResultsOptions.intraInstrument =
        newResultsOptions.intraInstrumentPreviousState;
      delete newResultsOptions.intraInstrumentPreviousState;
      setResultsOptions(newResultsOptions);
    }
  }, [fileInfos, resultsOptions]);

  useEffect(() => {
    if (getCookieConsentValue("harmonyCookieConsent")) {
      ReactGA.initialize("G-S79J6E39ZP");
      console.log("GA enabled");
    }
    exampleInstruments()
      .then((data) => {
        setExistingInstruments(data);
        console.log(data);
      })
      .catch((e) => {
        console.log(e);
      });
  }, [exampleInstruments]);

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
        return q.question_index === qidx;
      })[0];
  };

  const executeMatch = useCallback(
    (forceModel) => {
      if (fileInfos)
        return match(fileInfos, forceModel).then((data) => {
          let simpleApi = simplifyApi(data, fileInfos);
          setApiData(simpleApi);
        });
    },
    [match, fileInfos]
  );

  useEffect(() => {
    if (window.location.href.includes("/model")) {
      executeMatch(currentModel);
    }
  }, [currentModel, executeMatch]);

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

  const ratingToast = () => {
    if (
      !document.cookie
        .split("; ")
        .find((row) => row.startsWith("harmonyHasRated"))
    ) {
      toast(
        <Box>
          <Typography component="legend">Are you enjoying Harmony?</Typography>
          <Box>
            <Rating
              name="simple-controlled"
              value={ratingValue}
              onChange={(event, newValue) => {
                console.log(newValue);
                setRatingValue(newValue);
                reportRating(newValue);
                document.cookie =
                  "harmonyHasRated=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; SameSite=None; Secure";
                ReactGA &&
                  ReactGA.event({
                    category: "Actions",
                    action: "Rating",
                    value: Number(newValue),
                  });
              }}
            />
          </Box>
        </Box>,
        {
          autoClose: false,
        }
      );
    }
  };

  const saveToMyHarmony = () => {
    setTimeout(ratingToast, 1000);
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
    setTimeout(ratingToast, 1000);

    const matchSheet = computedMatches
      .reduce(function (a, cm, i) {
        let q = getQuestion(cm.qi);
        let mq = getQuestion(cm.mqi);
        a.push({
          instrument1: q.instrument.name,
          question1_no: q.question_no,
          question1_text: q.question_text,
          question1_topics:
            Array.isArray(q.topics_strengths) && q.topics_strengths.join(", "),
          instrument2: mq.instrument.name,
          question2_no: mq.question_no,
          question2_text: mq.question_text,
          question2_topics:
            Array.isArray(mq.topics_strengths) &&
            mq.topics_strengths.join(", "),
          match: cm.match,
        });
        return a;
      }, [])
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
    const allQs = apiData.instruments
      .map((i) => {
        return i.questions;
      })
      .flat()
      .sort((a, b) => {
        if (a.question_index > b.question_index) {
          return 1;
        }
        if (a.question_index < b.question_index) {
          return -1;
        }
        return 0;
      });

    const headers = allQs.map((q) => {
      return q.instrument.name + " " + q.question_no;
    });
    const subheaders = allQs.map((q) => {
      return q.question_text;
    });

    const matrixSheet = allQs.map((q, i) => {
      return Array(i + 1).concat(q.matches);
    });
    matrixSheet.unshift(subheaders);
    matrixSheet.unshift(headers);

    const matches = XLSXutils.json_to_sheet(matchSheet);
    const matrix = XLSXutils.aoa_to_sheet(matrixSheet);
    const workbook = XLSXutils.book_new();
    XLSXutils.book_append_sheet(workbook, matches, "Matches");
    XLSXutils.book_append_sheet(workbook, matrix, "Matrix");
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
          <ToastContainer theme={theme.palette.mode} />
          <Router>
            {/* Side bar for wide screens - narrow screens at top of screen and only on upload page*/}
            <Box
              sx={{
                display: "flex",
                boxSizing: "border-box",
                width: { lg: "35%", md: "100%" },
                minWidth: 300,
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
              <Link href="#" sx={{ width: "80%", maxWidth: 700, mx: "auto" }}>
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
                    toaster={toast}
                    ReactGA={ReactGA}
                  />
                </Route>
                <Route path="*">
                  <div>
                    <h1 style={{ color: "white" }}>
                      Harmonise questionnaire items
                    </h1>
                    <p>
                      Harmony is an AI tool which can read questionnaires and
                      find questions with similar meanings, such as{" "}
                      <i>anxiety</i> vs <i>I feel anxious</i>.
                    </p>
                    <p>
                      Psychologists sometimes need to combine survey results,
                      especially when surveys have been run by different
                      organisations or in different countries.
                    </p>
                    <p>
                      Try two example PDFs:{" "}
                      <a
                        target="gad7-pdf"
                        style={{ color: "white" }}
                        href="https://adaa.org/sites/default/files/GAD-7_Anxiety-updated_0.pdf"
                      >
                        GAD-7 PDF
                      </a>{" "}
                      vs{" "}
                      <a
                        target="phq-pdf"
                        style={{ color: "white" }}
                        href="https://www.apa.org/depression-guideline/patient-health-questionnaire.pdf"
                      >
                        PHQ-9 PDF
                      </a>
                      .
                    </p>
                    <p>
                      <a
                        style={{ color: "white" }}
                        href="https://harmonydata.ac.uk/frequently-asked-questions"
                      >
                        FAQs
                      </a>{" "}
                      -{" "}
                      <a
                        style={{ color: "white" }}
                        href="https://harmonydata.ac.uk/privacy-policy"
                      >
                        Privacy policy
                      </a>{" "}
                      -{" "}
                      <a
                        style={{ color: "white" }}
                        href="https://harmonydata.ac.uk/formatting-help/"
                      >
                        Help with formatting
                      </a>{" "}
                      -{" "}
                      <a
                        style={{ color: "white" }}
                        href="https://harmonydata.ac.uk/troubleshooting-harmony/"
                      >
                        Troubleshooting
                      </a>
                    </p>
                  </div>
                  <YouTube
                    className={"youtubeContainer" + (fullscreen ? "Full" : "")}
                    iframeClassName="youtubeIframe"
                    videoId="cEZppTBj1NI"
                    onPlay={() => setFullscreen(true)}
                    onPause={() => setFullscreen(false)}
                  />
                </Route>
              </Switch>
            </Box>
            <HarmonyAppBar></HarmonyAppBar>
            <Slide in={true} direction="up">
              <Box
                sx={{
                  width: { lg: "65%", md: "100%" },
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
                      toaster={toast}
                      computedMatches={computedMatches}
                      setComputedMatches={setComputedMatches}
                      ReactGA={ReactGA}
                    />
                  </Route>
                  <Route path="/makeMeJSON">
                    <MakeMeJSON
                      appFileInfos={fileInfos}
                      setAppFileInfos={setFileInfos}
                      setApiData={setApiData}
                      existingInstruments={existingInstruments}
                      ReactGA={ReactGA}
                    />
                  </Route>
                  <Route path="/import/:importId">
                    <Upload
                      executeMatch={executeMatch}
                      appFileInfos={fileInfos}
                      setAppFileInfos={setFileInfos}
                      existingInstruments={existingInstruments}
                      ReactGA={ReactGA}
                    />
                  </Route>
                  <Route path="*">
                    <Upload
                      appFileInfos={fileInfos}
                      setAppFileInfos={setFileInfos}
                      executeMatch={executeMatch}
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
              console.log("GA enabled");
            }}
          >
            This website uses analytics cookies to allow us to improve the user
            experience.{" "}
          </CookieConsent>
        </Container>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
