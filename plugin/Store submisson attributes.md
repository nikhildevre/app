# Description ( seperate to manifest summary )

Send to Harmony enables users to send selected text from any webpage to the Harmony Data Harmonization (https://harmonydata.ac.uk/) platform for analysis. This plugin provides a right-click or context menu item which allows users to add selected content from any page on the internet into their harmonisations, making it easier to compare and analyze different measurement scales across research studies.

# Justifications

## Single purpose

Send to Harmony enables users to send selected text from any webpage or PDF to the Harmony Data Harmonization platform for analysis. With a simple right-click, users can harmonize questionnaire items and survey instruments, making it easier to compare and analyze different measurement scales across research studies.

## Context Menu

Justification: Required for the right-click "Send to Harmony" menu functionality.
Used for: Creating and handling the context menu item that allows users to select text for harmonization.

## Storage

Justification: Required for maintaining user's harmonization history.
Used for: Storing and retrieving previous harmonizations, allowing users to access their history through the popup.

## Scriping

Justification: Required for executing content scripts to capture selected text.
Used for: Running the text selection script in active tabs via chrome.scripting.executeScript().

## ActiveTab

Justification: Required for accessing the current tab's content.
Used for: Getting selected text and tab information from the active tab.

## Tabs

Justification: Required for advanced tab management.
Used for:

Finding existing Harmony tabs (chrome.tabs.query)
Updating tab URLs (chrome.tabs.update)
Managing window focus (chrome.windows.update)
Creating new tabs (chrome.tabs.create)
