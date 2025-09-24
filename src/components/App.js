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
import HarmonySidebar from "./HarmonySidebar";
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

function App() {
  const [fullscreen, setFullscreen] = useState(false);
  const [existingInstruments, setExistingInstruments] = useState([]);
  const [apiData, setApiData] = useState({});
  const [resultsOptions, setResultsOptions] = useState({
    threshold: [70, 100],
    searchTerm: "",
    intraInstrument: false,
  });
  // Lock to light mode for compatibility with DiscoveryNext
  const [mode, setMode] = useState("light");
  const {
    storeHarmonisation,
    reportRating,
    exampleInstruments,
    match,
    currentModel,
    setCurrentModel,
    getModels,
  } = useData();
  const [ratingValue, setRatingValue] = useState();
  const [computedMatches, setComputedMatches] = useState();
  const [fileInfos, setFileInfos] = useState();
  const [allModels, setAllModels] = useState();

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
        if (Array.isArray(data)) {
          setExistingInstruments(data);
        } else {
          console.error("Error fetching example instruments", data);
        }
      })
      .catch((e) => {
        console.error("Error fetching example instruments", e);
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

          // Filter existing computedMatches to remove any references to removed instruments
          setComputedMatches((prev) => {
            if (!prev) return prev;
            const validQuestionIndices = new Set(
              fileInfos.flatMap((f, i) => f.questions.map((_, qIdx) => qIdx))
            );
            return prev.filter(
              (match) =>
                validQuestionIndices.has(match.qi) &&
                validQuestionIndices.has(match.mqi)
            );
          });

          setApiData(simpleApi);
        });
    },
    [match, fileInfos]
  );

  useEffect(() => {
    // Only execute match if we're on a model route but not loading a saved harmonisation
    // (saved harmonisations are loaded via URL params like /model/abc123)
    if (
      window.location.href.includes("/model") &&
      !window.location.href.includes("/model/")
    ) {
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
    h.apiData = apiData;
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
          instrument1: q.instrument.name || "Instrument " + i,
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

  const handleModelSelect = (event) => {
    setCurrentModel(event.target.value);
  };

  useEffect(() => {
    getModels()
      .then((models) => {
        setAllModels(models);
      })
      .catch((e) => {
        console.log(e);
      });
  }, [getModels]);

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
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            minHeight: "100vh",
            // Add subtle background image
            backgroundImage: `linear-gradient(rgba(39, 237, 185, 0.1), rgba(46, 95, 255, 0.1)), url(${pattern})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        >
          <ToastContainer theme={theme.palette.mode} />
          <Router>
            <HarmonySidebar />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                // Responsive spacing for sidebar
                ml: { xs: 0, md: "72px" }, // No left margin on mobile, 72px on desktop
                mt: { xs: "64px", md: 0 }, // 64px top margin on mobile, none on desktop
                minHeight: { xs: "calc(100vh - 64px)", md: "100vh" }, // Account for top bar height
                width: { xs: "100%", md: "calc(100% - 72px)" }, // Full width on mobile, minus sidebar on desktop
                background: "rgba(250, 248, 255, 0.9)", // Semi-transparent background
                padding: useMediaQuery(theme.breakpoints.only("xs"))
                  ? "0.5rem"
                  : "2rem",
              }}
            >
              <Switch>
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
                    makePublicShareLink={makePublicShareLink}
                    saveToMyHarmony={saveToMyHarmony}
                    downloadExcel={downloadExcel}
                    currentModel={currentModel}
                    allModels={allModels}
                    handleModelSelect={handleModelSelect}
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
                    fullscreen={fullscreen}
                    setFullscreen={setFullscreen}
                  />
                </Route>
                <Route path="*">
                  <Upload
                    appFileInfos={fileInfos}
                    setAppFileInfos={setFileInfos}
                    executeMatch={executeMatch}
                    existingInstruments={existingInstruments}
                    ReactGA={ReactGA}
                    fullscreen={fullscreen}
                    setFullscreen={setFullscreen}
                  />
                </Route>
              </Switch>
            </Box>
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
        </Box>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
