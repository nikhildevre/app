import React, {
  useState,
  useRef,
  memo,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import DragDrop from "./DragDrop";
// This requires more finessing to request the additional permissions needed smoothly - it may require google approval before it can be enabled
//import GoogleDriveImport from "./GoogleDriveImport";
import { useData } from "../contexts/DataContext";
import { useParams } from "react-router-dom";
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ListItem,
  List,
  Paper,
  Button,
  Typography,
  CircularProgress,
  TextField,
  Stack,
  Tooltip,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import {
  AddCircleOutline as AddCircleOutlineIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useHistory } from "react-router-dom";
import InlineFeedback from "./InlineFeedback";
import ExistingInstruments from "./ExistingInstruments";
import { simplifyApi } from "../utilities/simplifyApi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import pdfTableExtractor from "../utilities/pdf-table-extractor";
import { useAuth } from "../contexts/AuthContext";
import { Base64 } from "js-base64";

export default function Upload({
  appFileInfos,
  setAppFileInfos,
  executeMatch,
  existingInstruments,
  ReactGA,
}) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState(false);
  const [matchError, setMatchError] = useState(false);
  const [importFeedback, setImportFeedback] = useState();
  const [grouping] = useState("");
  const [expanded, setExpanded] = useState(false);
  const dirty = useRef(false);
  const localFileInfos = useRef();
  const history = useHistory();
  const { match, parse, getSharedInstrument } = useData();
  const { importId } = useParams();

  ReactGA.send({
    hitType: "pageview",
    page: "/",
    title: "Upload / Definition",
  });

  const fileInfos = useMemo(() => {
    return dirty.current ? localFileInfos.current || [] : appFileInfos || [];
  }, [appFileInfos]);

  const setFileInfos = useCallback(
    (fi, forceExpanded) => {
      console.log("setting local FI ", fi);
      dirty.current = dirty.current + 1;
      localFileInfos.current = fi;
      if (forceExpanded) {
        setExpanded(forceExpanded);
      } else if (
        fi.length &&
        !(expanded && fi.map((i) => i.instrument_id).includes(expanded))
      ) {
        setExpanded(fi[0].instrument_id);
      }
    },
    [expanded, setExpanded]
  );
  const syncFileInfos = useCallback(() => {
    console.log("syncing fileinfo");
    setAppFileInfos(localFileInfos.current);
    dirty.current = false;
  }, [setAppFileInfos]);

  useEffect(() => {
    if (importId) {
      // immediately rewite URL to prevent reimport loop trauma
      history.push("/");

      // define validation functions
      const importToModelDef = (imported) => {
        const isValidImport = (inst) => {
          const isQuestionValid = (q) => {
            return !!q.question_text;
          };
          return (
            !!inst.instrument_name &&
            !!inst.questions &&
            Array.isArray(inst.questions) &&
            inst.questions.every((q) => isQuestionValid(q))
          );
        };
        // make it an array if just a single instrument
        if (!Array.isArray(imported)) imported = [imported];

        // if valid import - adding to the existing fileinfos - App contains a beforeunload to stash file infors between loads within session.
        if (imported.every((inst) => isValidImport(inst))) {
          imported.map((i) => (i.instrument_id = "Imported_" + Math.random()));
          setFileInfos([...fileInfos].concat(imported));
          syncFileInfos();
          return imported.length;
        } else {
          return 0;
        }
      };
      toast.promise(
        new Promise((resolve, reject) => {
          if (importId.length > 20 && Base64.isValid(importId)) {
            console.log("decoded", Base64.decode(importId));
            // Support the whole instrument being presented as a base64 encoded instrument object - This will only work for small instruments but enhances privacy and speed
            try {
              let imported = JSON.parse(Base64.decode(importId));
              const nImported = importToModelDef(imported);
              if (nImported) {
                setTimeout(() => resolve(nImported), 250);
              } else {
                setTimeout(() => reject(0), 250);
              }
            } catch (e) {
              setTimeout(() => reject(e), 250);
            }
          } else {
            getSharedInstrument(importId).then((imported) => {
              const nImported = importToModelDef(imported);
              if (nImported) {
                resolve(nImported);
              } else {
                reject(0);
              }
            });
          }
        }),
        {
          pending: "Importing your instruments",
          success: "All your instruments have been imported",
          error: "Sorry we couldn't interpret that import!",
        }
      );
    }
  });

  function filesReceiver(fileList) {
    const files = Array.from(fileList);
    let frp = [];
    files.forEach((file) => {
      frp.push(
        new Promise((resolve, reject) => {
          const fileExt = file.name.split(".").pop().toLowerCase();
          const reader = new FileReader();
          reader.onload = () => {
            if (fileExt === "pdf") {
              const uint8array = Uint8Array.from(
                atob(reader.result.split(",")[1]),
                (c) => c.charCodeAt(0)
              );
              var typedarray = new Uint8Array(uint8array);

              pdfTableExtractor(typedarray)
                .then((tables) => {
                  resolve({
                    file_name: file.name,
                    file_type: file.name.split(".").pop().toLowerCase(),
                    content: reader.result,
                    tables: tables.pageTables,
                  });
                })
                .catch((e) => {
                  // PDF clientside parsing failed for some reason - defer to the server
                  console.log(e);
                  resolve({
                    file_name: file.name,
                    file_type: file.name.split(".").pop().toLowerCase(),
                    content: reader.result,
                  });
                });
            } else {
              resolve({
                file_name: file.name,
                file_type: file.name.split(".").pop().toLowerCase(),
                content: reader.result,
              });
            }
          };
          reader.onerror = (e) => {
            reject(e);
          };
          if (fileExt === "txt" || fileExt === "csv") {
            reader.readAsText(file);
          } else {
            reader.readAsDataURL(file);
          }
        })
      );
    });
    Promise.all(frp)
      .then((allFiles) => {
        toast.promise(
          new Promise((resolve, reject) => {
            parse(allFiles)
              .then((data) => {
                const newFileInfos = [...fileInfos];
                // Load each returned file / instrument in the data
                data.forEach((instrument) => {
                  newFileInfos.push(instrument);
                });
                setFileInfos(newFileInfos);
                resolve(true);
              })
              .catch((e) => {
                console.log(e);
                setParseError(true);
                reject("Parse Error");
              })
              .finally((_) => {
                syncFileInfos();
              });
          }),
          {
            pending: "Parsing files - this may take a while",
            success: "Success!",
            error: "Something went wrong - please try again",
          }
        );
      })
      .catch((e) => {
        console.log(e);
      });
  }

  function existingReceiver(selected) {
    var newFileInfos = [...fileInfos];
    // Add the selected instruments to the infoList - attaching a instrument grouping key if needed
    // work through the current total selection and ensure any existing ones are in out out as required.
    const existingInstrumentIDs = existingInstruments.map((ei) => {
      return ei.instrument_id;
    });

    // trim out any which are existing instruments but not selected
    newFileInfos = newFileInfos
      .map((fi) => {
        if (
          (existingInstrumentIDs.includes(fi.instrument_id) &&
            selected.includes(fi.instrument_name)) ||
          !existingInstrumentIDs.includes(fi.instrument_id)
        ) {
          return fi;
        } else {
          return null;
        }
      })
      .filter((i) => {
        return i !== null;
      });

    // add in any selected which are not already in there
    selected.forEach((sin) => {
      let si = existingInstruments.filter((inst) => {
        return inst.instrument_name === sin;
      })[0];
      si.grouping = grouping;
      if (
        newFileInfos.filter((inst) => {
          return inst.instrument_id === si.instrument_id;
        }).length === 0
      ) {
        console.log("adding " + si.instrument_name);
        newFileInfos.push(si);
      }
    });

    setFileInfos(newFileInfos);
    syncFileInfos();
  }
  const updateInstrument = (instrument_id, value) => {
    console.log("updating instrument " + instrument_id);
    const newFileInfos = fileInfos.map((fileInfo) => {
      if (fileInfo.instrument_id === instrument_id) {
        fileInfo.instrument_name = value;
      }
      return fileInfo;
    });
    setFileInfos(newFileInfos);
  };
  const removeInstrument = (instrument_id) => {
    const newFileInfos = fileInfos.filter((fileInfo) => {
      return fileInfo.instrument_id !== instrument_id;
    });
    setFileInfos(newFileInfos);
    syncFileInfos();
  };

  const insertInstrument = (after_instrument_id) => {
    const after = fileInfos.findIndex(
      (f) => f.instrument_id === after_instrument_id
    );
    const instrument_id = "ManuallyCreated" + String(new Date().getTime());
    const newFileInfos = fileInfos
      .slice(0, after + 1)
      .concat([
        {
          instrument_id: instrument_id,
          instrument_name: "",
          questions: [{ question_no: "", question_text: "" }],
        },
      ])
      .concat(fileInfos.slice(after + 1));
    setFileInfos(newFileInfos, instrument_id);
    syncFileInfos();
  };

  const insertQuestion = (instrument_id, after_question_index) => {
    const instrument = fileInfos.filter((f) => {
      return f.instrument_id === instrument_id;
    })[0];

    const questions = instrument.questions
      .slice(0, after_question_index + 1)
      .concat([{ question_no: "", question_text: "" }])
      .concat(instrument.questions.slice(after_question_index + 1));

    const newFileInfos = fileInfos.map((fileInfo) => {
      if (fileInfo.instrument_id === instrument_id) {
        fileInfo.questions = questions;
      }
      return fileInfo;
    });
    setFileInfos(newFileInfos);
  };

  const removeQuestion = (instrument_id, question_index) => {
    const newFileInfos = fileInfos.map((fileInfo) => {
      if (fileInfo.instrument_id === instrument_id) {
        fileInfo.questions.splice(question_index, 1);
      }
      return fileInfo;
    });
    setFileInfos(newFileInfos);
  };

  const updateQuestion = (
    instrument_id,
    question_index,
    new_question_no,
    new_question_text
  ) => {
    console.log("updating Q");
    const newFileInfos = fileInfos.map((fileInfo) => {
      if (fileInfo.instrument_id === instrument_id) {
        if (new_question_no)
          fileInfo.questions[question_index].question_no = new_question_no;
        if (new_question_text)
          fileInfo.questions[question_index].question_text = new_question_text;
      }
      return fileInfo;
    });
    setFileInfos(newFileInfos);
  };

  const getQuestion = (instrument_id, index) => {
    return fileInfos.filter((fi) => {
      return fi.instrument_id === instrument_id;
    })[0].questions[index];
  };

  const QuestionDetail = memo(
    ({ question, index, instrument_id, rerender }) => {
      return (
        <ListItem
          key={instrument_id + "_" + index + "_" + question.question_no}
          sx={{ alignItems: "flex-end", pr: 0, mr: 0 }}
        >
          <TextField
            //setting the key to ensure the whole box is rerendered when the value changes
            key={instrument_id + "_" + index + "_" + question.question_no}
            sx={{ width: 35, px: 0, mx: 0 }}
            variant={"standard"}
            defaultValue={getQuestion(instrument_id, index).question_no}
            placeholder={question.question_no ? "" : "#"}
            onBlur={(e) => {
              updateQuestion(instrument_id, index, e.target.value);
              rerender((prev) => (prev || 0) + 1);
            }}
            onClickCapture={(e) => {
              e.stopPropagation();
            }}
          />
          <TextField
            multiline
            //setting the key to ensure the whole box is rerendered when the value changes
            key={instrument_id + "_" + index + question.question_text}
            sx={{ width: "100%", px: 1 }}
            variant={"standard"}
            defaultValue={getQuestion(instrument_id, index).question_text}
            placeholder={"Enter your question text"}
            onBlur={(e) => {
              updateQuestion(instrument_id, index, null, e.target.value);
              rerender((prev) => (prev || 0) + 1);
            }}
            onClickCapture={(e) => {
              e.stopPropagation();
            }}
          />
          <Stack
            direction="row"
            spacing={0}
            sx={{ pointerEvents: "none", mx: 0, right: 0 }}
          >
            <IconButton
              sx={{ pointerEvents: "auto" }}
              aria-label="delete"
              title="Delete this question"
              onClickCapture={(e) => {
                e.stopPropagation();
                removeQuestion(instrument_id, index);
                rerender((prev) => (prev || 0) + 1);
              }}
            >
              <DeleteIcon />
            </IconButton>
            <IconButton
              sx={{ pointerEvents: "auto", pr: 0.7 }}
              aria-label="add-new"
              title="Add new question here"
              onClickCapture={(e) => {
                e.stopPropagation();
                insertQuestion(instrument_id, index);
                rerender((prev) => (prev || 0) + 1);
              }}
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </Stack>
        </ListItem>
      );
    }
  );

  const FileInfo = ({ fi }) => {
    const instrument_id = fi.instrument_id;
    const fileInfo = fi;
    const [, rerender] = useState();
    console.log("rendering " + instrument_id + fileInfo.instrument_name);
    return (
      <Accordion
        id={instrument_id}
        key={instrument_id}
        expanded={expanded === instrument_id}
        onChange={(e, ex) => {
          if (ex) setExpanded(instrument_id);
          syncFileInfos();
        }}
      >
        <AccordionSummary
          expandIcon={
            <ExpandMoreIcon
              sx={{
                pointerEvents: "auto",
              }}
            />
          }
          sx={{
            pointerEvents: "none",
            flexDirection: "row",
            alignItems: "center",
            "& .MuiAccordionSummary-content": {
              justifyContent: "space-between",
              alignItems: "center",
              mr: 0.5,
            },
          }}
        >
          <TextField
            error={
              fi.questions.reduce((a, q) => (a = a + q.question_text), "")
                .length === 0
            }
            helperText={
              fi.questions.reduce((a, q) => (a = a + q.question_text), "")
                .length === 0
                ? "You must add questions before this will be harmonised"
                : false
            }
            variant="standard"
            sx={{
              pointerEvents: "auto",
              width: "100%",
              pr: 1,
              focusVisibleClassName: "NA",
            }}
            defaultValue={fileInfo.instrument_name}
            placeholder={"Manually create your instrument - add a name"}
            onClickCapture={(e) => {
              e.stopPropagation();
            }}
            onFocus={(e) => {
              console.log("entered  " + instrument_id);
              setExpanded(instrument_id);
            }}
            onBlur={(e) => {
              updateInstrument(instrument_id, e.target.value);
              rerender((i) => i || 0 + 1);
            }}
          />
          <IconButton
            aria-label="delete"
            onClickCapture={(e) => {
              e.stopPropagation();
              removeInstrument(instrument_id);
            }}
            sx={{
              pointerEvents: "auto",
            }}
          >
            <DeleteIcon />
          </IconButton>
          <IconButton
            aria-label="add-new"
            onClickCapture={(e) => {
              e.stopPropagation();
              insertInstrument(instrument_id);
            }}
            sx={{
              pointerEvents: "auto",
            }}
          >
            <AddCircleOutlineIcon />
          </IconButton>
        </AccordionSummary>
        {expanded && expanded === instrument_id && (
          <AccordionDetails
            sx={{
              width: "100%",
              marginTop: -3,
              marginLeft: -2,
              maxHeight: "50vh",
              overflowY: "auto",
            }}
          >
            {fileInfo.questions && fileInfo.questions.length && (
              <List dense={true}>
                {fileInfo.questions.map((question, i) => {
                  return (
                    <QuestionDetail
                      key={instrument_id + "_" + i}
                      question={question}
                      index={i}
                      instrument_id={instrument_id}
                      rerender={rerender}
                    />
                  );
                })}
              </List>
            )}
          </AccordionDetails>
        )}
      </Accordion>
    );
  };

  return (
    <Paper
      elevation={4}
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: "1rem",
      }}
    >
      <ToastContainer />
      <InlineFeedback
        message="The file could not be parsed"
        severity="error"
        state={parseError}
        setState={setParseError}
      />
      <InlineFeedback
        message="The match proceedure failed"
        severity="error"
        state={matchError}
        setState={setMatchError}
      />
      <InlineFeedback
        message={importFeedback}
        severity="info"
        state={!!importFeedback}
        setState={setImportFeedback}
      />
      <DragDrop filesReceiver={filesReceiver} sx={{ mt: "2rem" }} />
      {/* //REMOVING for now - the firebase auth tokens do not cover the scopes for
      drive access and we would need to request additional permissions as well
      as get validated by google to enable this
      {currentUser &&
        currentUser.providerData &&
        currentUser.providerData
          .map((p) => p.providerId)
          .includes("google.com") && (
          <GoogleDriveImport
            filesReceiver={filesReceiver}
            sx={{ display: "flex", width: "100%", mt: "1rem" }}
          />
        )} */}
      <Stack
        direction={"row"}
        spacing={1}
        sx={{
          mt: 2,
          mr: 1,
          display: "flex",
          alignItems: "center",
          maxWidth: "100%",
        }}
      >
        <ExistingInstruments
          sx={{ width: "100%", flexShrink: 2 }}
          existingReceiver={existingReceiver}
          existingInstruments={existingInstruments}
          fileInfos={fileInfos}
        />
        <Tooltip title="Type in an instrument">
          <IconButton
            aria-label="add-new"
            onClick={(e) => {
              e.stopPropagation();
              insertInstrument();
            }}
          >
            <AddCircleOutlineIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box sx={{ marginTop: "1rem" }}>
        {fileInfos && fileInfos.length
          ? fileInfos.map((fi, i) => {
              return <FileInfo key={fi.instrument_id} fi={fi}></FileInfo>;
            })
          : ""}
      </Box>
      <Button
        variant="contained"
        size="large"
        sx={{ margin: "2rem" }}
        disabled={!fileInfos || fileInfos.length === 0 || loading}
        onClick={() => {
          console.log("executeMatch", executeMatch);
          setLoading(true);
          executeMatch()
            .then((_) => {
              history.push("/model");
              setLoading(false);
            })
            .catch((e) => {
              console.log(e);
              setMatchError(true);
            });
          /*  match(fileInfos)
            .then((data) => {
              let simpleApi = simplifyApi(data, fileInfos);
              setApiData(simpleApi);
              console.log(simpleApi);
              setLoading(false);
              history.push("/model");
            })
            .catch((e) => {
              console.log(e);
              setMatchError(true);
            }); */
        }}
      >
        {!loading && <Typography>Harmonise</Typography>}
        {loading && <CircularProgress />}
      </Button>
    </Paper>
  );
}
