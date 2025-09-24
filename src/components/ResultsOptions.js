import React, { useEffect, useMemo, useState } from "react";
import {
  Divider,
  Card,
  Slider,
  Switch,
  Typography,
  Stack,
  Button,
  TextField,
  InputAdornment,
} from "@mui/material";
import { ReactComponent as xlsxSVG } from "../img/file-excel-solid.svg";
import DropdownShareButton from "./DropdownShareButton";
import SvgIcon from "@mui/material/SvgIcon";
import { useAuth } from "../contexts/AuthContext";
import { useDebounce } from "react-use-custom-hooks";
import PopperHelp from "./PopperHelp";
import { Check as CheckIcon } from "@mui/icons-material";
import {
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  ListItemText,
} from "@mui/material";
import { Bookmark } from "lucide-react";

export default function ResultsOptions({
  resultsOptions,
  setResultsOptions,
  makePublicShareLink,
  saveToMyHarmony,
  downloadExcel,
  ReactGA,
  toaster,
  currentModel,
  allModels,
  handleModelSelect,
}) {
  const [threshold, setThreshold] = useState(resultsOptions.threshold);
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle", "saving", "saved"
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    setThreshold(resultsOptions.threshold);
    setSearchTerm(resultsOptions.searchTerm);
  }, [resultsOptions]);

  useMemo(() => {
    if (debouncedSearchTerm !== resultsOptions.searchTerm) {
      let thisOptions = { ...resultsOptions };
      thisOptions.searchTerm = debouncedSearchTerm;
      setResultsOptions(thisOptions);
    }
  }, [debouncedSearchTerm, resultsOptions, setResultsOptions]);

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      await saveToMyHarmony();
      setSaveStatus("saved");
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus("idle");
    }
  };

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        width: { xs: "100%", sm: "75%" },
        margin: "auto",
        padding: "1rem",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Options</h2>
      <Stack>
        <div>
          <Typography id="Threshold">Match Threshold</Typography>
        </div>
        <Slider
          value={threshold}
          min={0}
          valueLabelDisplay="auto"
          onChange={(e, value) => {
            setThreshold(value);
          }}
          onChangeCommitted={(e, value) => {
            let thisOptions = { ...resultsOptions };
            thisOptions.threshold = value;
            setResultsOptions(thisOptions);
          }}
        />
        <Divider sx={{ mt: 1, mb: 1 }} />
        <TextField
          sx={{ mt: 1, mb: 1 }}
          id="outlined-basic"
          label="Search"
          autoComplete="off"
          inputProps={{
            autoComplete: "off",
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
          }}
          value={searchTerm}
          variant="outlined"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <PopperHelp>
                  <Typography>
                    This supports Lucene-like queries. So you can use wildcards,
                    logical operators, parentheses, and negation to create
                    precise and complex searches. You can also search within
                    specific data fields (instrument, question, or topic) e.g.
                    <br />
                    <br />
                    <b>instrument:RCAD and instrument:GAD</b>
                    <br />
                    <br />
                    which will show matches in your results between these two
                    instruments only.
                  </Typography>
                </PopperHelp>
              </InputAdornment>
            ),
          }}
        />
        <Divider sx={{ mt: 1, mb: 1 }} />
        <Stack
          direction="row"
          sx={{
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography id="withinInstruments">
            Show within-instrument matches
          </Typography>
          <Switch
            checked={resultsOptions.intraInstrument}
            onChange={(event) => {
              let thisOptions = { ...resultsOptions };
              thisOptions.intraInstrument = event.target.checked;
              setResultsOptions(thisOptions);
            }}
          />
        </Stack>
        <Stack
          direction="row"
          sx={{
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography id="withinInstruments">Just selected matches</Typography>
          <Switch
            checked={resultsOptions.onlySelected}
            onChange={(event) => {
              let thisOptions = { ...resultsOptions };
              thisOptions.onlySelected = event.target.checked;
              setResultsOptions(thisOptions);
            }}
          />
        </Stack>
        <Divider sx={{ mt: 1, mb: 1 }} />

        {/* Model Selector */}
        <Stack sx={{ mt: 1, mb: 1 }}>
          <Typography id="model-selector" sx={{ mb: 1 }}>
            AI Model
          </Typography>
          <FormControl size="small" fullWidth>
            <InputLabel id="models">Model</InputLabel>
            <Select
              labelId="models"
              id="modelcombo"
              value={currentModel || ""}
              onChange={handleModelSelect}
              input={
                <OutlinedInput sx={{ overflow: "hidden" }} label="Model" />
              }
              renderValue={(selected) =>
                selected ? selected.framework + " (" + selected.model + ")" : ""
              }
            >
              {allModels &&
                allModels.map(
                  (model) =>
                    model.available && (
                      <MenuItem key={model.model} value={model}>
                        <ListItemText
                          primary={model.framework + " (" + model.model + ")"}
                        />
                      </MenuItem>
                    )
                )}
            </Select>
          </FormControl>
        </Stack>
        <Divider sx={{ mt: 1, mb: 1 }} />

        <Stack
          direction="row"
          sx={{
            width: "100%",
            alignItems: "center",
            justifyContent: "space-around",
          }}
        >
          {currentUser && (
            <DropdownShareButton
              getShareLink={makePublicShareLink}
              ReactGA={ReactGA}
            />
          )}
          {currentUser && (
            <Button
              variant="contained"
              onClick={() => {
                ReactGA &&
                  ReactGA.event({
                    category: "Actions",
                    action: "Save Harmonisation",
                  });
                handleSave();
              }}
              disabled={saveStatus === "saving"}
              sx={{
                minWidth: 120,
                backgroundColor: saveStatus === "saved" ? "#4caf50" : undefined,
                "&:hover": {
                  backgroundColor:
                    saveStatus === "saved" ? "#45a049" : undefined,
                },
              }}
            >
              {saveStatus === "saving" ? (
                <CircularProgress size={20} sx={{ mr: 1, color: "white" }} />
              ) : saveStatus === "saved" ? (
                <CheckIcon sx={{ mr: 1 }} />
              ) : (
                <Bookmark size={20} style={{ marginRight: 8 }} />
              )}
              <Typography>
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                  ? "Saved!"
                  : "Save"}
              </Typography>
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => {
              ReactGA &&
                ReactGA.event({
                  category: "Actions",
                  action: "Export Matches",
                });
              downloadExcel();
            }}
          >
            <SvgIcon component={xlsxSVG} inheritViewBox />
            <Typography> Export</Typography>
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
