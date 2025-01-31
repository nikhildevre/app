importScripts("./js-base64/base64.js");

const harmonyURL = "https://harmonydata.ac.uk/app/#/";

const createHarmonyUrl = ({ questions, instrument_name }) => {
  if (
    Array.isArray(questions) &&
    questions.length &&
    questions.every(
      (q) =>
        typeof q === "string" ||
        q instanceof String ||
        (q.question_text &&
          (typeof q.question_text === "string" ||
            q.question_text instanceof String))
    )
  ) {
    const qArray = questions.map((q, i) => {
      return {
        question_no: q.question_no || i,
        question_text: q.question_text || q,
      };
    });
    const iArray = { instrument_name: instrument_name, questions: qArray };
    return harmonyURL + "import/" + Base64.encode(JSON.stringify(iArray), true);
  } else {
    throw new Error(
      "questions is not properly formatted - it must be an array of question texts, or an array of objects which each must have a question_text property"
    );
  }
};

// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToHarmony",
    title: "Send to Harmony",
    contexts: ["selection"],
  });
  // Initialize history in storage
  chrome.storage.local.set({ history: [] });
});

// Function to find or create Harmony tab
async function findOrCreateHarmonyTab(url) {
  // First, try to find an existing tab with our target name in the URL
  const tabs = await chrome.tabs.query({});
  const harmonyTab = tabs.find(
    (tab) => tab.url && tab.url.includes(harmonyURL)
  );

  if (harmonyTab) {
    // Update existing tab
    await chrome.tabs.update(harmonyTab.id, { url: url, active: true });
    await chrome.windows.update(harmonyTab.windowId, { focused: true });
  } else {
    // Create new tab
    await chrome.tabs.create({ url: url });
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openHarmonyUrl") {
    findOrCreateHarmonyTab(request.url);
    return true;
  }
  if (request.action === "returnCopied") {
    findOrCreateHarmonyTab(request.url);
    return true;
  }
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "sendToHarmony") {
    if (tab?.id > -1) {
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          function: () => {
            const selection = document.getSelection();
            return selection ? selection.toString() : "";
          },
        })
        .then((resultArray) => {
          const result = resultArray[0];
          const selectedText =
            result && result && result.result ? result.result : ""; // Handle various result possibilities
          processSelection(selectedText, tab);
        })
        .catch((error) => {
          console.error("Error getting selected text:", error);
        });
    } else {
      // If tab.id is null (eg in a PDF), trigger the copy command and then read from clipboard
      chrome.tabs
        .sendMessage({
          action: "copySelection",
        })
        .then((response) => {
          if (response?.success) {
            try {
              navigator.clipboard
                .readText()
                .then((selectedText) => processSelection(selectedText, tab));
            } catch (err) {
              console.error("Failed to read clipboard contents: ", err);
            }
          }
        })
        .catch((error) => {
          console.error("Error executing copy command:", error);
        });
    }
  }
});

async function processSelection(selectedText, tab) {
  if (!selectedText) {
    return; // Handle cases where no text is selected
  }

  // Process the selected text here...
  const questionsArray = selectedText
    .split(/\r?\n|\s*<br\s*\/?>/i)
    .filter((line) => line.trim() !== "");

  try {
    // Create the Harmony URL with the selected text as a question
    const harmonyUrl = createHarmonyUrl({
      questions: questionsArray,
      instrument_name: `Imported from ${tab.title} ${tab.url}`,
    });

    // Store in history
    chrome.storage.local.get(["history"], function (result) {
      const history = result.history || [];
      history.unshift({
        text:
          selectedText.substring(0, 100) +
          (selectedText.length > 100 ? "..." : ""),
        url: tab.url,
        timestamp: new Date().toISOString(),
        harmonyUrl: harmonyUrl,
      });
      // Keep only last 10 items
      if (history.length > 10) history.pop();
      chrome.storage.local.set({ history: history });
    });

    // Open or update the Harmony tab
    await findOrCreateHarmonyTab(harmonyUrl);

    // Show success notification
    chrome.action.setBadgeText({ text: "✓" });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 2000);
  } catch (error) {
    // Show error notification
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#F44336" });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 2000);
    console.error("Error:", error);
  }
}
