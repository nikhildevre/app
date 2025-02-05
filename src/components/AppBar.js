import * as React from "react";
import {
  AppBar,
  Box,
  Select,
  Toolbar,
  Typography,
  Avatar,
  Tooltip,
  MenuItem,
  Menu,
  Container,
  Divider,
  FormControl,
  InputLabel,
  OutlinedInput,
  ListItemText,
} from "@mui/material";
import { Logout, JoinInner } from "@mui/icons-material/";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import TwitterIcon from "@mui/icons-material/Twitter";
import { useData } from "../contexts/DataContext";
const settings = ["My Harmony", "Logout"];

const SettingsIcons = {
  "My Harmony": <JoinInner />,
  Logout: <Logout />,
};
function HarmonyAppBar() {
  const [anchorUser, setAnchorUser] = React.useState(null);
  const [apiVersion, setApiVersion] = React.useState(null);
  const [allModels, setAllModels] = React.useState();
  const [error, setError] = React.useState(null);
  const {
    currentUser,
    logout,
    signInWithGoogle,
    signInWithGitHub,
    signInWithTwitter,
  } = useAuth();
  const { getVersion, getModels, currentModel, setCurrentModel } = useData();

  React.useEffect(() => {
    getVersion()
      .then((ver) => {
        setApiVersion(ver);
      })
      .catch((e) => setError("ERROR: API unreachable"));
  }, [getVersion]);

  React.useEffect(() => {
    getModels()
      .then((models) => {
        setAllModels(models);
      })
      .catch((e) => setError("ERROR: API unreachable"));
  }, [getModels]);

  const handleModelSelect = (event) => {
    const model = event.target.value;
    if (
      model.framework !== currentModel.framework ||
      model.model !== currentModel.model
    ) {
      setCurrentModel(model);
    }
  };

  const handleOpenUserMenu = (event) => {
    setAnchorUser(event.currentTarget);
  };

  const handleUserMenuClick = (menuItem) => {
    switch (menuItem) {
      case "Logout":
        handleCloseUserMenu();
        console.log("logging out");
        logout();
        break;
      default:
    }
  };

  const handleLanguageMenuClick = (menuItem) => {
    console.log(menuItem);
  };

  const handleCloseUserMenu = () => {
    setAnchorUser(null);
  };

  return (
    <AppBar
      position="absolute"
      sx={{
        background: "transparent",
        boxShadow: "none",
        top: 0,
      }}
    >
      <Container sx={{ maxWidth: "100%!important" }}>
        <Toolbar disableGutters>
          <Box
            sx={{
              flexGrow: 1,

              textAlign: "right",
              paddingRight: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyItems: "flex-end",
              }}
            >
              {error && (
                <Typography sx={{ color: "red", fontWeight: 900 }}>
                  {error}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ flexGrow: 0 }}>
            <Tooltip key="My Harmony" title="My Harmony">
              <Avatar
                key={(currentUser && currentUser.uid) || "anonUser"}
                src={currentUser && currentUser.photoURL}
                imgProps={{ referrerPolicy: "no-referrer" }}
                onClick={handleOpenUserMenu}
                sx={{ display: "flex" }}
              >
                {currentUser &&
                  !currentUser.photoURL &&
                  currentUser.email.substring(1).toUpperCase()}
              </Avatar>
            </Tooltip>
            <Menu
              sx={{ mt: "45px", maxWidth: "50%" }}
              id="menu-appbar"
              anchorEl={anchorUser}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem key="mode">
                <ThemeToggle />
              </MenuItem>
              <MenuItem key="language">
                <Select
                  size="small"
                  id="language"
                  value={"EN"}
                  onChange={handleLanguageMenuClick}
                  sx={{ width: "100%" }}
                >
                  <MenuItem value={"EN"}>English</MenuItem>
                  <MenuItem value={"PT"}>Portuguese</MenuItem>
                </Select>
              </MenuItem>
              <MenuItem key="model">
                <FormControl sx={{ margin: "auto" }}>
                  <InputLabel id="models">Model</InputLabel>
                  <Select
                    size="small"
                    labelId="models"
                    id="modelcombo"
                    value={currentModel}
                    onChange={handleModelSelect}
                    input={
                      <OutlinedInput
                        sx={{ overflow: "hidden" }}
                        label="Model"
                      />
                    }
                    renderValue={(selected) =>
                      selected.framework + " (" + selected.model + ")"
                    }
                  >
                    {allModels &&
                      allModels.map(
                        (model) =>
                          model.available && (
                            <MenuItem key={model.model} value={model}>
                              <ListItemText
                                primary={
                                  model.framework + " (" + model.model + ")"
                                }
                              />
                            </MenuItem>
                          )
                      )}
                  </Select>
                </FormControl>
              </MenuItem>
              <Divider />

              {settings.map((setting) => (
                <MenuItem
                  key={setting}
                  onClick={() => handleUserMenuClick(setting)}
                  disabled={!currentUser}
                >
                  {SettingsIcons[setting]}
                  <Typography textAlign="center" sx={{ pl: 1 }}>
                    {setting}
                  </Typography>
                </MenuItem>
              ))}
              {!currentUser && [
                <Divider key="oauthSigninDiv" />,
                <p
                  key="oauthSigninText"
                  style={{ margin: "0 0.5rem", textAlign: "center" }}
                >
                  Signing in with one of the OAuth providers below allows you
                  access to My Harmony where you can save and share your
                  harmonisations.
                </p>,
              ]}
              {!currentUser && (
                <MenuItem
                  key="SSOGoogle"
                  onClick={() => signInWithGoogle().then(handleCloseUserMenu)}
                >
                  <GoogleIcon />
                  <Typography textAlign="center" sx={{ pl: 1 }}>
                    Sign in with Google
                  </Typography>
                </MenuItem>
              )}
              {!currentUser && (
                <MenuItem
                  key="SSOGithub"
                  onClick={() => signInWithGitHub().then(handleCloseUserMenu)}
                >
                  <GitHubIcon />
                  <Typography textAlign="center" sx={{ pl: 1 }}>
                    Sign in with GitHub
                  </Typography>
                </MenuItem>
              )}
              {!currentUser && (
                <MenuItem
                  key="SSOTwitter"
                  onClick={() => signInWithTwitter().then(handleCloseUserMenu)}
                >
                  <TwitterIcon />
                  <Typography textAlign="center" sx={{ pl: 1 }}>
                    Sign in with Twitter
                  </Typography>
                </MenuItem>
              )}
              <Divider key="versionDiv" />
              {apiVersion && (
                <Typography sx={{ mx: 1 }}>
                  Harmony API version: {apiVersion}
                </Typography>
              )}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
export default HarmonyAppBar;
