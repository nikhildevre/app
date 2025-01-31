chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "copySelection") {
    try {
      // Execute the copy command
      document.execCommand("copy");
      navigator.clipboard.readText().then((selection) => {
        console.log("selectedText", selection);
        sendResponse({
          action: "returnCopied",
          success: true,
          selection: selection,
        });
      });
    } catch (error) {
      console.error("Error executing copy command:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});
