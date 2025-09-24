import React, { useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Typography,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { Logout, JoinInner } from "@mui/icons-material/";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import TwitterIcon from "@mui/icons-material/Twitter";

// Get current domain for dynamic links
const getCurrentDomain = () => {
  if (typeof window !== "undefined") {
    // Handle local development with different ports
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      // React app runs on port 3000, DiscoveryNext runs on port 3222
      return "http://localhost:3222";
    }
    return window.location.origin;
  }
  return "https://harmonydata.ac.uk"; // fallback for SSR
};

// Get the correct path for DiscoveryNext links
const getDiscoveryNextPath = (path) => {
  if (typeof window !== "undefined") {
    // Handle local development - DiscoveryNext is on root
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return path; // e.g., "/studies" becomes "/studies"
    }
    // Production - DiscoveryNext is under /search
    return `/search${path}`; // e.g., "/studies" becomes "/search/studies"
  }
  return `/search${path}`; // fallback for SSR
};

const navigationItems = [
  {
    text: "Search",
    icon: "/app/icons/discover.svg",
    activeIcon: "/app/icons/discover-active.svg",
    href: `${getCurrentDomain()}${getDiscoveryNextPath("/")}`,
  },
  {
    text: "Browse",
    icon: "",
    activeIcon: "",
    href: `${getCurrentDomain()}${getDiscoveryNextPath("/studies")}`,
  },
  {
    text: "Explore",
    icon: "/app/icons/explore.svg",
    activeIcon: "/app/icons/explore-active.svg",
    href: `${getCurrentDomain()}${getDiscoveryNextPath("/explore")}`,
  },
  {
    text: "Compare",
    icon: "/app/icons/compare.svg",
    activeIcon: "/app/icons/compare-active.svg",
    href: `${getCurrentDomain()}${getDiscoveryNextPath("/compare")}`,
  },
  {
    text: "Saves",
    icon: "/app/icons/saves.svg",
    activeIcon: "/app/icons/saves-active.svg",
    href: `${getCurrentDomain()}${getDiscoveryNextPath("/saves")}`,
  },
  {
    text: "Harmonise",
    icon: "/app/icons/harmonise.svg",
    activeIcon: "/app/icons/harmonise-active.svg",
    href: "/",
  },
];

const settings = ["My Harmony", "Logout"];

const SettingsIcons = {
  "My Harmony": <JoinInner />,
  Logout: <Logout />,
};

export default function HarmonySidebar() {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [anchorUser, setAnchorUser] = useState(null);
  const [apiVersion, setApiVersion] = useState(null);
  const [error, setError] = useState(null);

  const {
    currentUser,
    logout,
    signInWithGoogle,
    signInWithGitHub,
    signInWithTwitter,
  } = useAuth();
  const { getVersion } = useData();

  // Determine if an item is active
  const isActive = (item) => {
    if (item.text === "Harmonise") {
      // Harmonise is active when we're on any /app path
      return location.pathname.startsWith("/app");
    } else {
      // Other items are active when the pathname matches exactly
      return location.pathname === item.href;
    }
  };

  // User menu handlers
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

  const handleCloseUserMenu = () => {
    setAnchorUser(null);
  };

  // Load API version
  React.useEffect(() => {
    getVersion()
      .then((ver) => {
        setApiVersion(ver);
      })
      .catch((e) => setError("ERROR: API unreachable"));
  }, [getVersion]);

  return (
    <>
      {/* Mobile Sidebar */}
      <Box
        component="nav"
        sx={{
          width: "100%",
          height: 64,
          position: "fixed",
          top: 0,
          left: 0,
          bgcolor: "#FAF8FF",
          borderBottom: "1px solid",
          borderColor: "grey.200",
          zIndex: 1200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          px: 2,
          // Hide on desktop
          "@media (min-width: 900px)": {
            display: "none",
          },
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            position: "absolute",
            left: 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Link to="/app/" style={{ textDecoration: "none" }}>
            <img
              src="/app/harmony.png"
              alt="Harmony Logo"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          </Link>
        </Box>

        {/* Navigation Items - Hidden on mobile, moved to avatar menu */}
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            gap: 2,
            alignItems: "center",
          }}
        >
          {navigationItems.map((item) => {
            const isExternal = item.href.startsWith("http");

            return (
              <ListItemButton
                key={item.text}
                component={isExternal ? "a" : Link}
                href={isExternal ? item.href : undefined}
                to={isExternal ? undefined : item.href}
                selected={isActive(item)}
                sx={{
                  flexDirection: "column",
                  minWidth: 48,
                  minHeight: 48,
                  px: 1,
                  py: 0.5,
                  borderRadius: 2,
                  color: isActive(item) ? "#2E5FFF" : "#444653",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: isActive(item)
                    ? "rgba(46, 95, 255, 0.08)"
                    : "inherit",
                  "&.Mui-selected": {
                    bgcolor: "rgba(46, 95, 255, 0.08)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    color: "inherit",
                    position: "relative",
                    mb: 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.text === "Browse" ? (
                    <LayoutGrid
                      size={16}
                      color={isActive(item) ? "#2E5FFF" : "#444653"}
                      style={{
                        position: "relative",
                        zIndex: 1,
                      }}
                    />
                  ) : (
                    <img
                      src={
                        item.text === "Harmonise"
                          ? item.activeIcon
                          : isActive(item)
                          ? item.activeIcon
                          : item.icon
                      }
                      alt={`${item.text} icon`}
                      width={16}
                      height={16}
                      style={{
                        position: "relative",
                        zIndex: 1,
                      }}
                    />
                  )}
                </ListItemIcon>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#444653",
                    fontSize: "10px",
                    fontWeight: 500,
                    textAlign: "center",
                  }}
                >
                  {item.text}
                </Typography>
              </ListItemButton>
            );
          })}
        </Box>

        {/* User Avatar on Mobile - Right Side */}
        <Box sx={{ position: "absolute", right: 16 }}>
          <Tooltip title="My Harmony">
            <Avatar
              key={(currentUser && currentUser.uid) || "anonUser"}
              src={currentUser && currentUser.photoURL}
              imgProps={{ referrerPolicy: "no-referrer" }}
              onClick={handleOpenUserMenu}
              sx={{
                display: "flex",
                cursor: "pointer",
                width: 40,
                height: 40,
              }}
            >
              {currentUser &&
                !currentUser.photoURL &&
                currentUser.email.substring(1).toUpperCase()}
            </Avatar>
          </Tooltip>
        </Box>
      </Box>

      {/* Desktop Sidebar */}
      <Box
        component="nav"
        sx={{
          width: 72,
          borderRight: "1px solid",
          borderColor: "grey.200",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bgcolor: "#FAF8FF",
          overflow: "hidden",
          // Hide on mobile
          "@media (max-width: 899px)": {
            display: "none",
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 1, pt: 3, display: "flex", justifyContent: "center" }}>
          <Link to="/app/" style={{ textDecoration: "none" }}>
            <img
              src="/app/harmony.png"
              alt="Harmony Logo"
              width={64}
              height={64}
              style={{ objectFit: "contain" }}
            />
          </Link>
        </Box>

        {/* Navigation Items */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            width: "100%",
          }}
        >
          {navigationItems.map((item) => {
            const isExternal = item.href.startsWith("http");

            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={isExternal ? "a" : Link}
                  href={isExternal ? item.href : undefined}
                  to={isExternal ? undefined : item.href}
                  selected={isActive(item)}
                  sx={{
                    minHeight: 48,
                    justifyContent: "center",
                    px: 2.5,
                    flexDirection: "column",
                    color: isActive(item) ? "#2E5FFF" : "#444653",
                    "&.Mui-selected": {
                      bgcolor: "rgba(46, 95, 255, 0.08)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      color: "inherit",
                      position: "relative",
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    {item.text === "Browse" ? (
                      <LayoutGrid
                        size={20}
                        style={{
                          position: "relative",
                          zIndex: 1,
                          color: isActive(item) ? "#2E5FFF" : "#444653",
                        }}
                      />
                    ) : (
                      <img
                        src={
                          item.text === "Harmonise"
                            ? item.activeIcon
                            : isActive(item)
                            ? item.activeIcon
                            : item.icon
                        }
                        alt={`${item.text} icon`}
                        width={20}
                        height={20}
                        style={{
                          position: "relative",
                          zIndex: 1,
                        }}
                      />
                    )}
                  </ListItemIcon>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#444653",
                      fontSize: "12px",
                      fontWeight: 500,
                      textAlign: "center",
                    }}
                  >
                    {item.text}
                  </Typography>
                </ListItemButton>
              </ListItem>
            );
          })}
        </Box>

        {/* User Avatar at Bottom */}
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Tooltip title="My Harmony">
            <Avatar
              key={(currentUser && currentUser.uid) || "anonUser"}
              src={currentUser && currentUser.photoURL}
              imgProps={{ referrerPolicy: "no-referrer" }}
              onClick={handleOpenUserMenu}
              sx={{
                display: "flex",
                cursor: "pointer",
                width: 48,
                height: 48,
              }}
            >
              {currentUser &&
                !currentUser.photoURL &&
                currentUser.email.substring(1).toUpperCase()}
            </Avatar>
          </Tooltip>
          <Menu
            sx={{
              mt: isMobile ? "45px" : "-8px",
              maxWidth: "50%",
              "& .MuiPaper-root": {
                transform: isMobile ? "none" : "translateY(-100%)",
              },
            }}
            id="menu-appbar"
            anchorEl={anchorUser}
            anchorOrigin={{
              vertical: isMobile ? "bottom" : "top",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: isMobile ? "top" : "bottom",
              horizontal: "right",
            }}
            open={Boolean(anchorUser)}
            onClose={handleCloseUserMenu}
          >
            {/* Navigation items for mobile */}
            {isMobile &&
              navigationItems.map((item) => {
                const isExternal = item.href.startsWith("http");
                const itemIsActive = isActive(item);

                return (
                  <MenuItem
                    key={item.text}
                    component={isExternal ? "a" : Link}
                    href={isExternal ? item.href : undefined}
                    to={isExternal ? undefined : item.href}
                    onClick={handleCloseUserMenu}
                    sx={{
                      color: itemIsActive ? "#2E5FFF" : "inherit",
                      bgcolor: itemIsActive
                        ? "rgba(46, 95, 255, 0.08)"
                        : "inherit",
                    }}
                  >
                    {item.text === "Browse" ? (
                      <LayoutGrid
                        size={20}
                        color={itemIsActive ? "#2E5FFF" : "#444653"}
                      />
                    ) : (
                      <img
                        src={itemIsActive ? item.activeIcon : item.icon}
                        alt={`${item.text} icon`}
                        width={20}
                        height={20}
                      />
                    )}
                    <Typography textAlign="center" sx={{ pl: 1 }}>
                      {item.text}
                    </Typography>
                  </MenuItem>
                );
              })}

            {/* Divider between navigation and settings */}
            {isMobile && <Divider />}

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
      </Box>
    </>
  );
}
