import React, { useState } from "react";
import { Box, Button } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import useDrivePicker from "react-google-drive-picker";
function GoogleDriveImport({ filesReceiver, sx }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [openPicker, authResponse] = useDrivePicker();
  const { apiKey, currentUser } = useAuth();

  const handleOpenPicker = () => {
    const userOAuthToken = currentUser.accessToken;

    const handleOpenPicker = () => {
      console.log(currentUser);
      console.log(apiKey);
      openPicker({
        clientId:
          "914732561143-d46nnko41krb3vo1lbif9khmcta8k836.apps.googleusercontent.com",
        developerKey: apiKey,
        viewId: "DOCS",
        //token: currentUser.accessToken, // pass oauth token in case you already have one
        showUploadView: false,
        showUploadFolders: false,
        supportDrives: false,
        multiselect: true,
        // customViews: customViewsArray, // custom view
        callbackFunction: (data) => {
          if (data.action === "cancel") {
            console.log("User clicked cancel/close button");
          }
          console.log(data);
        },
      });
    };
  };

  return (
    <Box sx={sx}>
      <Button
        variant="contained"
        size="large"
        sx={{ mx: "auto" }}
        onClick={() => handleOpenPicker()}
      >
        <img
          style={{ height: "2rem", marginRight: 10 }}
          src={require("../img/google-drive.png")}
          alt="Google Drive"
        />
        Import Forms, Sheets or Documents from Google Drive
      </Button>
    </Box>
  );
}

export default GoogleDriveImport;
